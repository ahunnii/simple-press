import { Prisma } from "generated/prisma";

import type {
  DashboardMetricsContext,
  MetricWindow,
  StatPart,
  StatQuery,
} from "./types";
import type {
  RecentOrdersCardData,
  RevenueChartCardData,
  TopProductsCardData,
} from "~/lib/dashboard/card-data";
import type { DashboardRangeGranularity } from "~/lib/dashboard/ranges";
import type { TxClient } from "~/server/db";
import { orderOptionsHint } from "~/lib/customizer/display";
import {
  financeOrderScope,
  financeOrderStatusSql,
} from "~/lib/finance/order-scope";
import { PHOTO_ONLY_WHERE } from "~/lib/products/media";
import { formatCurrency } from "~/lib/utils";

import {
  pickTotals,
  queryBucketAggregates,
  queryBucketTotals,
  WHOLE_WINDOW_KEY,
  windowSeriesPoints,
} from "./series";

// ── Revenue-scoped money (gross / net / refunds / count / AOV) ──────────────

export type OrderMoneyWidget =
  | "gross-revenue"
  | "net-revenue"
  | "refunds"
  | "order-count"
  | "avg-order-value";

/** The money figures the revenue cards read, per window or per bucket. */
export type OrderMoneyTotals = {
  /** Σ total (`totalChargedCents`). */
  gross: number;
  /** Σ per-order refund, clamped to [0, total]; 0 for total <= 0. */
  refunded: number;
  /** Σ per-order total − refund; 0 for total <= 0 (`netCollectedCents`). */
  net: number;
  /** Rows in scope (`orderCount`). */
  count: number;
  /** Rows with a positive stored refund (the Refunds card's detail). */
  refundedOrders: number;
};

/** The order's refund as `splitOrderMoney` sees it: null → 0, clamped to [0, total]. */
const REFUND_KEPT_SQL = Prisma.sql`LEAST(GREATEST(COALESCE("refundAmountCents", 0), 0), "total")`;

/**
 * `summarizeOrderMoney`'s gross / refunded / net / count as SQL sums, so a
 * card never loads every order row (All time = the whole history).
 *
 * Per row this is exactly `splitOrderMoney`: `totalChargedCents` is `total`
 * even when `total <= 0` (such rows refund and net nothing); otherwise the
 * refund is the stored cumulative amount, null → 0, clamped to [0, total],
 * and net is `total − refund`. `dashboard-router.test.ts` pins the SQL
 * against `summarizeOrderMoney` and Finances on the edge cases.
 */
const ORDER_MONEY_AGGREGATES = {
  gross: Prisma.sql`SUM("total")`,
  refunded: Prisma.sql`SUM(CASE WHEN "total" <= 0 THEN 0 ELSE ${REFUND_KEPT_SQL} END)`,
  net: Prisma.sql`SUM(CASE WHEN "total" <= 0 THEN 0 ELSE "total" - ${REFUND_KEPT_SQL} END)`,
  count: Prisma.sql`COUNT(*)`,
  refundedOrders: Prisma.sql`COUNT(*) FILTER (WHERE COALESCE("refundAmountCents", 0) > 0)`,
} satisfies Record<keyof OrderMoneyTotals, Prisma.Sql>;

const EMPTY_MONEY: OrderMoneyTotals = {
  gross: 0,
  refunded: 0,
  net: 0,
  count: 0,
  refundedOrders: 0,
};

/**
 * Money totals for orders that count toward revenue in the window — the SAME
 * scope as `financeOrderScope` (Finances), so the two can't drift — either
 * for the whole window (`granularity: null`, keyed `WHOLE_WINDOW_KEY`) or per
 * store-local bucket.
 */
export function queryOrderMoneyTotals(
  db: TxClient,
  opts: {
    businessId: string;
    window: MetricWindow;
    granularity: DashboardRangeGranularity | null;
    timeZone: string;
  },
): Promise<Map<string, OrderMoneyTotals>> {
  return queryBucketAggregates(db, {
    table: "Order",
    timeColumn: "createdAt",
    businessId: opts.businessId,
    window: opts.window,
    granularity: opts.granularity,
    timeZone: opts.timeZone,
    aggregates: ORDER_MONEY_AGGREGATES,
    whereSql: financeOrderStatusSql(),
  });
}

