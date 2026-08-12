/**
 * Finance tRPC router — data layer for the admin "Finances" page.
 *
 * Answers "where did my money actually go?": product sales vs. tax collected
 * vs. shipping collected vs. Stripe fees withheld vs. net.
 *
 * Also carries the payments/compliance data that used to live in a separate
 * `business.getPaymentsOverview` procedure (now removed): INFORM Act thresholds,
 * Stripe account verification status, most-recent payouts. The admin Payments
 * page has been merged into Finances, so one call now powers both halves of it.
 *
 * Conventions:
 * - `ownerAdminProcedure` (auth + membership enforced by the middleware).
 * - The business is always resolved from `ctx.businessId`, never from input.
 * - Stripe reads are best-effort: failures are captured to Sentry and degrade
 *   to a partial/null `stripe` block. The DB half of the response is always
 *   returned intact.
 */

import type { Prisma } from "generated/prisma";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type { OrdersBreakdown } from "~/lib/orders/order-money";
import {
  EMPTY_ORDERS_BREAKDOWN,
  summarizeOrderMoney,
} from "~/lib/orders/order-money";
import { stripeClient } from "~/lib/stripe/client";
import { createTRPCRouter, ownerAdminProcedure } from "~/server/api/trpc";

const rangeKeySchema = z.enum(["7d", "30d", "90d", "ytd", "year"]);
type RangeKey = z.infer<typeof rangeKeySchema>;

/** Hard cap on auto-paged balance transactions; surfaced as `truncated`. */
const BALANCE_TXN_CAP = 5000;
/** Hard cap on auto-paged payouts. */
const PAYOUT_CAP = 5000;

/**
 * Balance-transaction types that represent money coming IN from a sale.
 * Direct charges on a Standard connected account land as `charge` (Checkout /
 * PaymentIntents) or `payment` (older/legacy charge objects).
 */
const CHARGE_TYPES: ReadonlySet<Stripe.BalanceTransaction.Type> = new Set([
  "charge",
  "payment",
]);

/**
 * Balance-transaction types that represent a refund going back OUT. Their
 * `amount` is negative in Stripe.
 */
const REFUND_TYPES: ReadonlySet<Stripe.BalanceTransaction.Type> = new Set([
  "refund",
  "payment_refund",
  "payment_failure_refund",
]);

/**
 * Chargeback / dispute and other balance adjustments. Signed: a lost dispute is
 * negative, a won dispute reversal is positive.
 */
const ADJUSTMENT_TYPES: ReadonlySet<Stripe.BalanceTransaction.Type> = new Set([
  "adjustment",
]);

/** INFORM Consumers Act: high-volume seller at 200+ transactions/year… */
const INFORM_TRANSACTION_THRESHOLD = 200;
/** …OR $5,000+ in annual gross revenue. */
const INFORM_REVENUE_THRESHOLD_CENTS = 500000;

/** How many "most recent payouts ever" to surface on the page. */
const RECENT_PAYOUT_LIMIT = 5;

/** Payout statuses that represent money that has actually left the balance. */
const SETTLED_PAYOUT_STATUSES: ReadonlySet<string> = new Set([
  "paid",
  "in_transit",
]);

export type FinanceRange = {
  key: RangeKey;
  label: string;
  start: Date;
  endExclusive: Date;
};

/**
 * Resolve a range key to a local-time, midnight-aligned half-open window.
 *
 * All arithmetic uses `setDate`/`setHours` rather than epoch-ms subtraction so
 * DST transitions do not shift the window by an hour.
 */
function resolveRange(key: RangeKey, now = new Date()): FinanceRange {
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  if (key === "ytd") {
    return {
      key,
      label: "Year to date",
      start: new Date(now.getFullYear(), 0, 1),
      endExclusive: tomorrowStart,
    };
  }

  if (key === "year") {
    return {
      key,
      label: `Calendar year ${now.getFullYear()}`,
      start: new Date(now.getFullYear(), 0, 1),
      endExclusive: new Date(now.getFullYear() + 1, 0, 1),
    };
  }

  const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
  const start = new Date(todayStart);
  // Trailing N *whole* local days, today inclusive.
  start.setDate(start.getDate() - (days - 1));

  return {
    key,
    label: `Last ${days} days`,
    start,
    endExclusive: tomorrowStart,
  };
}

/** Local midnight of Jan 1 this year, and of tomorrow — for the YTD tax figure. */
function resolveYtdWindow(now = new Date()): {
  start: Date;
  endExclusive: Date;
} {
  const ytd = resolveRange("ytd", now);
  return { start: ytd.start, endExclusive: ytd.endExclusive };
}

function toUnixSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

export type StripeFinanceSummary = {
  grossChargesCents: number;
  processingFeesCents: number;
  /** POSITIVE magnitude — Stripe reports refunds as negative amounts. */
  refundsCents: number;
  /** Signed — negative when disputes went against the business. */
  disputeAdjustmentsCents: number;
  netToBalanceCents: number;
  paidOutCents: number;
  balanceAvailableCents: number;
  balancePendingCents: number;
  /** True when the balance-transaction list hit the auto-paging cap. */
  truncated: boolean;
  /**
   * True when SOME (but not all) Stripe calls failed. The tiles fed by the
   * failed call read 0, which is indistinguishable from a genuine zero — so the
   * UI must warn rather than present these figures as complete.
   */
  partial: boolean;
};

