import Link from "next/link";
import { FileText } from "lucide-react";

import type { InvoicesPageTemplateProps } from "../../_templates/types";
import { formatInvoiceDateLabel } from "~/lib/invoices/format";
import { ymdToUtcMidnight } from "~/lib/invoices/status";
import { formatPrice } from "~/lib/prices";
import { Badge } from "~/components/ui/badge";

/**
 * Invoices — shared account-page content, the read-only counterpart to
 * `rewards-content.tsx`. There is nothing to mutate here (no client
 * interactivity), so unlike `RewardsContent` this is a plain server
 * component: `getMine` already carries a fresh, freshly-tokened `viewPath`
 * per row, and "View invoice" just navigates to the hosted page.
 *
 * Exported so `DefaultInvoicesPage` and every per-template wrapper (dream,
 * happy-bamboo, olive, umsc, wealth — see the plan's step 5) render the same
 * list, re-skinned with each template's own CSS variables. Nothing here
 * reaches for a template-specific color; it only uses the shared shadcn
 * tokens (`text-foreground`, `text-muted-foreground`, `border`) so it drops
 * into any template unchanged.
 */

export type InvoicesData = InvoicesPageTemplateProps["invoices"];
export type InvoiceRow = InvoicesData[number];

type InvoiceBadgeVariant =
  | "success"
  | "warning"
  | "destructive"
  | "outline"
  | "secondary";

/**
 * The label + `Badge` variant for one invoice row.
 *
 * Priority mirrors the hosted page's status pill: a cancelled invoice reads
 * "Cancelled" even if it was overdue when it was cancelled; a paid invoice
 * reads "Paid" even past its due date; `isOverdue` (already computed by the
 * router from the SENT/PARTIALLY_PAID + due-date rule) beats "Partially
 * paid"; and a plain open invoice with time left reads "Awaiting payment" —
 * the row already shows its due date in the line below (`Issued … · Due …`),
 * so the badge doesn't repeat it.
 */
export function invoiceRowBadge(
  invoice: Pick<InvoiceRow, "status" | "isOverdue" | "dueDate">,
): { label: string; variant: InvoiceBadgeVariant } {
  if (invoice.status === "CANCELLED") {
    return { label: "Cancelled", variant: "secondary" };
  }
  if (invoice.status === "PAID") {
    return { label: "Paid", variant: "success" };
  }
  if (invoice.isOverdue) {
    return { label: "Overdue", variant: "destructive" };
  }
  if (invoice.status === "PARTIALLY_PAID") {
    return { label: "Partially paid", variant: "warning" };
  }
  return { label: "Awaiting payment", variant: "outline" };
}

export function InvoicesContent({ invoices }: { invoices: InvoicesData }) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText
          className="text-muted-foreground mb-4 h-10 w-10"
          aria-hidden="true"
        />
        <h2 className="text-foreground text-xl font-medium">No invoices yet</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Invoices from this business will show up here once one is sent to you.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-border flex flex-col divide-y">
      {invoices.map((invoice) => {
        const badge = invoiceRowBadge(invoice);
        const balanceNote =
          invoice.status === "CANCELLED"
            ? null
            : invoice.balanceCents > 0
              ? `${formatPrice(invoice.balanceCents)} due`
              : "Paid in full";

        return (
          <div
            key={invoice.id}
            className="flex flex-col gap-4 py-6 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <p className="text-foreground text-sm font-medium">
                  {invoice.displayNumber}
                </p>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="text-muted-foreground text-[13px]">
                {invoice.issueDate
                  ? `Issued ${formatInvoiceDateLabel(ymdToUtcMidnight(invoice.issueDate))}`
                  : null}
                {invoice.issueDate && invoice.dueDate ? " · " : null}
                {invoice.dueDate
                  ? `Due ${formatInvoiceDateLabel(ymdToUtcMidnight(invoice.dueDate))}`
                  : null}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex flex-col sm:items-end">
                <p className="text-foreground text-base font-semibold">
                  {formatPrice(invoice.totalCents)}
                </p>
                {balanceNote && (
                  <p className="text-muted-foreground text-[13px]">
                    {balanceNote}
                  </p>
                )}
              </div>
              <Link
                href={invoice.viewPath}
                className="inline-flex items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
              >
                View invoice <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
