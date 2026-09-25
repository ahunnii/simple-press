import { Badge } from "~/components/ui/badge";

/**
 * Shared by the list table and the detail header so the two can't disagree
 * on what a check-out's status reads as. `status` is the raw DB column
 * (`"open" | "closed"`); `overdue` — {@link isCheckoutOverdue} — wins over it,
 * matching the list's own Overdue tab/filter rule.
 */
export function CheckoutStatusBadge({
  status,
  overdue,
}: {
  status: string;
  overdue: boolean;
}) {
  if (overdue) return <Badge variant="destructive">Overdue</Badge>;
  if (status === "closed") return <Badge variant="secondary">Closed</Badge>;
  return <Badge variant="outline">Open</Badge>;
}
