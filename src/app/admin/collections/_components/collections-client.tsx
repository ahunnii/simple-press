"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { BulkAction } from "../../_components/admin-bulk-bar";
import type { AdminFilterDef } from "../../_components/admin-filters";
import type { RouterOutputs } from "~/trpc/react";
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
  WARNING_TEXT,
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

type Collection = RouterOutputs["collections"]["getAll"][number];

type Props = {
  /** The current page slice only — filtering/sorting/paging happen server-side. */
  collections: Collection[];
  /** Ids of every row matching the current filters, across all pages — or `null`
   *  when more than ADMIN_BULK_SELECTION_LIMIT match and `buildTablePage`
   *  declined to enumerate them. See `useAdminTableSelection`, which takes both. */
  matchingIds: string[] | null;
  /** Unfiltered total — distinguishes "no collections yet" from "no matches". */
  totalCollections: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Mirrors `collections.bulkDelete`'s `ownerOnlyProcedure`, resolved
   *  server-side. False OMITS the bulk Delete action rather than disabling it. */
  canBulkDelete: boolean;
};

const BASE_PATH = "/admin/collections";
const ITEM_NOUN = { one: "collection", many: "collections" } as const;

// Table type/density and the warning colour live in ../../_components/admin-table-style
// so a second table can adopt them without copy-paste. Aliased to the short names
// this file already reads with.
const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_CHECKBOX = TABLE_HEAD_TIGHT;
const TD_CHECKBOX = TABLE_CELL_TIGHT;

/** "3 of 5" — a bulk op silently touching fewer rows than asked must say so. */
const shortfallMessage = createShortfallMessage(ITEM_NOUN);

/**
 * The one place this sentence is written. The desktop Products cell and the
 * `md:hidden` reflow line both render it, so the two cannot drift — mobile used
 * to say "No live products" while desktop said this, which reads as two
 * different problems. Mobile keeps the compact badge PRESENTATION; only the
 * string is shared. Services carries the identical sentence for its own items.
 */
const EMPTY_ON_STOREFRONT_MESSAGE = "Published, but shoppers see an empty page";

