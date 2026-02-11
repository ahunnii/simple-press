import { Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type ContactFormEmailProps = {
  name: string;
  email: string;
  subject?: string;
  message: string;
  businessName: string;
};

export default function ContactFormEmail({
  name,
  email,
  subject,
  message,
  businessName,
}: ContactFormEmailProps) {
  return (
    <EmailLayout
      previewText={`New contact form submission from ${name}`}
      businessName={businessName}
    >
      <Text style={heading}>New Contact Form Submission</Text>

      <Section style={infoBox}>
        <Text style={label}>From:</Text>
        <Text style={value}>{name}</Text>

        <Text style={label}>Email:</Text>
        <Text style={value}>{email}</Text>

        {subject && (
          <>
            <Text style={label}>Subject:</Text>
            <Text style={value}>{subject}</Text>
          </>
        )}
      </Section>

      <Section style={messageBox}>
        <Text style={label}>Message:</Text>
        <Text style={messageText}>{message}</Text>
      </Section>

      <Text style={note}>
        Reply directly to this email to respond to {name}.
      </Text>
    </EmailLayout>
  );
}

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  marginBottom: "24px",
};

const infoBox = {
  marginBottom: "24px",
};

const label = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  fontWeight: "600",
  margin: "0 0 4px 0",
};

const value = {
  fontSize: "16px",
  color: "#1f2937",
  margin: "0 0 16px 0",
};

const messageBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const messageText = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#374151",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const note = {
  fontSize: "14px",
  color: "#6b7280",
  fontStyle: "italic",
};
