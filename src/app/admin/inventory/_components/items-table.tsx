"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeftRight,
  Edit,
  Eye,
  MoreVertical,
  Package,
  PackageMinus,
  PackagePlus,
  Search,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

import type { AdminFilterDef } from "../../_components/admin-filters";
import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  totalOwned,
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
import { MoveStockDialog } from "./move-stock-dialog";
import { PoolAdjustInventory } from "./pool-adjust-inventory";
import { PoolCreateButton } from "./pool-create-button";
import { PoolDialog } from "./pool-dialog";

type Item = RouterOutputs["baseInventoryUnit"]["items"]["items"][number];

type Props = {
  /** The current page slice only — filtering/sorting/paging happen server-side. */
  items: Item[];
  /** Unfiltered total — distinguishes "no items yet" from "no matches". */
  totalItems: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  categories: string[];
  canManage: boolean;
  rentalsEnabled: boolean;
};

const BASE_PATH = "/admin/inventory";
const ITEM_NOUN = { one: "item", many: "items" } as const;

// Aliased to the short names this file reads with.
const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_ACTIONS = TABLE_HEAD;
const TD_ACTIONS = TABLE_CELL;

/**
 * Deliberately NO AdminBulkBar: there is no bulk endpoint for items, and
 * deleting one detaches every linked product and zeroes its stock. That is not
 * an operation to make available behind a checkbox and a single click. The
 * primitives are independently adoptable; this is the page that proves it.
 */
const STOCK_FILTER: AdminFilterDef = {
  key: "stock",
  label: "Stock",
  defaultValue: "all",
  options: [
    { value: "all", label: "All items" },
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
    { value: "all", label: "All items" },
    {
      value: "unavailable",
      label: "Unsellable (reserved out)",
    },
  ],
};

