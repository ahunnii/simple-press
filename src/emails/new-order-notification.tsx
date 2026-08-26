import {
  Button,
  Column,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";

import { EmailLayout } from "./components/layout";

type OrderItem = {
  productName: string;
  variantName: string | null;
  quantity: number;
  total: number;
};

type NewOrderNotificationEmailProps = {
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  businessName: string;
  businessLogoUrl?: string;
  adminOrderUrl: string;
  deliveryMethod?: "ship" | "pickup";
  /** Present when this order was created from a paid subscription invoice. */
  subscription?: { intervalLabel: string; adminUrl: string };
};

export default function NewOrderNotificationEmail({
  orderNumber,
  customerName,
  customerEmail,
  items,
  subtotal,
  shipping,
  tax,
  discount,
  total,
  businessName,
  businessLogoUrl,
  adminOrderUrl,
  deliveryMethod,
  subscription,
}: NewOrderNotificationEmailProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <EmailLayout
      previewText={`New order #${orderNumber} from ${customerName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>You have a new order</Text>
      <Text style={paragraph}>
        Order #{orderNumber} was just placed. Review it in your dashboard when
        you&apos;re ready to fulfill.
      </Text>

      {subscription && (
        <Section style={subscriptionBanner}>
          <Text style={subscriptionBannerText}>
            Subscription order — every {subscription.intervalLabel}.{" "}
            <Link href={subscription.adminUrl} style={subscriptionBannerLink}>
              View subscription →
            </Link>
          </Text>
        </Section>
      )}

      <Section style={orderBox}>
        <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
        <Text style={meta}>
          {customerName}
          <br />
          {customerEmail}
        </Text>
        {deliveryMethod === "pickup" && (
          <Text style={fulfillmentBadge}>Fulfillment: In-store pickup</Text>
        )}
      </Section>

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

      <Section style={buttonSection}>
        <Button href={adminOrderUrl} style={button}>
          View order in admin
        </Button>
      </Section>

      <Text style={note}>
        This is an automated notification from your store. Customers also
        receive their own order confirmation.
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

const orderBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const orderNumberStyle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 8px 0",
};

const meta = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
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

const fulfillmentBadge = {
  fontSize: "13px",
  fontWeight: "600" as const,
  color: "#1d4ed8",
  backgroundColor: "#eff6ff",
  borderRadius: "4px",
  padding: "4px 10px",
  marginTop: "8px",
  display: "inline-block" as const,
};

const subscriptionBanner = {
  backgroundColor: "#f0f9ff",
  borderLeft: "4px solid #0284c7",
  borderRadius: "4px",
  padding: "12px 16px",
  marginBottom: "16px",
};

const subscriptionBannerText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#0c4a6e",
  margin: "0",
  fontWeight: "600" as const,
};

const subscriptionBannerLink = {
  color: "#0284c7",
  textDecoration: "underline",
};
