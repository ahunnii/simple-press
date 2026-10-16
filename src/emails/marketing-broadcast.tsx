import { Link, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

interface MarketingBroadcastEmailProps {
  businessName: string;
  logoUrl?: string;
  /** Plain-text body. Blank lines / newlines become paragraphs. */
  body?: string;
  /**
   * Pre-sanitized HTML body (rich-text campaigns). Takes precedence over
   * `body`. The caller is responsible for sanitizing it.
   */
  bodyHtml?: string;
  unsubscribeUrl: string;
  /** Inbox preview text; defaults to "A message from {businessName}". */
  previewText?: string;
  /** Sender's postal address, shown in the footer (CAN-SPAM). Omitted when null. */
  postalAddress?: string | null;
}

export function MarketingBroadcastEmail({
  businessName,
  logoUrl,
  body,
  bodyHtml,
  unsubscribeUrl,
  previewText,
  postalAddress,
}: MarketingBroadcastEmailProps) {
  const preview = previewText?.trim() ?? "";
  // Split on blank lines to form paragraphs; treat body as plain text only
  const paragraphs = (body ?? "")
    .split(/\n{2,}/)
    .flatMap((block) => block.split("\n"))
    .filter((line) => line.trim().length > 0);

  return (
    <EmailLayout
      previewText={
        preview.length > 0 ? preview : `A message from ${businessName}`
      }
      businessName={businessName}
      logoUrl={logoUrl}
    >
      {bodyHtml ? (
        <div style={richBody} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      ) : (
        paragraphs.map((paragraph, i) => (
          <Text key={i} style={text}>
            {paragraph}
          </Text>
        ))
      )}

      <Section style={unsubscribeSection}>
        <Text style={unsubscribeText}>
          You received this email because you opted in to marketing emails from{" "}
          {businessName}.{" "}
          <Link href={unsubscribeUrl} style={unsubscribeLink}>
            Unsubscribe
          </Link>
        </Text>
        {postalAddress ? (
          <Text style={addressText}>
            {businessName}, {postalAddress}
          </Text>
        ) : null}
      </Section>
    </EmailLayout>
  );
}

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "12px 0",
};

const richBody = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
};

const unsubscribeSection = {
  marginTop: "32px",
};

const unsubscribeText = {
  color: "#9ca3af",
  fontSize: "11px",
  lineHeight: "20px",
  textAlign: "center" as const,
};

const addressText = {
  color: "#9ca3af",
  fontSize: "11px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "4px 0 0",
};

const unsubscribeLink = {
  color: "#9ca3af",
  textDecoration: "underline",
};
