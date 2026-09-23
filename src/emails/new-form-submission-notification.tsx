import { Button, Column, Row, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type FormAnswerRow = {
  label: string;
  value: string;
};

type NewFormSubmissionNotificationEmailProps = {
  formName: string;
  submittedAt: Date;
  answers: FormAnswerRow[];
  businessName: string;
  businessLogoUrl?: string;
  adminEntryUrl: string;
};

export default function NewFormSubmissionNotificationEmail({
  formName,
  submittedAt,
  answers,
  businessName,
  businessLogoUrl,
  adminEntryUrl,
}: NewFormSubmissionNotificationEmailProps) {
  const submittedAtText = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(submittedAt);

  return (
    <EmailLayout
      previewText={`New submission — ${formName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>You have a new form submission</Text>
      <Text style={paragraph}>
        Someone just submitted &ldquo;{formName}&rdquo; on {submittedAtText}.
      </Text>

      {answers.length > 0 && (
        <Section style={answersSection}>
          <Text style={sectionHeading}>Answers</Text>
          {answers.map((answer, index) => (
            <Row key={index} style={answerRow}>
              <Column style={answerLabelCol}>
                <Text style={answerLabel}>{answer.label}</Text>
              </Column>
              <Column style={answerValueCol}>
                <Text style={answerValue}>{answer.value}</Text>
              </Column>
            </Row>
          ))}
        </Section>
      )}

      <Section style={buttonSection}>
        <Button href={adminEntryUrl} style={button}>
          View entry
        </Button>
      </Section>

      <Text style={note}>
        This is an automated notification from your store.
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

const answersSection = {
  marginBottom: "24px",
};

const sectionHeading = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  marginBottom: "8px",
};

const answerRow = {
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
};

const answerLabelCol = {
  width: "50%",
};

const answerLabel = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0",
};

const answerValueCol = {
  width: "50%",
  textAlign: "right" as const,
};

const answerValue = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1f2937",
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
  textAlign: "center" as const,
};
