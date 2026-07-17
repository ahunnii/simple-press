import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type OrderStatusLinkEmailProps = {
  orderNumber: number;
  customerName: string;
  businessName: string;
  businessLogoUrl?: string;
  orderStatusUrl: string;
};

export default function OrderStatusLinkEmail({
  orderNumber,
  customerName,
  businessName,
  businessLogoUrl,
  orderStatusUrl,
}: OrderStatusLinkEmailProps) {
  return (
    <EmailLayout
      previewText={`Your order status link for order #${orderNumber}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your order status link</Text>

      <Text style={paragraph}>Hi {customerName},</Text>

      <Text style={paragraph}>
        You requested a link to check the status of your order #{orderNumber}{" "}
        from {businessName}. Use the button below to view your order details,
        including items, shipping, and tracking information.
      </Text>

      <Section style={buttonSection}>
        <Button href={orderStatusUrl} style={button}>
          View order status
        </Button>
      </Section>

      <Text style={note}>
        This link is valid for 90 days. If you didn&apos;t request it, you can
        safely ignore this email. If you have questions about your order, reply
        to this email and the store will get back to you.
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
