import { Button, Column, Row, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type QuoteAnswerRow = {
  title: string;
  display: string;
  /** Skipped in the Q&A list — hidden by a show-if the visitor never saw. */
  hidden: boolean;
};

type NewQuoteNotificationEmailProps = {
  calculatorName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  /** Null when the formula could not be evaluated for this submission. */
  estimateCents: number | null;
  answers: QuoteAnswerRow[];
  formula: string;
  variables: Record<string, number>;
  businessName: string;
  businessLogoUrl?: string;
  adminQuoteUrl: string;
};

export default function NewQuoteNotificationEmail({
  calculatorName,
  contactName,
  contactEmail,
  contactPhone,
  estimateCents,
  answers,
  formula,
  variables,
  businessName,
  businessLogoUrl,
  adminQuoteUrl,
}: NewQuoteNotificationEmailProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const visibleAnswers = answers.filter((answer) => !answer.hidden);
  const variableEntries = Object.entries(variables);

  return (
    <EmailLayout
      previewText={`New quote request — ${calculatorName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>You have a new quote request</Text>
      <Text style={paragraph}>
        Someone just submitted &ldquo;{calculatorName}&rdquo;. Review the
        details below or open it in your dashboard.
      </Text>

      <Section style={contactBox}>
        <Text style={contactNameStyle}>{contactName}</Text>
        <Text style={meta}>
          <a href={`mailto:${contactEmail}`} style={mailLink}>
            {contactEmail}
          </a>
          {contactPhone && (
            <>
              <br />
              {contactPhone}
            </>
          )}
        </Text>
      </Section>

      <Section style={estimateBox}>
        <Text style={estimateLabel}>Estimated cost</Text>
        <Text style={estimateValue}>
          {estimateCents != null ? formatPrice(estimateCents) : "—"}
        </Text>
      </Section>

      {visibleAnswers.length > 0 && (
        <Section style={answersSection}>
          <Text style={sectionHeading}>Answers</Text>
          {visibleAnswers.map((answer, index) => (
            <Row key={index} style={answerRow}>
              <Column style={answerLabelCol}>
                <Text style={answerLabel}>{answer.title}</Text>
              </Column>
              <Column style={answerValueCol}>
                <Text style={answerValue}>{answer.display}</Text>
              </Column>
            </Row>
          ))}
        </Section>
      )}

      <Section style={formulaSection}>
        <Text style={sectionHeading}>Formula</Text>
        <Text style={formulaText}>{formula}</Text>
        {variableEntries.length > 0 && (
          <Text style={variablesText}>
            {variableEntries
              .map(([name, value]) => `${name} = ${value}`)
              .join("  ·  ")}
          </Text>
        )}
      </Section>

      <Section style={buttonSection}>
        <Button href={adminQuoteUrl} style={button}>
          View quote request
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

const contactBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
};

const contactNameStyle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 4px 0",
};

const meta = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "0",
};

const mailLink = {
  color: "#2563eb",
  textDecoration: "underline",
};

const estimateBox = {
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  padding: "16px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const estimateLabel = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#1d4ed8",
  fontWeight: "600",
  margin: "0 0 4px 0",
};

const estimateValue = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0",
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

const formulaSection = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const formulaText = {
  fontSize: "13px",
  fontFamily: "monospace",
  color: "#374151",
  margin: "0 0 8px 0",
  whiteSpace: "pre-wrap" as const,
};

const variablesText = {
  fontSize: "12px",
  color: "#6b7280",
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
