import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type PaymentsDisabledEmailProps = {
  businessName: string;
  stripeDashboardUrl: string;
  adminSettingsUrl?: string;
  businessLogoUrl?: string;
};

export default function PaymentsDisabledEmail({
  businessName,
  stripeDashboardUrl,
  adminSettingsUrl,
  businessLogoUrl,
}: PaymentsDisabledEmailProps) {
  return (
    <EmailLayout
      previewText={`Action required: ${businessName} can't accept payments right now`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your store can&apos;t accept payments</Text>
      <Text style={paragraph}>
        Stripe has disabled charges on the account connected to{" "}
        <strong>{businessName}</strong>. Until this is resolved, checkout is
        failing for your shoppers right now and no new orders can come through.
      </Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Store</Text>
        <Text style={infoValue}>{businessName}</Text>
        <Text style={infoLabel}>Status</Text>
        <Text style={infoValue}>Charges disabled — checkout is failing</Text>
        <Text style={infoLabel}>Common causes</Text>
        <Text style={infoValue}>
          Stripe usually disables charges when it needs identity or business
          verification, additional documents, or a response to a dispute review.
        </Text>
      </Section>

      <Section style={buttonSection}>
        <Button href={stripeDashboardUrl} style={button}>
          Resolve in Stripe
        </Button>
      </Section>

      {adminSettingsUrl ? (
        <Text style={note}>
          You can also review your connection status under{" "}
          <a href={adminSettingsUrl} style={link}>
            Settings → Integrations
          </a>{" "}
          in your store admin.
        </Text>
      ) : null}

      <Text style={note}>
        Your store starts accepting payments again automatically as soon as
        Stripe re-enables charges — nothing needs to change on your storefront.
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

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};
