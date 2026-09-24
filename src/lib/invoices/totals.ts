/**
 * Invoice money math — pure, dependency-free, client-safe.
 *
 * One function computes every derived amount on an invoice, and it is the
 * SAME function everywhere: the builder's live totals panel, the draft
 * validator's overflow guard (`invoiceDraftSchema`), and the router that
 * writes `subtotalCents`/`discountCents`/`taxCents`/`totalCents`. A second
 * implementation anywhere would eventually round a cent differently from this
 * one, and the customer would see a total the owner's screen never showed.
 *
 * All amounts are integer cents; rates are integer basis points (625 = 6.25%).
 * Rounding is half-up (`Math.round`) at exactly three points — each line, the
 * percent discount, and the tax — and nowhere else, so every stored amount is
 * a whole cent and `total = subtotal − discount + tax` holds exactly.
 */

/** 100% in basis points. */
export const BPS_DENOMINATOR = 10_000;

/** The subset of a line item the math reads. `InvoiceLineItem` satisfies it. */
export type InvoiceTotalsLineInput = {
  quantity: number;
  unitPriceCents: number;
};

export type InvoiceTotalsInput<L extends InvoiceTotalsLineInput> = {
  lineItems: readonly L[];
  /** `null`/`undefined` = no discount, regardless of `discountValue`. */
  discountType?: "flat" | "percent" | null;
  /** Cents when `flat`, basis points when `percent`. */
  discountValue?: number | null;
  taxRateBps?: number | null;
};

export type InvoiceTotals<L extends InvoiceTotalsLineInput> = {
  lines: (L & { amountCents: number })[];
  subtotalCents: number;
  discountCents: number;
  /** `subtotalCents − discountCents` — what the tax rate applies to. */
  taxableCents: number;
  taxCents: number;
  totalCents: number;
};

/**
 * `quantity × unitPriceCents`, rounded half-up to a whole cent.
 *
 * Quantities carry at most 3 decimals (the validator enforces it), so the
 * product is computed as `round(qty × 1000) × price / 1000` — an integer
 * numerator over 1000 — rather than as a raw float multiply. `1.005 × 100` in
 * floating point is `100.49999…`, which `Math.round` would take DOWN to 100;
 * `1005 × 100 / 1000` is exactly `100.5`, which rounds to 101 as a person
 * doing the sum by hand would expect.
 */
export function computeLineAmountCents(
  quantity: number,
  unitPriceCents: number,
): number {
  const milliQuantity = Math.round(quantity * 1000);
  return Math.round((milliQuantity * unitPriceCents) / 1000);
}

/**
 * Every derived amount on an invoice, from its lines, discount and tax rate.
 *
 * - A `flat` discount is capped at the subtotal (a $50 discount on a $30
 *   invoice discounts $30, not −$20).
 * - A `percent` discount is `subtotal × bps / 10000`, rounded, and capped the
 *   same way — the validator rejects > 10000 bps, but a stored row read back
 *   must never produce a negative total either.
 * - Tax applies AFTER the discount, to `taxableCents`.
 *
 * Negative inputs are clamped to 0 rather than trusted: the validator already
 * rejects them, so a negative here can only be corrupted data, and a negative
 * discount or tax silently inflating a bill is the worse failure.
 */
export function computeInvoiceTotals<L extends InvoiceTotalsLineInput>(
  input: InvoiceTotalsInput<L>,
): InvoiceTotals<L> {
  const lines = input.lineItems.map((line) => ({
    ...line,
    amountCents: computeLineAmountCents(line.quantity, line.unitPriceCents),
  }));

  const subtotalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);

  const discountValue = Math.max(0, input.discountValue ?? 0);
  let discountCents = 0;
  if (input.discountType === "flat") {
    discountCents = Math.round(discountValue);
  } else if (input.discountType === "percent") {
    discountCents = Math.round(
      (subtotalCents * discountValue) / BPS_DENOMINATOR,
    );
  }
  discountCents = Math.min(
    Math.max(0, discountCents),
    Math.max(0, subtotalCents),
  );

  const taxableCents = subtotalCents - discountCents;
  const taxRateBps = Math.max(0, input.taxRateBps ?? 0);
  const taxCents = Math.max(
    0,
    Math.round((taxableCents * taxRateBps) / BPS_DENOMINATOR),
  );

  return {
    lines,
    subtotalCents,
    discountCents,
    taxableCents,
    taxCents,
    totalCents: taxableCents + taxCents,
  };
}

/**
 * What is still owed. Never negative — an overpayment is rejected at record
 * time, but a stored total edited by hand (or a future refund path) must not
 * render as "−$5.00 due".
 */
export function balanceDueCents(invoice: {
  totalCents: number;
  amountPaidCents: number;
}): number {
  return Math.max(0, invoice.totalCents - invoice.amountPaidCents);
}
