import type { InvoiceDocumentIssuer } from "~/components/invoices/invoice-document";
import type { RouterOutputs } from "~/trpc/react";

type SimplifiedBusiness = RouterOutputs["business"]["simplifiedGet"];

export type InvoicePreviewIssuer = InvoiceDocumentIssuer & {
  /** Hex-ish accent, unvalidated — an invalid CSS color value is simply
   * ignored by the browser, so no `#RRGGBB` check is worth the code here. */
  accentColor?: string | null;
};

/**
 * The issuer block for the invoice BUILDER's live preview — always the
 * business's current public details, the same fallback
 * `buildInvoiceDocumentProps` uses for a draft with no `issuerSnapshot` yet
 * (a draft being built has no snapshot at all). Kept separate from that
 * function rather than shared: this also carries the brand accent color,
 * which the draft branch there deliberately omits (see its comment) — a
 * draft previewed on the detail page shows no accent, but the *builder's*
 * live preview should look like what sending it today would actually
 * produce.
 */
export function buildPreviewIssuer(
  business: SimplifiedBusiness,
): InvoicePreviewIssuer {
  return {
    businessName: business?.name ?? "Your business",
    logoUrl: business?.siteContent?.logoUrl ?? null,
    addressLines: business?.businessAddress
      ? business.businessAddress
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : [],
    email: business?.supportEmail ?? null,
    phone: business?.phoneNumber ?? null,
    accentColor: business?.siteContent?.primaryColor ?? null,
  };
}
