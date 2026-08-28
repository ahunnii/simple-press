import { Button, Column, Row, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type OwnerSubscriptionNotificationEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  kind: "new" | "cancelled" | "payment_failed";
  customerEmail: string;
  customerName?: string | null;
  productName: string;
  variantName?: string | null;
  quantity: number;
  intervalLabel: string;
  perDeliveryCents: number;
  adminUrl: string;
  /** Only meaningful when `kind === "cancelled"`. Raw `Subscription.cancelReason` value. */
  cancelReason?: string | null;
  /** Only meaningful when `kind === "payment_failed"`. Stripe's `attempt_count` on the invoice. */
  attemptCount?: number;
};

/** Human line for the cancellation reason, shown only for known values. */
const CANCEL_REASON_LABELS: Record<string, string> = {
  customer: "Cancelled by the customer",
  owner: "Cancelled from your admin",
  stripe:
    "Ended by Stripe (payment failed after retries, or removed in Stripe)",
  payment_failed: "Payment failed",
};

export default function OwnerSubscriptionNotificationEmail({
  businessName,
  businessLogoUrl,
  kind,
  customerEmail,
  customerName,
  productName,
  variantName,
  quantity,
  intervalLabel,
  perDeliveryCents,
  adminUrl,
  cancelReason,
  attemptCount,
}: OwnerSubscriptionNotificationEmailProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const heading =
    kind === "new"
      ? `New subscription: ${productName}`
      : kind === "payment_failed"
        ? "Payment failed for a subscription"
        : `Subscription cancelled: ${productName}`;

  const previewText =
    kind === "new"
      ? "New subscription received"
      : kind === "payment_failed"
        ? "Payment failed for a subscription"
        : "Subscription cancelled";

  const bodyMessage =
    kind === "new"
      ? `${customerName ?? customerEmail} just subscribed to ${productName}${variantName ? ` — ${variantName}` : ""}.`
      : kind === "payment_failed"
        ? `A payment failed for ${customerName ?? customerEmail}'s ${productName}${variantName ? ` — ${variantName}` : ""} subscription.`
        : `${customerName ?? customerEmail} has cancelled their ${productName}${variantName ? ` — ${variantName}` : ""} subscription.`;

  const cancelReasonLabel =
    kind === "cancelled" && cancelReason
      ? CANCEL_REASON_LABELS[cancelReason]
      : undefined;

  return (
    <EmailLayout
      previewText={previewText}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={textHeading}>{heading}</Text>

      <Text style={paragraph}>{bodyMessage}</Text>

      {kind === "payment_failed" && attemptCount !== undefined && (
        <Text style={paragraph}>
          Stripe attempt #{attemptCount} — Stripe will keep retrying per your
          dunning settings; the customer has been emailed to update their card.
        </Text>
      )}

      {/* Subscription Details */}
      <Section style={detailsBox}>
        <Row style={detailRow}>
          <Column>
            <Text style={detailLabel}>Customer</Text>
          </Column>
          <Column style={detailValueCol}>
            <Text style={detailValue}>{customerName ?? customerEmail}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column>
            <Text style={detailLabel}>Email</Text>
          </Column>
          <Column style={detailValueCol}>
            <Text style={detailValue}>{customerEmail}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column>
            <Text style={detailLabel}>Product</Text>
          </Column>
          <Column style={detailValueCol}>
            <Text style={detailValue}>
              {productName}
              {variantName && ` — ${variantName}`}
            </Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column>
            <Text style={detailLabel}>Quantity</Text>
          </Column>
          <Column style={detailValueCol}>
            <Text style={detailValue}>{quantity}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column>
            <Text style={detailLabel}>Billing frequency</Text>
          </Column>
          <Column style={detailValueCol}>
            <Text style={detailValue}>{intervalLabel}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column>
            <Text style={detailLabel}>Charge per delivery</Text>
          </Column>
          <Column style={detailValueCol}>
            <Text style={detailValue}>{formatPrice(perDeliveryCents)}</Text>
          </Column>
        </Row>

        {cancelReasonLabel && (
          <Row style={detailRow}>
            <Column>
              <Text style={detailLabel}>Reason</Text>
            </Column>
            <Column style={detailValueCol}>
              <Text style={detailValue}>{cancelReasonLabel}</Text>
            </Column>
          </Row>
        )}
      </Section>

      {/* CTA Button */}
      <Section style={buttonSection}>
        <Button href={adminUrl} style={button}>
          View in admin
        </Button>
      </Section>

      {/* Footer text */}
      <Text style={note}>
        {kind === "new"
          ? "Congratulations on the new subscription! Manage it from your admin dashboard."
          : kind === "payment_failed"
            ? "Review payment failures in your admin dashboard."
            : "Review subscription details in your admin dashboard."}
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
