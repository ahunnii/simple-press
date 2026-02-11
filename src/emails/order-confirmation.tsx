import { Button, Column, Row, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

type OrderItem = {
  productName: string;
  variantName: string | null;
  quantity: number;
  price: number;
  total: number;
};

type OrderConfirmationEmailProps = {
  orderNumber: number;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  shippingAddress?: {
    name: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  businessName: string;
  businessLogoUrl?: string;
  businessUrl: string;
  trackingUrl?: string;
};

export default function OrderConfirmationEmail({
  orderNumber,
  customerName,
  items,
  subtotal,
  shipping,
  tax,
  discount,
  total,
  shippingAddress,
  businessName,
  businessLogoUrl,
  businessUrl,
  trackingUrl,
}: OrderConfirmationEmailProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <EmailLayout
      previewText={`Order #${orderNumber} confirmed`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      {/* Greeting */}
      <Text style={heading}>Order Confirmed!</Text>
      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        Thank you for your order. We&apos;ve received your payment and will
        start processing your order shortly.
      </Text>

      {/* Order Details */}
      <Section style={orderBox}>
        <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
      </Section>

      {/* Items */}
      <Section style={itemsSection}>
        {items.map((item, index) => (
          <Row key={index} style={itemRow}>
            <Column style={itemDetails}>
              <Text style={itemName}>
                {item.productName}
                {item.variantName && ` - ${item.variantName}`}
              </Text>
              <Text style={itemQty}>Qty: {item.quantity}</Text>
            </Column>
            <Column style={itemPrice}>
              <Text style={priceText}>{formatPrice(item.total)}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      {/* Totals */}
      <Section style={totalsSection}>
        <Row style={totalRow}>
          <Column>
            <Text style={totalLabel}>Subtotal</Text>
          </Column>
          <Column style={totalValue}>
            <Text style={totalLabel}>{formatPrice(subtotal)}</Text>
          </Column>
        </Row>

        {discount > 0 && (
          <Row style={totalRow}>
            <Column>
              <Text style={totalLabel}>Discount</Text>
            </Column>
            <Column style={totalValue}>
              <Text style={discountText}>-{formatPrice(discount)}</Text>
            </Column>
          </Row>
        )}

        <Row style={totalRow}>
          <Column>
            <Text style={totalLabel}>Shipping</Text>
          </Column>
          <Column style={totalValue}>
            <Text style={totalLabel}>{formatPrice(shipping)}</Text>
          </Column>
        </Row>

        <Row style={totalRow}>
          <Column>
            <Text style={totalLabel}>Tax</Text>
          </Column>
          <Column style={totalValue}>
            <Text style={totalLabel}>{formatPrice(tax)}</Text>
          </Column>
        </Row>

        <Row
          style={{
            ...totalRow,
            borderTop: "2px solid #e5e7eb",
            paddingTop: "12px",
          }}
        >
          <Column>
            <Text style={totalFinal}>Total</Text>
          </Column>
          <Column style={totalValue}>
            <Text style={totalFinal}>{formatPrice(total)}</Text>
          </Column>
        </Row>
      </Section>

      {/* Shipping Address */}
      {shippingAddress && (
        <Section style={addressSection}>
          <Text style={sectionHeading}>Shipping Address</Text>
          <Text style={addressText}>
            {shippingAddress.name}
            <br />
            {shippingAddress.line1}
            <br />
            {shippingAddress.line2 && (
              <>
                {shippingAddress.line2}
                <br />
              </>
            )}
            {shippingAddress.city}, {shippingAddress.state}{" "}
            {shippingAddress.postalCode}
            <br />
            {shippingAddress.country}
          </Text>
        </Section>
      )}

      {/* CTA Button */}
      <Section style={buttonSection}>
        {trackingUrl ? (
          <Button href={trackingUrl} style={button}>
            Track Your Order
          </Button>
        ) : (
          <Button href={businessUrl} style={button}>
            Visit Store
          </Button>
        )}
      </Section>

      {/* Footer Note */}
      <Text style={note}>
        You&apos;ll receive another email when your order ships. If you have any
        questions, please reply to this email.
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

const orderBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const orderNumberStyle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0",
};

const itemsSection = {
  marginBottom: "24px",
};

const itemRow = {
  padding: "12px 0",
  borderBottom: "1px solid #e5e7eb",
};

const itemDetails = {
  width: "70%",
};

const itemName = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1f2937",
  margin: "0 0 4px 0",
};

const itemQty = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0",
};

const itemPrice = {
  width: "30%",
  textAlign: "right" as const,
};

const priceText = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1f2937",
  margin: "0",
};

const totalsSection = {
  marginBottom: "24px",
};

const totalRow = {
  padding: "8px 0",
};

const totalLabel = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
};

const totalValue = {
  textAlign: "right" as const,
};

const discountText = {
  fontSize: "14px",
  color: "#10b981",
  margin: "0",
};

const totalFinal = {
  fontSize: "18px",
  fontWeight: "bold",
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
  lineHeight: "20px",
  color: "#6b7280",
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
  textAlign: "center" as const,
};
