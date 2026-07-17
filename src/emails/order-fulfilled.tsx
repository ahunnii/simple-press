import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type OrderFulfilledEmailProps = {
  orderNumber: number;
  customerName: string;
  businessName: string;
  businessLogoUrl?: string;
  businessUrl: string;
  /** Optional owner-customized intro paragraph, shown under the heading. */
  introText?: string;
};

export default function OrderFulfilledEmail({
  orderNumber,
  customerName,
  introText,
  businessName,
  businessLogoUrl,
  businessUrl,
}: OrderFulfilledEmailProps) {
  return (
    <EmailLayout
      previewText={`Order #${orderNumber} has been marked as fulfilled`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your order is on the way</Text>

      {introText && (
        <Text style={{ ...paragraph, whiteSpace: "pre-line" }}>
          {introText}
        </Text>
      )}

      <Text style={paragraph}>Hi {customerName},</Text>

      <Text style={paragraph}>
        {businessName} has marked your order #{orderNumber} as fulfilled.
      </Text>

      <Section style={buttonSection}>
        <Button href={businessUrl} style={button}>
          Visit store
        </Button>
      </Section>

      <Text style={note}>
        If you have questions about your order, reply to this email and the
        store will get back to you.
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
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  textAlign: "center" as const,
};
