import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type InvoicePaymentReceiptEmailProps = {
  customerName: string;
  businessName: string;
  businessLogoUrl?: string;
  invoiceNumber: string;
  amountPaidCents: number;
  /** Pre-formatted, e.g. "September 23, 2026". */
  paidOnLabel: string;
  /** Human-readable payment method label, e.g. "Bank transfer". */
  methodLabel: string;
  /** Remaining balance in cents. `0` means the invoice is now paid in full. */
  balanceCents: number;
  /** Signed URL to the hosted invoice page — no login required. */
  viewInvoiceUrl: string;
};

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export default function InvoicePaymentReceiptEmail({
  customerName,
  businessName,
  businessLogoUrl,
  invoiceNumber,
  amountPaidCents,
  paidOnLabel,
  methodLabel,
  balanceCents,
  viewInvoiceUrl,
}: InvoicePaymentReceiptEmailProps) {
  const isPaidInFull = balanceCents <= 0;

  return (
    <EmailLayout
      previewText={`Payment received for invoice ${invoiceNumber}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Payment received</Text>
      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        We received your payment of {formatPrice(amountPaidCents)} on{" "}
        {paidOnLabel} via {methodLabel} for invoice {invoiceNumber} from{" "}
        {businessName}.
      </Text>

      <Section style={amountBox}>
        <Text style={amountLabel}>
          {isPaidInFull ? "Status" : "Remaining balance"}
        </Text>
        <Text style={amountValue}>
          {isPaidInFull ? "Paid in full" : formatPrice(balanceCents)}
        </Text>
      </Section>

      <Section style={buttonSection}>
        <Button href={viewInvoiceUrl} style={button}>
          View invoice
        </Button>
      </Section>
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

const amountBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "20px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const amountLabel = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  fontWeight: "600",
  margin: "0 0 4px 0",
};

const amountValue = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0",
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
