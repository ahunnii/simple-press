import { Link, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

export type PolicyUpdateNoticeEmailProps = {
  /** Plain-language summary from the material-update registry. */
  summary: string;
  /** Pre-formatted effective date, e.g. "February 5, 2027". */
  effectiveOnLabel: string;
  /** True when the effective date has already passed at send time. */
  inEffect?: boolean;
  /** The changed policy pages, with ABSOLUTE urls. */
  policies: ReadonlyArray<{ label: string; url: string }>;
  supportEmail: string;
};

/**
 * Legal notice to store owners that SimplePress's policies are changing.
 *
 * Transactional, not marketing: it carries no unsubscribe machinery because it
 * is notice of a change to the terms the recipient is bound by, and is sent
 * regardless of any marketing opt-out. Sent from the platform hub — see
 * `platform.sendPolicyUpdateNotice`.
 */
export default function PolicyUpdateNoticeEmail({
  summary,
  effectiveOnLabel,
  inEffect = false,
  policies,
  supportEmail,
}: PolicyUpdateNoticeEmailProps) {
  return (
    <EmailLayout
      previewText={`We're updating our policies — effective ${effectiveOnLabel}`}
      businessName="SimplePress"
      footerText="You're receiving this because you own a store on SimplePress. It is an account and legal notice, not a marketing email, so it is sent even if you have opted out of marketing."
    >
      <Text style={heading}>
        {inEffect
          ? "We've updated our policies"
          : "We're updating our policies"}
      </Text>
      <Text style={paragraph}>
        {inEffect
          ? `Some of the policies that govern your SimplePress store took effect on ${effectiveOnLabel}.`
          : `Some of the policies that govern your SimplePress store will change on ${effectiveOnLabel}.`}{" "}
        Here is what changed:
      </Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Summary</Text>
        <Text style={infoValue}>{summary}</Text>
        <Text style={infoLabel}>Effective</Text>
        <Text style={infoValue}>{effectiveOnLabel}</Text>
      </Section>

      <Text style={paragraph}>Read the full text of the updated policies:</Text>
      <Section style={list}>
        {policies.map((policy) => (
          <Text key={policy.url} style={listItem}>
            <Link href={policy.url} style={link}>
              {policy.label}
            </Link>
          </Text>
        ))}
      </Section>

      <Text style={paragraph}>
        {inEffect
          ? "If you keep using SimplePress, the updated terms apply. If you don't agree, you can close your store."
          : `If you keep using SimplePress after ${effectiveOnLabel}, the updated terms apply. If you don't agree, you can close your store before then.`}
      </Text>

      <Text style={note}>
        Questions? Write to us at{" "}
        <Link href={`mailto:${supportEmail}`} style={link}>
          {supportEmail}
        </Link>
        . You will also see a notice in your store admin, where you can mark it
        as read.
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

const infoBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const infoLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#4b5563",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "8px 0 2px 0",
};

const infoValue = {
  fontSize: "15px",
  lineHeight: "22px",
  color: "#1f2937",
  margin: "0 0 8px 0",
};

const list = {
  marginBottom: "16px",
};

const listItem = {
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 4px 0",
};

const note = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};
