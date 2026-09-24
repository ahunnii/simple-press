import type { InvoiceStatusTone } from "./format";
import type { InvoiceStatus } from "~/lib/validators/invoice";
import { Badge } from "~/components/ui/badge";

import { invoiceStatusDisplay } from "./format";

/**
 * Status badge for a NATIVE invoice (`INVOICE_STATUS_VALUES`), distinct from
 * `~/app/admin/invoices/_components/invoice-status-badge.tsx` which speaks the
 * QuickBooks vocabulary (`QboInvoiceStatus`) — the two never share rows, so
 * this one is scoped to `[id]/_components` rather than renamed over it.
 */
const TONE_VARIANT: Record<
  InvoiceStatusTone,
  "secondary" | "success" | "warning" | "destructive"
> = {
  neutral: "secondary",
  success: "success",
  warning: "warning",
  danger: "destructive",
};

type Props = {
  status: InvoiceStatus;
  isOverdue: boolean;
  className?: string;
};

export function NativeInvoiceStatusBadge({
  status,
  isOverdue,
  className,
}: Props) {
  const { label, tone } = invoiceStatusDisplay(status, isOverdue);
  return (
    <Badge variant={TONE_VARIANT[tone]} className={className}>
      {label}
    </Badge>
  );
}
