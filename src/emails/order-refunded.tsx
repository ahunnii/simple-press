import { Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type OrderRefundedEmailProps = {
  orderNumber: number;
  customerName: string;
  refundAmountCents: number;
  orderTotalCents: number;
  isFullRefund: boolean;
  reason?: string | null;
  businessName: string;
  businessLogoUrl?: string;
  businessUrl: string;
};

export default function OrderRefundedEmail({
  orderNumber,
  customerName,
  refundAmountCents,
  orderTotalCents,
  isFullRefund,
  reason,
  businessName,
  businessLogoUrl,
  businessUrl,
}: OrderRefundedEmailProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <EmailLayout
      previewText={`Refund for order #${orderNumber}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>
        {isFullRefund ? "Your order was refunded" : "Partial refund processed"}
      </Text>

      <Text style={paragraph}>Hi {customerName},</Text>

      <Text style={paragraph}>
        {isFullRefund ? (
          <>
            We&apos;ve processed a full refund for order #{orderNumber}. The
            amount of <strong>{formatPrice(refundAmountCents)}</strong> will
            appear on your original payment method. Timing depends on your bank
            or card issuer, usually within 5–10 business days.
          </>
        ) : (
          <>
            We&apos;ve processed a partial refund of{" "}
            <strong>{formatPrice(refundAmountCents)}</strong> for order #
            {orderNumber} (order total was {formatPrice(orderTotalCents)}). The
            refund will appear on your original payment method; timing depends on
            your bank or card issuer.
          </>
        )}
      </Text>

      {reason ? (
        <Section style={reasonBox}>
          <Text style={reasonLabel}>Note from the store</Text>
          <Text style={reasonText}>{reason}</Text>
        </Section>
      ) : null}

      <Text style={paragraph}>
        If you have questions, reply to this email or visit{" "}
        <a href={businessUrl} style={link}>
          {businessName}
        </a>
        .
      </Text>

      <Text style={note}>
        This email confirms the refund initiated by the store. You may also
        receive a receipt from your payment provider.
      </Text>
    </EmailLayout>
  );
}

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

const reasonBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const reasonLabel = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  margin: "0 0 8px 0",
};

const reasonText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#374151",
  margin: "0",
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

const note = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  textAlign: "center" as const,
};
