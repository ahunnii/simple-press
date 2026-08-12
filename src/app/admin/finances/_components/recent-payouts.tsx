"use client";

import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatCurrency } from "~/lib/utils";

type BreakdownData = RouterOutputs["finance"]["getBreakdown"];

function PayoutStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    in_transit: "bg-blue-100 text-blue-800",
    pending: "bg-gray-100 text-gray-700",
    failed: "bg-red-100 text-red-800",
    canceled: "bg-red-100 text-red-800",
  };
  const label: Record<string, string> = {
    paid: "Paid",
    in_transit: "In Transit",
    pending: "Pending",
    failed: "Failed",
    canceled: "Canceled",
  };
  const cls = variants[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label[status] ?? status}
    </span>
  );
}

export function RecentPayouts({
  recentPayouts,
  isStripeConnected,
}: {
  recentPayouts: BreakdownData["recentPayouts"];
  isStripeConnected: BreakdownData["isStripeConnected"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Payouts</CardTitle>
        <CardDescription>Last 5 payouts to your bank account</CardDescription>
      </CardHeader>
      <CardContent>
        {!isStripeConnected ? (
          <p className="text-muted-foreground text-sm">
            Connect your Stripe account in{" "}
            <Link
              href="/admin/settings/integrations"
              className="underline underline-offset-2"
            >
              Settings → Integrations
            </Link>{" "}
            to view payouts.
          </p>
        ) : !recentPayouts || recentPayouts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No payouts yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Estimated Arrival</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-medium">
                    {formatCurrency(payout.amount, payout.currency)}
                  </TableCell>
                  <TableCell>
                    <PayoutStatusBadge status={payout.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(payout.arrival_date * 1000).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
