import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

interface TeamInviteEmailProps {
  businessName: string;
  inviteUrl: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  logoUrl?: string;
  ownerEmail?: string;
}

export function TeamInviteEmail({
  businessName,
  inviteUrl,
  role,
  logoUrl,
  ownerEmail,
}: TeamInviteEmailProps) {
  const roleLabel =
    role === "OWNER" ? "Owner" : role === "STAFF" ? "Staff" : "Manager";

  return (
    <EmailLayout
      previewText={`You've been invited to join ${businessName}`}
      businessName={businessName}
      logoUrl={logoUrl}
      ownerEmail={ownerEmail}
    >
      <Text style={heading}>You&apos;ve been invited to join {businessName}</Text>

      <Text style={text}>Hi there,</Text>

      <Text style={text}>
        You&apos;ve been invited to join{" "}
        <strong>{businessName}</strong> as a <strong>{roleLabel}</strong> on
        SimplePress.
      </Text>

      <Text style={text}>
        Click the button below to accept the invitation and get started. This
        invitation expires in 14 days and can only be used once.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={inviteUrl}>
          Accept Invitation
        </Button>
      </Section>

      <Text style={footer}>
        If you weren&apos;t expecting this invitation, you can safely ignore
        this email.
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
