import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type BackInStockEmailProps = {
  productName: string;
  /** Optional variant name, e.g. "Large / Blue". */
  variantName?: string;
  productUrl: string;
  businessName: string;
  businessLogoUrl?: string;
};

export default function BackInStockEmail({
  productName,
  variantName,
  productUrl,
  businessName,
  businessLogoUrl,
}: BackInStockEmailProps) {
  const displayName = variantName
    ? `${productName} (${variantName})`
    : productName;

  return (
    <EmailLayout
      previewText={`${displayName} is back in stock at ${businessName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>{displayName} is back in stock</Text>

      <Text style={paragraph}>Good news!</Text>

      <Text style={paragraph}>
        {displayName} is available again at {businessName}. Popular items can
        sell out quickly, so grab it while it lasts.
      </Text>

      <Section style={buttonSection}>
        <Button href={productUrl} style={button}>
          View product
        </Button>
      </Section>

      <Text style={note}>
        You&apos;re receiving this one-time email because you asked us to let
        you know when this item was back in stock.
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
