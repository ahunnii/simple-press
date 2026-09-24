import { Button, Column, Link, Row, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

export type OverdueInvoiceRow = {
  /** Formatted invoice number, e.g. "INV-0012". */
  displayNumber: string;
  customerName: string;
  balanceCents: number;
  /** Pre-formatted, e.g. "September 20, 2026". */
  dueDateLabel: string;
  adminUrl: string;
};

type InvoiceOverdueOwnerEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  count: number;
  invoices: OverdueInvoiceRow[];
  /** Link to /admin/invoices?status=overdue. */
  viewAllUrl: string;
};

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export default function InvoiceOverdueOwnerEmail({
  businessName,
  businessLogoUrl,
  count,
  invoices,
  viewAllUrl,
}: InvoiceOverdueOwnerEmailProps) {
  return (
    <EmailLayout
      previewText={`${count} invoice${count === 1 ? "" : "s"} became past due`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>
        {count} invoice{count === 1 ? "" : "s"} became past due
      </Text>
      <Text style={paragraph}>
        The following invoice{count === 1 ? "" : "s"} from {businessName}{" "}
        {count === 1 ? "has" : "have"} passed its due date without full
        payment.
      </Text>

      <Section style={listSection}>
        {invoices.map((invoice, index) => (
          <Row key={index} style={listRow}>
            <Column style={listDetails}>
              <Text style={listPrimary}>
                <Link href={invoice.adminUrl} style={listLink}>
                  {invoice.displayNumber}
                </Link>{" "}
                — {invoice.customerName}
              </Text>
              <Text style={listMeta}>Due {invoice.dueDateLabel}</Text>
            </Column>
            <Column style={listAmount}>
              <Text style={listAmountText}>
                {formatPrice(invoice.balanceCents)}
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Section style={buttonSection}>
        <Button href={viewAllUrl} style={button}>
          View overdue invoices
        </Button>
      </Section>
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

const listSection = {
  marginBottom: "24px",
};

const listRow = {
  padding: "12px 0",
  borderBottom: "1px solid #e5e7eb",
};

const listDetails = {
  width: "70%",
};

const listPrimary = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1f2937",
  margin: "0 0 4px 0",
};

const listLink = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const listMeta = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0",
};

const listAmount = {
  width: "30%",
  textAlign: "right" as const,
};

const listAmountText = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#b91c1c",
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
