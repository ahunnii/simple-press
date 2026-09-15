import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type LoyaltyRewardRedeemedEmailProps = {
  customerName?: string | null;
  code: string;
  rewardLabel: string;
  /** e.g. "$5.00 off" or "15% off" */
  rewardDescription: string;
  /** Pre-formatted date string, e.g. "September 30, 2026". */
  expiresAt: string;
  /** Pre-formatted, e.g. "$25.00" */
  minPurchase?: string | null;
  pointsSpent: number;
  balance: number;
  shopUrl: string;
  rewardsUrl: string;
  businessName: string;
  businessLogoUrl?: string | null;
};

export default function LoyaltyRewardRedeemedEmail({
  customerName,
  code,
  rewardLabel,
  rewardDescription,
  expiresAt,
  minPurchase,
  pointsSpent,
  balance,
  shopUrl,
  rewardsUrl,
  businessName,
  businessLogoUrl,
}: LoyaltyRewardRedeemedEmailProps) {
  return (
    <EmailLayout
      previewText={`Your ${rewardLabel} reward code from ${businessName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl ?? undefined}
    >
      <Text style={heading}>
        You redeemed {pointsSpent} points for {rewardLabel}
      </Text>

      <Text style={paragraph}>
        Hi {customerName?.trim() ? customerName : "there"},
      </Text>
      <Text style={paragraph}>
        Here&apos;s your reward code — {rewardDescription}:
      </Text>

      {/* Reward Code */}
      <Section style={codeBox}>
        <Text style={codeText}>{code}</Text>
      </Section>

      <Text style={paragraph}>
        Paste this code in the discount field at checkout. It works once and
        expires on {expiresAt}.
      </Text>
      {minPurchase && (
        <Text style={paragraph}>
          A minimum purchase of {minPurchase} is required.
        </Text>
      )}

      <Text style={paragraph}>Your balance is now {balance} points.</Text>

      {/* CTA Button */}
      <Section style={buttonSection}>
        <Button href={shopUrl} style={button}>
          Shop now
        </Button>
        <Text style={statusLinkText}>
          <a href={rewardsUrl} style={statusLink}>
            View your rewards
          </a>
        </Text>
      </Section>

      <Text style={note}>
        If you have any questions, please reply to this email.
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

const codeBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "20px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const codeText = {
  fontFamily: "'SF Mono', 'Courier New', Courier, monospace",
  fontSize: "28px",
  fontWeight: "bold",
  letterSpacing: "6px",
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

const statusLinkText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "12px 0 0 0",
};

const statusLink = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const note = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  textAlign: "center" as const,
};
