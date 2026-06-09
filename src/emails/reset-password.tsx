import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type ResetPasswordEmailProps = {
  name: string;
  businessName: string;
  resetUrl: string;
  logoUrl?: string;
};

export default function ResetPasswordEmail({
  name,
  businessName,
  resetUrl,
  logoUrl,
}: ResetPasswordEmailProps) {
  return (
    <EmailLayout
      previewText={`Reset your password for ${businessName}`}
      businessName={businessName}
      logoUrl={logoUrl}
    >
      <Text style={heading}>Reset your password</Text>

      <Text style={paragraph}>Hi {name},</Text>

      <Text style={paragraph}>
        We received a request to reset your password for your SimplePress
        account.
      </Text>

      <Text style={paragraph}>
        Click the button below to set a new password. If you didn&apos;t request
        a password reset, you can safely ignore this email.
      </Text>

      <Section style={buttonSection}>
        <Button href={resetUrl} style={button}>
          Reset Password
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
