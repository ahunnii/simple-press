import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type DisputeAlertEmailProps = {
  orderNumber: number;
  disputeAmountFormatted: string;
  reason: string;
  evidenceDueBy?: string;
  stripeDashboardUrl: string;
  businessName: string;
  businessLogoUrl?: string;
};

export default function DisputeAlertEmail({
  orderNumber,
  disputeAmountFormatted,
  reason,
  evidenceDueBy,
  stripeDashboardUrl,
  businessName,
  businessLogoUrl,
}: DisputeAlertEmailProps) {
  return (
    <EmailLayout
      previewText={`Payment dispute opened on order #${orderNumber}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Payment dispute opened</Text>
      <Text style={paragraph}>
        A customer has disputed the payment for{" "}
        <strong>order #{orderNumber}</strong>. The disputed funds are withheld
        until the dispute is resolved. You can respond with evidence in your
        Stripe Dashboard.
      </Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Order</Text>
        <Text style={infoValue}>#{orderNumber}</Text>
        <Text style={infoLabel}>Disputed amount</Text>
        <Text style={infoValue}>{disputeAmountFormatted}</Text>
        <Text style={infoLabel}>Reason</Text>
        <Text style={infoValue}>{reason}</Text>
        {evidenceDueBy ? (
          <>
            <Text style={infoLabel}>Respond by</Text>
            <Text style={infoValue}>{evidenceDueBy}</Text>
          </>
        ) : null}
      </Section>

      <Section style={buttonSection}>
        <Button href={stripeDashboardUrl} style={button}>
          Respond in Stripe
        </Button>
      </Section>

      <Text style={note}>
        Disputes have strict response deadlines — if you don&apos;t submit
        evidence in time, the dispute is lost automatically.
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
