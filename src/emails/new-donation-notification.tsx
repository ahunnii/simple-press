import { Button, Column, Row, Section, Text } from "@react-email/components";

import type { DonationLabel } from "~/lib/donations/label";

import { EmailLayout } from "./components/layout";

type NewDonationNotificationEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  /**
   * The resolved copy set for `Business.donationLabel` — the owner picked one
   * wording for the whole feature, so the email calls it whatever the donate
   * page and the Checkout line item call it.
   */
  label: DonationLabel;
  amountCents: number;
  /** Donor-supplied. Absent means the donor gave anonymously. */
  donorName?: string | null;
  /** Collected by Stripe Checkout. Absent for a session that carried no email. */
  donorEmail?: string | null;
  /** Donor-supplied free text. Rendered as PLAIN TEXT — see below. */
  message?: string | null;
  adminUrl: string;
};

/**
 * Owner notification for a completed donation/tip, modeled on
 * `owner-subscription-notification.tsx`.
 *
 * The donor `message` is attacker-supplied free text from a public, unauthenticated
 * form. It is rendered as a React child, so React escapes it — there is no
 * `dangerouslySetInnerHTML` here and there must never be one. The same goes for
 * `donorName`. (Length is already capped at 500/100 chars by
 * `donationCheckoutBodySchema`, and again by Stripe's 500-char metadata limit.)
 */
export default function NewDonationNotificationEmail({
  businessName,
  businessLogoUrl,
  label,
  amountCents,
  donorName,
  donorEmail,
  message,
  adminUrl,
}: NewDonationNotificationEmailProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const noun = label.noun.toLowerCase();
  const amount = formatPrice(amountCents);
  const heading = `New ${noun} to ${businessName}`;
  const previewText = `${amount} ${noun} received`;
  const donorDisplay = donorName?.trim() ? donorName.trim() : "Anonymous";

  return (
    <EmailLayout
      previewText={previewText}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={textHeading}>{heading}</Text>

      <Text style={paragraph}>
        {donorDisplay === "Anonymous"
          ? `You received an anonymous ${noun} of ${amount}.`
          : `${donorDisplay} sent you a ${noun} of ${amount}.`}
      </Text>

      {/* Donation Details */}
      <Section style={detailsBox}>
        <Row style={detailRow}>
          <Column>
            <Text style={detailLabel}>Amount</Text>
          </Column>
          <Column style={detailValueCol}>
            <Text style={detailValue}>{amount}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column>
            <Text style={detailLabel}>From</Text>
          </Column>
          <Column style={detailValueCol}>
            <Text style={detailValue}>{donorDisplay}</Text>
          </Column>
        </Row>

        {donorEmail && (
          <Row style={detailRow}>
            <Column>
              <Text style={detailLabel}>Email</Text>
            </Column>
            <Column style={detailValueCol}>
              <Text style={detailValue}>{donorEmail}</Text>
            </Column>
          </Row>
        )}
      </Section>

      {/* Donor message — plain text, React-escaped. Never HTML. */}
      {message && (
        <Section style={messageBox}>
          <Text style={messageLabel}>Message</Text>
          <Text style={messageText}>{message}</Text>
        </Section>
      )}

      {/* CTA Button */}
      <Section style={buttonSection}>
        <Button href={adminUrl} style={button}>
          View in admin
        </Button>
      </Section>

      {/* Footer text */}
      <Text style={note}>
        The full amount was charged on your own Stripe account and will settle
        with your normal payouts.
      </Text>
    </EmailLayout>
  );
}

// Styles
const textHeading = {
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

const detailsBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const detailRow = {
  padding: "8px 0",
};

const detailLabel = {
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: "500",
  margin: "0",
};

const detailValueCol = {
  textAlign: "right" as const,
};

const detailValue = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0",
  wordBreak: "break-word" as const,
};

const messageBox = {
  backgroundColor: "#f9fafb",
  borderLeft: "3px solid #d1d5db",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const messageLabel = {
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: "500",
  margin: "0 0 8px 0",
};

const messageText = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#1f2937",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
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
  margin: "0",
};
