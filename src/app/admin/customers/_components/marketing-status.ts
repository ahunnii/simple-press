import { marketingConsentSourceLabel } from "~/lib/marketing/consent";

/**
 * Plain-language email-marketing status for a customer, shared by the
 * Customers list and the customer page so the two never disagree.
 *
 * Suppressed (bounced / marked as spam / blocked) wins over everything else:
 * those customers get no marketing email regardless of what they agreed to.
 */
export type MarketingStatusInput = {
  acceptsMarketing: boolean;
  marketingUnsubscribedAt: Date | null;
  marketingSuppressedAt: Date | null;
  marketingSuppressionReason: string | null;
};

export type MarketingStatus = {
  kind: "subscribed" | "unsubscribed" | "not-subscribed" | "suppressed";
  /** Full label, e.g. "Suppressed: Bounced". */
  label: string;
  /** Short label for the list table. */
  shortLabel: string;
  variant: "success" | "secondary" | "warning" | "outline";
};

const SUPPRESSION_REASON_LABELS: Record<string, string> = {
  HARD_BOUNCE: "Bounced",
  COMPLAINT: "Marked as spam",
  PROVIDER_SUPPRESSED: "Blocked by provider",
};

export function marketingSuppressionReasonLabel(
  reason: string | null | undefined,
): string {
  if (!reason) return "";
  return SUPPRESSION_REASON_LABELS[reason] ?? reason;
}

export function getMarketingStatus(c: MarketingStatusInput): MarketingStatus {
  if (c.marketingSuppressedAt) {
    const reason = marketingSuppressionReasonLabel(
      c.marketingSuppressionReason,
    );
    return {
      kind: "suppressed",
      label: reason ? `Suppressed: ${reason}` : "Suppressed",
      shortLabel: "Suppressed",
      variant: "warning",
    };
  }
  if (c.acceptsMarketing) {
    return {
      kind: "subscribed",
      label: "Subscribed",
      shortLabel: "Subscribed",
      variant: "success",
    };
  }
  if (c.marketingUnsubscribedAt) {
    return {
      kind: "unsubscribed",
      label: "Unsubscribed",
      shortLabel: "Unsubscribed",
      variant: "secondary",
    };
  }
  return {
    kind: "not-subscribed",
    label: "Not subscribed",
    shortLabel: "Not subscribed",
    variant: "outline",
  };
}

/** Owner-facing label for a consent event ("Subscribed at checkout"). */
export function consentEventLabel(event: {
  type: string;
  source: string;
}): string {
  const { type, source } = event;
  if (type === "OPT_IN") {
    switch (source) {
      case "CHECKOUT":
        return "Subscribed at checkout";
      case "NEWSLETTER_FORM":
        return "Subscribed from the sign-up form";
      case "ACCOUNT":
        return "Subscribed in their account";
      case "LEGACY_ACCOUNT":
        return "Subscribed in their account (before consent tracking)";
      case "RESUBSCRIBE_LINK":
        return "Resubscribed from an email link";
      default:
        return `Subscribed (${marketingConsentSourceLabel(source)})`;
    }
  }
  if (type === "OPT_OUT") {
    switch (source) {
      case "UNSUBSCRIBE_LINK":
        return "Unsubscribed from email link";
      case "ONE_CLICK":
        return "Unsubscribed from their mail app";
      case "OWNER":
        return "Unsubscribed by you";
      case "ACCOUNT":
        return "Unsubscribed in their account";
      default:
        return "Unsubscribed";
    }
  }
  if (type === "SUPPRESSED") {
    switch (source) {
      case "COMPLAINT":
        return "Marked as spam";
      case "HARD_BOUNCE":
        return "Email bounced";
      case "PROVIDER_SUPPRESSED":
        return "Blocked by the email provider";
      default:
        return "Emails stopped";
    }
  }
  if (type === "UNSUPPRESSED") return "Emails turned back on";
  return type;
}