const TYPE_FILTER: AdminFilterDef = {
  key: "type",
  label: "Type",
  defaultValue: "all",
  options: [
    { value: "all", label: "All types" },
    { value: "stock", label: "Stock" },
    { value: "rental", label: "Rental" },
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
    { value: "sku-asc", label: "SKU A–Z" },
    { value: "category-asc", label: "Category A–Z" },
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
function qtyTone(item: Item) {
  if (isOutOfStock(item)) return `font-semibold ${DANGER_TEXT}`;
  if (isLowStock(item)) return `font-semibold ${WARNING_TEXT}`;
  return "text-foreground";
}

/** Same sentence on desktop and mobile — written once so they can't drift. */
function oversellMessage(events: number) {
  return `${events} sale${events === 1 ? "" : "s"} could not be deducted — units sold may be understated`;
}

export function ItemsTable({
  items,
  totalItems,
  totalCount,
  totalPages,
  page,
  pageSize,
  categories,
  canManage,
  rentalsEnabled,
}: Props) {
  const router = useRouter();
  const apiUtils = api.useUtils();

  // `editItem` deliberately survives the close. Radix keeps dialog content mounted
  // through its ~200ms exit animation, so clearing the item at the same moment as
  // the open flag makes the title flip to "New item" and the fields blank out
  // while it fades. Holding the last item until the next open replaces it keeps the
  // dialog showing what it was showing.
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [moveItem, setMoveItem] = useState<{
    item: Item;
    mode: "use" | "restock";
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  // Threaded alongside deleteName for the same reason it isn't cleared on
  // close: `item._count.products` only exists on the row that was clicked, so
  // it has to be captured at that moment rather than looked up again later.
  const [deleteProductCount, setDeleteProductCount] = useState<number>(0);

  // Deleting an item detaches every linked product, so it can take a moment. The
  // loading toast is the same one Collections and Services show.
  const deleteItem = api.baseInventoryUnit.delete.useMutation({
    onMutate: loadingToast("Deleting item…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Item deleted");
      setDeleteId(null);
      void apiUtils.baseInventoryUnit.invalidate();
      router.refresh();
    },
    onError: (err, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(err.message ?? "Failed to delete item");
    },
  });

  const hasItems = totalItems > 0;
  const hasResults = items.length > 0;

  const categoryFilter: AdminFilterDef = {
    key: "category",
    label: "Category",
    defaultValue: "all",
    options: [
      { value: "all", label: "All categories" },
      ...categories.map((category) => ({ value: category, label: category })),
    ],
  };

  const filters: AdminFilterDef[] = [
    STOCK_FILTER,
    AVAILABILITY_FILTER,
    TYPE_FILTER,
    ...(categories.length > 0 ? [categoryFilter] : []),
    SORT_FILTER,
  ];

  return (
    <>
      {!hasItems ? (
        <AdminEmpty
          icon={Package}
          title="No inventory items yet"
          description="Create your first item to start tracking stock — consumables you use up, or rentals you lend out and get back."
          action={
            canManage ? (
              <PoolCreateButton
                label="Create item"
                categories={categories}
                rentalsEnabled={rentalsEnabled}
              />
            ) : undefined
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search items…"
            searchAriaLabel="Search items by name, description, SKU, category, or location"
            filters={filters}
            resultCount={totalCount}
            itemNoun={ITEM_NOUN}
          />

          {!hasResults ? (
            <AdminEmpty
              icon={Search}
              title="No items match your filters"
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
                    Inventory items
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      {/* min-w-[14rem]: without it "4-pack roll" and longer
                          names wrap one word per line in the auto-layout
                          table, since this column has no other pressure
                          keeping it wide. */}
                      <TableHead scope="col" className={`min-w-[14rem] ${TH}`}>
                        Name
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Type
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden lg:table-cell ${TH}`}
                      >
                        Category
                      </TableHead>
                      {/* xl, not lg: with Category, On hand, Out/Total, Units
                          sold and Products all already showing by lg, adding
                          Location at the same breakpoint is what was pushing
                          the actions column out of view at 1280–1535px. */}
                      <TableHead
                        scope="col"
                        className={`hidden xl:table-cell ${TH}`}
                      >
                        Location
                      </TableHead>
                      {/* Never hidden at any breakpoint: the Adjust button lives
                          in this column, and it is the reason this page exists. */}
                      <TableHead scope="col" className={TH}>
                        On hand
                      </TableHead>
                      {rentalsEnabled && (
                        <TableHead
                          scope="col"
                          className={`hidden md:table-cell ${TH}`}
                        >
                          Out / Total
                        </TableHead>
                      )}
                      {canManage && (
                        <TableHead
                          scope="col"
                          className={`hidden 2xl:table-cell ${TH}`}
                        >
                          Unit cost
                        </TableHead>
                      )}
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Units sold
                      </TableHead>
                      {/* 2xl: the last column before Actions, and the one
                          admins lean on least day-to-day — cutting it is what
                          keeps Actions from needing a horizontal scroll at
                          1280–1535px. Still surfaced in the <md reflow row. */}
                      {canManage && (
                        <TableHead
                          scope="col"
                          className={`hidden 2xl:table-cell ${TH}`}
                        >
                          Products
                        </TableHead>
                      )}
                      <TableHead
                        scope="col"
                        className={`${TH_ACTIONS} text-right`}
                      >
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const netSold = item.sales.netSoldUnits;
                      const returned = item.sales.returnedUnits;
                      const oversells = item.sales.oversellEvents;
                      const productCount = item._count.products;
                      const reserved = item.reservedQty;
                      const unavailable = isUnavailable(item);
                      const isRental = item.itemType === "rental";

                      return (
                        <TableRow key={item.id}>
                          <TableCell
                            className={`min-w-[14rem] ${TD} whitespace-normal`}
                          >
                            <Link
                              href={`${BASE_PATH}/${item.id}`}
                              className="text-foreground font-medium hover:underline"
                            >
                              {item.name}
                            </Link>
                            {item.sku && (
                              <div className="text-muted-foreground text-xs">
                                {item.sku}
                              </div>
                            )}
                            {item.description && (
                              <div className="text-muted-foreground line-clamp-2 text-sm">
                                {item.description}
                              </div>
                            )}

                            {/* Below md/lg several columns are hidden — reflow
                                them here rather than lose them. On hand is NOT
                                reflowed: it keeps its own column so Adjust
                                stays one click away. */}
                            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                              <Badge
                                variant={isRental ? "secondary" : "outline"}
                                className="capitalize"
                              >
                                {isRental ? "Rental" : "Stock"}
                              </Badge>
                              {item.category && <span>{item.category}</span>}
                              <span>{netSold} sold</span>
                              {returned > 0 && <span>{returned} returned</span>}
                              {reserved > 0 && <span>{reserved} reserved</span>}
                              <span>
                                {productCount}{" "}
                                {productCount === 1 ? "product" : "products"}
                              </span>
                            </div>
                            {isRental && rentalsEnabled && (
                              <div className="text-muted-foreground mt-0.5 text-sm tabular-nums md:hidden">
                                {item.outQty} out / {totalOwned(item)} total
                              </div>
                            )}
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
                                  {unavailableMessage(item)}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            <Badge variant={isRental ? "secondary" : "outline"}>
                              {isRental ? "Rental" : "Stock"}
                            </Badge>
                          </TableCell>

                          <TableCell
                            className={`text-foreground hidden lg:table-cell ${TD}`}
                          >
                            {item.category ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell
                            className={`text-foreground hidden xl:table-cell ${TD}`}
                          >
                            {item.storageLocation ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className={TD}>
                            <div className="flex items-center gap-2">
                              <span
                                className={`min-w-[4ch] text-right tabular-nums ${qtyTone(item)}`}
                              >
                                {item.inventoryQty}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setAdjustItem(item)}
                              >
                                Adjust
                                <span className="sr-only">
                                  {" "}
                                  quantity for {item.name}
                                </span>
                              </Button>
                            </div>
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
                                  {unavailableMessage(item)}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          {rentalsEnabled && (
                            <TableCell
                              className={`text-foreground hidden tabular-nums md:table-cell ${TD}`}
                            >
                              {isRental ? (
                                `${item.outQty} / ${totalOwned(item)}`
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}

                          {canManage && (
                            <TableCell
                              className={`text-foreground hidden tabular-nums 2xl:table-cell ${TD}`}
                            >
                              {item.unitCostCents != null ? (
                                formatPrice(item.unitCostCents)
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}

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

                          {canManage && (
                            <TableCell
                              className={`text-foreground hidden tabular-nums 2xl:table-cell ${TD}`}
                            >
                              {productCount}
                            </TableCell>
                          )}

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
                                    Actions for {item.name}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`${BASE_PATH}/${item.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View details
                                  </Link>
                                </DropdownMenuItem>
                                {!isRental && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setMoveItem({ item, mode: "use" })
                                    }
                                  >
                                    <PackageMinus className="mr-2 h-4 w-4" />
                                    Use
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() =>
                                    setMoveItem({ item, mode: "restock" })
                                  }
                                >
                                  <PackagePlus className="mr-2 h-4 w-4" />
                                  Restock
                                </DropdownMenuItem>
                                {isRental && rentalsEnabled && (
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/admin/inventory/checkouts/new?item=${item.id}`}
                                    >
                                      <ArrowLeftRight className="mr-2 h-4 w-4" />
                                      Check out
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                {canManage && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditItem(item);
                                        setEditOpen(true);
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        setDeleteId(item.id);
                                        setDeleteName(item.name);
                                        setDeleteProductCount(
                                          item._count.products,
                                        );
                                      }}
                                    >
                                      <Trash className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
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

      {canManage && (
        <PoolDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          item={editItem ?? undefined}
          categories={categories}
          rentalsEnabled={rentalsEnabled}
        />
      )}

      {adjustItem && (
        <PoolAdjustInventory
          pool={adjustItem}
          open={!!adjustItem}
          onOpenChange={(open) => {
            if (!open) setAdjustItem(null);
          }}
        />
      )}

      {moveItem && (
        <MoveStockDialog
          item={moveItem.item}
          mode={moveItem.mode}
          open={!!moveItem}
          onOpenChange={(open) => {
            if (!open) setMoveItem(null);
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
              This will permanently delete the item.{" "}
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
                "No products are currently linked to this item."
              )}{" "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteItem.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, NOT className. AlertDialogAction wraps a `Button ...
                asChild`, so a className lands on the inner Radix element while
                Button still supplies `bg-primary` — and Slot concatenates the
                two without tailwind-merge, so CSS order decides. */}
            <AlertDialogAction
              variant="destructive"
              disabled={deleteItem.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteId) deleteItem.mutate({ id: deleteId });
              }}
            >
              {deleteItem.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
