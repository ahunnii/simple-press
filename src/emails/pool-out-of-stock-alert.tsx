import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type PoolOutOfStockAlertEmailProps = {
  poolName: string;
  adminUrl: string;
  businessName: string;
  businessLogoUrl?: string;
};

export default function PoolOutOfStockAlertEmail({
  poolName,
  adminUrl,
  businessName,
  businessLogoUrl,
}: PoolOutOfStockAlertEmailProps) {
  return (
    <EmailLayout
      previewText={`Base unit out of stock: ${poolName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Base unit out of stock</Text>
      <Text style={paragraph}>
        Your base unit <strong>{poolName}</strong> has sold out. All products
        that draw from this pool are now unavailable for purchase until you
        restock.
      </Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Base Unit</Text>
        <Text style={infoValue}>{poolName}</Text>
        <Text style={infoLabel}>Status</Text>
        <Text style={infoValue}>Out of stock — affected products blocked</Text>
      </Section>

      <Section style={buttonSection}>
        <Button href={adminUrl} style={button}>
          Manage inventory
        </Button>
      </Section>

      <Text style={note}>
        This notification fires once. You&apos;ll receive it again if the pool
        is restocked and depleted again.
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
  backgroundColor: "#fee2e2",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const infoLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#991b1b",
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
  backgroundColor: "#ef4444",
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
