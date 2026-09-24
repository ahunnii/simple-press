import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";
import {
  InvoiceSummary,
  type InvoiceSummaryLineItem,
} from "./components/invoice-summary";

type InvoiceReminderEmailProps = {
  customerName: string;
  businessName: string;
  businessLogoUrl?: string;
  /** Whether the due date has already passed — changes the framing, never the facts. */
  isOverdue: boolean;
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

export default function InvoiceReminderEmail({
  customerName,
  businessName,
  businessLogoUrl,
  isOverdue,
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
}: InvoiceReminderEmailProps) {
  return (
    <EmailLayout
      previewText={
        isOverdue
          ? `Invoice ${invoiceNumber} from ${businessName} is past due`
          : `Reminder: invoice ${invoiceNumber} from ${businessName}`
      }
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>
        {isOverdue ? "Your invoice is past due" : "Friendly reminder"}
      </Text>
      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        {isOverdue
          ? `Invoice ${invoiceNumber} from ${businessName} was due on ${dueDateLabel} and hasn't been paid yet.`
          : `This is a reminder that invoice ${invoiceNumber} from ${businessName} is due on ${dueDateLabel}.`}
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
