import { Link, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

interface MarketingBroadcastEmailProps {
  businessName: string;
  logoUrl?: string;
  body: string;
  unsubscribeUrl: string;
}

export function MarketingBroadcastEmail({
  businessName,
  logoUrl,
  body,
  unsubscribeUrl,
}: MarketingBroadcastEmailProps) {
  // Split on blank lines to form paragraphs; treat body as plain text only
  const paragraphs = body
    .split(/\n{2,}/)
    .flatMap((block) => block.split("\n"))
    .filter((line) => line.trim().length > 0);

  return (
    <EmailLayout
      previewText={`A message from ${businessName}`}
      businessName={businessName}
      logoUrl={logoUrl}
    >
      {paragraphs.map((paragraph, i) => (
        <Text key={i} style={text}>
          {paragraph}
        </Text>
      ))}

      <Section style={unsubscribeSection}>
        <Text style={unsubscribeText}>
          You received this email because you opted in to marketing emails from{" "}
          {businessName}.{" "}
          <Link href={unsubscribeUrl} style={unsubscribeLink}>
            Unsubscribe
          </Link>
        </Text>
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

const unsubscribeSection = {
  marginTop: "32px",
};

const unsubscribeText = {
  color: "#9ca3af",
  fontSize: "11px",
  lineHeight: "20px",
  textAlign: "center" as const,
};

const unsubscribeLink = {
  color: "#9ca3af",
  textDecoration: "underline",
};
