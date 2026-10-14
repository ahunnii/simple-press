"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, History, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import type { InvoiceEventType } from "~/lib/validators/invoice";
import type { RouterOutputs } from "~/trpc/react";
import { downloadCsv } from "~/lib/csv-download";
import {
  invoiceEventActorFallback,
  invoiceEventGroup,
  invoiceEventLabel,
  metadataSummary,
} from "~/lib/invoices/event-format";
import {
  INVOICE_EVENT_TYPE_GROUPS,
  INVOICE_EVENT_TYPE_LABELS,
} from "~/lib/validators/invoice";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { AdminEmpty } from "../../../_components/admin-empty";
import { AdminPagination } from "../../../_components/admin-pagination";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../../_components/admin-table-style";
import { EventTime } from "../../[id]/_components/invoice-activity";

type ActivityRow = RouterOutputs["invoice"]["activity"]["rows"][number];

type Filters = {
  type?: InvoiceEventType;
  from?: string;
  to?: string;
  search?: string;
};

type Props = {
  rows: ActivityRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  /** `Business.timeZone` — the zone `EventTime` renders in. */
  timeZone: string;
  filters: Filters;
};

const BASE_PATH = "/admin/invoices/activity";
const ITEM_NOUN = { one: "event", many: "events" } as const;

function hasActiveFilters(filters: Filters): boolean {
  return !!filters.type || !!filters.from || !!filters.to || !!filters.search;
}

/** Payments read as good news, Problems as trouble, everything else neutral —
 *  the same tinting `reasonBadgeVariant` does for the inventory log. */
function eventBadgeVariant(
  type: string,
): "secondary" | "success" | "destructive" {
  switch (invoiceEventGroup(type)) {
    case "Payments":
      return "success";
    case "Problems":
      return "destructive";
    default:
      return "secondary";
  }
}

/** `actor.name` can be "" (not null), so check emptiness explicitly rather
 *  than falling through on nullishness. */
function byLabel(row: ActivityRow): string {
  if (row.actor?.name) return row.actor.name;
  if (row.actor?.email) return row.actor.email;
  return invoiceEventActorFallback(row.type) ?? "—";
}

function customerLabel(invoice: ActivityRow["invoice"]): string {
  return invoice.customerName.trim() !== ""
    ? invoice.customerName
    : invoice.customerEmail;
}

function detailsLabel(row: ActivityRow): string | null {
  const summary = metadataSummary(row.metadata);
  return summary.length > 0 ? summary.join(" · ") : null;
}

/**
 * Search / event / date-range filters. Not built on `AdminFilters`: its
 * filters render as plain options in a popover, and the event filter here is
 * a grouped select (Sending / Payments / Problems) shown inline. Search
 * submits on Enter (or the button), same as `AdminFilters`; the selects and
 * dates navigate on change, carrying whatever is typed in the search box.
 */
