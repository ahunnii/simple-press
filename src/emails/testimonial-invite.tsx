import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

interface TestimonialInviteEmailProps {
  businessName: string;
  inviteUrl: string;
  logoUrl?: string;
}

export function TestimonialInviteEmail({
  businessName,
  inviteUrl,
  logoUrl,
}: TestimonialInviteEmailProps) {
  return (
    <EmailLayout
      previewText={`Share your experience with ${businessName}`}
      businessName={businessName}
      logoUrl={logoUrl}
    >
      <Text style={heading}>We&apos;d love your feedback!</Text>

      <Text style={text}>Hi there,</Text>

      <Text style={text}>
        We hope you had a great experience with {businessName}. We&apos;d be
        thrilled if you could take a moment to share your thoughts!
      </Text>

      <Text style={text}>
        Your testimonial will help us improve and help others learn about what
        we do.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={inviteUrl}>
          Share Your Experience
        </Button>
      </Section>

      <Text style={footer}>
        This link is valid for 30 days and can only be used once.
      </Text>
    </EmailLayout>
  );
}

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
