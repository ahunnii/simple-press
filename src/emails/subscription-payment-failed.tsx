import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type SubscriptionPaymentFailedEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  customerName: string;
  productName: string;
  intervalLabel: string;
  perDeliveryCents: number;
  manageUrl: string;
  attemptCount?: number;
};

export default function SubscriptionPaymentFailedEmail({
  businessName,
  businessLogoUrl,
  customerName,
  productName,
  intervalLabel,
  perDeliveryCents,
  manageUrl,
  attemptCount,
}: SubscriptionPaymentFailedEmailProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <EmailLayout
      previewText="Action needed: payment for your subscription"
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>We couldn&apos;t charge your card</Text>

      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        We tried to charge your card for your {productName} subscription (
        {formatPrice(perDeliveryCents)} {intervalLabel.toLowerCase()}) but the
        payment was declined.
      </Text>

      <Text style={paragraph}>
        We&apos;ll continue trying automatically over the next few days, but to
        make sure you don&apos;t miss a delivery, please update your payment
        method now.
      </Text>

      {/* Alert Box */}
      <Section style={alertBox}>
        <Text style={alertText}>
          {attemptCount && attemptCount > 1
            ? `This is attempt #${attemptCount}. Please update your card to avoid cancellation.`
            : "Update your payment method to keep your subscription active."}
        </Text>
      </Section>

      {/* CTA Button */}
      <Section style={buttonSection}>
        <Button href={manageUrl} style={button}>
          Update payment method
        </Button>
      </Section>

      {/* Footer text */}
      <Text style={note}>
        If you have questions or believe this is an error, please reply to this
        email and we&apos;ll help you sort it out.
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

const alertBox = {
  backgroundColor: "#fef2f2",
  borderLeft: "4px solid #dc2626",
  borderRadius: "4px",
  padding: "16px",
  marginBottom: "24px",
};

const alertText = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#b91c1c",
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
