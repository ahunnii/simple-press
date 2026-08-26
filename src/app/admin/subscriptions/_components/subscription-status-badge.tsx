import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";
import { Badge } from "~/components/ui/badge";

/**
 * Variant per `Subscription.status`, using the same vocabulary the Invoices
 * and Orders status badges settled on (see `InvoiceStatusBadge`):
 *
 * - `success` is the platform-wide "this is the good state" — `active` is
 *   the healthy, billing-normally state here.
 * - `secondary` is in-flight and unremarkable — `incomplete` means checkout
 *   hasn't finished yet (no card charged, nothing to worry about).
 * - `outline` is neutral/parked — `paused` is an intentional, reversible
 *   hold; `cancelled` is terminal and nothing more will happen to it.
 * - `destructive` is the one state an owner scans for — `past_due` means a
 *   payment attempt failed and Stripe is retrying.
 *
 * No plain component prop, no "use client" — safe to render from either the
 * server-rendered detail page or the client list table.
 */
const STATUS_VARIANT: Record<
  string,
  "success" | "secondary" | "destructive" | "outline"
> = {
  active: "success",
  incomplete: "secondary",
  paused: "outline",
  past_due: "destructive",
  cancelled: "outline",
};

// `status` is a plain `String` column (not a DB enum), so a raw value outside
// the five documented ones is possible — fall back to it verbatim rather than
// rendering a blank badge. Same idiom as `InvoiceStatusBadge`'s `KNOWN_STATUSES`.
const KNOWN_STATUSES = new Set(Object.keys(SUBSCRIPTION_STATUS_LABELS));

export function SubscriptionStatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "outline";
  const label = KNOWN_STATUSES.has(status)
    ? SUBSCRIPTION_STATUS_LABELS[
        status as keyof typeof SUBSCRIPTION_STATUS_LABELS
      ]
    : status;

  return <Badge variant={variant}>{label}</Badge>;
}
