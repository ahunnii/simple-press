import Link from "next/link";
import { Eye } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";

const BASE_PATH = "/admin/orders";

// Short local aliases, matching the Customers/Products tables' convention.
const TH = TABLE_HEAD;
const TD = TABLE_CELL;

// Hoisted out of the component: constructing a new Intl.DateTimeFormat on
// every render (what this file used to do) is wasted work — the format
// never varies per row.
const ORDER_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/**
 * `status` is an unconstrained `String` column (not a DB enum), so a raw value
 * outside the four documented ones is possible — fall back to it verbatim
 * rather than rendering a blank badge.
 */
function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Same convention as the Discounts table: `success` is the platform-wide
 * "this is the good state" variant, and the neutral in-flight state is
 * `outline` (Discounts uses it for "scheduled"). Open is the majority state
 * on this page, so it stays visually quiet — the colors that carry meaning
 * (green Completed, red Cancelled/Oversold, amber flags) are the exceptions
 * an owner scans for.
 */
function statusVariant(
  status: string,
): "success" | "outline" | "destructive" | "secondary" {
  if (status === "completed") return "success";
  if (status === "open") return "outline";
  if (status === "cancelled") return "destructive";
  return "secondary";
}

type OrderRow = RouterOutputs["order"]["getAll"]["orders"][number];

/**
 * The conditional flag badges — partial fulfillment, pickup, oversell — used
 * in BOTH the desktop Status cell and the md:hidden reflow line. A single
 * source so the two can't drift, and so "Oversold" (the one that matters most:
 * money was taken for stock that isn't there) can't silently vanish on a
 * narrow screen because only one of two hand-written copies was updated.
 */
function OrderFlagBadges({ order }: { order: OrderRow }) {
  return (
    <>
      {/* paymentStatus has a filter but previously no visual in the row.
          Cancelled orders are excluded: nobody is awaiting payment on an
          order that will never be paid, and the badge would read as a
          problem needing action. A completed-but-pending order (e.g. a
          manual order marked done without payment) IS worth flagging. */}
      {order.paymentStatus === "pending" && order.status !== "cancelled" && (
        <Badge variant="warning">Awaiting payment</Badge>
      )}
      {order.fulfillmentStatus === "partially_fulfilled" && (
        <Badge variant="warning">Partially fulfilled</Badge>
      )}
      {order.deliveryMethod === "pickup" && (
        <Badge variant="warning">Pickup</Badge>
      )}
      {order.subscriptionId && <Badge variant="secondary">Subscription</Badge>}
      {order.hasOversell && <Badge variant="destructive">Oversold</Badge>}
    </>
  );
}

type Props = {
  orders: RouterOutputs["order"]["getAll"]["orders"];
};

export function OrdersTable({ orders }: Props) {
  return (
    <Card className={TABLE_CARD}>
      <Table>
        <TableCaption className="sr-only">Orders</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className={TH}>
              Order
            </TableHead>
            {/* Below md, Customer / Items / Total / Status all collapse into
                the secondary line under the order number — identity (the
                order number) and the View action are what a phone needs to
                keep in place. */}
            <TableHead scope="col" className={`hidden md:table-cell ${TH}`}>
              Customer
            </TableHead>
            <TableHead scope="col" className={`hidden md:table-cell ${TH}`}>
              Items
            </TableHead>
            <TableHead scope="col" className={`hidden md:table-cell ${TH}`}>
              Total
            </TableHead>
            <TableHead scope="col" className={`hidden md:table-cell ${TH}`}>
              Status
            </TableHead>
            <TableHead scope="col" className={`${TH} text-right`}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const customerDisplayName =
              order.customerName ?? order.customerEmail;

            return (
              <TableRow key={order.id}>
                <TableCell className={`${TD} whitespace-normal`}>
                  <div className="min-w-0">
                    {/* The link is the ORDER NUMBER text only, not the whole
                        cell — an anchor wrapping the number and date together
                        would give assistive tech an accessible name that runs
                        both lines into one. */}
                    <Link
                      href={`${BASE_PATH}/${order.id}`}
                      className="font-medium hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                    <p className="text-muted-foreground text-sm">
                      {ORDER_DATE_FORMAT.format(new Date(order.createdAt))}
                    </p>
                    {/* Below md the Customer, Items, Total and Status columns
                        are hidden — reflow them here rather than lose them.
                        Every value carries its own noun for the same reason
                        Customers' reflow line does: the column headers that
                        supplied that meaning are `display:none` at this
                        width. */}
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                      <span>{customerDisplayName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-foreground font-medium tabular-nums">
                        {formatPrice(order.total)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {order.itemCount}{" "}
                        {order.itemCount === 1 ? "item" : "items"}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{statusLabel(order.status)}</span>
                      <OrderFlagBadges order={order} />
                    </div>
                  </div>
                </TableCell>

                <TableCell className={`hidden md:table-cell ${TD}`}>
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium">
                      {customerDisplayName}
                    </p>
                    {order.customerName ? (
                      <p className="text-muted-foreground line-clamp-1 text-sm">
                        {order.customerEmail}
                      </p>
                    ) : null}
                  </div>
                </TableCell>

                <TableCell
                  className={`hidden md:table-cell ${TD} text-foreground tabular-nums`}
                >
                  {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                </TableCell>

                <TableCell
                  className={`hidden md:table-cell ${TD} text-foreground font-medium tabular-nums`}
                >
                  {formatPrice(order.total)}
                </TableCell>

                <TableCell className={`hidden md:table-cell ${TD}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={statusVariant(order.status)}>
                      {statusLabel(order.status)}
                    </Badge>
                    <OrderFlagBadges order={order} />
                  </div>
                </TableCell>

                <TableCell className={`${TD} text-right`}>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`${BASE_PATH}/${order.id}`}>
                      <Eye aria-hidden="true" className="mr-2 h-4 w-4" />
                      View
                      {/* Without this the accessible name is the bare word
                          "View" on every row, so a screen reader's link list
                          on a 25-row page reads "View, View, View…" — 25
                          identical entries, none of which says whose order it
                          opens. */}
                      <span className="sr-only">
                        {" "}
                        order {order.orderNumber}
                      </span>
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
