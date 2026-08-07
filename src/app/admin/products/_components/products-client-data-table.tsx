"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type { BulkAction } from "../../_components/admin-bulk-bar";
import type { AdminFilterDef } from "../../_components/admin-filters";
import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";
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
import { Checkbox } from "~/components/ui/checkbox";
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

import { AdminBulkBar } from "../../_components/admin-bulk-bar";
import { AdminEmpty } from "../../_components/admin-empty";
import { AdminFilters } from "../../_components/admin-filters";
import { AdminPagination } from "../../_components/admin-pagination";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_CELL_TIGHT,
  TABLE_HEAD,
  TABLE_HEAD_TIGHT,
} from "../../_components/admin-table-style";
import {
  createCapDisabledReason,
  createOverCapGuard,
  createShortfallMessage,
  describeSelection,
} from "../../_lib/admin-bulk-actions";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";
import { useAdminTableSelection } from "../../_lib/use-admin-table-selection";
import { DeleteProductAlertDialog } from "./delete-product-alert-dialog";

type Product = RouterOutputs["product"]["secureList"]["products"][number];

type Props = {
  /**
   * The current page slice only. Unlike Collections and Services, the filtering,
   * sorting and paging all happened in Postgres — `product.secureList` owns it.
   */
  products: Product[];
  /** Status and Sort, defined in the page so their option lists are pinned to
   *  the same tuples `pickParam` and the router's `z.enum` use. */
  filters: AdminFilterDef[];
  /**
   * Ids of every row matching the current filters, across all pages — or `null`
   * when the server declined to enumerate them because more than
   * ADMIN_BULK_SELECTION_LIMIT match. `null` is not `[]`: an empty array is a
   * genuine "nothing matched", and conflating the two would offer a "Select all
   * 0 products" link. `useAdminTableSelection` takes this shape directly.
   */
  matchingIds: string[] | null;
  /** Does the catalog hold anything at all, IGNORING filters? Distinguishes
   *  "no products yet" from "no matches"; resolved server-side. */
  hasProducts: boolean;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Gates the WooCommerce import / WordPress export buttons. */
  isPlatformAdmin: boolean;
  /** Mirrors `product.bulkDelete`'s `ownerOnlyProcedure`, resolved server-side.
   *  False OMITS the bulk Delete action rather than disabling it — a MANAGER
   *  should see the actions they have, not a greyed list of the ones they don't. */
  canBulkDelete: boolean;
};

const BASE_PATH = "/admin/products";
const ITEM_NOUN = { one: "product", many: "products" } as const;

// Table type/density lives in ../../_components/admin-table-style so a second
// table can adopt it without copy-paste. Aliased to short names for the JSX.
const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_CHECKBOX = TABLE_HEAD_TIGHT;
const TD_CHECKBOX = TABLE_CELL_TIGHT;

/** "3 of 5" — a bulk op silently touching fewer rows than asked must say so. */
const shortfallMessage = createShortfallMessage(ITEM_NOUN);

/**
 * The figure the storefront would show: one price when every variant agrees,
 * the cheapest with a "+" when they don't.
 *
 * Variants may carry a null price, meaning "inherit the product's" — those are
 * filtered out rather than treated as zero, and a product whose variants all
 * inherit falls back to its own price, which is what a shopper sees.
 *
 * `Product.price` is a non-nullable Float in the schema, so there is no
 * priceless branch. The old inline version opened on `let displayPrice = "N/A"`
 * and guarded with `product.price != null` — both dead, and "N/A" could never
 * have rendered.
 */
function displayPriceFor(product: Product): string {
  const variantPrices = product.variants
    .map((variant) => variant.price)
    .filter((price): price is number => price !== null);

  if (variantPrices.length === 0) return formatPrice(product.price);

  const min = Math.min(...variantPrices);
  return variantPrices.every((price) => price === min)
    ? formatPrice(min)
    : `${formatPrice(min)}+`;
}

/** Both the desktop cell and the `md:hidden` reflow line render this, so the
 *  two cannot drift. */
function variantLabelFor(product: Product): string {
  const count = product._count.variants;
  if (count === 0) return "No variants";
  return `${count} ${count === 1 ? "variant" : "variants"}`;
}

