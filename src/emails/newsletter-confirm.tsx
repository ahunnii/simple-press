import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

interface NewsletterConfirmEmailProps {
  businessName: string;
  confirmUrl: string;
  logoUrl?: string;
}

export function NewsletterConfirmEmail({
  businessName,
  confirmUrl,
  logoUrl,
}: NewsletterConfirmEmailProps) {
  return (
    <EmailLayout
      previewText={`Confirm your subscription to ${businessName}`}
      businessName={businessName}
      logoUrl={logoUrl}
    >
      <Text style={heading}>Confirm your subscription</Text>

      <Text style={text}>
        Someone asked to get news and offers from{" "}
        <strong>{businessName}</strong> at this email address. Click the button
        below to confirm it was you.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={confirmUrl}>
          Confirm subscription
        </Button>
      </Section>

      <Text style={footer}>
        This link expires in 7 days. If you didn&apos;t sign up, you can ignore
        this email and you won&apos;t be subscribed.
      </Text>
    </EmailLayout>
  );
}

export default NewsletterConfirmEmail;

const heading = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const buttonContainer = {
  padding: "27px 0 27px",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#5e6ad2",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "0",
};