/**
 * INFORM Consumers Act compliance figures. Always calendar-year-to-date and
 * DB-driven, so they are independent of both the selected `range` and of
 * whether Stripe is connected.
 */
export type InformActSummary = {
  annualTransactions: number;
  annualRevenueCents: number;
  thresholdReached: boolean;
};

/** A recent payout row, shaped for direct rendering. */
export type FinancePayoutRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number;
};

export const financeRouter = createTRPCRouter({
  /**
   * getBreakdown — one call powering the whole Finances page.
   *
   * DB half (always returned): the order-money breakdown for the selected
   * range, calendar-YTD tax collected, and the calendar-YTD INFORM Act
   * transaction/revenue counters.
   * Stripe half (best-effort): balance transactions, payouts and balance for
   * the same window, read from the connected account with direct charges, plus
   * the account's verification status and its last few payouts overall.
   */
  getBreakdown: ownerAdminProcedure
    .input(z.object({ range: rangeKeySchema.default("30d") }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const now = new Date();
      const range = resolveRange(input.range, now);

      const business = await ctx.db.business.findFirst({
        where: { id: businessId },
        select: { stripeAccountId: true, stripeAutoTaxEnabled: true },
      });

      // Order scope for the Finances page. Deliberately STRICTER than the
      // dashboard's revenue scope (which does not exclude cancelled orders) —
      // that difference is a known dashboard bug we are not fixing here.
      const orderScope: Prisma.OrderWhereInput = {
        businessId,
        createdAt: { gte: range.start, lt: range.endExclusive },
        paymentStatus: { in: ["paid", "refunded", "disputed"] },
        status: { not: "cancelled" },
      };

      const ytdWindow = resolveYtdWindow(now);
      const ytdOrderScope: Prisma.OrderWhereInput = {
        businessId,
        createdAt: { gte: ytdWindow.start, lt: ytdWindow.endExclusive },
        paymentStatus: { in: ["paid", "refunded", "disputed"] },
        status: { not: "cancelled" },
      };

      // INFORM Act scope — current calendar year, and deliberately NOT the
      // finance scopes above. The thresholds measure transactions *conducted*,
      // not revenue currently retained: an order that was paid counts even if
      // it was later refunded, disputed or cancelled, while an order that was
      // never paid (pending/unpaid/failed) does not. Gross, not net of refunds.
      const startOfCalendarYear = new Date(now.getFullYear(), 0, 1);
      const informOrderScope: Prisma.OrderWhereInput = {
        businessId,
        createdAt: { gte: startOfCalendarYear },
        paymentStatus: { in: ["paid", "refunded", "disputed"] },
      };

      const [orderRows, ytdTaxAgg, informAgg] = await Promise.all([
        ctx.db.order.findMany({
          where: orderScope,
          select: {
            total: true,
            tax: true,
            shipping: true,
            discount: true,
            refundAmountCents: true,
            paymentMethod: true,
          },
        }),
        ctx.db.order.aggregate({
          where: ytdOrderScope,
          _sum: { tax: true },
        }),
        ctx.db.order.aggregate({
          where: informOrderScope,
          _count: { id: true },
          _sum: { total: true },
        }),
      ]);

      const orders: OrdersBreakdown =
        orderRows.length > 0
          ? summarizeOrderMoney(orderRows)
          : { ...EMPTY_ORDERS_BREAKDOWN };

      const taxCollectedYtdCents = ytdTaxAgg._sum.tax ?? 0;

      const annualTransactions = informAgg._count.id;
      const annualRevenueCents = informAgg._sum.total ?? 0;
      const inform: InformActSummary = {
        annualTransactions,
        annualRevenueCents,
        thresholdReached:
          annualTransactions >= INFORM_TRANSACTION_THRESHOLD ||
          annualRevenueCents >= INFORM_REVENUE_THRESHOLD_CENTS,
      };

      // NOTE: no cost-of-goods figure is reported here on purpose.
      // `Product.cost` is a nullable Float that no admin UI can write (it is
      // absent from the product form and from `src/lib/validators/product.ts`;
      // only product-duplicate and store-transfer copy it), and its unit is
      // genuinely ambiguous — the schema comment on the sibling `Product.price`
      // says "in cents or dollars" while `create-session/route.ts` passes
      // `price` through as Stripe's `unit_amount`, i.e. cents. A COGS estimate
      // built on it would be either always-null or silently 100x wrong. Add it
      // back once `cost` is editable and its unit is pinned down.

      // ---- Stripe half ---------------------------------------------------
      const accountId = business?.stripeAccountId ?? null;
      let stripe: StripeFinanceSummary | null = null;
      let stripeError = false;
      // Tri-state: null means "unknown" (not connected, or the account read
      // failed). The UI must not raise a "verification required" alert on
      // unknown — only on an explicit `false`.
      let stripeDetailsSubmitted: boolean | null = null;
      let recentPayouts: FinancePayoutRow[] | null = null;

      if (accountId) {
        const startUnix = toUnixSeconds(range.start);
        const endUnix = toUnixSeconds(range.endExclusive);

        // allSettled so one failing endpoint only blanks its own tiles.
        const [
          txnsResult,
          payoutsResult,
          balanceResult,
          accountResult,
          recentPayoutsResult,
        ] = await Promise.allSettled([
          stripeClient.balanceTransactions
            .list(
              { created: { gte: startUnix, lt: endUnix }, limit: 100 },
              { stripeAccount: accountId },
            )
            .autoPagingToArray({ limit: BALANCE_TXN_CAP }),
          stripeClient.payouts
            .list(
              {
                arrival_date: { gte: startUnix, lt: endUnix },
                limit: 100,
              },
              { stripeAccount: accountId },
            )
            .autoPagingToArray({ limit: PAYOUT_CAP }),
          stripeClient.balance.retrieve({ stripeAccount: accountId }),
          stripeClient.accounts.retrieve(accountId),
          // "Last N payouts ever" — intentionally NOT range-filtered, so it
          // cannot be served by the arrival_date-bounded list above.
          stripeClient.payouts.list(
            { limit: RECENT_PAYOUT_LIMIT },
            { stripeAccount: accountId },
          ),
        ]);

        const failures = [
          txnsResult,
          payoutsResult,
          balanceResult,
          accountResult,
          recentPayoutsResult,
        ].filter((r): r is PromiseRejectedResult => r.status === "rejected");

        // Only the first three calls feed `StripeFinanceSummary`, so only they
        // can make its figures incomplete. A failed account/recent-payout read
        // blanks its own field instead of flagging the money tiles as partial.
        const summaryFailures = [
          txnsResult,
          payoutsResult,
          balanceResult,
        ].filter((r) => r.status === "rejected");

        if (accountResult.status === "fulfilled") {
          stripeDetailsSubmitted =
            accountResult.value.details_submitted ?? false;
        }

        if (recentPayoutsResult.status === "fulfilled") {
          recentPayouts = recentPayoutsResult.value.data.map((p) => ({
            id: p.id,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            arrival_date: p.arrival_date,
          }));
        }

        if (failures.length === 5) {
          stripeError = true;
        } else {
          let grossChargesCents = 0;
          let processingFeesCents = 0;
          let refundAmountSum = 0;
          let disputeAdjustmentsCents = 0;
          let netToBalanceCents = 0;
          let truncated = false;

          if (txnsResult.status === "fulfilled") {
            const txns = txnsResult.value;
            truncated = txns.length >= BALANCE_TXN_CAP;
            for (const txn of txns) {
              // Fees are withheld on EVERY transaction type, not just charges.
              processingFeesCents += txn.fee;
              netToBalanceCents += txn.net;
              if (CHARGE_TYPES.has(txn.type)) {
                grossChargesCents += txn.amount;
              } else if (REFUND_TYPES.has(txn.type)) {
                // Negative in Stripe; accumulate signed, flip below.
                refundAmountSum += txn.amount;
              } else if (ADJUSTMENT_TYPES.has(txn.type)) {
                disputeAdjustmentsCents += txn.amount;
              }
            }
          }

          let paidOutCents = 0;
          if (payoutsResult.status === "fulfilled") {
            for (const payout of payoutsResult.value) {
              if (!SETTLED_PAYOUT_STATUSES.has(payout.status)) continue;
              paidOutCents += Math.abs(payout.amount);
            }
          }

          let balanceAvailableCents = 0;
          let balancePendingCents = 0;
          if (balanceResult.status === "fulfilled") {
            balanceAvailableCents = balanceResult.value.available.reduce(
              (sum, b) => sum + b.amount,
              0,
            );
            balancePendingCents = balanceResult.value.pending.reduce(
              (sum, b) => sum + b.amount,
              0,
            );
          }

          stripe = {
            grossChargesCents,
            processingFeesCents,
            // Returned as a positive magnitude so the UI can render "− $X".
            refundsCents: Math.abs(refundAmountSum),
            disputeAdjustmentsCents,
            netToBalanceCents,
            paidOutCents,
            balanceAvailableCents,
            balancePendingCents,
            truncated,
            partial: summaryFailures.length > 0,
          };
        }

        if (failures.length > 0) {
          // Capture once, non-fatally — the DB half is still returned.
          Sentry.captureException(failures[0]?.reason, {
            tags: {
              "trpc.procedure": "finance.getBreakdown",
              service: "stripe",
            },
            extra: {
              businessId,
              failedCalls: failures.length,
              range: range.key,
            },
          });
        }
      }

      return {
        range: {
          key: range.key,
          label: range.label,
          start: range.start,
          endExclusive: range.endExclusive,
        },
        orders,
        stripe,
        taxCollectedYtdCents,
        stripeAutoTaxEnabled: business?.stripeAutoTaxEnabled ?? false,
        isStripeConnected: !!accountId,
        stripeError,
        inform,
        stripeDetailsSubmitted,
        recentPayouts,
      };
    }),
});
