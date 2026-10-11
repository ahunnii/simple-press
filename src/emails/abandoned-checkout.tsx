import {
  Button,
  Column,
  Img,
  Row,
  Section,
  Text,
} from "@react-email/components";

import { EmailLayout } from "./components/layout";

/** One line the shopper left in their cart; `unitAmount` is in cents. */
export type AbandonedCheckoutItem = {
  name: string;
  variantName?: string;
  quantity: number;
  unitAmount: number;
  imageUrl?: string;
};

/** Rows listed in the email; anything beyond collapses to "and N more". */
const MAX_ITEM_ROWS = 10;

type AbandonedCheckoutEmailProps = {
  customerName?: string;
  businessName: string;
  businessLogoUrl?: string;
  businessUrl: string;
  /** Optional owner-customized intro paragraph, shown under the heading. */
  introText?: string;
  /** When non-empty, the email lists what was in the cart. */
  items?: AbandonedCheckoutItem[];
};

export default function AbandonedCheckoutEmail({
  customerName,
  introText,
  businessName,
  businessLogoUrl,
  businessUrl,
  items,
}: AbandonedCheckoutEmailProps) {
  const hasItems = !!items && items.length > 0;
  const shownItems = hasItems ? items.slice(0, MAX_ITEM_ROWS) : [];
  const hiddenCount = hasItems ? items.length - shownItems.length : 0;
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <EmailLayout
      previewText={`You left items in your cart at ${businessName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>You left items in your cart</Text>

      {introText && (
        <Text style={{ ...paragraph, whiteSpace: "pre-line" }}>
          {introText}
        </Text>
      )}

      <Text style={paragraph}>Hi {customerName ?? "there"},</Text>

      {hasItems ? (
        <>
          <Text style={paragraph}>
            It looks like you started checking out at {businessName} but
            didn&apos;t finish. Here&apos;s what was in your cart:
          </Text>

          <Section style={itemsSection}>
            {shownItems.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column style={itemImageCell}>
                  {item.imageUrl ? (
                    <Img
                      src={item.imageUrl}
                      alt={item.name}
                      width={64}
                      height={64}
                      style={itemImage}
                    />
                  ) : (
                    <div style={itemImagePlaceholder} />
                  )}
                </Column>
                <Column style={itemDetails}>
                  <Text style={itemName}>{item.name}</Text>
                  {item.variantName && (
                    <Text style={itemMeta}>{item.variantName}</Text>
                  )}
                  <Text style={itemMeta}>Qty: {item.quantity}</Text>
                </Column>
                <Column style={itemPrice}>
                  <Text style={priceText}>
                    {formatPrice(item.unitAmount * item.quantity)}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>
          {hiddenCount > 0 && (
            <Text style={moreItems}>
              and {hiddenCount} more {hiddenCount === 1 ? "item" : "items"}
            </Text>
          )}

          <Text style={paragraph}>
            Your cart is saved on the device and browser you were using, so head
            back to finish checking out. Prices and availability are confirmed
            at checkout.
          </Text>
        </>
      ) : (
        <Text style={paragraph}>
          It looks like you started checking out at {businessName} but
          didn&apos;t finish. Your cart is saved on the device and browser you
          were using, so head back to finish checking out.
        </Text>
      )}

      <Text style={paragraph}>
        If you&apos;re on a different device, your cart may be empty — you can
        browse the shop and add your items again.
      </Text>

      <Section style={buttonSection}>
        <Button href={`${businessUrl}/cart`} style={button}>
          Return to your cart
        </Button>
      </Section>

      <Text style={note}>
        If you have questions or ran into a problem checking out, reply to this
        email and the store will get back to you.
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

const itemsSection = {
  marginBottom: "16px",
};

const itemRow = {
  padding: "12px 0",
  borderBottom: "1px solid #e5e7eb",
};

const itemImageCell = {
  width: "80px",
  verticalAlign: "top" as const,
};

const itemImage = {
  borderRadius: "8px",
  objectFit: "cover" as const,
};

const itemImagePlaceholder = {
  width: "64px",
  height: "64px",
  borderRadius: "8px",
  backgroundColor: "#f3f4f6",
};

const itemDetails = {
  verticalAlign: "top" as const,
};

const itemName = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 4px 0",
};

const itemMeta = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 2px 0",
};

const itemPrice = {
  width: "90px",
  textAlign: "right" as const,
  verticalAlign: "top" as const,
};

const priceText = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1f2937",
  margin: "0",
};

const moreItems = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 16px 0",
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
