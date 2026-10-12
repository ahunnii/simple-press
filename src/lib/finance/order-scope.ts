import { Prisma } from "generated/prisma";

/**
 * Payment statuses that count as "revenue" for the owner-facing money views
 * (Finances page, dashboard revenue cards): the customer paid, whether or not
 * the money was later refunded or disputed (refunds are subtracted separately
 * by `~/lib/orders/order-money`). Pending / failed orders never count.
 */
export const REVENUE_PAYMENT_STATUSES = [
  "paid",
  "refunded",
  "disputed",
] as const;

/** A half-open `[start, endExclusive)` window on `Order.createdAt`. */
export interface FinanceOrderWindow {
  /** `null` = no lower bound (all time). */
  start: Date | null;
  endExclusive: Date;
}

/**
 * The single definition of "an order that counts toward revenue":
 * paid / refunded / disputed, not cancelled, placed in the window.
 *
 * Shared by the Finances page and the dashboard so the two can never drift.
 * Money math on the returned rows lives in `~/lib/orders/order-money`
 * (`splitOrderMoney` / `summarizeOrderMoney`).
 */
export function financeOrderScope(
  businessId: string,
  window?: FinanceOrderWindow,
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {
    businessId,
    paymentStatus: { in: [...REVENUE_PAYMENT_STATUSES] },
    status: { not: "cancelled" },
  };
  if (window) {
    where.createdAt = {
      ...(window.start ? { gte: window.start } : {}),
      lt: window.endExclusive,
    };
  }
  return where;
}

/**
 * `financeOrderScope`'s status predicate as raw SQL on `"Order"`, for the
 * aggregate queries that can't go through Prisma's `where` (the dashboard's
 * SQL money sums). The business id and `createdAt` window are applied by the
 * caller. Keep in step with `financeOrderScope` above.
 */
export function financeOrderStatusSql(): Prisma.Sql {
  return Prisma.sql`"paymentStatus" IN (${Prisma.join([...REVENUE_PAYMENT_STATUSES])}) AND "status" <> 'cancelled'`;
}
