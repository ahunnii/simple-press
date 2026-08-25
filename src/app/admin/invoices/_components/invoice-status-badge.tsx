import { AlertTriangle } from "lucide-react";

import type { QboInvoiceStatus } from "~/lib/validators/quickbooks";
import {
  QBO_INVOICE_STATUS_LABELS,
  QBO_INVOICE_STATUS_VALUES,
} from "~/lib/validators/quickbooks";
import { Badge } from "~/components/ui/badge";

/**
 * Variant per `QboInvoiceStatus`, using the same vocabulary the Orders and
 * Discounts status badges settled on:
 *
 * - `success` is the platform-wide "this is the good state" — `paid` is the
 *   terminal good outcome here, exactly as `completed` is on an order. It was
 *   `default` (a solid primary fill), which is the loudest chip on the page
 *   and made every paid invoice shout louder than the overdue ones.
 * - `secondary` is in-flight and unremarkable (`created`, `sent`), the
 *   majority state on a healthy table, so it stays visually quiet.
 * - `outline` is neutral/parked (`pending`, `voided`) — Orders uses it for
 *   `open`, Discounts for `scheduled`.
 * - `destructive` is the two states an owner scans for. `error` additionally
 *   gets an icon: it shares `overdue`'s colour, and "the sync broke" and "the
 *   customer is late" are different problems that need different actions.
 */
const STATUS_VARIANT: Record<
  string,
  "success" | "secondary" | "destructive" | "outline"
> = {
  paid: "success",
  sent: "secondary",
  created: "secondary",
  overdue: "destructive",
  error: "destructive",
  voided: "outline",
  pending: "outline",
};

// Same idiom as `toInvoiceStatus` in the router: `status` is a plain `string`
// prop (rows may come from hand-edited data or a future status not yet
// known to this component), so the tuple is the guard that lets the label
// lookup be a safe direct property access rather than an unchecked index.
const KNOWN_STATUSES: readonly string[] = QBO_INVOICE_STATUS_VALUES;

export function InvoiceStatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "outline";
  const label = KNOWN_STATUSES.includes(status)
    ? QBO_INVOICE_STATUS_LABELS[status as QboInvoiceStatus]
    : status;

  return (
    <Badge variant={variant}>
      {status === "error" && (
        <AlertTriangle aria-hidden="true" className="h-3 w-3" />
      )}
      {label}
    </Badge>
  );
}