const SORT_FILTER: AdminFilterDef = {
  key: "sort",
  label: "Sort",
  defaultValue: "newest",
  options: [
    // No "Storefront order" option here: owners cannot reorder collections
    // (only products WITHIN a collection), so that sort implied a control
    // that doesn't exist. `Collection.sortOrder` still drives the storefront's
    // own rendering — see the page's comment on `comparePrimary`.
    { value: "newest", label: "Newest" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
    { value: "oldest", label: "Oldest" },
    { value: "products-desc", label: "Most products" },
    { value: "products-asc", label: "Fewest products" },
  ],
};

const STATUS_FILTER: AdminFilterDef = {
  key: "status",
  label: "Status",
  defaultValue: "all",
  options: [
    { value: "all", label: "All collections" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Drafts" },
  ],
};

export function CollectionsClient({
  collections,
  matchingIds,
  totalCollections,
  totalCount,
  totalPages,
  page,
  pageSize,
  canBulkDelete,
}: Props) {
  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ── Selection ──────────────────────────────────────────────────────────────
  // Shared with Services. The hook owns which URL changes invalidate a selection
  // (any filter, but never a page or sort change), the shift-click anchor, and
  // the "select all N matching" escalation.
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
    rowIds: collections.map((collection) => collection.id),
    matchingIds,
    totalCount,
    page,
    searchParams,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  // Every handler dismisses the specific loading toast it opened — see
  // dismissLoadingToast. A bare toast.dismiss() clears every toast on screen.

  const afterWrite = () => {
    void utils.collections.invalidate();
    router.refresh();
  };

  const deleteMutation = api.collections.delete.useMutation({
    onMutate: loadingToast("Deleting collection…"),
    onSuccess: (_data, id, context) => {
      dismissLoadingToast(context);
      toast.success("Collection deleted");
      pruneSelection([id]);
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _id, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete collection");
    },
  });

  const duplicateMutation = api.collections.duplicate.useMutation({
    onMutate: loadingToast("Duplicating collection…"),
    onSuccess: (_data, _id, context) => {
      dismissLoadingToast(context);
      toast.success("Collection duplicated — draft saved");
      // Prune like every other mutation. Skipping it here left `isEscalated`
      // true while the new draft grew the matching set, so the bulk bar would
      // claim more rows were selected than actually were.
      pruneSelection([]);
      afterWrite();
    },
    onError: (error, _id, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to duplicate collection");
    },
  });

  // Separate from bulkPublishMutation so the undo's own success toast doesn't
  // offer another Undo, which would let the two ping-pong indefinitely.
  const undoPublishMutation = api.collections.bulkSetPublished.useMutation({
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

  const bulkPublishMutation = api.collections.bulkSetPublished.useMutation({
    onMutate: loadingToast("Updating collections…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.published ? "published" : "unpublished";
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, verb));
      } else {
        // Publish/unpublish are exactly invertible, so the recovery path is a
        // single click rather than re-finding and re-selecting every row.
        //
        // Undo targets `data.changedIds` — the rows this call actually flipped,
        // computed server-side — NOT `variables.ids`. Re-sending the whole
        // selection inverted would unpublish collections that were already
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
      toast.error(error.message ?? "Failed to update collections");
    },
  });

  const bulkDeleteMutation = api.collections.bulkDelete.useMutation({
    onMutate: loadingToast("Deleting collections…"),
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
      toast.error(error.message ?? "Failed to delete collections");
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Confirm-dialog context. Only rows on the current page are available here;
  // `describeSelection` handles the shortfall in the copy.
  const selectedOnPageRows = collections.filter((collection) =>
    selectedIds.has(collection.id),
  );
  const selectedNames = selectedOnPageRows.map((collection) => collection.name);
  const deleteTarget = collections.find(
    (collection) => collection.id === deleteId,
  );

  // Warn about storefront pages disappearing only when that's actually true.
  // A selection can reach past this page, and unseen rows might be published —
  // so an incomplete view has to assume the warning applies rather than omit it.
  const selectionReachesPastPage = selectedCount > selectedOnPageRows.length;
  const anySelectedPublished =
    selectionReachesPastPage ||
    selectedOnPageRows.some((collection) => collection.published);

  const overCap = createOverCapGuard(selectedCount, ITEM_NOUN);
  /** Delete's cap is well below the selection cap, so it can be unavailable
   *  while Publish and Duplicate are fine — the bar disables that one action
   *  and says why, rather than letting the click fail. */
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
            // render and click. Otherwise the user reads "Delete 43
            // Collections?", confirms, and gets an error toast while the dialog
            // sits there with no way forward.
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasCollections = totalCollections > 0;
  const hasResults = collections.length > 0;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Collections</h1>
          <p>Organize your products into collections</p>
        </div>
        <Button asChild>
          <Link href={`${BASE_PATH}/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Collection
          </Link>
        </Button>
      </div>

      {!hasCollections ? (
        <AdminEmpty
          icon={FolderOpen}
          title="No collections yet"
          description="Group related products together so shoppers can browse by category, season, or any theme that fits your store."
          action={
            <Button asChild>
              <Link href={`${BASE_PATH}/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Collection
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search collections…"
            // Names the fields actually matched — the placeholder can't, at that
            // width, and a bare "Search collections" leaves a screen-reader user
            // guessing whether typing a URL or a description word will hit.
            searchAriaLabel="Search collections by name, URL or description"
            filters={[STATUS_FILTER, SORT_FILTER]}
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

          {!hasResults ? (
            <AdminEmpty
              icon={Search}
              title="No collections match your filters"
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
                  <TableCaption className="sr-only">Collections</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={`w-10 ${TH_CHECKBOX}`}>
                        <Checkbox
                          id="select-all-collections"
                          checked={
                            allPageSelected
                              ? true
                              : somePageSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={handleSelectAllOnPage}
                          aria-label="Select all collections on this page"
                        />
                      </TableHead>
                      <TableHead scope="col" className={TH}>
                        Collection
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
                        Status
                      </TableHead>
                      <TableHead scope="col" className={`${TH} text-right`}>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((collection, index) => {
                      const isSelected = selectedIds.has(collection.id);
                      const totalProducts =
                        collection._count.collectionProducts;
                      const liveProducts = collection.liveProductCount;
                      // A published collection with nothing visible renders an
                      // empty storefront page — the most useful signal here.
                      const isEmptyOnStorefront =
                        collection.published && liveProducts === 0;

                      return (
                        <TableRow
                          key={collection.id}
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell className={TD_CHECKBOX}>
                            <Checkbox
                              checked={isSelected}
                              onClickCapture={onRowClickCapture}
                              onCheckedChange={() => handleRowToggle(index)}
                              aria-label={`Select ${collection.name}`}
                            />
                          </TableCell>

                          <TableCell className={`${TD} whitespace-normal`}>
                            <div className="flex items-center gap-3">
                              {collection.imageUrl ? (
                                <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded">
                                  <Image
                                    src={collection.imageUrl}
                                    alt=""
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                                  <FolderOpen
                                    aria-hidden="true"
                                    className="text-muted-foreground h-4 w-4"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <Link
                                  href={`${BASE_PATH}/${collection.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {collection.name}
                                </Link>
                                {collection.description && (
                                  <p className="text-muted-foreground line-clamp-1 text-sm">
                                    {collection.description}
                                  </p>
                                )}
                                {/* Below md the Products and Status columns are
                                    hidden — reflow them here rather than lose them. */}
                                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                                  <span>
                                    {totalProducts}{" "}
                                    {totalProducts === 1
                                      ? "product"
                                      : "products"}
                                  </span>
                                  {liveProducts !== totalProducts && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{liveProducts} live</span>
                                    </>
                                  )}
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    {collection.published
                                      ? "Published"
                                      : "Draft"}
                                  </span>
                                  {isEmptyOnStorefront && (
                                    // Same sentence as the desktop cell, from the
                                    // constant above. `whitespace-normal shrink`
                                    // overrides Badge's nowrap/shrink-0 so a full
                                    // sentence wraps inside the row instead of
                                    // pushing the table off a phone screen.
                                    <Badge
                                      variant="warning"
                                      className="shrink whitespace-normal"
                                    >
                                      <span className="sr-only">Warning: </span>
                                      {EMPTY_ON_STOREFRONT_MESSAGE}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Primary number, then muted qualifier lines beneath —
                              the idiom Inventory established for "one value plus
                              caveats". A badge could only say THAT something is
                              wrong; the warning line says what. */}
                          {/* whitespace-normal so the warning sentence wraps —
                              TableCell is nowrap by default, which would push the
                              table far past the viewport. */}
                          <TableCell
                            className={`hidden md:table-cell ${TD} whitespace-normal`}
                          >
                            <div
                              className={`tabular-nums ${
                                isEmptyOnStorefront && totalProducts === 0
                                  ? `font-semibold ${WARNING_TEXT}`
                                  : "text-foreground"
                              }`}
                            >
                              {totalProducts}
                            </div>
                            {liveProducts !== totalProducts && (
                              <div
                                className={`text-sm tabular-nums ${
                                  isEmptyOnStorefront
                                    ? WARNING_TEXT
                                    : "text-muted-foreground"
                                }`}
                              >
                                {liveProducts} live
                              </div>
                            )}
                            {isEmptyOnStorefront && (
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
                                  {EMPTY_ON_STOREFRONT_MESSAGE}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {collection.published ? (
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
                                    Actions for {collection.name}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`${BASE_PATH}/${collection.id}`}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                {collection.published && collection.slug && (
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={`/collections/${collection.slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={`View ${collection.name} on storefront (opens in new tab)`}
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      View on storefront
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() =>
                                    duplicateMutation.mutate(collection.id)
                                  }
                                  disabled={duplicateMutation.isPending}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(collection.id)}
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
                pageSize={pageSize}
                basePath={BASE_PATH}
                itemNoun={ITEM_NOUN}
              />
            </>
          )}
        </>
      )}

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            {/* Name in the TITLE, consequence in the description — the shape
                Inventory's pool-delete dialog uses. The title is the line people
                actually read before clicking through. */}
            <AlertDialogTitle>
              {deleteTarget
                ? `Delete “${deleteTarget.name}”?`
                : "Delete Collection?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              The products in it won&apos;t be deleted.
              {deleteTarget?.published && deleteTarget.slug
                ? ` Its storefront page at /collections/${deleteTarget.slug} will stop working.`
                : ""}{" "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, NOT className. AlertDialogAction wraps a `Button ...
                asChild`, so a className lands on the inner Radix element while
                Button still supplies `bg-primary` — and Slot concatenates the two
                without tailwind-merge, so CSS order decides and primary wins. A
                `className="bg-destructive"` here renders BLACK. */}
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount}{" "}
              {selectedCount === 1 ? "Collection" : "Collections"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              {describeSelection(selectedNames, selectedCount, ITEM_NOUN)}. The
              products in {selectedCount === 1 ? "it" : "them"} won&apos;t be
              deleted.
              {anySelectedPublished
                ? " Published collections will stop working on your storefront."
                : ""}{" "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* See the note on the single-delete action: `variant`, not className. */}
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? "Deleting…"
                : `Delete ${selectedCount} ${selectedCount === 1 ? "Collection" : "Collections"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
