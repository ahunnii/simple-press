import { Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type OrderCancelledEmailProps = {
  orderNumber: number;
  customerName: string;
  reason?: string | null;
  businessName: string;
  businessLogoUrl?: string;
  businessUrl: string;
  /** Optional owner-customized intro paragraph, shown under the heading. */
  introText?: string;
};

export default function OrderCancelledEmail({
  orderNumber,
  customerName,
  introText,
  reason,
  businessName,
  businessLogoUrl,
  businessUrl,
}: OrderCancelledEmailProps) {
  return (
    <EmailLayout
      previewText={`Your order #${orderNumber} has been cancelled`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your order has been cancelled</Text>

      {introText && (
        <Text style={{ ...paragraph, whiteSpace: "pre-line" }}>
          {introText}
        </Text>
      )}

      <Text style={paragraph}>Hi {customerName},</Text>

      <Text style={paragraph}>
        Your order #{orderNumber} from {businessName} has been cancelled.
      </Text>

      {reason ? (
        <Section style={reasonBox}>
          <Text style={reasonLabel}>Note from the store</Text>
          <Text style={reasonText}>{reason}</Text>
        </Section>
      ) : null}

      <Text style={paragraph}>
        If you were charged for this order, any refund will appear on your
        original payment method within 5–10 business days. If you have
        questions, reply to this email or visit{" "}
        <a href={businessUrl} style={link}>
          {businessName}
        </a>
        .
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
