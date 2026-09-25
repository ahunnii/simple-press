import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";
import {
  InvoiceSummary,
  type InvoiceSummaryLineItem,
} from "./components/invoice-summary";

type InvoiceSentEmailProps = {
  customerName: string;
  businessName: string;
  businessLogoUrl?: string;
  /** Optional owner-written message for this send. Plain text; blank lines = paragraphs. */
  message?: string;
  invoiceNumber: string;
  amountDueCents: number;
  dueDateLabel: string;
  lineItems: InvoiceSummaryLineItem[];
  subtotalCents?: number;
  discountCents?: number;
  taxCents?: number;
  totalCents?: number;
  amountPaidCents?: number;
  balanceCents?: number;
  paymentMethodLabels?: string[];
  /** Signed URL to the hosted invoice page — no login required. */
  viewInvoiceUrl: string;
};

export default function InvoiceSentEmail({
  customerName,
  businessName,
  businessLogoUrl,
  message,
  invoiceNumber,
  amountDueCents,
  dueDateLabel,
  lineItems,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  amountPaidCents,
  balanceCents,
  paymentMethodLabels,
  viewInvoiceUrl,
}: InvoiceSentEmailProps) {
  return (
    <EmailLayout
      previewText={`Invoice ${invoiceNumber} from ${businessName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>You have a new invoice</Text>
      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        {businessName} sent you invoice {invoiceNumber}.
      </Text>

      {message
        ?.split(/\n{2,}/)
        .map((block) => block.trim())
        .filter((block) => block !== "")
        .map((block, index) => (
          <Text key={index} style={{ ...paragraph, whiteSpace: "pre-line" }}>
            {block}
          </Text>
        ))}

      <InvoiceSummary
        invoiceNumber={invoiceNumber}
        amountDueCents={amountDueCents}
        dueDateLabel={dueDateLabel}
        lineItems={lineItems}
        subtotalCents={subtotalCents}
        discountCents={discountCents}
        taxCents={taxCents}
        totalCents={totalCents}
        amountPaidCents={amountPaidCents}
        balanceCents={balanceCents}
        paymentMethodLabels={paymentMethodLabels}
      />

      <Section style={buttonSection}>
        <Button href={viewInvoiceUrl} style={button}>
          View invoice
        </Button>
      </Section>

      <Text style={note}>Payment details are on the invoice page.</Text>
    </EmailLayout>
  );
}

// Styles
const heading = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1f2937",
  marginBottom: "16px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  marginBottom: "16px",
};

const buttonSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const note = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#9ca3af",
  textAlign: "center" as const,
};
