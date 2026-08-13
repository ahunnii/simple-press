import { Column, Row, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type QuoteAnswerSummary = {
  title: string;
  display: string;
};

/**
 * Either an exact figure or a low–high range — the calculator's
 * `displayAsRange` setting decides which shape the server sends.
 */
type QuoteEstimate =
  | { exactCents: number }
  | { lowCents: number; highCents: number };

type QuoteConfirmationEmailProps = {
  customerName: string;
  /** Optional owner-customized intro paragraph, shown under the heading. */
  introText?: string;
  calculatorName: string;
  businessName: string;
  businessLogoUrl?: string;
  ownerEmail?: string;
  responseDays: number;
  answers: QuoteAnswerSummary[];
  /**
   * Present only when the calculator's `showEstimateToCustomer` is on.
   * When absent, no pricing appears anywhere in this email.
   */
  estimate?: QuoteEstimate;
};

export default function QuoteConfirmationEmail({
  customerName,
  introText,
  calculatorName,
  businessName,
  businessLogoUrl,
  ownerEmail,
  responseDays,
  answers,
  estimate,
}: QuoteConfirmationEmailProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <EmailLayout
      previewText={`We received your quote request for ${calculatorName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>We received your quote request</Text>

      {introText && (
        <Text style={{ ...paragraph, whiteSpace: "pre-line" }}>
          {introText}
        </Text>
      )}

      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        Thanks for requesting a quote for {calculatorName} from{" "}
        {businessName}. We&apos;ll get back to you within {responseDays}{" "}
        business day{responseDays === 1 ? "" : "s"}.
      </Text>

      {/* Answers summary */}
      {answers.length > 0 && (
        <Section style={answersSection}>
          <Text style={sectionHeading}>Your answers</Text>
          {answers.map((answer, index) => (
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

      {/* Estimate — only when the calculator opts in to showing it */}
      {estimate && (
        <Section style={estimateBox}>
          <Text style={estimateLabel}>Estimated cost</Text>
          <Text style={estimateValue}>
            {"exactCents" in estimate
              ? formatPrice(estimate.exactCents)
              : `${formatPrice(estimate.lowCents)} – ${formatPrice(estimate.highCents)}`}
          </Text>
          <Text style={estimateCaveat}>
            This is an estimate based on the details you provided, not a
            final price. We&apos;ll confirm exact pricing when we follow up.
          </Text>
        </Section>
      )}

      <Text style={note}>
        If you have questions in the meantime, reply to this email
        {ownerEmail ? <> or contact {ownerEmail}</> : null}.
      </Text>
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

const estimateBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const estimateLabel = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  fontWeight: "600",
  margin: "0 0 4px 0",
};

const estimateValue = {
  fontSize: "22px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 8px 0",
};

const estimateCaveat = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#6b7280",
  margin: "0",
};

const note = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  textAlign: "center" as const,
};
