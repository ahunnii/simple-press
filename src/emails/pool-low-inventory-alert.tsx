import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type PoolLowInventoryAlertEmailProps = {
  poolName: string;
  currentQty: number;
  threshold: number;
  adminUrl: string;
  businessName: string;
  businessLogoUrl?: string;
};

export default function PoolLowInventoryAlertEmail({
  poolName,
  currentQty,
  threshold,
  adminUrl,
  businessName,
  businessLogoUrl,
}: PoolLowInventoryAlertEmailProps) {
  return (
    <EmailLayout
      previewText={`Low base unit stock: ${poolName} has ${currentQty} left`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Base unit running low</Text>
      <Text style={paragraph}>
        Your base unit <strong>{poolName}</strong> is running low. You have{" "}
        <strong>{currentQty}</strong> unit{currentQty !== 1 ? "s" : ""} remaining
        (threshold: {threshold}). Products that draw from this pool may soon
        become unavailable for purchase.
      </Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Base Unit</Text>
        <Text style={infoValue}>{poolName}</Text>
        <Text style={infoLabel}>Current stock</Text>
        <Text style={infoValue}>{currentQty} unit{currentQty !== 1 ? "s" : ""}</Text>
        <Text style={infoLabel}>Alert threshold</Text>
        <Text style={infoValue}>{threshold} unit{threshold !== 1 ? "s" : ""}</Text>
      </Section>

      <Section style={buttonSection}>
        <Button href={adminUrl} style={button}>
          Manage inventory
        </Button>
      </Section>

      <Text style={note}>
        This alert fires once per low-stock cycle and resets when you restock
        above the threshold.
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
  backgroundColor: "#fef9c3",
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
  backgroundColor: "#f59e0b",
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
