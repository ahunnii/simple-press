import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type WelcomeEmailProps = {
  name: string;
  businessName: string;
  businessUrl: string;
  logoUrl?: string;
};

export default function WelcomeEmail({
  name,
  businessName,
  businessUrl,
  logoUrl,
}: WelcomeEmailProps) {
  return (
    <EmailLayout
      previewText={`Welcome to ${businessName}!`}
      businessName={businessName}
      logoUrl={logoUrl}
    >
      <Text style={heading}>Welcome to {businessName}! 🎉</Text>

      <Text style={paragraph}>Hi {name},</Text>

      <Text style={paragraph}>
        Thank you for creating an account with us. We&apos;re excited to have
        you!
      </Text>

      <Text style={paragraph}>
        Your account is now active and you can start shopping.
      </Text>

      <Section style={buttonSection}>
        <Button href={businessUrl} style={button}>
          Start Shopping
        </Button>
      </Section>

      <Text style={note}>
        If you have any questions, feel free to reply to this email.
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
  marginTop: "32px",
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
  marginTop: "32px",
};
