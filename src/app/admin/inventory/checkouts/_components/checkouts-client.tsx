"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarClock, Info, Plus, Search } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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

import { formatCalendarDate, formatZonedDate } from "../_lib/format";
import { InventoryTabs } from "../../_components/inventory-tabs";
import { AdminEmpty } from "../../../_components/admin-empty";
import { AdminFilters } from "../../../_components/admin-filters";
import { AdminPagination } from "../../../_components/admin-pagination";
import {
  DANGER_TEXT,
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../../_components/admin-table-style";
import { CheckoutStatusBadge } from "./checkout-status-badge";

type CheckoutListOutput = RouterOutputs["inventoryCheckout"]["list"];
type CheckoutRow = CheckoutListOutput["rows"][number];
type CheckoutStatus = "open" | "overdue" | "closed" | "all";

type Props = {
  rows: CheckoutRow[];
  totalCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
  counts: CheckoutListOutput["counts"];
  status: CheckoutStatus;
  search: string;
  timeZone: string;
  /** `inventoryRentals` flag — gates starting NEW check-outs only. */
  rentalsEnabled: boolean;
};

const BASE_PATH = "/admin/inventory/checkouts";
const ITEM_NOUN = { one: "check-out", many: "check-outs" } as const;

const TH = TABLE_HEAD;
const TD = TABLE_CELL;

const TAB_CLASS =
  "focus-visible:outline-ring inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
const TAB_ACTIVE = "border-primary text-primary";
const TAB_INACTIVE =
  "text-muted-foreground hover:border-border hover:text-foreground border-transparent";

const STATUS_TABS: { value: CheckoutStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

/** Tab strip over the table: one link per status, carrying every other param except `page`. */
function StatusTabs({
  status,
  counts,
}: {
  status: CheckoutStatus;
  counts: CheckoutListOutput["counts"];
}) {
  const searchParams = useSearchParams();

  const hrefFor = (target: CheckoutStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (target === "open") params.delete("status");
    else params.set("status", target);
    const qs = params.toString();
    return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
  };

  // `counts` only covers open/overdue/closed (see the router doc) — "All"
  // has no badge rather than a number that would need a second query.
  const badgeFor = (value: CheckoutStatus): number | null => {
    if (value === "open") return counts.open;
    if (value === "overdue") return counts.overdue;
    if (value === "closed") return counts.closed;
    return null;
  };

  return (
    <nav aria-label="Check-out status" className="border-border mb-6 border-b">
      <div className="no-scrollbar -mb-px flex overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const badge = badgeFor(tab.value);
          return (
            <Link
              key={tab.value}
              href={hrefFor(tab.value)}
              aria-current={status === tab.value ? "page" : undefined}
              className={cn(
                TAB_CLASS,
                status === tab.value ? TAB_ACTIVE : TAB_INACTIVE,
              )}
            >
              {tab.label}
              {badge !== null && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function emptyStateFor(status: CheckoutStatus): {
  title: string;
  description: string;
} {
  switch (status) {
    case "overdue":
      return {
        title: "Nothing overdue",
        description: "Every open check-out is on schedule.",
      };
    case "closed":
      return {
        title: "No closed check-outs yet",
        description:
          "Check-ins show up here once every unit on a check-out has come back.",
      };
    case "all":
      return {
        title: "No check-outs yet",
        description:
          "Check rental items out to an event or client to see them here.",
      };
    case "open":
    default:
      return {
        title: "No open check-outs",
        description:
          "Check rental items out to an event or client to see them here.",
      };
  }
}

export function CheckoutsClient({
  rows,
  totalCount,
  page,
  pageCount,
  pageSize,
  counts,
  status,
  search,
  timeZone,
  rentalsEnabled,
}: Props) {
  const hasResults = rows.length > 0;
  // Search and status both narrow the result — page doesn't.
  const filtersNarrow = search !== "" || status !== "open";

  const newCheckoutButton = rentalsEnabled ? (
    <Button asChild>
      <Link href={`${BASE_PATH}/new`}>
        <Plus className="h-4 w-4" />
        New check-out
      </Link>
    </Button>
  ) : null;

  const emptyState = emptyStateFor(status);

  return (
    <div className="admin-container">
      <InventoryTabs rentalsEnabled={rentalsEnabled} />

      <div className="admin-header">
        <div>
          <h1>Check-outs</h1>
          <p>
            Check rental inventory out to an event or client, then check it back
            in — partial returns, damage and loss included.
          </p>
        </div>
        {newCheckoutButton}
      </div>

      {!rentalsEnabled && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Rental check-outs are turned off</AlertTitle>
          <AlertDescription>
            You can still view and check in existing check-outs. Turn Rental
            Check-outs on in Settings → Features to start new ones.
          </AlertDescription>
        </Alert>
      )}

      <StatusTabs status={status} counts={counts} />

      <AdminFilters
        basePath={BASE_PATH}
        searchPlaceholder="Search by event or client…"
        searchAriaLabel="Search check-outs by label or customer name"
        filters={[]}
        resultCount={totalCount}
        itemNoun={ITEM_NOUN}
      />

      {!hasResults ? (
        <AdminEmpty
          icon={filtersNarrow && search !== "" ? Search : CalendarClock}
          title={
            search !== "" ? "No check-outs match your search" : emptyState.title
          }
          description={search !== "" ? undefined : emptyState.description}
          filtered={search !== ""}
          action={
            search !== "" ? (
              <Button variant="outline" asChild>
                <Link href={BASE_PATH}>Clear filters</Link>
              </Button>
            ) : (
              (newCheckoutButton ?? undefined)
            )
          }
        />
      ) : (
        <>
          <Card className={TABLE_CARD}>
            <Table>
              <TableCaption className="sr-only">Check-outs</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className={TH}>
                    Label
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={cn("hidden md:table-cell", TH)}
                  >
                    Customer
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={cn("hidden md:table-cell", TH)}
                  >
                    Checked out
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={cn("hidden md:table-cell", TH)}
                  >
                    Due back
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={cn("hidden md:table-cell", TH)}
                  >
                    Items / Units out
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={cn("hidden md:table-cell", TH)}
                  >
                    Outstanding
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={cn("hidden md:table-cell", TH)}
                  >
                    Status
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={cn("hidden md:table-cell", TH)}
                  >
                    By
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const dueLabel = formatCalendarDate(row.dueBackOn);
                  const checkedOutLabel = formatZonedDate(
                    row.checkedOutAt,
                    timeZone,
                  );
                  const by = row.createdBy?.name ?? row.createdBy?.email ?? "—";

                  return (
                    <TableRow key={row.id}>
                      <TableCell className={cn("whitespace-normal", TD)}>
                        <div className="min-w-0">
                          <Link
                            href={`${BASE_PATH}/${row.id}`}
                            className="font-medium break-words hover:underline"
                          >
                            {row.label}
                          </Link>
                          <div className="mt-1 md:hidden">
                            {row.customerName && (
                              <p className="text-sm break-words">
                                {row.customerName}
                              </p>
                            )}
                            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                              <CheckoutStatusBadge
                                status={row.status}
                                overdue={row.overdue}
                              />
                              <span aria-hidden="true">·</span>
                              <span>Out {checkedOutLabel}</span>
                              {row.dueBackOn && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={cn(
                                      "tabular-nums",
                                      row.overdue && DANGER_TEXT,
                                    )}
                                  >
                                    Due {dueLabel}
                                  </span>
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              <span>
                                {row.lineCount}{" "}
                                {row.lineCount === 1 ? "item" : "items"} ·{" "}
                                {row.unitsOut} out
                              </span>
                              {row.outstanding > 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-foreground font-medium tabular-nums">
                                    {row.outstanding} outstanding
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(
                          "hidden whitespace-normal md:table-cell",
                          TD,
                        )}
                      >
                        {row.customerName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell
                        className={cn("hidden tabular-nums md:table-cell", TD)}
                      >
                        {checkedOutLabel}
                      </TableCell>

                      <TableCell
                        className={cn("hidden tabular-nums md:table-cell", TD)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={row.overdue ? DANGER_TEXT : undefined}
                          >
                            {dueLabel}
                          </span>
                          {row.overdue && (
                            <span className="text-destructive text-xs font-medium">
                              Overdue
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn("hidden tabular-nums md:table-cell", TD)}
                      >
                        {row.lineCount} {row.lineCount === 1 ? "item" : "items"}{" "}
                        · {row.unitsOut} out
                      </TableCell>

                      <TableCell
                        className={cn(
                          "hidden tabular-nums md:table-cell",
                          TD,
                          row.outstanding > 0 && "font-medium",
                        )}
                      >
                        {row.outstanding}
                      </TableCell>

                      <TableCell className={cn("hidden md:table-cell", TD)}>
                        <CheckoutStatusBadge
                          status={row.status}
                          overdue={row.overdue}
                        />
                      </TableCell>

                      <TableCell
                        className={cn(
                          "hidden whitespace-normal md:table-cell",
                          TD,
                        )}
                      >
                        {by}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <AdminPagination
            page={page}
            totalPages={pageCount}
            totalCount={totalCount}
            pageSize={pageSize}
            basePath={BASE_PATH}
            itemNoun={ITEM_NOUN}
          />
        </>
      )}
    </div>
  );
}
