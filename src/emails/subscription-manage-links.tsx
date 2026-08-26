import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type SubscriptionLink = {
  productName: string;
  variantName?: string | null;
  intervalLabel: string;
  status: string;
  manageUrl: string;
};

type SubscriptionManageLinksEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  links: SubscriptionLink[];
};

export default function SubscriptionManageLinksEmail({
  businessName,
  businessLogoUrl,
  links,
}: SubscriptionManageLinksEmailProps) {
  return (
    <EmailLayout
      previewText={`Manage your subscriptions at ${businessName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your subscriptions</Text>

      <Text style={paragraph}>
        Here are the links to manage your subscriptions at {businessName}:
      </Text>

      {/* Subscription Links */}
      <div style={{ marginBottom: "24px" }}>
        {links.map((link, index) => (
          <Section key={index} style={linkBox}>
            <Text style={linkTitle}>
              {link.productName}
              {link.variantName && ` — ${link.variantName}`}
            </Text>
            <Text style={linkMeta}>
              {link.intervalLabel} • Status: {link.status}
            </Text>
            <Button href={link.manageUrl} style={linkButton}>
              Manage
            </Button>
          </Section>
        ))}
      </div>

      {/* Footer text */}
      <Text style={note}>
        These links are personalized — don&apos;t share them. If you have any
        questions, reply to this email.
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
  marginBottom: "24px",
};

const linkBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
};

const linkTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 4px 0",
};

const linkMeta = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 12px 0",
};

const linkButton = {
  backgroundColor: "#3b82f6",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "10px 24px",
};

const note = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "0",
};
