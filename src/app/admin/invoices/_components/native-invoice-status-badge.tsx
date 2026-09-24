import { AlertTriangle } from "lucide-react";

import type { UnifiedInvoiceStatus } from "~/lib/invoices/unified-list";
import { UNIFIED_INVOICE_STATUS_LABELS } from "~/lib/invoices/unified-list";
import { Badge } from "~/components/ui/badge";

/**
 * Status chip for a native (SimplePress) invoice row, in the same variant
 * vocabulary `InvoiceStatusBadge` uses for QuickBooks rows so the two sources
 * read alike in one table:
 *
 * - `success` for the terminal good state (`paid`).
 * - `secondary` for in-flight and unremarkable (`outstanding`).
 * - `warning` for `partially_paid`: money has arrived, but not all of it.
 * - `outline` for parked/neutral (`draft`, `cancelled`, `pending`).
 * - `destructive` for what an owner scans for — overdue, and `error`.
 *
 * Overdue is a flag, not a status (see `~/lib/invoices/unified-list`), so it
 * overrides the status chip rather than being one of its values. `error`
 * carries an icon because it shares overdue's colour — the same split
 * `InvoiceStatusBadge` makes between QuickBooks `overdue` and `error`.
 */
const STATUS_VARIANT: Record<
  UnifiedInvoiceStatus,
  "success" | "secondary" | "warning" | "destructive" | "outline"
> = {
  draft: "outline",
  outstanding: "secondary",
  partially_paid: "warning",
  paid: "success",
  cancelled: "outline",
  pending: "outline",
  error: "destructive",
};

export function NativeInvoiceStatusBadge({
  status,
  isOverdue,
}: {
  status: UnifiedInvoiceStatus;
  isOverdue: boolean;
}) {
  if (isOverdue) {
    return <Badge variant="destructive">Overdue</Badge>;
  }

  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {status === "error" && (
        <AlertTriangle aria-hidden="true" className="h-3 w-3" />
      )}
      {UNIFIED_INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
