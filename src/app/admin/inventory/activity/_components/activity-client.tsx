"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, History, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { downloadCsv } from "~/lib/csv-download";
import {
  MANUAL_REASONS,
  ORDER_LEDGER_REASONS,
  REASON_LABELS,
  reasonLabel,
} from "~/lib/inventory/reasons";
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
  DANGER_TEXT,
  SUCCESS_TEXT,
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../../_components/admin-table-style";

type HistoryRow = RouterOutputs["baseInventoryUnit"]["history"]["rows"][number];
type ItemOption = RouterOutputs["baseInventoryUnit"]["items"]["items"][number];

type Filters = {
  itemId?: string;
  /** "all" or a `MANUAL_REASONS`/`ORDER_LEDGER_REASONS` value. */
  reason: string;
  from?: string;
  to?: string;
};

type Props = {
  rows: HistoryRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  items: ItemOption[];
  canManage: boolean;
  filters: Filters;
};

const BASE_PATH = "/admin/inventory/activity";
const ITEM_NOUN = { one: "entry", many: "entries" } as const;

/** `ORDER_LEDGER_REASONS` minus whatever `MANUAL_REASONS` already covers
 *  (`return`), so the "Order" select group doesn't repeat a row. */
const ORDER_ONLY_REASONS = ORDER_LEDGER_REASONS.filter(
  (r) => !(MANUAL_REASONS as readonly string[]).includes(r),
);

function reasonBadgeVariant(
  reason: string,
): "default" | "secondary" | "outline" | "destructive" | "success" | "warning" {
  switch (reason) {
    case "damage":
    case "lost":
      return "destructive";
    case "oversell":
      return "warning";
    case "restock":
    case "initial":
    case "checkin":
    case "return":
      return "success";
    case "sale":
      return "default";
    case "checkout":
    case "used":
      return "secondary";
    default:
      return "outline";
  }
}

function hasActiveFilters(filters: Filters): boolean {
  return (
    !!filters.itemId ||
    filters.reason !== "all" ||
    !!filters.from ||
    !!filters.to
  );
}

function byLabel(row: HistoryRow): string {
  if (row.user?.name) return row.user.name;
  if (row.user?.email) return row.user.email;
  if (row.order) return `Order #${row.order.orderNumber}`;
  return "System";
}

function ItemCell({ item }: { item: HistoryRow["item"] }) {
  if (!item) {
    return <span className="text-muted-foreground italic">Deleted item</span>;
  }
  return (
    <>
      <Link
        href={`/admin/inventory/${item.id}`}
        className="text-foreground font-medium hover:underline"
      >
        {item.name}
      </Link>
      {item.sku && (
        <div className="text-muted-foreground text-xs">{item.sku}</div>
      )}
    </>
  );
}

