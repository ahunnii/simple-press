"use client";

import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";

import type { InvoiceBuilderValues } from "./types";
import { computeInvoiceTotals } from "~/lib/invoices/totals";
import { formatPrice } from "~/lib/prices";

/**
 * The invoice's live total — computed with the exact same
 * `computeInvoiceTotals` the router and the draft validator use, so what the
 * owner sees while building never disagrees with what gets saved.
 *
 * Deliberately total-only: the full subtotal/discount/tax/total breakdown now
 * lives in the live `InvoiceDocument` preview beside it (see
 * `invoice-preview.tsx`), which duplicating here would just repeat. This
 * panel's job is to stay visible somewhere the preview's own numbers can
 * scroll out of — pinned above the preview's scroll area on desktop, and in
 * the sticky bottom bar in Edit mode on mobile.
 *
 * Watches the form directly with `useWatch` rather than taking computed
 * values as props, so typing a line item, a discount or the tax rate
 * re-renders only this small panel — not the whole builder form.
 */
export function TotalsPanel({
  form,
}: {
  form: UseFormReturn<InvoiceBuilderValues>;
}) {
  const [lineItems, discountType, discountValue, taxRateBps] = useWatch({
    control: form.control,
    name: ["lineItems", "discountType", "discountValue", "taxRateBps"],
  });

  const totals = computeInvoiceTotals({
    lineItems: (lineItems ?? []).map((line) => ({
      quantity: Number(line?.quantity) || 0,
      unitPriceCents: Number(line?.unitPriceCents) || 0,
    })),
    discountType: discountType ?? null,
    discountValue: discountValue ?? 0,
    taxRateBps: taxRateBps ?? 0,
  });

  return (
    <div className="bg-card flex items-center justify-between rounded-lg border px-4 py-3 shadow-sm">
      <span className="text-sm font-medium">Total</span>
      <span className="text-base font-semibold tabular-nums">
        {formatPrice(totals.totalCents)}
      </span>
    </div>
  );
}
