import { Button, Column, Row, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type SubscriptionStartedEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  customerName: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  intervalLabel: string;
  perDeliveryCents: number;
  nextBillingAt?: Date | null;
  deliveryMethod: "ship" | "pickup";
  shippingAddressLines?: string[];
  manageUrl: string;
};

export default function SubscriptionStartedEmail({
  businessName,
  businessLogoUrl,
  customerName,
  productName,
  variantName,
  quantity,
  intervalLabel,
  perDeliveryCents,
  nextBillingAt,
  deliveryMethod,
  shippingAddressLines,
  manageUrl,
}: SubscriptionStartedEmailProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <EmailLayout
      previewText={`Your ${productName} subscription is confirmed`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your subscription is confirmed!</Text>

      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        Thank you for subscribing! We&apos;ll automatically charge you and send
        your order {intervalLabel.toLowerCase()}.
      </Text>

      {/* Subscription Details */}
      <Section style={detailsBox}>
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

        {nextBillingAt && (
          <Row style={detailRow}>
            <Column>
              <Text style={detailLabel}>Next charge</Text>
            </Column>
            <Column style={detailValueCol}>
              <Text style={detailValue}>{formatDate(nextBillingAt)}</Text>
            </Column>
          </Row>
        )}
      </Section>

      {/* Delivery Method */}
      {deliveryMethod === "ship" && shippingAddressLines && (
        <Section style={addressSection}>
          <Text style={sectionHeading}>Shipping Address</Text>
          <Text style={addressText}>{shippingAddressLines.join("\n")}</Text>
        </Section>
      )}

      {deliveryMethod === "pickup" && (
        <Section style={addressSection}>
          <Text style={sectionHeading}>Delivery Method</Text>
          <Text style={addressText}>For in-store pickup</Text>
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
        You can pause, skip a delivery, update your card, or cancel anytime from
        that link. If you have any questions, please reply to this email.
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
};

const addressSection = {
  marginBottom: "24px",
};

const sectionHeading = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  marginBottom: "8px",
};

const addressText = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#374151",
  margin: "0",
  whiteSpace: "pre-line" as const,
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
