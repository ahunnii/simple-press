import { Link, Section, Text } from "@react-email/components";

type MarketingFooterProps = {
  businessName: string;
  /** Sender's postal address (CAN-SPAM). The line is omitted when null. */
  postalAddress?: string | null;
  /** One-click unsubscribe page (`/api/unsubscribe?t=...`). */
  unsubscribeUrl: string;
  /** Why the recipient got this email, e.g. "You received this email because ...". */
  reason: string;
};

/**
 * The marketing footer shared by every commercial email: the reason the
 * recipient is getting it, an unsubscribe link, and the sender's postal
 * address. Used by campaign broadcasts and abandoned-checkout reminders.
 */
export function MarketingFooter({
  businessName,
  postalAddress,
  unsubscribeUrl,
  reason,
}: MarketingFooterProps) {
  return (
    <Section style={unsubscribeSection}>
      <Text style={unsubscribeText}>
        {reason}{" "}
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
  );
}

const unsubscribeSection = {
  marginTop: "32px",
};

const unsubscribeText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
};

const addressText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "4px 0 0",
};

const unsubscribeLink = {
  color: "#6b7280",
  textDecoration: "underline",
};
