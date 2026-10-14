import { Section, Text } from "@react-email/components";

import type { AbandonedCheckoutItem } from "./abandoned-checkout";

import { EmailLayout } from "./components/layout";
import { PaymentItemsList } from "./components/payment-items-list";

type OrderPaymentFailedOwnerEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  customerName?: string;
  customerEmail: string;
  items?: AbandonedCheckoutItem[];
  /** Order total in cents. */
  amountTotal: number;
  stripeSessionId: string;
};

export default function OrderPaymentFailedOwnerEmail({
  businessName,
  businessLogoUrl,
  customerName,
  customerEmail,
  items,
  amountTotal,
  stripeSessionId,
}: OrderPaymentFailedOwnerEmailProps) {
  return (
    <EmailLayout
      previewText={`A customer's bank payment failed at ${businessName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>A customer&apos;s bank payment failed</Text>
      <Text style={paragraph}>
        A bank payment for an order at {businessName} didn&apos;t go through, so
        no order was created and the held stock has been released automatically.
        There&apos;s nothing you need to do, but you may want to reach out to
        the customer.
      </Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Customer</Text>
        <Text style={infoValue}>
          {customerName ? `${customerName} · ` : ""}
          {customerEmail}
        </Text>
      </Section>

      <PaymentItemsList items={items} amountTotal={amountTotal} />

      <Text style={reference}>Stripe checkout session: {stripeSessionId}</Text>
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
  marginBottom: "24px",
};

const infoBox = {
  backgroundColor: "#fee2e2",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const infoLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#991b1b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 2px 0",
};

const infoValue = {
  fontSize: "15px",
  color: "#1f2937",
  margin: "0",
};

const reference = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#9ca3af",
  wordBreak: "break-all" as const,
  margin: "0",
};
