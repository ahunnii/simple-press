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

const BASE_PATH = "/admin/customers";

// Short local aliases, matching the Products table's convention.
const TH = TABLE_HEAD;
const TD = TABLE_CELL;

// Rendered in both the desktop "Marketing" cell and the md:hidden reflow
// line — a single constant keeps the two from ever drifting apart.
const SUBSCRIBED_LABEL = "Subscribed";

/**
 * The reflow line's counterpart for the un-subscribed state.
 *
 * The desktop cell renders a muted "—" for this, which is legible there because
 * the "Marketing" column header says what the dash is about. Below `md` that
 * header is gone, and so is every other header — so the reflow line has to
 * carry its own meaning. Rendering nothing (the obvious alternative) makes
 * "not subscribed" indistinguishable from "this row didn't render its marketing
 * state at all".
 */
const NOT_SUBSCRIBED_LABEL = "Not subscribed";

// Hoisted out of the component: constructing a new Intl.DateTimeFormat on
// every render (what this file used to do) is wasted work — the format
// never varies per row.
const JOINED_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Props = {
  customers: RouterOutputs["customer"]["list"]["customers"];
};

export function CustomersTable({ customers }: Props) {
  return (
    <Card className={TABLE_CARD}>
      <Table>
        <TableCaption className="sr-only">Customers</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className={TH}>
              Customer
            </TableHead>
            {/* Below md, Orders / Total Spent / Marketing / Joined all
                collapse into the secondary line under the customer's name.
                Identity (name or email, plus the GDPR badge) and the View
                action are what a phone needs to keep in place; the other
                four are short values that read fine inline, and losing the
                horizontal scroll is worth more than four columns of their
                own. */}
            <TableHead scope="col" className={`hidden md:table-cell ${TH}`}>
              Orders
            </TableHead>
            <TableHead scope="col" className={`hidden md:table-cell ${TH}`}>
              Total Spent
            </TableHead>
            <TableHead scope="col" className={`hidden md:table-cell ${TH}`}>
              Marketing
            </TableHead>
            <TableHead scope="col" className={`hidden md:table-cell ${TH}`}>
              Joined
            </TableHead>
            <TableHead scope="col" className={`${TH} text-right`}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const name =
              [customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(" ") || null;
            const joined = JOINED_DATE_FORMAT.format(
              new Date(customer.createdAt),
            );

            return (
              <TableRow key={customer.id}>
                <TableCell className={`${TD} whitespace-normal`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {/* The link is the NAME (or email, for a guest with no
                          name) text only, not the whole cell — an anchor
                          wrapping the name and email together would give
                          assistive tech an accessible name that runs both
                          lines into one. */}
                      <Link
                        href={`${BASE_PATH}/${customer.id}`}
                        className="font-medium hover:underline"
                      >
                        {name ?? customer.email}
                      </Link>
                      {/* Deletion-requested and anonymized are mutually
                          exclusive GDPR/CCPA states. Surfaced here — not
                          just on the detail page — because the statutory
                          clock on a deletion request is 30 days; `warning`
                          (not `destructive`) because it needs attention but
                          nothing is broken. */}
                      {customer.deletionRequestedAt &&
                      !customer.anonymizedAt ? (
                        <Badge variant="warning">Deletion requested</Badge>
                      ) : customer.anonymizedAt ? (
                        <Badge variant="secondary">Anonymized</Badge>
                      ) : null}
                    </div>
                    {name ? (
                      <p className="text-muted-foreground line-clamp-1 text-sm">
                        {customer.email}
                      </p>
                    ) : null}
                    {/* Below md the Orders, Total Spent, Marketing and
                        Joined columns are hidden — reflow them here rather
                        than lose them.

                        Every value carries its own noun ("3 orders",
                        "$240.00 spent", "Joined Jan 5") because the column
                        headers that supplied that meaning are `display:none`
                        at this width, taking their `scope="col"` associations
                        with them. A bare "$240.00 · Jan 5, 2026" reads as
                        plausibly a last-order total and a last-order date. */}
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                      <span className="text-foreground font-medium">
                        <span className="tabular-nums">
                          {customer.orderCount}
                        </span>{" "}
                        {customer.orderCount === 1 ? "order" : "orders"}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-foreground">
                        <span className="tabular-nums">
                          {formatPrice(customer.totalSpent)}
                        </span>{" "}
                        spent
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {customer.acceptsMarketing
                          ? SUBSCRIBED_LABEL
                          : NOT_SUBSCRIBED_LABEL}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Joined {joined}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell
                  className={`hidden md:table-cell ${TD} text-foreground tabular-nums`}
                >
                  {customer.orderCount}
                </TableCell>

                <TableCell
                  className={`hidden md:table-cell ${TD} text-foreground tabular-nums`}
                >
                  {formatPrice(customer.totalSpent)}
                </TableCell>

                <TableCell className={`hidden md:table-cell ${TD}`}>
                  {customer.acceptsMarketing ? (
                    <Badge variant="secondary">{SUBSCRIBED_LABEL}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell
                  className={`hidden md:table-cell ${TD} text-muted-foreground`}
                >
                  {joined}
                </TableCell>

                <TableCell className={`${TD} text-right`}>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`${BASE_PATH}/${customer.id}`}>
                      <Eye aria-hidden="true" className="mr-2 h-4 w-4" />
                      View
                      {/* Without this the accessible name is the bare word
                          "View" on every row, so a screen reader's link list
                          on a 50-row page reads "View, View, View…" — 50
                          identical entries, none of which says whose record it
                          opens, interleaved with the 50 identity links that
                          point at the same places. */}
                      <span className="sr-only"> {name ?? customer.email}</span>
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
