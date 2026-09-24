import { Button, Column, Link, Row, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";

export type DigestInvoiceRow = {
  /** Formatted invoice number, e.g. "INV-0012". */
  displayNumber: string;
  customerName: string;
  balanceCents: number;
  /** Pre-formatted, e.g. "September 20, 2026". */
  dueDateLabel: string;
  isOverdue: boolean;
  adminUrl: string;
};

type InvoiceWeeklyDigestEmailProps = {
  businessName: string;
  businessLogoUrl?: string;
  outstandingCount: number;
  outstandingCents: number;
  overdueCount: number;
  overdueCents: number;
  /** Total collected across all invoices in the last 7 days, in cents. */
  collectedLast7DaysCents: number;
  /** Up to 20 rows, overdue rows first. */
  invoices: DigestInvoiceRow[];
  /** Link to /admin/invoices. */
  viewAllUrl: string;
};

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export default function InvoiceWeeklyDigestEmail({
  businessName,
  businessLogoUrl,
  outstandingCount,
  outstandingCents,
  overdueCount,
  overdueCents,
  collectedLast7DaysCents,
  invoices,
  viewAllUrl,
}: InvoiceWeeklyDigestEmailProps) {
  return (
    <EmailLayout
      previewText={`Your weekly invoice summary for ${businessName}`}
      businessName={businessName}
      logoUrl={businessLogoUrl}
    >
      <Text style={heading}>Your weekly invoice summary</Text>
      <Text style={paragraph}>Here&apos;s where things stand this week.</Text>

      <Section style={statsSection}>
        <Row>
          <Column style={statCol}>
            <Text style={statLabel}>Outstanding</Text>
            <Text style={statValue}>{formatPrice(outstandingCents)}</Text>
            <Text style={statMeta}>
              {outstandingCount} invoice{outstandingCount === 1 ? "" : "s"}
            </Text>
          </Column>
          <Column style={statCol}>
            <Text style={statLabel}>Overdue</Text>
            <Text style={{ ...statValue, color: "#b91c1c" }}>
              {formatPrice(overdueCents)}
            </Text>
            <Text style={statMeta}>
              {overdueCount} invoice{overdueCount === 1 ? "" : "s"}
            </Text>
          </Column>
          <Column style={statCol}>
            <Text style={statLabel}>Collected (7 days)</Text>
            <Text style={{ ...statValue, color: "#059669" }}>
              {formatPrice(collectedLast7DaysCents)}
            </Text>
          </Column>
        </Row>
      </Section>

      {invoices.length > 0 && (
        <Section style={listSection}>
          {invoices.map((invoice, index) => (
            <Row key={index} style={listRow}>
              <Column style={listDetails}>
                <Text style={listPrimary}>
                  <Link href={invoice.adminUrl} style={listLink}>
                    {invoice.displayNumber}
                  </Link>{" "}
                  — {invoice.customerName}
                  {invoice.isOverdue && (
                    <span style={overdueBadge}> Overdue</span>
                  )}
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
      )}

      <Section style={buttonSection}>
        <Button href={viewAllUrl} style={button}>
          View all invoices
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

const statsSection = {
  marginBottom: "24px",
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
};

const statCol = {
  width: "33%",
  textAlign: "center" as const,
};

const statLabel = {
  fontSize: "11px",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  fontWeight: "600",
  margin: "0 0 4px 0",
};

const statValue = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 2px 0",
};

const statMeta = {
  fontSize: "11px",
  color: "#9ca3af",
  margin: "0",
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

const overdueBadge = {
  color: "#b91c1c",
  fontSize: "11px",
  fontWeight: "700" as const,
  textTransform: "uppercase" as const,
  marginLeft: "4px",
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
