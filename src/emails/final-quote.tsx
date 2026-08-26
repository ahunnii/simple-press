import { Column, Row, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type QuoteAnswerSummary = {
  title: string;
  display: string;
};

type FinalQuoteEmailProps = {
  customerName: string;
  calculatorName: string;
  businessName: string;
  businessLogoUrl?: string;
  ownerEmail?: string;
  /** Owner-written message for this send. Plain text; blank lines = paragraphs. */
  message: string;
  /**
   * The final quoted amount in cents — always exact, never a range.
   *
   * `null` = message-only follow-up. The amount box, the heading and the
   * preview text all change; the owner's message and the answers recap stay
   * exactly as they are, because those are what the email is FOR in that case.
   * A $0 quote is not representable here on purpose — a genuine zero would be
   * `0`, and it would render as "$0.00" in the box like any other figure.
   */
  finalQuoteCents: number | null;
  /** The customer's original request, for context under the quote. */
  answers: QuoteAnswerSummary[];
};

/**
 * The follow-up email an owner sends from the submission detail page after
 * reviewing (and possibly adjusting) the computed estimate. Unlike the
 * confirmation email's "estimate" framing, this is the business's actual
 * quote. Reply-to is the owner, so the conversation continues in ordinary
 * email from here.
 *
 * It doubles as the plain reply channel: with `finalQuoteCents: null` the same
 * layout carries a question or a decline instead of a price, so a lead the
 * owner needs one more detail about stays in the thread the admin page tracks
 * rather than disappearing into their personal mail client.
 */
export default function FinalQuoteEmail({
  customerName,
  calculatorName,
  businessName,
  businessLogoUrl,
  ownerEmail,
  message,
  finalQuoteCents,
  answers,
}: FinalQuoteEmailProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  // The heading, the preview text and the amount box all turn on the same
  // question — does this email contain a price? — and must never disagree. The
  // box below re-states the check inline rather than reading this flag, purely
  // so TypeScript narrows `finalQuoteCents` to `number` for `formatPrice`.
  const hasQuote = finalQuoteCents !== null;

  return (
    <EmailLayout
      previewText={
        hasQuote
          ? `Your quote from ${businessName}`
          : `An update from ${businessName} on your quote request`
      }
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>
        {hasQuote ? "Your quote is ready" : "An update on your quote request"}
      </Text>

      <Text style={paragraph}>Hi {customerName},</Text>

      {finalQuoteCents !== null && (
        <Section style={quoteBox}>
          <Text style={quoteLabel}>{calculatorName}</Text>
          <Text style={quoteValue}>{formatPrice(finalQuoteCents)}</Text>
        </Section>
      )}

      {/* Owner-written message, plain text split on blank lines — the same
          treatment as the marketing broadcast body. */}
      {message
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter((block) => block !== "")
        .map((block, index) => (
          <Text key={index} style={{ ...paragraph, whiteSpace: "pre-line" }}>
            {block}
          </Text>
        ))}

      {answers.length > 0 && (
        <Section style={answersSection}>
          <Text style={sectionHeading}>Your request</Text>
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

      {/* "Ready to move forward?" reads as a nudge under a price and as a
          non-sequitur under "we can't cover that area", so the message-only
          send drops that half. */}
      <Text style={note}>
        {hasQuote ? "Questions, or ready to move forward? " : "Questions? "}
        Reply to this email
        {ownerEmail ? <> or contact {ownerEmail}</> : null} and we&apos;ll take
        it from there.
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

const quoteBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "20px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const quoteLabel = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  fontWeight: "600",
  margin: "0 0 4px 0",
};

const quoteValue = {
  fontSize: "28px",
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

const note = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  textAlign: "center" as const,
};
