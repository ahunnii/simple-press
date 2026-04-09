import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type VerifyEmailProps = {
  name: string;
  businessName: string;
  verifyUrl: string;
  logoUrl?: string;
};

export default function VerifyEmail({
  name,
  businessName,
  verifyUrl,
  logoUrl,
}: VerifyEmailProps) {
  return (
    <EmailLayout
      previewText={`Verify your email address for ${businessName}`}
      businessName={businessName}
      logoUrl={logoUrl}
    >
      <Text style={heading}>Verify your email address</Text>

      <Text style={paragraph}>Hi {name},</Text>

      <Text style={paragraph}>
        Thank you for creating an account with {businessName}. To complete your
        registration, please verify your email address.
      </Text>

      <Text style={paragraph}>
        Click the button below to verify your email address. If you did not sign
        up for a SimplePress account, you can safely ignore this email.
      </Text>

      <Section style={buttonSection}>
        <Button href={verifyUrl} style={button}>
          Verify Email
        </Button>
      </Section>

      <Text style={note}>
        This link will expire in 1 hour for your security.
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
