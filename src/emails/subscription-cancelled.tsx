import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type SubscriptionCancelledEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  customerName: string;
  productName: string;
  variantName?: string | null;
  intervalLabel: string;
  cancelledAt: Date;
  manageUrl?: string;
};

export default function SubscriptionCancelledEmail({
  businessName,
  businessLogoUrl,
  customerName,
  productName,
  variantName,
  cancelledAt,
  manageUrl,
}: SubscriptionCancelledEmailProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <EmailLayout
      previewText={`Your ${productName} subscription has been cancelled`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your subscription has been cancelled</Text>

      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        Your subscription for {productName}
        {variantName && ` — ${variantName}`} has been cancelled as of{" "}
        {formatDate(cancelledAt)}. You will not be charged going forward.
      </Text>

      <Text style={paragraph}>
        Your most recent paid delivery will still ship — this cancellation only
        prevents future charges and shipments.
      </Text>

      {/* Info Box */}
      <Section style={infoBox}>
        <Text style={infoBoxText}>
          If you&apos;d like to resubscribe to {productName}, just visit our
          store and select the subscription option again. We&apos;d love to have
          you back!
        </Text>
      </Section>

      {/* CTA Button — the note below refers to "the link above", so it has to
          actually be here. Same signed manage link as every other
          subscription email; on a cancelled subscription it shows the final
          state and the past deliveries. */}
      {manageUrl && (
        <Section style={buttonSection}>
          <Button href={manageUrl} style={button}>
            View your subscription
          </Button>
        </Section>
      )}

      {/* Footer text */}
      <Text style={note}>
        {manageUrl
          ? "You can view your subscription history from the link above, or reach out if you have any questions."
          : "If you have any questions, please reply to this email and we'll help you."}
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

const infoBox = {
  backgroundColor: "#f0f9ff",
  borderLeft: "4px solid #0284c7",
  borderRadius: "4px",
  padding: "16px",
  marginBottom: "24px",
};

const infoBoxText = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#0c4a6e",
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
  margin: "0",
};
