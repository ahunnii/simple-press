/**
 * Stripe balance-transaction math — pure, no I/O, no Stripe client.
 *
 * Folds a connected account's balance transactions for a window into the
 * figures on the admin Finances page's "What Stripe took" card.
 *
 * Everything here is integer cents, as Stripe reports it.
 */

import type Stripe from "stripe";

/** The only fields the summary reads off a `Stripe.BalanceTransaction`. */
export type BalanceTxnRow = Pick<
  Stripe.BalanceTransaction,
  "type" | "amount" | "fee" | "net"
>;

export type BalanceTxnSummary = {
  grossChargesCents: number;
  processingFeesCents: number;
  /** POSITIVE magnitude — Stripe reports refunds as negative amounts. */
  refundsCents: number;
  /** Signed — negative when disputes went against the business. */
  disputeAdjustmentsCents: number;
  /**
   * Net of every NON-payout transaction: sales minus refunds, Stripe fees and
   * dispute adjustments. Payouts are left out so this is what the business
   * made, not how much its Stripe balance moved.
   */
  netFromSalesCents: number;
};

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

/**
 * Payout-family types: money moving from the Stripe balance to the bank (or
 * bouncing back), plus the minimum-balance holds Stripe places around payouts.
 * None of these are earnings, so they stay out of `netFromSalesCents`.
 */
const PAYOUT_TYPES: ReadonlySet<Stripe.BalanceTransaction.Type> = new Set([
  "payout",
  "payout_cancel",
  "payout_failure",
  "payout_minimum_balance_hold",
  "payout_minimum_balance_release",
]);

export function summarizeBalanceTransactions(
  txns: readonly BalanceTxnRow[],
): BalanceTxnSummary {
  let grossChargesCents = 0;
  let processingFeesCents = 0;
  let refundAmountSum = 0;
  let disputeAdjustmentsCents = 0;
  let netFromSalesCents = 0;

  for (const txn of txns) {
    // Fees are withheld on EVERY transaction type, not just charges — payout
    // fees (e.g. instant payouts) included, because Stripe did take them. They
    // are NOT in `netFromSalesCents`, so fees won't reconcile against net when
    // a payout carried a fee.
    processingFeesCents += txn.fee;
    if (PAYOUT_TYPES.has(txn.type)) continue;

    netFromSalesCents += txn.net;
    if (CHARGE_TYPES.has(txn.type)) {
      grossChargesCents += txn.amount;
    } else if (REFUND_TYPES.has(txn.type)) {
      // Negative in Stripe; accumulate signed, flip below.
      refundAmountSum += txn.amount;
    } else if (ADJUSTMENT_TYPES.has(txn.type)) {
      disputeAdjustmentsCents += txn.amount;
    }
  }

  return {
    grossChargesCents,
    processingFeesCents,
    // Returned as a positive magnitude so the UI can render "− $X".
    refundsCents: Math.abs(refundAmountSum),
    disputeAdjustmentsCents,
    netFromSalesCents,
  };
}
