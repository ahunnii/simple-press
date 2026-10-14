import { Column, Img, Row, Section, Text } from "@react-email/components";

import type { AbandonedCheckoutItem } from "../abandoned-checkout";

/** Rows listed in the email; anything beyond collapses to "and N more". */
const MAX_ITEM_ROWS = 10;

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

/**
 * Compact item list + order total used by the bank-payment emails
 * (processing, failed, owner alert). Renders nothing when there are no items
 * and no total to show.
 */
export function PaymentItemsList({
  items,
  amountTotal,
}: {
  items?: AbandonedCheckoutItem[];
  /** Order total in cents. */
  amountTotal?: number;
}) {
  const hasItems = !!items && items.length > 0;
  const shownItems = hasItems ? items.slice(0, MAX_ITEM_ROWS) : [];
  const hiddenCount = hasItems ? items.length - shownItems.length : 0;

  return (
    <>
      {hasItems && (
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
                {item.optionsSummary && (
                  <Text style={itemMeta}>{item.optionsSummary}</Text>
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
      )}
      {hiddenCount > 0 && (
        <Text style={moreItems}>
          and {hiddenCount} more {hiddenCount === 1 ? "item" : "items"}
        </Text>
      )}
      {typeof amountTotal === "number" && (
        <Text style={totalText}>Order total: {formatPrice(amountTotal)}</Text>
      )}
    </>
  );
}

const itemsSection = {
  marginBottom: "8px",
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
  margin: "0 0 8px 0",
};

const totalText = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  textAlign: "right" as const,
  margin: "8px 0 24px 0",
};
