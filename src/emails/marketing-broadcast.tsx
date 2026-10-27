import { Text } from "@react-email/components";

import type { EmailLayoutTheme } from "./components/layout";

import { EmailLayout } from "./components/layout";
import { MarketingFooter } from "./components/marketing-footer";

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
  /** Store marketing email style; omit for the neutral look. */
  theme?: EmailLayoutTheme;
  /**
   * Why the recipient got this email, shown in the footer. Defaults to the
   * opted-in line; a contact import's re-permission invite (sent to people
   * who have NOT opted in here) passes its own.
   */
  footerReason?: string;
}

export function MarketingBroadcastEmail({
  businessName,
  logoUrl,
  body,
  bodyHtml,
  unsubscribeUrl,
  previewText,
  postalAddress,
  theme,
  footerReason,
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
      theme={theme}
    >
      {bodyHtml ? (
        <div
          style={
            theme ? { ...richBody, fontFamily: theme.fontStack } : richBody
          }
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : (
        paragraphs.map((paragraph, i) => (
          <Text
            key={i}
            style={theme ? { ...text, fontFamily: theme.fontStack } : text}
          >
            {paragraph}
          </Text>
        ))
      )}

      <MarketingFooter
        businessName={businessName}
        postalAddress={postalAddress}
        unsubscribeUrl={unsubscribeUrl}
        reason={
          footerReason ??
          `You received this email because you opted in to marketing emails from ${businessName}.`
        }
        linkColor={theme?.linkColor}
      />
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
