import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type OrderReadyForPickupEmailProps = {
  orderNumber: number;
  customerName?: string;
  businessName: string;
  businessLogoUrl?: string;
  businessUrl: string;
  pickupLocation?: string;
  pickupInstructions?: string;
  /** Optional owner-customized intro paragraph, shown under the heading. */
  introText?: string;
};

export default function OrderReadyForPickupEmail({
  orderNumber,
  customerName,
  introText,
  businessName,
  businessLogoUrl,
  businessUrl,
  pickupLocation,
  pickupInstructions,
}: OrderReadyForPickupEmailProps) {
  return (
    <EmailLayout
      previewText={`Order #${orderNumber} is ready for pickup`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your order is ready for pickup</Text>

      {introText && (
        <Text style={{ ...paragraph, whiteSpace: "pre-line" }}>
          {introText}
        </Text>
      )}

      {customerName && <Text style={paragraph}>Hi {customerName},</Text>}

      <Text style={paragraph}>
        Great news — your order #{orderNumber} from {businessName} is ready and
        waiting for you.
      </Text>

      {pickupLocation && (
        <Section style={detailsSection}>
          <Text style={detailsLabel}>Pickup location</Text>
          <Text style={detailsValue}>{pickupLocation}</Text>
        </Section>
      )}

      {pickupInstructions && (
        <Section style={detailsSection}>
          <Text style={detailsLabel}>Instructions</Text>
          <Text style={{ ...detailsValue, whiteSpace: "pre-line" }}>
            {pickupInstructions}
          </Text>
        </Section>
      )}

      <Section style={buttonSection}>
        <Button href={businessUrl} style={button}>
          Visit Store
        </Button>
      </Section>

      <Text style={note}>
        If you have any questions about your order, please reply to this email
        and we&apos;ll be happy to help.
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

const detailsSection = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
};

const detailsLabel = {
  fontSize: "12px",
  fontWeight: "600" as const,
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px 0",
};

const detailsValue = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#1f2937",
  margin: "0",
};

const buttonSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
  marginTop: "8px",
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