function ReferenceCell({
  row,
  canManage,
}: {
  row: HistoryRow;
  canManage: boolean;
}) {
  if (row.order) {
    const label = `Order #${row.order.orderNumber}`;
    return canManage ? (
      <Link href={`/admin/orders/${row.order.id}`} className="hover:underline">
        {label}
      </Link>
    ) : (
      <span>{label}</span>
    );
  }
  if (row.checkout) {
    return (
      <Link
        href={`/admin/inventory/checkouts/${row.checkout.id}`}
        className="hover:underline"
      >
        {row.checkout.label}
      </Link>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

function ChangeCell({ changeQty }: { changeQty: number }) {
  if (changeQty === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span
      className={`font-medium tabular-nums ${changeQty > 0 ? SUCCESS_TEXT : DANGER_TEXT}`}
    >
      {changeQty > 0 ? `+${changeQty}` : changeQty}
    </span>
  );
}

/**
 * Item / Reason / date-range filters. Not built on `AdminFilters`: that
 * component always renders a free-text search box, and `history()` has no
 * search param to back one — an unwired search field would look live and do
 * nothing. Reasons and item still use the same `Select` primitives and
 * navigate-on-change idiom `AdminFilters` uses internally.
 */
function ActivityFilterBar({
  items,
  filters,
  resultCount,
}: {
  items: ItemOption[];
  filters: Filters;
  resultCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = hasActiveFilters(filters);

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

  return (
    <div className="bg-card mb-6 rounded-lg border p-4">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <Label htmlFor="activity-item-filter">Item</Label>
          <Select
            value={filters.itemId ?? "all"}
            onValueChange={(value) =>
              navigate({ item: value === "all" ? null : value })
            }
          >
            <SelectTrigger id="activity-item-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.sku ? `${item.name} (${item.sku})` : item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <Label htmlFor="activity-reason-filter">Reason</Label>
          <Select
            value={filters.reason}
            onValueChange={(value) =>
              navigate({ reason: value === "all" ? null : value })
            }
          >
            <SelectTrigger id="activity-reason-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reasons</SelectItem>
              <SelectGroup>
                <SelectLabel>Manual</SelectLabel>
                {MANUAL_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {REASON_LABELS[r] ?? r}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Order</SelectLabel>
                {ORDER_ONLY_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {REASON_LABELS[r] ?? r}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[150px] flex-col gap-2">
          <Label htmlFor="activity-from-filter">From</Label>
          <Input
            key={filters.from ?? "no-from"}
            id="activity-from-filter"
            type="date"
            defaultValue={filters.from ?? ""}
            max={filters.to}
            onChange={(e) => navigate({ from: e.target.value || null })}
          />
        </div>
        <div className="flex min-w-[150px] flex-col gap-2">
          <Label htmlFor="activity-to-filter">To</Label>
          <Input
            key={filters.to ?? "no-to"}
            id="activity-to-filter"
            type="date"
            defaultValue={filters.to ?? ""}
            min={filters.from}
            onChange={(e) => navigate({ to: e.target.value || null })}
          />
        </div>

        {active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground md:mb-0.5"
            onClick={() =>
              navigate({ item: null, reason: null, from: null, to: null })
            }
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

/** Matches `INVENTORY_HISTORY_EXPORT_MAX_ROWS` in
 *  `src/server/api/routers/base-inventory-unit.ts` — kept as a display-only
 *  constant here rather than imported, since that router file pulls in
 *  server-only Prisma types this client component can't bundle. */
const EXPORT_MAX_ROWS_LABEL = "20,000";

function ExportActivityButton({ filters }: { filters: Filters }) {
  const exportMutation = api.baseInventoryUnit.exportHistory.useMutation({
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
      itemId: filters.itemId,
      reasons: filters.reason === "all" ? undefined : [filters.reason],
      from: filters.from,
      to: filters.to,
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

export function ActivityClient({
  rows,
  totalCount,
  page,
  totalPages,
  pageSize,
  items,
  canManage,
  filters,
}: Props) {
  const active = hasActiveFilters(filters);
  const hasRows = rows.length > 0;

  return (
    <>
      <div className="mb-4 flex justify-end">
        {canManage && <ExportActivityButton filters={filters} />}
      </div>

      <ActivityFilterBar
        items={items}
        filters={filters}
        resultCount={totalCount}
      />

      {!hasRows ? (
        <AdminEmpty
          icon={History}
          title={
            active ? "No activity matches your filters" : "No activity yet"
          }
          description={
            active
              ? undefined
              : "Sales, restocks, check-outs and manual adjustments will show up here."
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
              <TableCaption className="sr-only">
                Inventory activity
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className={TABLE_HEAD}>
                    Date/time
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`min-w-[10rem] ${TABLE_HEAD}`}
                  >
                    Item
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Reason
                  </TableHead>
                  <TableHead scope="col" className={TABLE_HEAD}>
                    Change
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Resulting qty
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden lg:table-cell ${TABLE_HEAD}`}
                  >
                    Reference
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden lg:table-cell ${TABLE_HEAD}`}
                  >
                    By
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden min-w-[14rem] xl:table-cell ${TABLE_HEAD}`}
                  >
                    Note
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className={`${TABLE_CELL} whitespace-nowrap`}>
                      <FormattedDate date={row.createdAt} />
                    </TableCell>
                    <TableCell
                      className={`min-w-[10rem] ${TABLE_CELL} whitespace-normal`}
                    >
                      <ItemCell item={row.item} />
                      {/* Reflow below md/lg, where those columns are hidden. */}
                      <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs md:hidden">
                        <Badge variant={reasonBadgeVariant(row.reason)}>
                          {reasonLabel(row.reason)}
                        </Badge>
                        <span>{row.newQty} on hand</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-xs lg:hidden">
                        <ReferenceCell row={row} canManage={canManage} /> ·{" "}
                        {byLabel(row)}
                      </div>
                      {row.note && (
                        <div className="text-muted-foreground mt-0.5 text-xs xl:hidden">
                          {row.note}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className={`hidden md:table-cell ${TABLE_CELL}`}>
                      <Badge variant={reasonBadgeVariant(row.reason)}>
                        {reasonLabel(row.reason)}
                      </Badge>
                    </TableCell>
                    <TableCell className={TABLE_CELL}>
                      <ChangeCell changeQty={row.changeQty} />
                    </TableCell>
                    <TableCell
                      className={`hidden tabular-nums md:table-cell ${TABLE_CELL}`}
                    >
                      {row.newQty}
                    </TableCell>
                    <TableCell className={`hidden lg:table-cell ${TABLE_CELL}`}>
                      <ReferenceCell row={row} canManage={canManage} />
                    </TableCell>
                    <TableCell className={`hidden lg:table-cell ${TABLE_CELL}`}>
                      {byLabel(row)}
                    </TableCell>
                    <TableCell
                      className={`hidden max-w-64 min-w-[14rem] whitespace-normal xl:table-cell ${TABLE_CELL}`}
                    >
                      {row.note ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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

/** `Intl.DateTimeFormat` reads the viewer's local time zone — appropriate
 *  here, unlike the business-time-zone-scoped `from`/`to` filters, since this
 *  is an admin reading a timestamp, not defining a calendar-day boundary. */
function FormattedDate({ date }: { date: Date | string }) {
  const d = typeof date === "string" ? new Date(date) : date;
  return (
    <span className="text-sm">
      {new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d)}
    </span>
  );
}
