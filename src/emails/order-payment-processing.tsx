import { Text } from "@react-email/components";

import type { AbandonedCheckoutItem } from "./abandoned-checkout";

import { EmailLayout } from "./components/layout";
import { PaymentItemsList } from "./components/payment-items-list";

type OrderPaymentProcessingEmailProps = {
  customerName?: string;
  businessName: string;
  businessLogoUrl?: string;
  /** Optional owner-customized intro paragraph, shown under the heading. */
  introText?: string;
  items?: AbandonedCheckoutItem[];
  /** Order total in cents. */
  amountTotal: number;
};

export default function OrderPaymentProcessingEmail({
  customerName,
  businessName,
  businessLogoUrl,
  introText,
  items,
  amountTotal,
}: OrderPaymentProcessingEmailProps) {
  return (
    <EmailLayout
      previewText={`We've received your order at ${businessName} — your bank payment is processing`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>We&apos;ve received your order</Text>

      {introText && (
        <Text style={{ ...paragraph, whiteSpace: "pre-line" }}>
          {introText}
        </Text>
      )}

      <Text style={paragraph}>Hi {customerName ?? "there"},</Text>

      <Text style={paragraph}>
        Thank you for your order at {businessName}. Your bank payment is
        processing. Bank payments usually take a few business days to clear.
      </Text>

      <PaymentItemsList items={items} amountTotal={amountTotal} />

      <Text style={paragraph}>
        Once your payment clears, we&apos;ll email you your order confirmation.
        Nothing will ship or be made ready until then, so there&apos;s nothing
        more you need to do right now.
      </Text>

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

const note = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  textAlign: "center" as const,
};
