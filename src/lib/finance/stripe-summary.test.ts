import { describe, expect, it } from "vitest";

import type { BalanceTxnRow } from "./stripe-summary";

import { summarizeBalanceTransactions } from "./stripe-summary";

/** Build a BalanceTxnRow; `net` defaults to `amount - fee`, as Stripe reports. */
function txn(
  type: BalanceTxnRow["type"],
  amount: number,
  fee = 0,
  net = amount - fee,
): BalanceTxnRow {
  return { type, amount, fee, net };
}

describe("summarizeBalanceTransactions", () => {
  it("returns all zeros for no transactions", () => {
    expect(summarizeBalanceTransactions([])).toEqual({
      grossChargesCents: 0,
      processingFeesCents: 0,
      refundsCents: 0,
      disputeAdjustmentsCents: 0,
      netFromSalesCents: 0,
    });
  });

  it("sums charges and legacy payments as gross, with their fees", () => {
    const summary = summarizeBalanceTransactions([
      txn("charge", 10000, 320),
      txn("payment", 5000, 175),
    ]);
    expect(summary.grossChargesCents).toBe(15000);
    expect(summary.processingFeesCents).toBe(495);
    expect(summary.netFromSalesCents).toBe(14505);
  });

  it("reports refunds as a positive magnitude and subtracts them from net", () => {
    const summary = summarizeBalanceTransactions([
      txn("charge", 10000, 320),
      txn("refund", -4000),
      txn("payment_refund", -1000),
    ]);
    expect(summary.refundsCents).toBe(5000);
    expect(summary.netFromSalesCents).toBe(10000 - 320 - 5000);
  });

  it("keeps dispute adjustments signed (lost negative, won positive)", () => {
    const summary = summarizeBalanceTransactions([
      txn("charge", 10000, 320),
      txn("adjustment", -10000, 1500),
      txn("adjustment", 10000, 0),
    ]);
    expect(summary.disputeAdjustmentsCents).toBe(0);
    expect(summary.processingFeesCents).toBe(1820);
    expect(summary.netFromSalesCents).toBe(10000 - 320 - 11500 + 10000);
  });

  it("leaves payout-family transactions out of net", () => {
    const summary = summarizeBalanceTransactions([
      txn("charge", 10000, 320),
      txn("payout", -9680),
      txn("payout_failure", 2000),
      txn("payout_cancel", 1000),
      txn("payout_minimum_balance_hold", -500),
      txn("payout_minimum_balance_release", 500),
    ]);
    expect(summary.netFromSalesCents).toBe(9680);
    expect(summary.grossChargesCents).toBe(10000);
    expect(summary.refundsCents).toBe(0);
  });

  it("still counts a payout's own fee (e.g. instant payout) as a Stripe fee", () => {
    const summary = summarizeBalanceTransactions([
      txn("charge", 10000, 320),
      txn("payout", -9680, 145, -9825),
    ]);
    expect(summary.processingFeesCents).toBe(465);
    // …but not in net, which is why fees don't reconcile in that case.
    expect(summary.netFromSalesCents).toBe(9680);
  });

  it("counts other non-payout types (e.g. stripe_fee) toward net and fees", () => {
    const summary = summarizeBalanceTransactions([
      txn("charge", 10000, 320),
      txn("stripe_fee", -200, 0),
    ]);
    expect(summary.grossChargesCents).toBe(10000);
    expect(summary.netFromSalesCents).toBe(10000 - 320 - 200);
  });
});
