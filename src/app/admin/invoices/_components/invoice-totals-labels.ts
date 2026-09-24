import type { InvoiceDiscountType } from "~/lib/validators/invoice";

/**
 * Shared, client-safe formatting for the discount/tax rows on an invoice's
 * totals — used by the detail page's `buildInvoiceDocumentProps` (a SENT
 * invoice's real numbers) and the builder's live preview (a draft's numbers),
 * so "Discount (10%)" / "Tax (6.25%)" is spelled identically whether the
 * owner is still typing or the customer already has the PDF.
 */

/** `250` bps → `"2.5%"`; `625` → `"6.25%"`. Trims a trailing `.00`. */
export function formatBpsLabel(bps: number): string {
  const value = bps / 100;
  const rounded = Math.round(value * 100) / 100;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)}%`;
}

export type InvoiceTotalsLabelsInput = {
  discountType: InvoiceDiscountType | null | undefined;
  /** Cents (`flat`) or basis points (`percent`). */
  discountValue: number;
  taxRateBps: number;
};

export type InvoiceTotalsLabels = {
  /** e.g. "Discount (10%)" for a percent discount, else the plain "Discount". */
  discountLabel: string;
  /** e.g. "6.25%" — `undefined` when there is no tax to label. */
  taxRateLabel: string | undefined;
};

/** The discount/tax row labels for one invoice's totals. */
export function invoiceTotalsLabels({
  discountType,
  discountValue,
  taxRateBps,
}: InvoiceTotalsLabelsInput): InvoiceTotalsLabels {
  const discountLabel =
    discountType === "percent"
      ? `Discount (${formatBpsLabel(discountValue)})`
      : "Discount";
  const taxRateLabel = taxRateBps > 0 ? formatBpsLabel(taxRateBps) : undefined;
  return { discountLabel, taxRateLabel };
}
