import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type LoyaltyBirthdayEmailProps = {
  customerName?: string | null;
  points: number;
  balance: number;
  rewardsUrl: string;
  businessName: string;
  businessLogoUrl?: string | null;
};

export default function LoyaltyBirthdayEmail({
  customerName,
  points,
  balance,
  rewardsUrl,
  businessName,
  businessLogoUrl,
}: LoyaltyBirthdayEmailProps) {
  return (
    <EmailLayout
      previewText={`Happy birthday from ${businessName}! We added ${points} points to your rewards.`}
      businessName={businessName}
      logoUrl={businessLogoUrl ?? undefined}
    >
      <Text style={heading}>Happy birthday from {businessName}!</Text>

      <Text style={paragraph}>
        Hi {customerName?.trim() ? customerName : "there"},
      </Text>
      <Text style={paragraph}>
        We added {points} points to your rewards. Your balance is now {balance}.
      </Text>

      {/* CTA Button */}
      <Section style={buttonSection}>
        <Button href={rewardsUrl} style={button}>
          See your rewards
        </Button>
      </Section>

      <Text style={note}>Enjoy your day!</Text>
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
