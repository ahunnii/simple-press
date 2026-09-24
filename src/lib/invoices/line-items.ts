import { z } from "zod";

import type { InvoiceLineItem } from "~/lib/validators/invoice";

/**
 * (De)serialization for `Invoice.lineItems` — an encrypted JSON
 * `InvoiceLineItem[]`. Client-safe.
 *
 * **Reads never throw.** `parseLineItems` is total, like
 * `parseBillingAddressJson`: an unreadable blob returns `[]` and an unreadable
 * ENTRY is dropped, so one bad row can't take down the invoice list, the
 * hosted page or a cron run. The money is not at risk from that choice — the
 * totals are stored in their own plaintext columns and are what every screen
 * and email prints — and a draft can't be re-saved with zero lines (the draft
 * validator requires one), so an empty read never silently overwrites.
 *
 * The read schema is deliberately LOOSER than `invoiceLineItemSchema`: it
 * checks shape, not input limits. A line written under today's rules must
 * still read back if a limit (say, the description length) is tightened later.
 */

const storedLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().finite(),
  unitPriceCents: z.number().int(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  serviceItemId: z.string().optional(),
});

export function parseLineItems(
  json: string | null | undefined,
): InvoiceLineItem[] {
  if (!json) return [];

  let decoded: unknown;
  try {
    decoded = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(decoded)) return [];

  const items: InvoiceLineItem[] = [];
  for (const entry of decoded) {
    const result = storedLineItemSchema.safeParse(entry);
    if (result.success) items.push(result.data);
  }
  return items;
}

/**
 * Writes only the known keys, in a fixed order — so a caller passing the
 * `computeInvoiceTotals` output (which carries `amountCents`) or a form value
 * with extra UI state doesn't bloat the encrypted blob with derived data.
 */
export function serializeLineItems(items: readonly InvoiceLineItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      ...(item.productId ? { productId: item.productId } : {}),
      ...(item.variantId ? { variantId: item.variantId } : {}),
      ...(item.serviceItemId ? { serviceItemId: item.serviceItemId } : {}),
    })),
  );
}
