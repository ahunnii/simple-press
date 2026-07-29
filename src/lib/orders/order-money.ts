/**
 * Order money math — pure, no I/O, no Prisma imports.
 *
 * Splits a stored Order row into the three buckets an owner actually cares
 * about (product sales / shipping / tax), applies refund proration, and
 * aggregates many rows into a single breakdown for the admin Finances page.
 *
 * Everything here is integer cents. No floats are ever introduced.
 */

export type OrderMoneyRow = {
  /** cents — Stripe `amount_total`: subtotal - discounts + tax + shipping */
  total: number;
  /** cents */
  tax: number;
  /** cents */
  shipping: number;
  /** cents */
  discount: number;
  /** cents — CUMULATIVE refunded amount (partial or full), null if never refunded */
  refundAmountCents: number | null;
  /** "card" | "cash" | "check" | "manual" */
  paymentMethod: string;
};

export type OrderMoneySplit = {
  productSalesCents: number;
  shippingCents: number;
  taxCents: number;
  totalChargedCents: number;
  refundedCents: number;
  netCollectedCents: number;
};

export type OrdersBreakdown = {
  productSalesCents: number;
  shippingCents: number;
  taxCents: number;
  discountCents: number;
  totalChargedCents: number;
  refundedCents: number;
  netCollectedCents: number;
  orderCount: number;
  viaStripeCents: number;
  viaManualCents: number;
  manualOrderCount: number;
};

export const EMPTY_ORDERS_BREAKDOWN: OrdersBreakdown = Object.freeze({
  productSalesCents: 0,
  shippingCents: 0,
  taxCents: 0,
  discountCents: 0,
  totalChargedCents: 0,
  refundedCents: 0,
  netCollectedCents: 0,
  orderCount: 0,
  viaStripeCents: 0,
  viaManualCents: 0,
  manualOrderCount: 0,
});

/** Orders paid through Stripe. Everything else (cash/check/manual) is off-platform. */
const STRIPE_PAYMENT_METHOD = "card";

/**
 * Split one order's money into product sales / shipping / tax, net of refunds.
 *
 * Product sales are derived as `total - tax - shipping` rather than
 * `subtotal - discount`, because `subtotal` means two different things
 * depending on which path created the order:
 *   - Stripe checkout (`src/lib/checkout/create-order.ts`) stores Stripe's
 *     PRE-discount `amount_subtotal`.
 *   - Manual admin orders (`src/server/api/routers/order.ts`) store whatever
 *     subtotal the caller passed, and never write `discount` at all.
 * `total`, `tax` and `shipping` are written consistently on both paths, so
 * subtracting the two known components off the total is exact everywhere.
 */
export function splitOrderMoney(o: OrderMoneyRow): OrderMoneySplit {
  const total = o.total;

  // Degenerate/corrupt row (no money changed hands). Guard the divide below and
  // return an all-zero split so the sum identity still holds exactly.
  if (total <= 0) {
    return {
      productSalesCents: 0,
      shippingCents: 0,
      taxCents: 0,
      totalChargedCents: total,
      refundedCents: 0,
      netCollectedCents: 0,
    };
  }

  const tax = o.tax;
  const shipping = o.shipping;
  const refund = Math.max(0, o.refundAmountCents ?? 0);

  // No refund — components are the gross values and sum to exactly `total`.
  if (refund <= 0) {
    return {
      productSalesCents: total - tax - shipping,
      shippingCents: shipping,
      taxCents: tax,
      totalChargedCents: total,
      refundedCents: 0,
      netCollectedCents: total,
    };
  }

  // Fully refunded (or over-refunded) — nothing was kept.
  if (refund >= total) {
    return {
      productSalesCents: 0,
      shippingCents: 0,
      taxCents: 0,
      totalChargedCents: total,
      refundedCents: total,
      netCollectedCents: 0,
    };
  }

  // Partial refund. `refundAmountCents` is a single cumulative number with no
  // tax/shipping breakdown, so we prorate each component by refund/total.
  //
  // Rounding note: rounding all three components independently can drift the
  // sum by 1-2 cents against `netCollected`. To keep
  //   productSales + shipping + tax === netCollected
  // exact for every row (and therefore for every aggregate), only tax and
  // shipping are rounded; product sales is derived as the remainder.
  const refundRatio = refund / total;
  const netCollected = total - refund;
  const taxKept = tax - Math.round(tax * refundRatio);
  const shippingKept = shipping - Math.round(shipping * refundRatio);

  return {
    productSalesCents: netCollected - taxKept - shippingKept,
    shippingCents: shippingKept,
    taxCents: taxKept,
    totalChargedCents: total,
    refundedCents: refund,
    netCollectedCents: netCollected,
  };
}

/**
 * Aggregate many orders into one breakdown.
 *
 * The per-row invariant carries: for the returned object,
 * `productSalesCents + shippingCents + taxCents === netCollectedCents`.
 *
 * `discountCents` is a plain informational sum of stored discounts — it is NOT
 * prorated against refunds and is not part of the sum identity above.
 */
export function summarizeOrderMoney(rows: OrderMoneyRow[]): OrdersBreakdown {
  const acc: OrdersBreakdown = { ...EMPTY_ORDERS_BREAKDOWN };

  for (const row of rows) {
    const split = splitOrderMoney(row);

    acc.productSalesCents += split.productSalesCents;
    acc.shippingCents += split.shippingCents;
    acc.taxCents += split.taxCents;
    acc.totalChargedCents += split.totalChargedCents;
    acc.refundedCents += split.refundedCents;
    acc.netCollectedCents += split.netCollectedCents;
    acc.discountCents += row.discount;
    acc.orderCount += 1;

    if (row.paymentMethod === STRIPE_PAYMENT_METHOD) {
      acc.viaStripeCents += row.total;
    } else {
      acc.viaManualCents += row.total;
      acc.manualOrderCount += 1;
    }
  }

  return acc;
}
