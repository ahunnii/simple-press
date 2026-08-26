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
  /**
   * `variant: "resumed"` covers two different things the customer did, and
   * nothing on the subscription row distinguishes them after the fact: a
   * genuine resume from an indefinite pause, and UNDOING a pending skip
   * (`resumeSubscription` clears the same `pause_collection` either way).
   * The caller knows which it was, so it says so here. Absent ⇒ the generic
   * "back on" heading, which is true of both.
   */
  undoSkip?: boolean;
  /**
   * Accepted but unrendered. It only ever arrives as `pauseResumesAt`, which
   * an indefinite pause never sets and a skip always does — so the "resume on
   * or after…" box this used to draw for `variant: "paused"` was unreachable.
   * Kept in the type so `sendSubscriptionUpdated` can keep passing it.
   */
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
  undoSkip,
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
    heading = undoSkip
      ? "Your next delivery is back on"
      : "Your subscription is back on";
    message = undoSkip
      ? "Your skipped delivery of " +
        productName +
        (variantName ? ` — ${variantName}` : "") +
        " is back on. "
      : "Your subscription for " +
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

      {/* CTA Button */}
      <Section style={buttonSection}>
        <Button href={manageUrl} style={button}>
          Manage your subscription
        </Button>
      </Section>

      {/* Footer text */}
      <Text style={note}>
        You can manage or cancel your subscription anytime from the link above.
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
