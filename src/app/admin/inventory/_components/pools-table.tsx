"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Edit,
  Eye,
  MoreVertical,
  Package,
  Search,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

import type { AdminFilterDef } from "../../_components/admin-filters";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
  isLowStock,
  isOutOfStock,
  isUnavailable,
  unavailableMessage,
} from "../_lib/stock-state";
import { AdminEmpty } from "../../_components/admin-empty";
import { AdminFilters } from "../../_components/admin-filters";
import { AdminPagination } from "../../_components/admin-pagination";
import {
  DANGER_TEXT,
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
  WARNING_TEXT,
} from "../../_components/admin-table-style";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";
import { PoolAdjustInventory } from "./pool-adjust-inventory";
import { PoolCreateButton } from "./pool-create-button";
import { PoolDialog } from "./pool-dialog";

type Pool = RouterOutputs["baseInventoryUnit"]["list"][number];

type Props = {
  /** The current page slice only — filtering/sorting/paging happen server-side. */
  pools: Pool[];
  /** Unfiltered total — distinguishes "no base units yet" from "no matches". */
  totalPools: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

const BASE_PATH = "/admin/inventory";
const ITEM_NOUN = { one: "base unit", many: "base units" } as const;

// Aliased to the short names this file reads with.
const TH = TABLE_HEAD;
const TD = TABLE_CELL;
/** Full-width padding, matching Services/Collections — see the TABLE_HEAD_TIGHT
 *  docblock for why the tight variant is reserved for checkbox columns now. */
const TH_ACTIONS = TABLE_HEAD;
const TD_ACTIONS = TABLE_CELL;

/**
 * Deliberately NO AdminBulkBar: there is no bulk endpoint for pools, and
 * deleting one detaches every linked product and zeroes its stock. That is not
 * an operation to make available behind a checkbox and a single click. The
 * primitives are independently adoptable; this is the page that proves it.
 */
const STOCK_FILTER: AdminFilterDef = {
  key: "stock",
  label: "Stock",
  defaultValue: "all",
  options: [
    { value: "all", label: "All base units" },
    // "Low stock" includes out of stock — see the isLowStock note in page.tsx.
    { value: "low", label: "Low or out of stock" },
    { value: "out", label: "Out of stock" },
  ],
};

/**
 * A separate filter, not a third `STOCK_FILTER` option. "Stock" is documented
 * above as physical quantity — folding availability in under that label would
 * make "Stock: Unsellable" read like a quantity claim it isn't. Its own
 * "Availability" grouping keeps the label unambiguous without touching what
 * "Stock" already promises.
 */
const AVAILABILITY_FILTER: AdminFilterDef = {
  key: "availability",
  label: "Availability",
  defaultValue: "all",
  options: [
    { value: "all", label: "All base units" },
    {
      value: "unavailable",
      label: "Unsellable (reserved out)",
    },
  ],
};

const SORT_FILTER: AdminFilterDef = {
  key: "sort",
  label: "Sort",
  defaultValue: "name-asc",
  options: [
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "qty-asc", label: "Lowest stock" },
    { value: "qty-desc", label: "Highest stock" },
    { value: "sold-desc", label: "Most units sold" },
    { value: "sold-asc", label: "Fewest units sold" },
    { value: "products-desc", label: "Most products" },
    { value: "products-asc", label: "Fewest products" },
  ],
};

/**
 * Red when out, amber when low. Shares the predicates with the server-side stock
 * filter so the colour a row shows and the filter it answers to can't disagree.
 *
 * Deliberately does NOT factor in `isUnavailable`. This tone colours the
 * `inventoryQty` NUMBER, and that number is exactly what the "Out of stock" /
 * "Low or out of stock" filters promise to describe — painting a
 * healthy-quantity, fully-reserved row the same amber as a low-quantity row
 * would make the colour lie about which filter the row answers to (it stays
 * absent from "Low or out of stock" either way). Unavailability gets its own
 * warning treatment below instead, the same way oversell events do — a
 * distinct signal that never recolours the primary number.
 */
function qtyTone(pool: Pool) {
  if (isOutOfStock(pool)) return `font-semibold ${DANGER_TEXT}`;
  if (isLowStock(pool)) return `font-semibold ${WARNING_TEXT}`;
  return "text-foreground";
}

/** Same sentence on desktop and mobile — written once so they can't drift. */
function oversellMessage(events: number) {
  return `${events} sale${events === 1 ? "" : "s"} could not be deducted — units sold may be understated`;
}

