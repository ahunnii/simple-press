"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
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
import { COLLECTION_BULK_DUPLICATE_MAX } from "~/lib/validators/collections";
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

type Collection = RouterOutputs["collections"]["getAll"][number];

type Props = {
  /** The current page slice only — filtering/sorting/paging happen server-side. */
  collections: Collection[];
  /** Ids of every row matching the current filters, across all pages. */
  matchingIds: string[];
  /** Unfiltered total — distinguishes "no collections yet" from "no matches". */
  totalCollections: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

const BASE_PATH = "/admin/collections";
const ITEM_NOUN = { one: "collection", many: "collections" } as const;

/**
 * Turn a selection into something a person can actually check before confirming
 * a delete — "“Summer Collection” and “Night Out”" beats "2 collections", which
 * tells you the count you already knew and nothing about what you're destroying.
 *
 * `names` only covers the rows on the current page, since that's all this
 * component holds. A selection accumulated across pages degrades gracefully to
 * naming what it can plus a remainder.
 */
function describeSelection(names: string[], total: number, maxNamed = 3) {
  const shown = names.slice(0, maxNamed).map((name) => `“${name}”`);
  const remaining = total - shown.length;

  if (shown.length === 0) return `${total} collections`;
  if (remaining > 0) return `${shown.join(", ")} and ${remaining} more`;
  if (shown.length === 1) return shown[0]!;
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]!}`;
}

/** The publish and delete validators in ~/lib/validators/collections.ts cap `ids`
 *  at 1000. Duplicate is lower — see COLLECTION_BULK_DUPLICATE_MAX. */
const MAX_BULK_IDS = 1000;

const SORT_FILTER: AdminFilterDef = {
  key: "sort",
  label: "Sort",
  defaultValue: "storefront",
  options: [
    // `sortOrder` is the order the storefront renders collections in. It used
    // to be the silent, unexplained default here; naming it makes it legible.
    { value: "storefront", label: "Storefront order" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
    { value: "newest", label: "Newest" },
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
}: Props) {
  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Id-based so a selection survives paging — the ids of rows that scrolled off
  // are still meaningful, unlike row indices.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** True once the user escalated past the current page via "Select all N". */
  const [isEscalated, setIsEscalated] = useState(false);
  /** Anchor for shift-click range select — an index into the CURRENT page. */
  const [lastToggledIndex, setLastToggledIndex] = useState<number | null>(null);

  // ── Page change vs. filter change ──────────────────────────────────────────
  // Both are `router.push` to this same route, so the two are told apart by what
  // actually changed in the URL rather than by which control was clicked:
  // everything except `page` is a *filter* signature. A filter change invalidates
  // the selection (the rows it refers to may no longer be reachable, and a bulk
  // action promising "5 collections" while zero are on screen is a trap), while a
  // page change deliberately preserves it. Deriving this from the URL — rather
  // than only from AdminFilters' onFiltersChange — also covers back/forward
  // navigation and the "Clear filters" link in the empty state, neither of which
  // routes through that callback.

  // `sort` is excluded alongside `page`: reordering cannot change WHICH rows
  // match, so `matchingIds` and every selected id stay valid across a re-sort.
  // Sorting to find something and then selecting it is a normal workflow, and
  // wiping the selection for a pure reorder would be gratuitous.
  const filterSignature = (() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("sort");
    params.sort();
    return params.toString();
  })();

  const [lastFilterSignature, setLastFilterSignature] =
    useState(filterSignature);
  if (filterSignature !== lastFilterSignature) {
    setLastFilterSignature(filterSignature);
    setSelectedIds(new Set());
    setIsEscalated(false);
    setLastToggledIndex(null);
  }

  // A page or sort change keeps the selection, but the shift-click anchor is a
  // *positional* index and means nothing against a different set or order of rows.
  const sortKey = searchParams.get("sort") ?? "";
  const [lastPageAndSort, setLastPageAndSort] = useState(`${page}|${sortKey}`);
  if (`${page}|${sortKey}` !== lastPageAndSort) {
    setLastPageAndSort(`${page}|${sortKey}`);
    setLastToggledIndex(null);
  }

  // ── Selection helpers ──────────────────────────────────────────────────────

  const pageIds = collections.map((collection) => collection.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id));
  const allPageSelected =
    pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const somePageSelected = selectedOnPage.length > 0 && !allPageSelected;

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsEscalated(false);
    setLastToggledIndex(null);
  };

  /** Drop ids a mutation just consumed, so the counter can't outrun reality. */
  const pruneSelection = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    setIsEscalated(false);
    setLastToggledIndex(null);
  };

  // Radix's Checkbox reports the new checked state, not the originating event.
  // A capture-phase click listener runs before Radix's own handler fires
  // onCheckedChange, so the modifier key is recorded by the time we need it.
  // Keyboard activation produces a click with shiftKey === false, as intended.
  const shiftKeyRef = useRef(false);

  const handleRowToggle = (index: number) => {
    const withShift = shiftKeyRef.current;
    shiftKeyRef.current = false;

    const id = collections[index]?.id;
    if (!id) return;

    setIsEscalated(false);

    if (withShift && lastToggledIndex !== null && lastToggledIndex !== index) {
      const start = Math.min(lastToggledIndex, index);
      const end = Math.max(lastToggledIndex, index);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          const rangeId = collections[i]?.id;
          if (rangeId) next.add(rangeId);
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }

    setLastToggledIndex(index);
  };

  /** Select-all is scoped to the visible page, matching Products and Testimonials. */
  const handleSelectAllOnPage = () => {
    setIsEscalated(false);
    setLastToggledIndex(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllMatching = () => {
    setSelectedIds(new Set(matchingIds));
    setIsEscalated(true);
    setLastToggledIndex(null);
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  // Every handler dismisses the specific loading toast it opened. A bare
  // toast.dismiss() clears every toast on screen, including unrelated ones.

  const afterWrite = () => {
    void utils.collections.invalidate();
    router.refresh();
  };

  /** "3 of 5" — a bulk op silently touching fewer rows than asked must say so. */
  const shortfallMessage = (done: number, requested: number, verb: string) =>
    `${done} of ${requested} ${requested === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} ${verb} — ${
      requested - done
    } could not be found. They may have been deleted already.`;

  const deleteMutation = api.collections.delete.useMutation({
    onMutate: () => ({ toastId: toast.loading("Deleting collection…") }),
    onSuccess: (_data, id, context) => {
      if (context) toast.dismiss(context.toastId);
      toast.success("Collection deleted");
      pruneSelection([id]);
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _id, context) => {
      if (context) toast.dismiss(context.toastId);
      toast.error(error.message ?? "Failed to delete collection");
    },
  });

  const duplicateMutation = api.collections.duplicate.useMutation({
    onMutate: () => ({ toastId: toast.loading("Duplicating collection…") }),
    onSuccess: (_data, _id, context) => {
      if (context) toast.dismiss(context.toastId);
      toast.success("Collection duplicated — draft saved");
      afterWrite();
    },
    onError: (error, _id, context) => {
      if (context) toast.dismiss(context.toastId);
      toast.error(error.message ?? "Failed to duplicate collection");
    },
  });

  // Separate from bulkPublishMutation so the undo's own success toast doesn't
  // offer another Undo, which would let the two ping-pong indefinitely.
  const undoPublishMutation = api.collections.bulkSetPublished.useMutation({
    onMutate: () => ({ toastId: toast.loading("Undoing…") }),
    onSuccess: (data, variables, context) => {
      if (context) toast.dismiss(context.toastId);
      toast.success(
        `Undone — ${data.count} ${
          data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
        } ${variables.published ? "published" : "unpublished"}`,
      );
      afterWrite();
    },
    onError: (error, _variables, context) => {
      if (context) toast.dismiss(context.toastId);
      toast.error(error.message ?? "Failed to undo");
    },
  });

  const bulkPublishMutation = api.collections.bulkSetPublished.useMutation({
    onMutate: () => ({ toastId: toast.loading("Updating collections…") }),
    onSuccess: (data, variables, context) => {
      if (context) toast.dismiss(context.toastId);
      const verb = variables.published ? "published" : "unpublished";
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, verb));
      } else {
        // Publish/unpublish are exactly invertible, so the recovery path is a
        // single click rather than re-finding and re-selecting every row.
        toast.success(
          `${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} ${verb}`,
          {
            action: {
              label: "Undo",
              onClick: () =>
                undoPublishMutation.mutate({
                  ids: variables.ids,
                  published: !variables.published,
                }),
            },
          },
        );
      }

      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      if (context) toast.dismiss(context.toastId);
      toast.error(error.message ?? "Failed to update collections");
    },
  });

  const bulkDuplicateMutation = api.collections.bulkDuplicate.useMutation({
    onMutate: () => ({ toastId: toast.loading("Duplicating collections…") }),
    onSuccess: (data, variables, context) => {
      if (context) toast.dismiss(context.toastId);
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, "duplicated"));
      } else {
        toast.success(
          `${data.count} ${
            data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
          } duplicated — saved as drafts`,
        );
      }

      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      if (context) toast.dismiss(context.toastId);
      toast.error(error.message ?? "Failed to duplicate collections");
    },
  });

  const bulkDeleteMutation = api.collections.bulkDelete.useMutation({
    onMutate: () => ({ toastId: toast.loading("Deleting collections…") }),
    onSuccess: (data, variables, context) => {
      if (context) toast.dismiss(context.toastId);
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
      if (context) toast.dismiss(context.toastId);
      toast.error(error.message ?? "Failed to delete collections");
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const selectedCount = selectedIds.size;

  // Names for the confirm dialogs. Only rows on the current page are available
  // here; `describeSelection` handles the shortfall.
  const selectedNames = collections
    .filter((collection) => selectedIds.has(collection.id))
    .map((collection) => collection.name);
  const deleteTarget = collections.find(
    (collection) => collection.id === deleteId,
  );

  /** Belt-and-braces: escalation is already blocked past the cap, but a user can
   *  also accumulate a selection page by page. Fail here rather than at the API.
   *  Duplicate carries a lower cap than publish/delete — it's N sequential writes
   *  inside one transaction, where the others are a single statement. */
  const overCap = (max: number, verb: string) => {
    if (selectedCount <= max) return false;
    toast.error(
      `You can ${verb} at most ${max.toLocaleString()} collections at a time. ${selectedCount.toLocaleString()} are selected.`,
    );
    return true;
  };

  const handleBulkPublish = (published: boolean) => {
    if (selectedCount === 0 || overCap(MAX_BULK_IDS, "update")) return;
    bulkPublishMutation.mutate({ ids: [...selectedIds], published });
  };

  const handleBulkDuplicate = () => {
    if (
      selectedCount === 0 ||
      overCap(COLLECTION_BULK_DUPLICATE_MAX, "duplicate")
    ) {
      return;
    }
    bulkDuplicateMutation.mutate({ ids: [...selectedIds] });
  };

  const handleBulkDelete = () => {
    if (selectedCount === 0 || overCap(MAX_BULK_IDS, "delete")) return;
    bulkDeleteMutation.mutate({ ids: [...selectedIds] });
  };

  const isBulkPending =
    bulkPublishMutation.isPending ||
    bulkDuplicateMutation.isPending ||
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
    {
      label: "Duplicate",
      icon: Copy,
      onClick: handleBulkDuplicate,
      pending: bulkDuplicateMutation.isPending,
    },
    {
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      // Check the cap BEFORE opening the dialog. Otherwise the user reads
      // "Delete 1,043 Collections?", confirms, and gets an error toast while the
      // dialog sits there with no way forward.
      onClick: () => {
        if (overCap(MAX_BULK_IDS, "delete")) return;
        setBulkDeleteOpen(true);
      },
      pending: bulkDeleteMutation.isPending,
    },
  ];

  // Offer the escalation only when the page is exhausted and more matches exist.
  const canEscalate = allPageSelected && matchingIds.length > pageIds.length;

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
            searchAriaLabel="Search collections"
            filters={[STATUS_FILTER, SORT_FILTER]}
            resultCount={totalCount}
            itemNoun={ITEM_NOUN}
            // Redundant with the URL-signature check above, but it fires at push
            // time so the stale count disappears immediately rather than after
            // the server round-trip. Must apply the same `sort` exemption the
            // signature does, or a re-sort would clear the selection here first.
            onFiltersChange={(changedKeys) => {
              if (changedKeys.some((key) => key !== "sort")) clearSelection();
            }}
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
                    total: matchingIds.length,
                    onSelect: handleSelectAllMatching,
                    isEscalated,
                    // Describes what's blocked — selecting *all* matches — not
                    // the action itself. The current page's selection is
                    // perfectly actionable and the copy must not imply otherwise.
                    disabledReason:
                      matchingIds.length > MAX_BULK_IDS
                        ? `Too many matches to select at once (${matchingIds.length.toLocaleString()}). Work through them ${MAX_BULK_IDS.toLocaleString()} or fewer at a time.`
                        : undefined,
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
              {/* Margin lives here rather than on a wrapper around AdminBulkBar:
                  the bar is `sticky top-0`, and a wrapper sized to its own height
                  would cap the sticky range at zero. */}
              {/* `py-0` kills Card's default 24px vertical padding: the table is
                  full-bleed horizontally, so that padding rendered as white
                  gutters above the header and below the last row — visible as
                  banding the moment a row picks up a selected/hover background.
                  `overflow-hidden` then clips the first and last row backgrounds
                  to the card's rounded corners. */}
              <Card
                className={`overflow-hidden py-0 ${
                  selectedCount > 0 ? "mt-4" : ""
                }`}
              >
                {/* Cell padding: the shadcn primitives default to `p-2`, which is
                    half what every other admin table uses (`px-6 py-4` on their
                    hand-rolled cells) and left the checkboxes crowding the card
                    edge. The `:has([role=checkbox])` rule in the primitive is more
                    specific, so the checkbox cell keeps its `pr-0`. */}
                <Table className="[&_td]:px-4 [&_td]:py-3 [&_th]:px-4">
                  <TableCaption className="sr-only">Collections</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className="w-10">
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
                      <TableHead scope="col">Collection</TableHead>
                      <TableHead scope="col" className="hidden md:table-cell">
                        Products
                      </TableHead>
                      <TableHead scope="col" className="hidden md:table-cell">
                        Status
                      </TableHead>
                      <TableHead scope="col">
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
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onClickCapture={(e) => {
                                shiftKeyRef.current = e.shiftKey;
                              }}
                              onCheckedChange={() => handleRowToggle(index)}
                              aria-label={`Select ${collection.name}`}
                            />
                          </TableCell>

                          <TableCell className="whitespace-normal">
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
                                    <Badge variant="warning">
                                      No live products
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="tabular-nums">
                                {totalProducts}
                              </span>
                              {liveProducts !== totalProducts && (
                                <span
                                  className="text-muted-foreground text-xs"
                                  title="Products in this collection that shoppers can actually see"
                                >
                                  {liveProducts} live
                                </span>
                              )}
                              {isEmptyOnStorefront && (
                                <Badge variant="warning">
                                  No live products
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="hidden md:table-cell">
                            {collection.published ? (
                              <Badge variant="success">Published</Badge>
                            ) : (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                          </TableCell>

                          <TableCell>
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
            <AlertDialogTitle>Delete Collection?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will delete “${deleteTarget.name}”.`
                : "This will delete the collection."}{" "}
              The products in it won&apos;t be deleted. This action cannot be
              undone.
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
              This will delete {describeSelection(selectedNames, selectedCount)}
              . The products in {selectedCount === 1 ? "it" : "them"} won&apos;t
              be deleted. This action cannot be undone.
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
