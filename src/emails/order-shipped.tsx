import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type OrderShippedEmailProps = {
  orderNumber: number;
  customerName: string;
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
  estimatedDelivery?: string;
  businessName: string;
  businessLogoUrl?: string;
};

export default function OrderShippedEmail({
  orderNumber,
  customerName,
  trackingNumber,
  trackingUrl,
  carrier,
  estimatedDelivery,
  businessName,
  businessLogoUrl,
}: OrderShippedEmailProps) {
  return (
    <EmailLayout
      previewText={`Order #${orderNumber} has shipped!`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your Order Has Shipped! 📦</Text>

      <Text style={paragraph}>Hi {customerName},</Text>

      <Text style={paragraph}>
        Great news! Your order #{orderNumber} is on its way.
      </Text>

      <Section style={trackingBox}>
        <Text style={trackingLabel}>Tracking Number</Text>
        <Text style={trackingNumberStyle}>{trackingNumber}</Text>
        <Text style={carrierText}>Shipped via {carrier}</Text>
        {estimatedDelivery && (
          <Text style={estimatedText}>
            Estimated delivery: {estimatedDelivery}
          </Text>
        )}
      </Section>

      <Section style={buttonSection}>
        <Button href={trackingUrl} style={button}>
          Track Your Package
        </Button>
      </Section>

      <Text style={note}>
        You can track your package using the button above. If you have any
        questions, please reply to this email.
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

const trackingBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "24px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const trackingLabel = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  margin: "0 0 8px 0",
};

const trackingNumberStyle = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  fontFamily: "monospace",
  margin: "0 0 12px 0",
};

const carrierText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 4px 0",
};

const estimatedText = {
  fontSize: "14px",
  color: "#10b981",
  fontWeight: "500",
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

const note = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  textAlign: "center" as const,
};
