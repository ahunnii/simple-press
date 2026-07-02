import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type AbandonedCheckoutEmailProps = {
  customerName?: string;
  businessName: string;
  businessLogoUrl?: string;
  businessUrl: string;
};

export default function AbandonedCheckoutEmail({
  customerName,
  businessName,
  businessLogoUrl,
  businessUrl,
}: AbandonedCheckoutEmailProps) {
  return (
    <EmailLayout
      previewText={`You left items in your cart at ${businessName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>You left items in your cart</Text>

      <Text style={paragraph}>Hi {customerName ?? "there"},</Text>

      <Text style={paragraph}>
        It looks like you started checking out at {businessName} but didn&apos;t
        finish. Your cart is saved and waiting for you — pick up right where you
        left off.
      </Text>

      <Section style={buttonSection}>
        <Button href={`${businessUrl}/cart`} style={button}>
          Return to your cart
        </Button>
      </Section>

      <Text style={note}>
        If you have questions or ran into a problem checking out, reply to this
        email and the store will get back to you.
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