async function windowMoney(
  db: TxClient,
  ctx: DashboardMetricsContext,
  win: MetricWindow,
): Promise<OrderMoneyTotals> {
  const totals = await queryOrderMoneyTotals(db, {
    businessId: ctx.businessId,
    window: win,
    granularity: null,
    timeZone: ctx.timeZone,
  });
  return totals.get(WHOLE_WINDOW_KEY) ?? EMPTY_MONEY;
}

const usd = (cents: number) => formatCurrency(cents);

function pickMoney(
  m: OrderMoneyTotals,
  widget: OrderMoneyWidget,
): number | null {
  switch (widget) {
    case "gross-revenue":
      return m.gross;
    case "net-revenue":
      return m.net;
    case "refunds":
      return m.refunded;
    case "order-count":
      return m.count;
    case "avg-order-value":
      return m.count > 0 ? Math.round(m.net / m.count) : null;
  }
}

export async function orderMoneyStat(
  q: StatQuery,
  widget: OrderMoneyWidget,
): Promise<StatPart> {
  const [money, buckets] = await Promise.all([
    windowMoney(q.db, q.ctx, q.win),
    q.series
      ? queryOrderMoneyTotals(q.db, {
          businessId: q.ctx.businessId,
          window: q.win,
          granularity: q.granularity,
          timeZone: q.ctx.timeZone,
        })
      : Promise.resolve(null),
  ]);

  const detail: string[] = [];
  if (widget === "gross-revenue" && money.refunded > 0) {
    detail.push(`− ${usd(money.refunded)} refunded`);
  } else if (widget === "net-revenue" && money.refunded > 0) {
    detail.push(`after ${usd(money.refunded)} refunded`);
  } else if (widget === "refunds") {
    const refundedOrders = money.refundedOrders;
    if (refundedOrders > 0) {
      detail.push(
        `${refundedOrders} ${refundedOrders === 1 ? "order" : "orders"} refunded`,
      );
    }
  } else if (widget === "avg-order-value" && money.count > 0) {
    detail.push(`${money.count} ${money.count === 1 ? "order" : "orders"}`);
  }

  const part: StatPart = { value: pickMoney(money, widget), detail };
  if (buckets) {
    // Averages leave empty buckets null (no orders ≠ a $0 average); sums and
    // counts zero-fill.
    const isAverage = widget === "avg-order-value";
    part.series = windowSeriesPoints(
      pickTotals(buckets, (b) =>
        isAverage ? pickMoney(b, widget) : (pickMoney(b, widget) ?? 0),
      ),
      q.win,
      q.granularity,
      q.ctx.timeZone,
      isAverage ? null : 0,
    );
  }
  return part;
}

// ── Revenue chart ───────────────────────────────────────────────────────────

export async function revenueChart(
  db: TxClient,
  ctx: DashboardMetricsContext,
  win: MetricWindow,
  previous: MetricWindow | null,
  granularity: DashboardRangeGranularity,
  comparisonLabel: string | null,
): Promise<RevenueChartCardData> {
  const [totals, bucketTotals, previousTotals] = await Promise.all([
    windowMoney(db, ctx, win),
    queryOrderMoneyTotals(db, {
      businessId: ctx.businessId,
      window: win,
      granularity,
      timeZone: ctx.timeZone,
    }),
    previous ? windowMoney(db, ctx, previous) : null,
  ]);

  // Zero-fill each series on the same axis (`windowSeriesPoints` keys every
  // bucket from the window, so the three line up index for index).
  const axis = (pick: (m: OrderMoneyTotals) => number) =>
    windowSeriesPoints(
      pickTotals(bucketTotals, pick),
      win,
      granularity,
      ctx.timeZone,
    );
  const gross = axis((m) => m.gross);
  const refunded = axis((m) => m.refunded);
  const net = axis((m) => m.net);

  return {
    kind: "revenueChart",
    granularity,
    buckets: gross.map((point, i) => ({
      key: point.key,
      label: point.label,
      gross: point.value ?? 0,
      refunded: refunded[i]?.value ?? 0,
      net: net[i]?.value ?? 0,
    })),
    totals: {
      gross: totals.gross,
      refunded: totals.refunded,
      net: totals.net,
    },
    previousNet: previousTotals ? previousTotals.net : null,
    comparisonLabel: previousTotals ? comparisonLabel : null,
  };
}

