import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type BackorderAlertEmailProps = {
  productName: string;
  variantName?: string;
  adminProductUrl: string;
  businessName: string;
  businessLogoUrl?: string;
};

export default function BackorderAlertEmail({
  productName,
  variantName,
  adminProductUrl,
  businessName,
  businessLogoUrl,
}: BackorderAlertEmailProps) {
  const displayName = variantName
    ? `${productName} — ${variantName}`
    : productName;

  return (
    <EmailLayout
      previewText={`Out of stock (backorders on): ${displayName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Product out of stock — backorders on</Text>
      <Text style={paragraph}>
        <strong>{displayName}</strong> has reached zero stock. Backorders are
        enabled, so customers can still place orders — but consider restocking
        soon to avoid fulfillment delays.
      </Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Product</Text>
        <Text style={infoValue}>{displayName}</Text>
        <Text style={infoLabel}>Status</Text>
        <Text style={infoValue}>Out of stock — backorders accepted</Text>
      </Section>

      <Section style={buttonSection}>
        <Button href={adminProductUrl} style={button}>
          View product
        </Button>
      </Section>

      <Text style={note}>
        This notification fires once. You&apos;ll receive it again if the
        product is restocked and sells out again.
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
  marginBottom: "24px",
};

const infoBox = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const infoLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#92400e",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "8px 0 2px 0",
};

const infoValue = {
  fontSize: "15px",
  color: "#1f2937",
  margin: "0 0 8px 0",
};

const buttonSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#d97706",
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
