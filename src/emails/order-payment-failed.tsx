import { Button, Section, Text } from "@react-email/components";

import type { AbandonedCheckoutItem } from "./abandoned-checkout";

import { EmailLayout } from "./components/layout";
import { PaymentItemsList } from "./components/payment-items-list";

type OrderPaymentFailedEmailProps = {
  customerName?: string;
  businessName: string;
  businessLogoUrl?: string;
  businessUrl: string;
  /** Optional owner-customized intro paragraph, shown under the heading. */
  introText?: string;
  items?: AbandonedCheckoutItem[];
  /** Order total in cents. */
  amountTotal: number;
};

export default function OrderPaymentFailedEmail({
  customerName,
  businessName,
  businessLogoUrl,
  businessUrl,
  introText,
  items,
  amountTotal,
}: OrderPaymentFailedEmailProps) {
  return (
    <EmailLayout
      previewText={`Your bank payment to ${businessName} didn't go through`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your bank payment didn&apos;t go through</Text>

      {introText && (
        <Text style={{ ...paragraph, whiteSpace: "pre-line" }}>
          {introText}
        </Text>
      )}

      <Text style={paragraph}>Hi {customerName ?? "there"},</Text>

      <Text style={paragraph}>
        Unfortunately, the bank payment for your order at {businessName}{" "}
        didn&apos;t go through, so the order has been cancelled. You were not
        charged, because the payment never completed.
      </Text>

      <PaymentItemsList items={items} amountTotal={amountTotal} />

      <Text style={paragraph}>
        If you&apos;d still like these items, you can place your order again any
        time. You may want to try a different payment method.
      </Text>

      <Section style={buttonSection}>
        <Button href={businessUrl} style={button}>
          Visit {businessName}
        </Button>
      </Section>

      <Text style={note}>
        If you have questions, reply to this email and the store will get back
        to you.
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