export function PoolsTable({
  pools,
  totalPools,
  totalCount,
  totalPages,
  page,
  pageSize,
}: Props) {
  const router = useRouter();
  const apiUtils = api.useUtils();

  // `editPool` deliberately survives the close. Radix keeps dialog content mounted
  // through its ~200ms exit animation, so clearing the pool at the same moment as
  // the open flag makes the title flip to "New Base Unit" and the fields blank out
  // while it fades. Holding the last pool until the next open replaces it keeps the
  // dialog showing what it was showing.
  const [editPool, setEditPool] = useState<Pool | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustPool, setAdjustPool] = useState<Pool | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  // Threaded alongside deleteName for the same reason it isn't cleared on
  // close: `pool._count.products` only exists on the row that was clicked, so
  // it has to be captured at that moment rather than looked up again later.
  const [deleteProductCount, setDeleteProductCount] = useState<number>(0);

  // Deleting a pool detaches every linked product, so it can take a moment. The
  // loading toast is the same one Collections and Services show — this table had
  // none, which read as nothing happening until the row disappeared.
  const deletePool = api.baseInventoryUnit.delete.useMutation({
    onMutate: loadingToast("Deleting base unit…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Base unit deleted");
      setDeleteId(null);
      void apiUtils.baseInventoryUnit.invalidate();
      router.refresh();
    },
    onError: (err, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(err.message ?? "Failed to delete base unit");
    },
  });

  const hasPools = totalPools > 0;
  const hasResults = pools.length > 0;

  return (
    <>
      {!hasPools ? (
        <AdminEmpty
          icon={Package}
          title="No base units yet"
          description="Create your first base unit to start tracking shared inventory."
          action={<PoolCreateButton label="Create Base Unit" />}
        />
      ) : (
        <>
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search base units…"
            searchAriaLabel="Search base units by name or description"
            filters={[STOCK_FILTER, AVAILABILITY_FILTER, SORT_FILTER]}
            resultCount={totalCount}
            itemNoun={ITEM_NOUN}
          />

          {!hasResults ? (
            <AdminEmpty
              icon={Search}
              title="No base units match your filters"
              // AdminEmpty renders its own "Try adjusting your search or
              // filters." line when `filtered` — don't say it twice.
              filtered
              action={
                <Button variant="outline" asChild>
                  <Link href={BASE_PATH}>Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <Card className={TABLE_CARD}>
                <Table>
                  <TableCaption className="sr-only">
                    Inventory base units
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={TH}>
                        Name
                      </TableHead>
                      {/* Never hidden at any breakpoint: the Adjust button lives
                          in this column, and it is the reason this page exists. */}
                      <TableHead scope="col" className={TH}>
                        Current Qty
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Units sold
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Products
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Threshold
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`${TH_ACTIONS} text-right`}
                      >
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pools.map((pool) => {
                      const netSold = pool.sales.netSoldUnits;
                      const returned = pool.sales.returnedUnits;
                      const oversells = pool.sales.oversellEvents;
                      const productCount = pool._count.products;
                      const reserved = pool.reservedQty;
                      const unavailable = isUnavailable(pool);

                      return (
                        <TableRow key={pool.id}>
                          <TableCell className={`${TD} whitespace-normal`}>
                            <Link
                              href={`${BASE_PATH}/${pool.id}`}
                              className="text-foreground font-medium hover:underline"
                            >
                              {pool.name}
                            </Link>
                            {pool.description && (
                              <div className="text-muted-foreground text-sm">
                                {pool.description}
                              </div>
                            )}

                            {/* Below md the Units sold, Products and Threshold
                                columns are hidden — reflow them here rather than
                                lose them. Current Qty is NOT reflowed: it keeps
                                its own column so Adjust stays one click away. */}
                            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                              <span>{netSold} sold</span>
                              {returned > 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{returned} returned</span>
                                </>
                              )}
                              {reserved > 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{reserved} reserved</span>
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              <span>
                                {productCount}{" "}
                                {productCount === 1 ? "product" : "products"}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {pool.lowInventoryThreshold !== null
                                  ? `Low at ${pool.lowInventoryThreshold}`
                                  : "No threshold"}
                              </span>
                            </div>
                            {oversells > 0 && (
                              <div
                                className={`mt-1 flex items-start gap-1 md:hidden ${WARNING_TEXT}`}
                              >
                                <AlertTriangle
                                  className="mt-px h-3 w-3 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="text-xs">
                                  <span className="sr-only">Warning: </span>
                                  {oversellMessage(oversells)}
                                </span>
                              </div>
                            )}
                            {/* Mobile counterpart to the desktop-only warning
                                inside the Current Qty cell below — that cell
                                stays number+button only on small screens so
                                Adjust doesn't get crowded, so the "nothing
                                available" signal reflows here instead. */}
                            {unavailable && (
                              <div
                                className={`mt-1 flex items-start gap-1 md:hidden ${WARNING_TEXT}`}
                              >
                                <AlertTriangle
                                  className="mt-px h-3 w-3 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="text-xs">
                                  <span className="sr-only">Warning: </span>
                                  {unavailableMessage(pool)}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className={TD}>
                            <div className="flex items-center gap-2">
                              <span className={`min-w-[4ch] text-right tabular-nums ${qtyTone(pool)}`}>
                                {pool.inventoryQty}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setAdjustPool(pool)}
                              >
                                Adjust
                                <span className="sr-only">
                                  {" "}
                                  quantity for {pool.name}
                                </span>
                              </Button>
                            </div>
                            {/* Same "one value plus caveat" idiom as Units
                                sold's "N returned" line below netSoldUnits.
                                Hidden on mobile — see the reflow comment under
                                the Name cell for why. */}
                            {reserved > 0 && (
                              <div className="text-muted-foreground hidden text-sm tabular-nums md:block">
                                {reserved} reserved
                              </div>
                            )}
                            {unavailable && (
                              <div
                                className={`mt-1 hidden max-w-56 items-start gap-1 md:flex ${WARNING_TEXT}`}
                              >
                                <AlertTriangle
                                  className="mt-px h-3 w-3 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="text-xs">
                                  <span className="sr-only">Warning: </span>
                                  {unavailableMessage(pool)}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          {/* whitespace-normal so the oversell sentence wraps —
                              TableCell is nowrap by default, which would push the
                              table far past the viewport. */}
                          <TableCell
                            className={`hidden md:table-cell ${TD} whitespace-normal`}
                          >
                            <div className="text-foreground tabular-nums">
                              {netSold}
                            </div>
                            {returned > 0 && (
                              <div className="text-muted-foreground text-sm tabular-nums">
                                {returned} returned
                              </div>
                            )}
                            {oversells > 0 && (
                              <div
                                className={`mt-1 flex max-w-56 items-start gap-1 ${WARNING_TEXT}`}
                              >
                                <AlertTriangle
                                  className="mt-px h-3 w-3 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="text-xs">
                                  {/* Restores for screen readers the meaning the
                                      icon carries visually. */}
                                  <span className="sr-only">Warning: </span>
                                  {oversellMessage(oversells)}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell
                            className={`text-foreground hidden tabular-nums md:table-cell ${TD}`}
                          >
                            {productCount}
                          </TableCell>

                          <TableCell
                            className={`text-foreground hidden tabular-nums md:table-cell ${TD}`}
                          >
                            {pool.lowInventoryThreshold ?? (
                              <span className="text-muted-foreground">
                                <span aria-hidden="true">—</span>
                                <span className="sr-only">
                                  No threshold set
                                </span>
                              </span>
                            )}
                          </TableCell>

                          <TableCell className={`${TD_ACTIONS} text-right`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">
                                    Actions for {pool.name}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`${BASE_PATH}/${pool.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditPool(pool);
                                    setEditOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setDeleteId(pool.id);
                                    setDeleteName(pool.name);
                                    setDeleteProductCount(pool._count.products);
                                  }}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
      )}

      <PoolDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        pool={editPool ?? undefined}
      />

      {adjustPool && (
        <PoolAdjustInventory
          pool={adjustPool}
          open={!!adjustPool}
          onOpenChange={(open) => {
            if (!open) setAdjustPool(null);
          }}
        />
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteName}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the pool.{" "}
              {deleteProductCount > 0 ? (
                <>
                  {deleteProductCount} linked product
                  {deleteProductCount === 1 ? "" : "s"} will be detached and set
                  to out of stock — you&apos;ll need to restock{" "}
                  {deleteProductCount === 1 ? "it" : "them"} manually before{" "}
                  {deleteProductCount === 1 ? "it becomes" : "they become"}{" "}
                  purchasable again.
                </>
              ) : (
                "No products are currently linked to this pool."
              )}{" "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePool.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, NOT className. AlertDialogAction wraps a `Button ...
                asChild`, so a className lands on the inner Radix element while
                Button still supplies `bg-primary` — and Slot concatenates the
                two without tailwind-merge, so CSS order decides. The old
                `className="bg-red-600"` was fighting that and losing. */}
            <AlertDialogAction
              variant="destructive"
              disabled={deletePool.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteId) deletePool.mutate({ id: deleteId });
              }}
            >
              {deletePool.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
