import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { ArrowLeft, History } from "lucide-react";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { reasonLabel } from "~/lib/inventory/reasons";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { CheckoutStatusBadge } from "../_components/checkout-status-badge";
import { formatCalendarDate, formatInstant } from "../_lib/format";
import { InventoryTabs } from "../../_components/inventory-tabs";
import { AdminEmpty } from "../../../_components/admin-empty";
import {
  DANGER_TEXT,
  SUCCESS_TEXT,
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../../_components/admin-table-style";
import { TrailHeader } from "../../../_components/trail-header";
import { CheckInDialog } from "./_components/check-in-dialog";
import { EditCheckoutDialog } from "./_components/edit-checkout-dialog";

type Props = {
  params: Promise<{ id: string }>;
};

const TH = TABLE_HEAD;
const TD = TABLE_CELL;

/** Fetch, converting a missing/foreign check-out into `notFound()` rather
 *  than letting it fall through to the generic error boundary. */
async function loadCheckout(id: string) {
  return api.inventoryCheckout.getById({ id }).catch((error: unknown) => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    return rethrowTrpcForErrorBoundary(error);
  });
}

export default async function CheckoutDetailPage({ params }: Props) {
  const { id } = await params;

  // Reads work even with `inventoryRentals` off (see the router's `coRead`
  // tier) — `rentalsEnabled` is only fetched for the tab strip, never to
  // gate this page. `../../layout.tsx` already gates `inventory`.
  await requireAdminAccess();
  const [checkout, flags] = await Promise.all([
    loadCheckout(id),
    getBusinessFlags(),
  ]);
  const rentalsEnabled = flags.isEnabled("inventoryRentals");

  const by = checkout.createdBy?.name ?? checkout.createdBy?.email ?? "—";

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Check-outs", href: "/admin/inventory/checkouts" },
          { label: checkout.label },
        ]}
      />

      <div className="admin-form-toolbar">
        <div className="toolbar-info min-w-0">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/inventory/checkouts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-base font-medium break-words">
              {checkout.label}
            </h1>
            <CheckoutStatusBadge
              status={checkout.status}
              overdue={checkout.overdue}
            />
            {checkout.customerName && (
              <span className="text-muted-foreground hidden text-sm sm:inline">
                {checkout.customerName}
              </span>
            )}
            {checkout.outstanding > 0 && (
              <span className="text-sm font-medium">
                {checkout.outstanding} outstanding
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="admin-container space-y-6">
        <InventoryTabs rentalsEnabled={rentalsEnabled} />

        <div className="flex flex-wrap items-center gap-2">
          {checkout.status === "open" && (
            <CheckInDialog checkoutId={checkout.id} lines={checkout.lines} />
          )}
          <EditCheckoutDialog
            checkout={{
              id: checkout.id,
              label: checkout.label,
              customerName: checkout.customerName,
              notes: checkout.notes,
              dueBackOnYmd: checkout.dueBackOnYmd,
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Customer</span>
                <span className="text-right font-medium break-words">
                  {checkout.customerName ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Checked out</span>
                <span className="text-right font-medium">
                  {formatInstant(checkout.checkedOutAt, checkout.timeZone)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Due back</span>
                <span
                  className={
                    checkout.overdue
                      ? `text-right font-medium ${DANGER_TEXT}`
                      : "text-right font-medium"
                  }
                >
                  {formatCalendarDate(checkout.dueBackOn)}
                </span>
              </div>
              {checkout.closedAt && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Closed</span>
                  <span className="text-right font-medium">
                    {formatInstant(checkout.closedAt, checkout.timeZone)}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Created by</span>
                <span className="text-right font-medium">{by}</span>
              </div>
              {checkout.notes && (
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p className="break-words whitespace-pre-wrap">
                    {checkout.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            <Card className={TABLE_CARD}>
              <Table>
                <TableCaption className="sr-only">
                  Items on this check-out
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col" className={TH}>
                      Item
                    </TableHead>
                    <TableHead scope="col" className={cn("text-right", TH)}>
                      Out
                    </TableHead>
                    <TableHead scope="col" className={cn("text-right", TH)}>
                      Returned
                    </TableHead>
                    <TableHead scope="col" className={cn("text-right", TH)}>
                      Damaged
                    </TableHead>
                    <TableHead scope="col" className={cn("text-right", TH)}>
                      Lost
                    </TableHead>
                    <TableHead scope="col" className={cn("text-right", TH)}>
                      Outstanding
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkout.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className={cn("whitespace-normal", TD)}>
                        {line.item ? (
                          <Link
                            href={`/admin/inventory/${line.item.id}`}
                            className="font-medium hover:underline"
                          >
                            {line.itemName}
                          </Link>
                        ) : (
                          <span>
                            {line.itemName}{" "}
                            <span className="text-muted-foreground">
                              (deleted)
                            </span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", TD)}>
                        {line.qtyOut}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", TD)}>
                        {line.qtyReturned}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", TD)}>
                        {line.qtyDamaged}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", TD)}>
                        {line.qtyLost}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          TD,
                          line.outstanding > 0 && "font-bold",
                        )}
                      >
                        {line.outstanding}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {checkout.history.length === 0 ? (
                  <div className="p-6">
                    <AdminEmpty
                      icon={History}
                      title="No activity yet"
                      description="Check-ins and write-offs for this check-out will show up here."
                    />
                  </div>
                ) : (
                  <Table>
                    <TableCaption className="sr-only">
                      History for {checkout.label}
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col" className={TH}>
                          Date
                        </TableHead>
                        <TableHead
                          scope="col"
                          className={cn("min-w-[10rem]", TH)}
                        >
                          Item
                        </TableHead>
                        <TableHead scope="col" className={TH}>
                          Reason
                        </TableHead>
                        <TableHead scope="col" className={TH}>
                          Change
                        </TableHead>
                        <TableHead scope="col" className={TH}>
                          By
                        </TableHead>
                        <TableHead
                          scope="col"
                          className={cn("min-w-[14rem]", TH)}
                        >
                          Note
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkout.history.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className={cn("whitespace-nowrap", TD)}>
                            {formatInstant(entry.createdAt, checkout.timeZone)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "min-w-[10rem] whitespace-normal",
                              TD,
                            )}
                          >
                            {entry.itemName ?? (
                              <span className="text-muted-foreground">
                                (deleted)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={TD}>
                            <Badge variant="outline">
                              {reasonLabel(entry.reason)}
                            </Badge>
                          </TableCell>
                          <TableCell className={TD}>
                            {entry.changeQty === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span
                                className={
                                  entry.changeQty > 0
                                    ? `font-medium ${SUCCESS_TEXT}`
                                    : `font-medium ${DANGER_TEXT}`
                                }
                              >
                                {entry.changeQty > 0
                                  ? `+${entry.changeQty}`
                                  : `−${Math.abs(entry.changeQty)}`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={cn("whitespace-normal", TD)}>
                            {entry.user?.name ?? entry.user?.email ?? "—"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-muted-foreground max-w-[20rem] min-w-[14rem] whitespace-normal",
                              TD,
                            )}
                          >
                            {entry.note ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const checkout = await api.inventoryCheckout
    .getById({ id })
    .catch(() => null);
  return { title: checkout ? checkout.label : "Check-out" };
}
