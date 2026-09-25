import { Column, Row, Section, Text } from "@react-email/components";

export type InvoiceSummaryLineItem = {
  description: string;
  quantity: number;
  /** Line total in cents (unit price × quantity), not the unit price. */
  amountCents: number;
};

export type InvoiceSummaryProps = {
  invoiceNumber: string;
  /** The balance the customer still owes, in cents — the headline figure. */
  amountDueCents: number;
  /** Pre-formatted, e.g. "September 30, 2026". */
  dueDateLabel: string;
  lineItems: InvoiceSummaryLineItem[];
  subtotalCents?: number;
  discountCents?: number;
  taxCents?: number;
  totalCents?: number;
  amountPaidCents?: number;
  /** The remaining balance — shown only when non-zero, same figure as `amountDueCents`. */
  balanceCents?: number;
  /**
   * Payment METHOD NAMES only (e.g. "Bank transfer", "Venmo") — never account
   * numbers, routing numbers or handles. Full details live only on the
   * signed hosted page, not in email.
   */
  paymentMethodLabels?: string[];
};

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

/**
 * The line-items + totals + "ways to pay" block shared by every invoice
 * email. Deliberately never renders account numbers or handles — those are
 * safe only on the signed hosted page, which this component never sees.
 */
export function InvoiceSummary({
  invoiceNumber,
  amountDueCents,
  dueDateLabel,
  lineItems,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  amountPaidCents,
  balanceCents,
  paymentMethodLabels = [],
}: InvoiceSummaryProps) {
  const visibleLineItems = lineItems.slice(0, 5);
  const hiddenCount = lineItems.length - visibleLineItems.length;

  const totalsRows: Array<{ label: string; value: string; emphasize?: boolean }> =
    [];
  if (subtotalCents) {
    totalsRows.push({ label: "Subtotal", value: formatPrice(subtotalCents) });
  }
  if (discountCents) {
    totalsRows.push({
      label: "Discount",
      value: `-${formatPrice(discountCents)}`,
    });
  }
  if (taxCents) {
    totalsRows.push({ label: "Tax", value: formatPrice(taxCents) });
  }
  if (totalCents) {
    totalsRows.push({
      label: "Total",
      value: formatPrice(totalCents),
      emphasize: true,
    });
  }
  if (amountPaidCents) {
    totalsRows.push({
      label: "Paid",
      value: `-${formatPrice(amountPaidCents)}`,
    });
  }
  if (balanceCents) {
    totalsRows.push({
      label: "Balance due",
      value: formatPrice(balanceCents),
      emphasize: true,
    });
  }

  return (
    <>
      <Section style={amountBox}>
        <Text style={amountLabel}>Amount due</Text>
        <Text style={amountValue}>{formatPrice(amountDueCents)}</Text>
        <Text style={amountMeta}>
          Invoice {invoiceNumber} · Due {dueDateLabel}
        </Text>
      </Section>

      {visibleLineItems.length > 0 && (
        <Section style={itemsSection}>
          {visibleLineItems.map((item, index) => (
            <Row key={index} style={itemRow}>
              <Column style={itemDetails}>
                <Text style={itemName}>{item.description}</Text>
                <Text style={itemQty}>Qty: {item.quantity}</Text>
              </Column>
              <Column style={itemPrice}>
                <Text style={priceText}>{formatPrice(item.amountCents)}</Text>
              </Column>
            </Row>
          ))}
          {hiddenCount > 0 && (
            <Text style={moreText}>
              and {hiddenCount} more item{hiddenCount === 1 ? "" : "s"}
            </Text>
          )}
        </Section>
      )}

      {totalsRows.length > 0 && (
        <Section style={totalsSection}>
          {totalsRows.map((row, index) => (
            <Row key={index} style={totalRow}>
              <Column>
                <Text style={row.emphasize ? totalFinal : totalLabel}>
                  {row.label}
                </Text>
              </Column>
              <Column style={totalValue}>
                <Text style={row.emphasize ? totalFinal : totalLabel}>
                  {row.value}
                </Text>
              </Column>
            </Row>
          ))}
        </Section>
      )}

      {paymentMethodLabels.length > 0 && (
        <Section style={paySection}>
          <Text style={sectionHeading}>Ways to pay</Text>
          {paymentMethodLabels.map((label, index) => (
            <Text key={index} style={payItem}>
              • {label}
            </Text>
          ))}
        </Section>
      )}
    </>
  );
}

// Styles
const amountBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "20px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const amountLabel = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  fontWeight: "600",
  margin: "0 0 4px 0",
};

const amountValue = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 8px 0",
};

const amountMeta = {
  fontSize: "13px",
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

const moreText = {
  fontSize: "12px",
  color: "#6b7280",
  fontStyle: "italic" as const,
  margin: "8px 0 0 0",
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

const totalFinal = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0",
};

const paySection = {
  marginBottom: "24px",
};

const sectionHeading = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  marginBottom: "8px",
};

const payItem = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#374151",
  margin: "0",
};
