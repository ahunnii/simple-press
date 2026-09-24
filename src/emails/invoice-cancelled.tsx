import { Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type InvoiceCancelledEmailProps = {
  customerName: string;
  businessName: string;
  businessLogoUrl?: string;
  invoiceNumber: string;
  /** Optional owner-written explanation. Plain text; blank lines = paragraphs. */
  reason?: string;
  /**
   * Total already paid toward this invoice, in cents, before it was
   * cancelled. `0` (or absent) means nothing was paid — the common case —
   * and the email simply says no payment is needed.
   */
  amountPaidCents?: number;
};

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export default function InvoiceCancelledEmail({
  customerName,
  businessName,
  businessLogoUrl,
  invoiceNumber,
  reason,
  amountPaidCents,
}: InvoiceCancelledEmailProps) {
  const hasPayment = (amountPaidCents ?? 0) > 0;

  return (
    <EmailLayout
      previewText={`Invoice ${invoiceNumber} from ${businessName} has been cancelled`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Invoice cancelled</Text>
      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        Invoice {invoiceNumber} from {businessName} has been cancelled.
      </Text>

      {reason
        ?.split(/\n{2,}/)
        .map((block) => block.trim())
        .filter((block) => block !== "")
        .map((block, index) => (
          <Text key={index} style={{ ...paragraph, whiteSpace: "pre-line" }}>
            {block}
          </Text>
        ))}

      <Text style={paragraph}>
        {hasPayment
          ? `Please contact us about your payment of ${formatPrice(amountPaidCents ?? 0)} on this invoice.`
          : "No payment is needed."}
      </Text>
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