function ActivityFilterBar({
  filters,
  resultCount,
}: {
  filters: Filters;
  resultCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = hasActiveFilters(filters);

  const searchParam = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(searchParam);
  const [lastSearchParam, setLastSearchParam] = useState(searchParam);
  // Re-seed the box when the URL param changes out from under us (back/forward,
  // Clear filters, the "View all activity" link). Typing never changes
  // `searchParam`, so this can't clobber in-progress input.
  if (searchParam !== lastSearchParam) {
    setLastSearchParam(searchParam);
    setSearch(searchParam);
  }

  const navigate = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    // A filter change must never strand the admin on a page number the
    // narrowed result set doesn't have.
    params.delete("page");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${BASE_PATH}?${qs}` : BASE_PATH);
  };

  /** Merge the typed-but-unsubmitted search into a filter change so it isn't
   *  silently discarded. Callers that set `search` themselves win. */
  const navigateKeepingSearch = (overrides: Record<string, string | null>) =>
    navigate({ search: search.trim() || null, ...overrides });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = search.trim();
    // An unchanged query must not navigate — it would throw away the page.
    if (next === searchParam) return;
    navigate({ search: next === "" ? null : next });
  };

  return (
    <div className="bg-card mb-6 rounded-lg border p-4">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <div className="flex min-w-[240px] flex-[2] flex-col gap-2">
          <Label htmlFor="invoice-activity-search">Search</Label>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              />
              <Input
                id="invoice-activity-search"
                type="text"
                placeholder="Invoice number, customer name or email"
                value={search}
                maxLength={100}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <Label htmlFor="invoice-activity-type-filter">Event</Label>
          <Select
            value={filters.type ?? "all"}
            onValueChange={(value) =>
              navigateKeepingSearch({ type: value === "all" ? null : value })
            }
          >
            <SelectTrigger id="invoice-activity-type-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {INVOICE_EVENT_TYPE_GROUPS.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {INVOICE_EVENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[150px] flex-col gap-2">
          <Label htmlFor="invoice-activity-from-filter">From</Label>
          <Input
            key={filters.from ?? "no-from"}
            id="invoice-activity-from-filter"
            type="date"
            defaultValue={filters.from ?? ""}
            max={filters.to}
            onChange={(e) =>
              navigateKeepingSearch({ from: e.target.value || null })
            }
          />
        </div>
        <div className="flex min-w-[150px] flex-col gap-2">
          <Label htmlFor="invoice-activity-to-filter">To</Label>
          <Input
            key={filters.to ?? "no-to"}
            id="invoice-activity-to-filter"
            type="date"
            defaultValue={filters.to ?? ""}
            min={filters.from}
            onChange={(e) =>
              navigateKeepingSearch({ to: e.target.value || null })
            }
          />
        </div>

        {active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground md:mb-0.5"
            onClick={() => {
              setSearch("");
              navigate({ search: null, type: null, from: null, to: null });
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <span
        role="status"
        aria-live="polite"
        className="text-muted-foreground mt-3 block text-xs"
      >
        {active
          ? `${resultCount} ${resultCount === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} found`
          : ""}
      </span>
    </div>
  );
}

/** Matches `INVOICE_ACTIVITY_EXPORT_MAX_ROWS` in
 *  `src/server/api/routers/invoice.ts` — kept as a display-only constant here
 *  rather than imported, since that router file pulls in server-only Prisma
 *  types this client component can't bundle. */
const EXPORT_MAX_ROWS_LABEL = "20,000";

function ExportActivityButton({ filters }: { filters: Filters }) {
  const exportMutation = api.invoice.exportActivity.useMutation({
    onSuccess: (data) => {
      downloadCsv(data.csv, data.filename);
      if (data.capped) {
        toast.warning(`Exported the first ${EXPORT_MAX_ROWS_LABEL} rows`);
      } else {
        toast.success("Activity exported");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to export activity");
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      type: filters.type,
      from: filters.from,
      to: filters.to,
      search: filters.search,
    });
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={exportMutation.isPending}
    >
      {exportMutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {exportMutation.isPending ? "Exporting…" : "Export CSV"}
    </Button>
  );
}

export function InvoiceActivityClient({
  rows,
  totalCount,
  page,
  totalPages,
  pageSize,
  timeZone,
  filters,
}: Props) {
  const active = hasActiveFilters(filters);
  const hasRows = rows.length > 0;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <ExportActivityButton filters={filters} />
      </div>

      <ActivityFilterBar filters={filters} resultCount={totalCount} />

      {!hasRows ? (
        <AdminEmpty
          icon={active ? Search : History}
          title={
            active ? "No activity matches your filters" : "No activity yet"
          }
          description={
            active
              ? undefined
              : "When invoices are created, sent, viewed or paid, it shows up here."
          }
          filtered={active}
          action={
            active ? (
              <Button variant="outline" asChild>
                <Link href={BASE_PATH}>Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Card className={TABLE_CARD}>
            <Table>
              <TableCaption className="sr-only">Invoice activity</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className={TABLE_HEAD}>
                    When
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`min-w-[8rem] ${TABLE_HEAD}`}
                  >
                    Invoice
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Customer
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Event
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden lg:table-cell ${TABLE_HEAD}`}
                  >
                    By
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden min-w-[12rem] xl:table-cell ${TABLE_HEAD}`}
                  >
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const label = invoiceEventLabel(row.type);
                  const details = detailsLabel(row);
                  const by = byLabel(row);
                  const variant = eventBadgeVariant(row.type);

                  return (
                    <TableRow key={row.id}>
                      <TableCell
                        className={`${TABLE_CELL} text-sm whitespace-normal md:whitespace-nowrap`}
                      >
                        <EventTime date={row.createdAt} timeZone={timeZone} />
                      </TableCell>
                      <TableCell
                        className={`min-w-[8rem] ${TABLE_CELL} whitespace-normal`}
                      >
                        <Link
                          href={`/admin/invoices/${row.invoice.id}`}
                          className="text-foreground font-medium whitespace-nowrap tabular-nums hover:underline"
                        >
                          {row.invoice.displayNumber}
                        </Link>
                        {/* Reflow below md/lg/xl, where those columns are
                            hidden. */}
                        <div className="mt-0.5 md:hidden">
                          <p className="text-sm break-words">
                            {customerLabel(row.invoice)}
                          </p>
                          <div className="mt-0.5">
                            <Badge variant={variant}>{label}</Badge>
                          </div>
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-xs lg:hidden">
                          By {by}
                        </div>
                        {details && (
                          <div className="text-muted-foreground mt-0.5 text-xs xl:hidden">
                            {details}
                          </div>
                        )}
                      </TableCell>
                      <TableCell
                        className={`hidden whitespace-normal md:table-cell ${TABLE_CELL}`}
                      >
                        {customerLabel(row.invoice)}
                      </TableCell>
                      <TableCell
                        className={`hidden md:table-cell ${TABLE_CELL}`}
                      >
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell
                        className={`hidden whitespace-normal lg:table-cell ${TABLE_CELL}`}
                      >
                        {by}
                      </TableCell>
                      <TableCell
                        className={`hidden max-w-64 min-w-[12rem] whitespace-normal xl:table-cell ${TABLE_CELL}`}
                      >
                        {details ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            basePath={BASE_PATH}
            itemNoun={ITEM_NOUN}
          />
        </>
      )}
    </>
  );
}
