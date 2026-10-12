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
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { resolveDonationLabel } from "~/lib/donations/label";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { evaluateInform, resolveInformWindow } from "~/lib/finance/inform";
import type { BalanceTxnSummary } from "~/lib/finance/stripe-summary";
import { summarizeBalanceTransactions } from "~/lib/finance/stripe-summary";
import type { OrdersBreakdown } from "~/lib/orders/order-money";
import {
  EMPTY_ORDERS_BREAKDOWN,
  summarizeOrderMoney,
} from "~/lib/orders/order-money";
import { stripeClient } from "~/lib/stripe/client";
import {
  createTRPCRouter,
  featureGateAny,
  ownerAdminProcedure,
} from "~/server/api/trpc";

const rangeKeySchema = z.enum(["7d", "30d", "90d", "ytd", "year", "lastYear"]);
type RangeKey = z.infer<typeof rangeKeySchema>;

/** Hard cap on auto-paged balance transactions; surfaced as `truncated`. */
const BALANCE_TXN_CAP = 5000;
/** Hard cap on auto-paged payouts. */
const PAYOUT_CAP = 5000;

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

  if (key === "lastYear") {
    return {
      key,
      label: `Calendar year ${now.getFullYear() - 1}`,
      start: new Date(now.getFullYear() - 1, 0, 1),
      endExclusive: new Date(now.getFullYear(), 0, 1),
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

/**
 * Balance-transaction figures (see `summarizeBalanceTransactions` — net
 * excludes payouts) plus payout and balance reads for the same window.
 */
export type StripeFinanceSummary = BalanceTxnSummary & {
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
 * INFORM Consumers Act compliance figures. Always the trailing 12 months
 * ending today (see `~/lib/finance/inform`) and DB-driven, so they are
 * independent of both the selected `range` and of whether Stripe is connected.
 */
export type InformActSummary = {
  trailing12moTransactions: number;
  trailing12moRevenueCents: number;
  /** 200+ sales AND $5,000+ revenue — the FTC test is AND, not OR. */
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
   * range, calendar-YTD tax collected (refund-adjusted), and the trailing
   * 12-month INFORM Act transaction/revenue counters.
   * Stripe half (best-effort): balance transactions, payouts and balance for
   * the same window, read from the connected account with direct charges, plus
   * the account's verification status and its last few payouts overall.
   * The `donations` block is deliberately NOT gated on the `donations`
   * feature flag — same rationale as `donationRouter.list` (see
   * `src/server/api/routers/donation.ts`:6-23): a donation is a money
   * record, and it must stay readable here even after the owner turns the
   * feature back off.
   * The procedure itself is gated on payments OR donations (a donations-only
   * store still needs its finance breakdown); with neither enabled it is
   * FORBIDDEN, matching the admin nav item and the /admin/finances layout.
   */
  getBreakdown: ownerAdminProcedure
    .use(featureGateAny(["payments", "donations"]))
    .input(z.object({ range: rangeKeySchema.default("30d") }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const now = new Date();
      const range = resolveRange(input.range, now);

      const business = await ctx.db.business.findFirst({
        where: { id: businessId },
        select: {
          stripeAccountId: true,
          stripeAutoTaxEnabled: true,
          donationLabel: true,
          venmoHandle: true,
          cashAppHandle: true,
          featureFlags: true,
        },
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

      // INFORM Act scope — trailing 12 months ending today, and deliberately
      // NOT the finance scopes above. The thresholds measure sales *made*, not
      // revenue currently retained: an order that was paid counts even if it
      // was later refunded or disputed, while one that was never paid
      // (pending/failed) or was cancelled does not. Manual orders count — they
      // are sales too. Gross, not net of refunds.
      const informWindow = resolveInformWindow(now);
      const informOrderScope: Prisma.OrderWhereInput = {
        businessId,
        createdAt: { gte: informWindow.start, lt: informWindow.endExclusive },
        paymentStatus: { in: ["paid", "refunded", "disputed"] },
        status: { not: "cancelled" },
      };

      const orderMoneySelect = {
        total: true,
        tax: true,
        shipping: true,
        discount: true,
        refundAmountCents: true,
        paymentMethod: true,
      } satisfies Prisma.OrderSelect;

      const [orderRows, ytdTaxRows, informAgg, donationAgg, allTimeDonationCount] =
        await Promise.all([
          ctx.db.order.findMany({
            where: orderScope,
            select: orderMoneySelect,
          }),
          // Row-level (not `_sum.tax`) so YTD tax gets the same refund
          // proration as the range tile. Untaxed orders contribute 0, so
          // they are skipped to keep the read small.
          ctx.db.order.findMany({
            where: { ...ytdOrderScope, tax: { gt: 0 } },
            select: orderMoneySelect,
          }),
          ctx.db.order.aggregate({
            where: informOrderScope,
            _count: { id: true },
            _sum: { total: true },
          }),
          // Range-scoped donation totals for the new donations card. Gross
          // (Stripe amount_total) only — refunds are not tracked on donations,
          // unlike orders, so there is no net figure to compute here.
          ctx.db.donation.aggregate({
            where: {
              businessId,
              createdAt: { gte: range.start, lt: range.endExclusive },
            },
            _sum: { amountCents: true },
            _count: true,
          }),
          // All-time count, independent of `range` — drives the card's
          // visibility client-side (show once a business has ANY donation
          // history, not just within the selected window).
          ctx.db.donation.count({ where: { businessId } }),
        ]);

      const orders: OrdersBreakdown =
        orderRows.length > 0
          ? summarizeOrderMoney(orderRows)
          : { ...EMPTY_ORDERS_BREAKDOWN };

      const taxCollectedYtdCents = summarizeOrderMoney(ytdTaxRows).taxCents;

      const trailing12moTransactions = informAgg._count.id;
      const trailing12moRevenueCents = informAgg._sum.total ?? 0;
      const inform: InformActSummary = {
        trailing12moTransactions,
        trailing12moRevenueCents,
        thresholdReached: evaluateInform({
          transactions: trailing12moTransactions,
          revenueCents: trailing12moRevenueCents,
        }).thresholdReached,
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

        // Deliberately checked against `summaryFailures` (the 3 money reads),
        // NOT `failures` (all 5 settled calls). `failures.length === 5` was a
        // regression: it only tripped when every call failed, so a partial
        // outage where just the money reads fail (but account/recent-payout
        // succeed) fell through to the `else` branch and rendered $0.00
        // tiles instead of the error card. All 3 money reads failing is the
        // correct — and only — trigger for `stripeError`.
        if (summaryFailures.length === 3) {
          stripeError = true;
        } else {
          const txns =
            txnsResult.status === "fulfilled" ? txnsResult.value : [];
          const truncated = txns.length >= BALANCE_TXN_CAP;
          const txnSummary = summarizeBalanceTransactions(txns);

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
            ...txnSummary,
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
        // Year the YTD tile covers (the server's current year, whatever range is shown).
        taxCollectedYtdYear: ytdWindow.start.getFullYear(),
        stripeAutoTaxEnabled: business?.stripeAutoTaxEnabled ?? false,
        isStripeConnected: !!accountId,
        stripeError,
        inform,
        stripeDetailsSubmitted,
        recentPayouts,
        donations: {
          // Gross (Stripe amount_total) for the selected range; refunds are
          // not tracked on donations.
          totalCents: donationAgg._sum.amountCents ?? 0,
          count: donationAgg._count,
          // All-time count — drives card visibility client-side.
          allTimeCount: allTimeDonationCount,
          // `donations` feature-flag state; donation data may exist while
          // the flag is off (see the JSDoc above for why this block is
          // returned regardless).
          enabled: resolveFlags(business?.featureFlags).isEnabled(
            "donations",
          ),
          // Owner's chosen noun: "Donation" | "Tip" | "Contribution".
          labelNoun: resolveDonationLabel(business?.donationLabel).noun,
          hasOffPlatformHandles: !!(
            business?.venmoHandle ?? business?.cashAppHandle
          ),
        },
      };
    }),
});
