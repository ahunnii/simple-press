import type { InvoiceDocumentProps } from "~/components/invoices/invoice-document";
import type { RouterOutputs } from "~/trpc/react";

import { invoiceTotalsLabels } from "../../_components/invoice-totals-labels";
import { formatYmdLabel, invoiceStatusDisplay } from "./format";
import {
  PaymentInstructionsList,
  PaymentInstructionsPendingNotice,
} from "./payment-instructions-list";

type Invoice = RouterOutputs["invoice"]["getById"];
type Business = RouterOutputs["business"]["simplifiedGet"];

/**
 * Builds `InvoiceDocument`'s props from `invoice.getById` + `business.
 * simplifiedGet`, shared by the admin preview (`[id]/page.tsx`) and the print
 * page (`[id]/print/page.tsx`) so the two can never drift apart on how a
 * total, a date or the issuer block is rendered.
 */
export function buildInvoiceDocumentProps(
  invoice: Invoice,
  business: Business,
): InvoiceDocumentProps {
  const { label: statusLabel, tone: statusTone } = invoiceStatusDisplay(
    invoice.status,
    invoice.isOverdue,
  );

  const billToAddressLines = invoice.billingAddress
    ? [
        invoice.billingAddress.line1,
        invoice.billingAddress.line2,
        `${invoice.billingAddress.city}, ${invoice.billingAddress.state} ${invoice.billingAddress.zip}`,
      ].filter((line): line is string => Boolean(line?.trim()))
    : [];

  const isDraft = invoice.status === "DRAFT";

  // Sent+ invoices show the issuer as it looked the moment they were sent
  // (frozen in `issuerSnapshot`), so a later rebrand never rewrites a bill a
  // customer already has. A draft has no snapshot yet, so it previews with
  // the business's CURRENT public details instead.
  const issuer = invoice.issuerSnapshot
    ? {
        businessName: invoice.issuerSnapshot.name,
        logoUrl: invoice.issuerSnapshot.logoUrl,
        addressLines: invoice.issuerSnapshot.addressLines,
        email: invoice.issuerSnapshot.email,
        phone: invoice.issuerSnapshot.phone,
      }
    : {
        businessName: business?.name ?? "Draft preview",
        logoUrl: business?.siteContent?.logoUrl,
        addressLines: business?.businessAddress
          ? business.businessAddress.split("\n").filter(Boolean)
          : [],
        email: business?.supportEmail,
        phone: business?.phoneNumber,
      };

  const { discountLabel, taxRateLabel } = invoiceTotalsLabels({
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    taxRateBps: invoice.taxRateBps,
  });

  return {
    invoiceNumber: invoice.displayNumber,
    status: { label: statusLabel, tone: statusTone },
    issueDateLabel: formatYmdLabel(invoice.issueDateYmd),
    dueDateLabel: formatYmdLabel(invoice.dueDateYmd),
    issuer,
    billTo: {
      name: invoice.customerName,
      email: invoice.customerEmail,
      phone: invoice.customerPhone,
      addressLines: billToAddressLines,
    },
    lineItems: invoice.lineItems,
    totals: {
      subtotalCents: invoice.subtotalCents,
      discountCents: invoice.discountCents,
      discountLabel,
      taxCents: invoice.taxCents,
      taxRateLabel,
      totalCents: invoice.totalCents,
      amountPaidCents: invoice.amountPaidCents,
      balanceDueCents: invoice.balanceCents,
    },
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
    accentColor: invoice.issuerSnapshot?.accentColor ?? undefined,
    paymentSlot: isDraft ? (
      <PaymentInstructionsPendingNotice />
    ) : (
      <PaymentInstructionsList instructions={invoice.paymentInstructions} />
    ),
  };
}
