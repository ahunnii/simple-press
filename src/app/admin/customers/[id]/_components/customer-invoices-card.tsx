"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import type { UnifiedInvoiceStatus } from "~/lib/invoices/unified-list";
import { UNIFIED_INVOICE_STATUS_LABELS } from "~/lib/invoices/unified-list";
import { formatPrice } from "~/lib/prices";
import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type Props = {
  customerId: string;
  customerEmail: string;
};

/** `getForCustomer` only ever returns native rows, so only these five apply. */
const STATUS_VARIANT: Record<
  UnifiedInvoiceStatus,
  "success" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  outstanding: "secondary",
  partially_paid: "secondary",
  paid: "success",
  cancelled: "outline",
  pending: "outline",
  error: "destructive",
};

const DUE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  // `dueDate` is a calendar date stored as UTC midnight — format it in UTC so
  // the printed day never drifts a day off in a browser west of UTC.
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const MAX_ROWS_SHOWN = 5;

export function CustomerInvoicesCard({ customerId, customerEmail }: Props) {
  const { data, isPending, isError } = api.invoice.getForCustomer.useQuery({
    customerId,
  });
  const { data: flagsData } = api.features.getFlags.useQuery();
  const { isEnabled } = useFeatureFlags({ flags: flagsData?.flags ?? {} });
  const invoicesEnabled = isEnabled("invoices");

  if (isError) return null;
  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading invoices...</p>
        </CardContent>
      </Card>
    );
  }

  // Keeps the customer page uncluttered for businesses that have never used
  // (or have turned off) Invoices and have no history with this customer —
  // owners with the feature on still see the card, even empty, as their way
  // in to bill this customer.
  if (!invoicesEnabled && data.rows.length === 0) return null;

  const rows = data.rows.slice(0, MAX_ROWS_SHOWN);
  const viewAllHref = `/admin/invoices?search=${encodeURIComponent(customerEmail)}`;
  const newInvoiceHref = `/admin/invoices/new?customerId=${customerId}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Invoices</CardTitle>
          {invoicesEnabled && (
            <Button variant="outline" size="sm" asChild>
              <Link href={newInvoiceHref}>
                <Plus className="mr-2 h-4 w-4" />
                New invoice
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Invoices for this customer</caption>
              <thead>
                <tr className="border-b">
                  <th className="text-muted-foreground px-2 py-2 text-left text-xs font-medium tracking-wider uppercase">
                    Number
                  </th>
                  <th className="text-muted-foreground px-2 py-2 text-left text-xs font-medium tracking-wider uppercase">
                    Status
                  </th>
                  <th className="text-muted-foreground px-2 py-2 text-right text-xs font-medium tracking-wider uppercase">
                    Balance
                  </th>
                  <th className="text-muted-foreground px-2 py-2 text-left text-xs font-medium tracking-wider uppercase">
                    Due
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-2">
                      {row.href ? (
                        <Link
                          href={row.href}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {row.displayNumber}
                        </Link>
                      ) : (
                        row.displayNumber
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant={STATUS_VARIANT[row.status]}>
                        {row.isOverdue &&
                        (row.status === "outstanding" ||
                          row.status === "partially_paid")
                          ? "Overdue"
                          : UNIFIED_INVOICE_STATUS_LABELS[row.status]}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatPrice(row.balanceCents)}
                    </td>
                    <td className="text-muted-foreground px-2 py-2 whitespace-nowrap">
                      {row.dueDate ? DUE_DATE_FORMAT.format(row.dueDate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.totalCount > 0 && (
          <Link
            href={viewAllHref}
            className="text-sm underline underline-offset-2"
          >
            View all invoices
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