// ── Order status counts ─────────────────────────────────────────────────────

export type OrderStatusWidget =
  | "orders-to-fulfill"
  | "orders-awaiting-payment"
  | "orders-fulfilled"
  | "orders-cancelled";

function createdAtFilter(win: MetricWindow): Prisma.OrderWhereInput {
  return {
    createdAt: {
      ...(win.start ? { gte: win.start } : {}),
      lt: win.endExclusive,
    },
  };
}

export async function orderStatusStat(
  q: StatQuery,
  widget: OrderStatusWidget,
): Promise<StatPart> {
  const { db, ctx, win } = q;
  const businessId = ctx.businessId;

  switch (widget) {
    case "orders-to-fulfill":
      // Must match the needs-attention strip and its link filter
      // (/admin/orders?status=open&fulfillment=unfulfilled&paymentStatus=paid).
      return {
        value: await db.order.count({
          where: {
            businessId,
            status: "open",
            paymentStatus: "paid",
            fulfillmentStatus: "unfulfilled",
          },
        }),
        detail: [],
      };
    case "orders-awaiting-payment":
      return {
        value: await db.order.count({
          where: {
            businessId,
            paymentStatus: "pending",
            status: { notIn: ["cancelled", "refunded"] },
          },
        }),
        detail: [],
      };
    case "orders-fulfilled":
    case "orders-cancelled": {
      const fulfilled = widget === "orders-fulfilled";
      const value = await db.order.count({
        where: {
          businessId,
          ...createdAtFilter(win),
          ...(fulfilled
            ? { fulfillmentStatus: "fulfilled", status: { not: "cancelled" } }
            : { status: "cancelled" }),
        },
      });
      const part: StatPart = {
        value,
        detail: [],
        note: "Of orders placed in this period",
      };
      if (q.series) {
        const totals = await queryBucketTotals(db, {
          table: "Order",
          timeColumn: "createdAt",
          businessId,
          window: win,
          granularity: q.granularity,
          timeZone: ctx.timeZone,
          whereSql: fulfilled
            ? Prisma.sql`"fulfillmentStatus" = 'fulfilled' AND "status" <> 'cancelled'`
            : Prisma.sql`"status" = 'cancelled'`,
        });
        part.series = windowSeriesPoints(
          pickTotals(totals, (b) => b.count),
          win,
          q.granularity,
          ctx.timeZone,
        );
      }
      return part;
    }
  }
}

// ── Recent orders ───────────────────────────────────────────────────────────

export async function recentOrders(
  db: TxClient,
  businessId: string,
  take: number,
): Promise<RecentOrdersCardData> {
  const orders = await db.order.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      total: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      items: {
        where: { customization: { not: Prisma.DbNull } },
        select: { customization: true },
      },
    },
  });
  return {
    kind: "recentOrders",
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName ?? "",
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      optionsHint: orderOptionsHint(
        order.items.map((item) => item.customization),
      ),
    })),
  };
}

// ── Top products ────────────────────────────────────────────────────────────

export async function topProducts(
  db: TxClient,
  businessId: string,
  win: MetricWindow,
  take: number,
): Promise<TopProductsCardData> {
  const grouped = await db.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: financeOrderScope(businessId, win),
      productId: { not: null },
    },
    _sum: { total: true, quantity: true },
    orderBy: { _sum: { total: "desc" } },
    take,
  });

  const productIds = grouped
    .map((row) => row.productId)
    .filter((id): id is string => id !== null);
  const products =
    productIds.length > 0
      ? await db.product.findMany({
          where: { id: { in: productIds }, businessId },
          select: {
            id: true,
            name: true,
            images: {
              where: PHOTO_ONLY_WHERE,
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        })
      : [];

  return {
    kind: "topProducts",
    products: grouped.map((row) => {
      const product = products.find((p) => p.id === row.productId);
      return {
        productId: row.productId,
        productName: product?.name ?? "Unknown Product",
        imageUrl: product?.images[0]?.url ?? null,
        // OrderItem.total is a Float of cents: round so the sum has no drift.
        revenue: Math.round(row._sum.total ?? 0),
        unitsSold: row._sum.quantity ?? 0,
      };
    }),
  };
}
