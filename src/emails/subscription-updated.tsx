import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type SubscriptionUpdatedEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  customerName: string;
  productName: string;
  variantName?: string | null;
  intervalLabel: string;
  variant: "paused" | "resumed" | "skipped";
  resumesAt?: Date | null;
  nextBillingAt?: Date | null;
  manageUrl: string;
};

export default function SubscriptionUpdatedEmail({
  businessName,
  businessLogoUrl,
  customerName,
  productName,
  variantName,
  variant,
  resumesAt,
  nextBillingAt,
  manageUrl,
}: SubscriptionUpdatedEmailProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  let heading: string;
  let message: string;

  if (variant === "paused") {
    heading = "Your subscription is paused";
    message =
      "Your subscription for " +
      productName +
      (variantName ? ` — ${variantName}` : "") +
      " is now paused. We won't charge you or send any deliveries until you resume it.";
  } else if (variant === "resumed") {
    heading = "Your subscription is back on";
    message =
      "Your subscription for " +
      productName +
      (variantName ? ` — ${variantName}` : "") +
      " is back on. ";
    if (nextBillingAt) {
      message += `Your next charge will be on ${formatDate(nextBillingAt)}.`;
    }
  } else {
    // skipped
    heading = "Your next delivery is skipped";
    message =
      "Your next delivery of " +
      productName +
      (variantName ? ` — ${variantName}` : "") +
      " is skipped.";
    if (nextBillingAt) {
      message += ` You'll be charged again on ${formatDate(nextBillingAt)}.`;
    }
  }

  return (
    <EmailLayout
      previewText={heading}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={textHeading}>{heading}</Text>

      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>{message}</Text>

      {variant === "paused" && resumesAt && (
        <Section style={infoBox}>
          <Text style={infoBoxText}>
            Resume on or after {formatDate(resumesAt)}, or resume anytime from
            your subscription settings.
          </Text>
        </Section>
      )}

      {/* CTA Button */}
      <Section style={buttonSection}>
        <Button href={manageUrl} style={button}>
          Manage your subscription
        </Button>
      </Section>

      {/* Footer text */}
      <Text style={note}>
        Need to make other changes? You can pause, resume, skip, or cancel
        anytime from the link above.
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

const infoBox = {
  backgroundColor: "#f0f9ff",
  borderLeft: "4px solid #0284c7",
  borderRadius: "4px",
  padding: "16px",
  marginBottom: "24px",
};

const infoBoxText = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#0c4a6e",
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

const note = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "0",
};
