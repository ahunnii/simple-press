import { Column, Row, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type FormAnswerSummary = {
  label: string;
  value: string;
};

type FormConfirmationEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  /** Owner-written confirmation copy. Plain text — rendered as paragraphs, line breaks preserved. */
  message: string;
  formName: string;
  answers: FormAnswerSummary[];
};

export default function FormConfirmationEmail({
  businessName,
  businessLogoUrl,
  message,
  formName,
  answers,
}: FormConfirmationEmailProps) {
  return (
    <EmailLayout
      previewText={`Thanks for reaching out to ${businessName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Thanks for reaching out</Text>

      {/* Owner's message, rendered as plain text — never HTML. Preserving
          line breaks with `whiteSpace: pre-line` is what keeps a
          multi-paragraph message from collapsing into one run-on line;
          it's still plain text, so nothing the owner typed can inject
          markup. */}
      <Text style={{ ...paragraph, whiteSpace: "pre-line" }}>{message}</Text>

      {answers.length > 0 && (
        <Section style={answersSection}>
          <Text style={sectionHeading}>
            Your submission to &ldquo;{formName}&rdquo;
          </Text>
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