export function ProductsClient({
  products,
  filters,
  matchingIds,
  hasProducts,
  totalCount,
  totalPages,
  page,
  pageSize,
  isPlatformAdmin,
  canBulkDelete,
}: Props) {
  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ── Selection ──────────────────────────────────────────────────────────────
  // Shared with Collections and Services. The hook owns which URL changes
  // invalidate a selection (any filter, but never a page or sort change), the
  // shift-click anchor, and the "select all N matching" escalation.
  //
  // This deliberately replaces the old `useEffect(() => setSelected(new Set()),
  // [products])`, which dropped the selection on every page turn AND on every
  // background refetch. Surviving a page turn is the point: selecting a few
  // rows on page 1, paging to page 2 and adding more is ordinary work.
  //
  // `matchingIds: null` (server declined to enumerate) is the hook's business
  // now, not this component's — it used to be handled here alone, which is why
  // Collections and Services silently lacked the behaviour.
  const {
    selectedIds,
    selectedCount,
    isEscalated,
    allPageSelected,
    somePageSelected,
    canEscalate,
    escalationDisabledReason,
    clearSelection,
    pruneSelection,
    handleRowToggle,
    handleSelectAllOnPage,
    handleSelectAllMatching,
    onRowClickCapture,
    onFiltersChange,
  } = useAdminTableSelection({
    rowIds: products.map((product) => product.id),
    matchingIds,
    totalCount,
    page,
    searchParams,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  // Every handler dismisses the specific loading toast it opened — see
  // dismissLoadingToast. A bare toast.dismiss() clears every toast on screen.

  const afterWrite = () => {
    void utils.product.invalidate();
    router.refresh();
  };

  const deleteMutation = api.product.delete.useMutation({
    onMutate: loadingToast("Deleting product…"),
    onSuccess: (_data, id, context) => {
      dismissLoadingToast(context);
      toast.success("Product deleted");
      pruneSelection([id]);
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _id, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete product");
    },
  });

  const duplicateMutation = api.product.duplicate.useMutation({
    onMutate: loadingToast("Duplicating product…"),
    onSuccess: (data, _id, context) => {
      dismissLoadingToast(context);
      toast.success("Product duplicated — draft saved");
      void utils.product.invalidate();
      // Products differs from Collections here on purpose: a duplicated product
      // is almost always duplicated in order to be edited (different size,
      // colourway, price), so it opens the new draft rather than returning to
      // the list.
      router.push(`${BASE_PATH}/${data.productId}`);
    },
    onError: (error, _id, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to duplicate product");
    },
  });

  // Separate from bulkPublishMutation so the undo's own success toast doesn't
  // offer another Undo, which would let the two ping-pong indefinitely.
  const undoPublishMutation = api.product.bulkSetPublished.useMutation({
    onMutate: loadingToast("Undoing…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        `Undone — ${data.count} ${
          data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
        } ${variables.published ? "published" : "unpublished"}`,
      );
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to undo");
    },
  });

  const bulkPublishMutation = api.product.bulkSetPublished.useMutation({
    onMutate: loadingToast("Updating products…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.published ? "published" : "unpublished";
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, verb));
      } else {
        // Publish/unpublish are exactly invertible, so the recovery path is a
        // single click rather than re-finding and re-selecting every row.
        // Publishing 50 products by accident is otherwise 50 undos by hand.
        //
        // Undo targets `data.changedIds` — the rows this call actually flipped,
        // computed server-side — NOT `variables.ids`. Re-sending the whole
        // selection inverted would unpublish products that were already
        // published before the bulk op, which is a second unwanted edit dressed
        // up as a recovery. Nothing flipped means nothing to undo, so the toast
        // drops the action rather than offering a no-op.
        const undoable = data.changedIds;
        toast.success(
          `${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} ${verb}`,
          undoable.length > 0
            ? {
                action: {
                  label: "Undo",
                  onClick: () =>
                    undoPublishMutation.mutate({
                      ids: undoable,
                      published: !variables.published,
                    }),
                },
              }
            : undefined,
        );
      }

      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update products");
    },
  });

  const bulkDeleteMutation = api.product.bulkDelete.useMutation({
    onMutate: loadingToast("Deleting products…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, "deleted"));
      } else {
        toast.success(
          `${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} deleted`,
        );
      }

      pruneSelection(variables.ids);
      setBulkDeleteOpen(false);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete products");
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Confirm-dialog context. Only rows on the current page are available here;
  // `describeSelection` handles the shortfall in the copy.
  const selectedOnPageRows = products.filter((product) =>
    selectedIds.has(product.id),
  );
  const selectedNames = selectedOnPageRows.map((product) => product.name);
  const deleteTarget = products.find((product) => product.id === deleteId);

  // Warn about storefront pages disappearing only when that's actually true.
  // A selection can reach past this page, and unseen rows might be published —
  // so an incomplete view has to assume the warning applies rather than omit it.
  const selectionReachesPastPage = selectedCount > selectedOnPageRows.length;
  const anySelectedPublished =
    selectionReachesPastPage ||
    selectedOnPageRows.some((product) => product.published);

  const overCap = createOverCapGuard(selectedCount, ITEM_NOUN);
  /** Delete's cap is well below the selection cap, so it can be unavailable
   *  while Publish is fine — the bar disables that one action and says why. */
  const capReason = createCapDisabledReason(selectedCount, ITEM_NOUN);
  const deleteCapReason = capReason(ADMIN_BULK_DELETE_LIMIT, "delete");

  const handleBulkPublish = (published: boolean) => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_SELECTION_LIMIT, "update")) {
      return;
    }
    bulkPublishMutation.mutate({ ids: [...selectedIds], published });
  };

  const handleBulkDelete = () => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_DELETE_LIMIT, "delete")) {
      return;
    }
    bulkDeleteMutation.mutate({ ids: [...selectedIds] });
  };

  // `undoPublishMutation` counts: it writes to the same rows the bulk bar acts
  // on, so leaving the bar live during an undo lets a second bulk action race it.
  const isBulkPending =
    bulkPublishMutation.isPending ||
    undoPublishMutation.isPending ||
    bulkDeleteMutation.isPending;

  // Publish / Unpublish / Delete only. Duplication is deliberately per-row
  // across all admin tables (see the row dropdown's `product.duplicate`) —
  // bulk-duplicating creates a pile of near-identical drafts that each need
  // editing anyway.
  const bulkActions: BulkAction[] = [
    {
      label: "Publish",
      icon: Eye,
      onClick: () => handleBulkPublish(true),
      pending:
        bulkPublishMutation.isPending &&
        bulkPublishMutation.variables?.published === true,
    },
    {
      label: "Unpublish",
      icon: EyeOff,
      onClick: () => handleBulkPublish(false),
      pending:
        bulkPublishMutation.isPending &&
        bulkPublishMutation.variables?.published === false,
    },
    // Omitted, not disabled, for a MANAGER: `bulkDelete` is `ownerOnlyProcedure`,
    // and a button that only ever produces a FORBIDDEN toast is worse than no
    // button. The procedure remains the enforcement.
    ...(canBulkDelete
      ? [
          {
            label: "Delete",
            icon: Trash2,
            variant: "destructive" as const,
            // `disabledReason` stops the click; this still checks the cap BEFORE
            // opening the dialog, for a selection grown past the cap between
            // render and click. Otherwise the user reads "Delete 43 Products?",
            // confirms, and gets an error toast while the dialog sits there with
            // no way forward.
            onClick: () => {
              if (overCap(ADMIN_BULK_DELETE_LIMIT, "delete")) return;
              setBulkDeleteOpen(true);
            },
            pending: bulkDeleteMutation.isPending,
            disabledReason: deleteCapReason,
          },
        ]
      : []),
  ];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Products</h1>
          <p>Manage your product catalog</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {isPlatformAdmin && (
            <>
              <Button variant="outline" asChild size="sm">
                <Link href={`${BASE_PATH}/export`}>
                  <Download className="mr-2 h-4 w-4" />
                  Export to WordPress
                </Link>
              </Button>

              <Button variant="outline" asChild size="sm">
                <Link href={`${BASE_PATH}/import`}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import from WooCommerce
                </Link>
              </Button>
            </>
          )}

          <Button asChild size="sm">
            <Link href={`${BASE_PATH}/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {!hasProducts ? (
        // Gated on the UNFILTERED total, so a search term that matches nothing
        // can never tell a stocked store it has no products.
        <AdminEmpty
          icon={Package}
          title="No products yet"
          description="Add what you sell — name, photos, price and stock — and it appears on your storefront as soon as you publish it."
          action={
            <Button asChild>
              <Link href={`${BASE_PATH}/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Product
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search products…"
            // Names the fields actually matched — the placeholder can't, at that
            // width, and a bare "Search products" leaves a screen-reader user
            // guessing whether typing a SKU will hit. `secureList` ORs over
            // name, slug, the product SKU and any variant's SKU, so all four are
            // named.
            searchAriaLabel="Search products by name, URL, SKU or variant SKU"
            filters={filters}
            resultCount={totalCount}
            itemNoun={ITEM_NOUN}
            onFiltersChange={onFiltersChange}
          />

          <AdminBulkBar
            count={selectedCount}
            itemNoun={ITEM_NOUN}
            actions={bulkActions}
            onClear={clearSelection}
            disabled={isBulkPending}
            // Word-for-word what Collections and Services pass — the branching
            // this used to do (available vs. withheld ids) now lives in the
            // selection hook, so the three bars cannot drift apart again.
            selectAllMatching={
              canEscalate || isEscalated
                ? {
                    total: totalCount,
                    onSelect: handleSelectAllMatching,
                    isEscalated,
                    // Describes what's blocked — selecting *all* matches — not
                    // the action itself. The current page's selection is
                    // perfectly actionable and the copy must not imply otherwise.
                    disabledReason: escalationDisabledReason,
                  }
                : undefined
            }
          />

          {products.length === 0 ? (
            <AdminEmpty
              icon={Search}
              title="No products match your filters"
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
                  <TableCaption className="sr-only">Products</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={`w-10 ${TH_CHECKBOX}`}>
                        <Checkbox
                          id="select-all-products"
                          checked={
                            allPageSelected
                              ? true
                              : somePageSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={handleSelectAllOnPage}
                          aria-label="Select all products on this page"
                        />
                      </TableHead>
                      <TableHead scope="col" className={TH}>
                        Product
                      </TableHead>
                      {/* Below md, Price / Variants / Status all collapse into
                          the secondary line under the product name. Identity
                          (photo, name, URL) and the actions menu are what a
                          phone needs to keep in place; the other three are
                          short values that read fine inline, and losing the
                          horizontal scroll is worth more than a Status column
                          of its own. */}
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Price
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Variants
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Status
                      </TableHead>
                      <TableHead scope="col" className={`${TH} text-right`}>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product, index) => {
                      const isSelected = selectedIds.has(product.id);
                      const image = product.images[0];
                      const displayPrice = displayPriceFor(product);
                      const variantLabel = variantLabelFor(product);

                      return (
                        <TableRow
                          key={product.id}
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell className={TD_CHECKBOX}>
                            <Checkbox
                              checked={isSelected}
                              onClickCapture={onRowClickCapture}
                              onCheckedChange={() => handleRowToggle(index)}
                              aria-label={`Select ${product.name}`}
                            />
                          </TableCell>

                          <TableCell className={`${TD} whitespace-normal`}>
                            <div className="flex items-center gap-3">
                              {image ? (
                                <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded">
                                  {/* alt="" — decorative. The product name is
                                      the adjacent link text, so alt text here
                                      only makes a screen reader say it twice. */}
                                  <Image
                                    src={image.url}
                                    alt=""
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                                  <Package
                                    aria-hidden="true"
                                    className="text-muted-foreground h-4 w-4"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                {/* The link is the NAME, not the whole cell.
                                    Wrapping the photo and both text lines in one
                                    anchor (what this table used to do) gives
                                    assistive tech a link whose accessible name
                                    is the name and the slug run together. */}
                                <Link
                                  href={`${BASE_PATH}/${product.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {product.name}
                                </Link>
                                <p className="text-muted-foreground line-clamp-1 text-sm">
                                  {product.slug}
                                </p>
                                {/* Below md the Price, Variants and Status
                                    columns are hidden — reflow them here rather
                                    than lose them. */}
                                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                                  <span className="text-foreground font-medium tabular-nums">
                                    {displayPrice}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{variantLabel}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    {product.published ? "Published" : "Draft"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell
                            className={`hidden md:table-cell ${TD} text-foreground tabular-nums`}
                          >
                            {displayPrice}
                          </TableCell>

                          <TableCell
                            className={`hidden md:table-cell ${TD} text-muted-foreground text-sm`}
                          >
                            {variantLabel}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {product.published ? (
                              <Badge variant="success">Published</Badge>
                            ) : (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                          </TableCell>

                          <TableCell className={`${TD} text-right`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">
                                    Actions for {product.name}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`${BASE_PATH}/${product.id}`}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                {/* Gated on `published`: the storefront 404s an
                                    unpublished product, so an ungated link was
                                    an offer to visit a broken page. */}
                                {product.published && (
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={`/shop/${product.slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={`View ${product.name} on storefront (opens in new tab)`}
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      View on storefront
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  disabled={duplicateMutation.isPending}
                                  onClick={() =>
                                    duplicateMutation.mutate(product.id)
                                  }
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(product.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
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
                // Supplied by `secureList` rather than restated, so the
                // "Showing X–Y of Z" readout can't drift from the slice.
                pageSize={pageSize}
                basePath={BASE_PATH}
                itemNoun={ITEM_NOUN}
              />
            </>
          )}
        </>
      )}

      {/* Single Delete Confirmation Dialog */}
      <DeleteProductAlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        product={deleteTarget ?? null}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        isPending={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount}{" "}
              {selectedCount === 1 ? "Product" : "Products"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              {describeSelection(selectedNames, selectedCount, ITEM_NOUN)} and{" "}
              {selectedCount === 1 ? "its" : "their"} images.
              {anySelectedPublished
                ? " Published products will stop working on your storefront."
                : ""}{" "}
              Past orders keep their own record of what was bought. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, NOT className. AlertDialogAction wraps a `Button ...
                asChild`, so a className lands on the inner Radix element while
                Button still supplies `bg-primary` — and Slot concatenates the
                two without tailwind-merge, so CSS order decides and primary
                wins. A `className="bg-destructive"` here renders BLACK. */}
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? "Deleting…"
                : `Delete ${selectedCount} ${selectedCount === 1 ? "Product" : "Products"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
