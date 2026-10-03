"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Images, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { BulkAction } from "../../_components/admin-bulk-bar";
import type { AdminFilterDef } from "../../_components/admin-filters";
import type { LoadingToastContext } from "../../_lib/admin-mutation-toast";
import type { MediaItem } from "~/components/media/media-grid";
import type { MediaUsageStatus } from "~/lib/validators/media";
import type { RouterOutputs } from "~/trpc/react";
import { ADMIN_BULK_DELETE_LIMIT } from "~/lib/validators/admin-table";
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
import { Card, CardContent } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { Label } from "~/components/ui/label";
import { formatBytes, MediaThumbnail } from "~/components/media/media-grid";

import { AdminBulkBar } from "../../_components/admin-bulk-bar";
import { AdminCardGrid } from "../../_components/admin-card-grid";
import { AdminEmpty } from "../../_components/admin-empty";
import { AdminFilters } from "../../_components/admin-filters";
import { AdminPagination } from "../../_components/admin-pagination";
import { WARNING_TEXT } from "../../_components/admin-table-style";
import {
  createCapDisabledReason,
  createOverCapGuard,
  describeSelection,
} from "../../_lib/admin-bulk-actions";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";
import { useAdminTableSelection } from "../../_lib/use-admin-table-selection";
import { MediaUploadButton } from "./media-upload-button";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A media item with the fields the server page derives for the table
 *  pipeline: `id` (the S3 key — `buildTablePage` needs `{ id: string }`, and
 *  keys are unique), `filename` (precomputed once for the name sorts), and
 *  `usageStatus` (the three-bucket classification from `getMediaUsageStatus`,
 *  shared by the `used` filter predicate and `UsageBadge` below). */
export type MediaRow = MediaItem & {
  id: string;
  filename: string;
  usageStatus: MediaUsageStatus;
};

/**
 * Which router the library talks to.
 *
 * - `shop` — `api.media.*` on a shop host; the server acts on the HOST's
 *   business, so no id is sent.
 * - `platform` — `api.platformMedia.*` from the platform hub; `businessId` is
 *   sent with every call (the router re-checks PLATFORM_ADMIN + existence, and
 *   the shared service ties every key to `${businessId}/`).
 */
export type MediaLibraryScope =
  | { kind: "shop" }
  | { kind: "platform"; businessId: string };

type Props = {
  /** The current page's cards only — filtering/sorting/paging happen server-side. */
  items: MediaRow[];
  /** Router selection — see `MediaLibraryScope`. Fixed for the component's
   *  lifetime (each page renders exactly one scope). */
  scope: MediaLibraryScope;
  /** The page's own path, for filter/pagination/"Clear filters" links —
   *  `/admin/media` on a shop host, `/businesses/{id}/media` on the hub. */
  basePath: string;
  /** Mirrors `media.bulkDelete`'s `ownerOnlyProcedure`, resolved server-side.
   *  False OMITS every bulk affordance — see the note above `bulkActions`. */
  canBulkDelete: boolean;
  /** Whether the viewer may upload here (owner/manager/platform admin) —
   *  gates the empty-state "Upload images" action. */
  canUpload: boolean;
  /** Keys of every file matching the current filters, across all pages — or
   *  `null` when more than ADMIN_BULK_SELECTION_LIMIT match and
   *  `buildTablePage` declined to enumerate them. */
  matchingIds: string[] | null;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Unfiltered total — distinguishes "no media yet" from "no matches". */
  totalFiles: number;
  filters: AdminFilterDef[];
};

const ITEM_NOUN = { one: "file", many: "files" } as const;

const nounFor = (count: number) =>
  count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many;

// ─── Usage badge ──────────────────────────────────────────────────────────────

/** One usage line. `adminHref` is a SHOP-admin path (`/admin/...`), which only
 *  resolves on the business's own host — on the platform hub it would 404, so
 *  the hub (`linkUsages: false`) renders the same text unlinked. */
function UsageEntry({
  usage,
  linkUsages,
}: {
  usage: MediaRow["usedBy"][number];
  linkUsages: boolean;
}) {
  const label = (
    <>
      {usage.location}
      {usage.entityLabel ? ` — ${usage.entityLabel}` : ""}
    </>
  );
  return usage.adminHref && linkUsages ? (
    <Link
      href={usage.adminHref}
      className="text-foreground font-medium underline-offset-2 hover:underline"
    >
      {label}
    </Link>
  ) : (
    <span className="text-foreground">{label}</span>
  );
}

function UsageBadge({
  item,
  linkUsages,
}: {
  item: MediaRow;
  linkUsages: boolean;
}) {
  const count = item.usedBy.length;

  if (item.usageStatus === "unused") {
    return (
      <Badge variant="secondary" className="text-muted-foreground text-xs">
        Unused
      </Badge>
    );
  }

  if (item.usageStatus === "inactive") {
    return (
      <HoverCard openDelay={100} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Badge
            variant="outline"
            className={`cursor-help text-xs ${WARNING_TEXT}`}
            tabIndex={0}
            aria-label={`Referenced only by inactive templates, in ${count} location${count === 1 ? "" : "s"} — hover for details`}
          >
            Inactive template
          </Badge>
        </HoverCardTrigger>
        <HoverCardContent className="w-72" align="start">
          <p
            className={`mb-1 text-xs font-semibold tracking-wide uppercase ${WARNING_TEXT}`}
          >
            Referenced only by inactive templates
          </p>
          <p className="text-muted-foreground mb-2 text-xs">
            Your active template doesn&apos;t use this file. Deleting it also
            clears these leftover template fields.
          </p>
          <ul className="space-y-1.5">
            {item.usedBy.map((usage, i) => (
              <li key={i} className="text-sm">
                <UsageEntry usage={usage} linkUsages={linkUsages} />
              </li>
            ))}
          </ul>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Badge
          variant="default"
          className="cursor-help text-xs"
          tabIndex={0}
          aria-label={`In use in ${count} location${count === 1 ? "" : "s"} — hover for details`}
        >
          In use ({count})
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-72" align="start">
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          Referenced by
        </p>
        <ul className="space-y-1.5">
          {item.usedBy.map((usage, i) => (
            <li key={i} className="text-sm">
              <UsageEntry usage={usage} linkUsages={linkUsages} />
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}

// ─── Per-card action buttons ──────────────────────────────────────────────────

function MediaCardActions({
  item,
  scope,
  onDeleteConfirm,
  isDeleting,
}: {
  item: MediaRow;
  scope: MediaLibraryScope;
  onDeleteConfirm: (item: MediaRow) => void;
  isDeleting: boolean;
}) {
  // Presigned URL, so it's a mutation rather than a query — never cached, always
  // freshly signed. The loading toast is the shared grammar: the id travels in
  // the mutation context so settling dismisses THIS toast, not every toast.
  //
  // Both routers' hooks are ALWAYS called (unconditionally, same order every
  // render) and `scope` picks which one `download` fires — so hook order can
  // never depend on scope. An idle `useMutation` costs nothing: no request is
  // made until `mutate`.
  const downloadOptions = {
    onMutate: loadingToast("Preparing download…"),
    onSuccess: (
      { url }: { url: string },
      _variables: unknown,
      context: LoadingToastContext | undefined,
    ) => {
      dismissLoadingToast(context);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    onError: (
      error: { message: string },
      _variables: unknown,
      context: LoadingToastContext | undefined,
    ) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to generate download link");
    },
  };
  const shopDownload = api.media.getDownloadUrl.useMutation(downloadOptions);
  const platformDownload =
    api.platformMedia.getDownloadUrl.useMutation(downloadOptions);
  const download = () => {
    if (scope.kind === "platform") {
      platformDownload.mutate({ key: item.key, businessId: scope.businessId });
    } else {
      shopDownload.mutate({ key: item.key });
    }
  };
  const isDownloading = shopDownload.isPending || platformDownload.isPending;

  // Only an active-template (or non-template) usage blocks delete now —
  // inactive-template-only files are leftover content the owner can clean up
  // even though `usedBy` is non-empty. See `getMediaUsageStatus`.
  const inUse = item.usageStatus === "used";

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={download}
        disabled={isDownloading}
        aria-label={`Download ${item.filename}`}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        {isDownloading ? "Getting link…" : "Download"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 flex-1"
        onClick={() => onDeleteConfirm(item)}
        disabled={inUse || isDeleting}
        aria-label={
          inUse
            ? `Cannot delete ${item.filename} — file is in use by your active setup`
            : `Delete ${item.filename}`
        }
        title={
          inUse
            ? "Cannot delete — file is in use by your active setup"
            : undefined
        }
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Delete
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MediaLibraryClient({
  items,
  scope,
  basePath,
  canBulkDelete,
  canUpload,
  matchingIds,
  totalCount,
  totalPages,
  page,
  pageSize,
  totalFiles,
  filters,
}: Props) {
  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  /** Usage `adminHref`s are shop-admin paths — only linkable on a shop host. */
  const linkUsages = scope.kind === "shop";

  // ── Selection ──────────────────────────────────────────────────────────────
  // On the hub the business is part of the PATH (`basePath`), so switching
  // business remounts the page and starts a fresh selection — keys selected in
  // one business's library are meaningless in another's.
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
    rowIds: items.map((item) => item.id),
    matchingIds,
    totalCount,
    page,
    searchParams,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  // Every handler dismisses the specific loading toast it opened — see
  // dismissLoadingToast. A bare toast.dismiss() clears every toast on screen.

  // Both routers' hooks are ALWAYS called and `scope` only picks which one a
  // handler fires (see MediaCardActions) — hook order never depends on scope.
  // `isPending` ORs the pair; the idle one is always false.

  const afterWrite = () => {
    if (scope.kind === "platform") {
      void utils.platformMedia.list.invalidate({
        businessId: scope.businessId,
      });
    } else {
      void utils.media.list.invalidate();
    }
    router.refresh();
  };

  const deleteOptions = {
    onMutate: loadingToast("Deleting file…"),
    onSuccess: (
      _data: unknown,
      variables: { key: string },
      context: LoadingToastContext | undefined,
    ) => {
      dismissLoadingToast(context);
      toast.success("File deleted");
      pruneSelection([variables.key]);
      setDeleteTarget(null);
      afterWrite();
    },
    onError: (
      error: { message: string },
      _variables: unknown,
      context: LoadingToastContext | undefined,
    ) => {
      dismissLoadingToast(context);
      // On CONFLICT the server's message names the places still referencing the
      // file — the only way the owner learns WHICH page blocked the delete when
      // the card's usage badge was stale. Dialog stays open so Cancel (or a
      // retry) is still one click away.
      toast.error(error.message ?? "Failed to delete file");
    },
  };
  const shopDelete = api.media.delete.useMutation(deleteOptions);
  const platformDelete = api.platformMedia.delete.useMutation(deleteOptions);
  const deleteFile = (key: string) => {
    if (scope.kind === "platform") {
      platformDelete.mutate({ key, businessId: scope.businessId });
    } else {
      shopDelete.mutate({ key });
    }
  };
  const isDeletePending = shopDelete.isPending || platformDelete.isPending;

  const bulkDeleteOptions = {
    onMutate: loadingToast("Deleting files…"),
    onSuccess: (
      data: RouterOutputs["media"]["bulkDelete"],
      variables: { keys: string[] },
      context: LoadingToastContext | undefined,
    ) => {
      dismissLoadingToast(context);

      const requested = variables.keys.length;
      const inUseCount = data.skipped.filter(
        (skip) => skip.reason === "in-use",
      ).length;
      const protectedCount = data.skipped.filter(
        (skip) => skip.reason === "protected",
      ).length;
      // "2 in use, 1 logo/favicon" — the server's two machine reasons said in
      // the owner's words. `protected` only ever means the fixed-key brand
      // assets, which are overwritten by re-uploading, never deleted here.
      const reasons = [
        inUseCount > 0 ? `${inUseCount} in use` : null,
        protectedCount > 0 ? `${protectedCount} logo/favicon` : null,
      ]
        .filter((part): part is string => part !== null)
        .join(", ");

      if (data.skipped.length === 0) {
        toast.success(
          `${data.deletedCount} ${nounFor(data.deletedCount)} deleted`,
        );
      } else if (data.deletedCount === 0) {
        toast.warning(
          `Nothing deleted — all ${requested} selected ${nounFor(requested)} were skipped (${reasons}).`,
        );
      } else {
        toast.warning(
          `Deleted ${data.deletedCount} of ${requested} ${nounFor(requested)} — ${data.skipped.length} skipped (${reasons}).`,
        );
      }

      // Prune ONLY what was actually deleted, deliberately not clearSelection():
      // the skipped files stay selected, so after the toast the owner can see
      // on screen exactly which ones survived and why, instead of having to
      // re-find them in a cleared grid.
      pruneSelection(data.deletedKeys);
      setBulkDeleteOpen(false);
      afterWrite();
    },
    onError: (
      error: { message: string },
      _variables: unknown,
      context: LoadingToastContext | undefined,
    ) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete files");
    },
  };
  const shopBulkDelete = api.media.bulkDelete.useMutation(bulkDeleteOptions);
  const platformBulkDelete =
    api.platformMedia.bulkDelete.useMutation(bulkDeleteOptions);
  const isBulkDeletePending =
    shopBulkDelete.isPending || platformBulkDelete.isPending;

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Confirm-dialog context. Only rows on the current page have names available;
  // `describeSelection` handles the shortfall in the copy.
  const selectedNames = items
    .filter((item) => selectedIds.has(item.id))
    .map((item) => item.filename);

  const overCap = createOverCapGuard(selectedCount, ITEM_NOUN);
  const capReason = createCapDisabledReason(selectedCount, ITEM_NOUN);
  const deleteCapReason = capReason(ADMIN_BULK_DELETE_LIMIT, "delete");

  const handleBulkDelete = () => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_DELETE_LIMIT, "delete")) {
      return;
    }
    const keys = [...selectedIds];
    if (scope.kind === "platform") {
      platformBulkDelete.mutate({ keys, businessId: scope.businessId });
    } else {
      shopBulkDelete.mutate({ keys });
    }
  };

  // The per-card delete writes to rows the bulk bar can also be holding, so it
  // freezes the bar too. There is no undo mutation to include — an S3 delete is
  // irreversible, which is also why this page offers no Undo toast action.
  const isBulkPending = isBulkDeletePending || isDeletePending;

  // Delete is the ONLY bulk action here, and `media.bulkDelete` is
  // `ownerOnlyProcedure` — so a MANAGER gets no bulk bar, and no card
  // checkboxes either. Omitted rather than disabled, per
  // docs/admin-table-migration.md §2: a MANAGER should see the actions they
  // have, not a greyed list of the ones they don't. The procedure is still the
  // enforcement.
  const bulkActions: BulkAction[] = [
    {
      label: "Delete",
      icon: Trash2,
      variant: "destructive" as const,
      // `disabledReason` stops the click being worth making; this still
      // re-checks the cap BEFORE opening the dialog, for a selection grown past
      // it between render and click.
      onClick: () => {
        if (overCap(ADMIN_BULK_DELETE_LIMIT, "delete")) return;
        setBulkDeleteOpen(true);
      },
      pending: isBulkDeletePending,
      disabledReason: deleteCapReason,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  // Absolute empty state — no files at all, so there is nothing to filter.
  // Uploads can start here (when the viewer may upload) as well as wherever
  // media is used (product images, galleries, template fields). Files uploaded
  // from this page are `library-` keys, kept until deleted from this page.
  if (totalFiles === 0) {
    return (
      <AdminEmpty
        icon={Images}
        title="No media uploaded yet"
        description={
          canUpload
            ? "Upload images here, or they'll appear as you add media to products, galleries, and pages."
            : "Files will appear here once images, videos, or other media are added to products, galleries, and pages."
        }
        action={
          canUpload ? (
            <MediaUploadButton
              businessId={
                scope.kind === "platform" ? scope.businessId : undefined
              }
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <AdminFilters
        basePath={basePath}
        searchPlaceholder="Search files…"
        // Names the fields actually matched. Searching by where a file is USED
        // is the non-obvious one — the placeholder has no room to say so.
        searchAriaLabel="Search media by file name, by the name of the product, gallery, or page where it's used, or by a general word like products or galleries"
        filters={filters}
        resultCount={totalCount}
        itemNoun={ITEM_NOUN}
        onFiltersChange={onFiltersChange}
      />

      {canBulkDelete && (
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
                  disabledReason: escalationDisabledReason,
                }
              : undefined
          }
        />
      )}

      {items.length === 0 ? (
        <AdminEmpty
          icon={Search}
          title="No files match your filters"
          // AdminEmpty renders its own "Try adjusting your search or filters."
          // line when `filtered` — don't say it twice.
          filtered
          action={
            <Button variant="outline" asChild>
              <Link href={basePath}>Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* A card grid has no header row to hang the select-all checkbox off,
              so it gets its own modest strip here — same three states as a
              table's header checkbox, same handler. */}
          {canBulkDelete && (
            <div className="mb-3 flex items-center gap-2 px-1">
              <Checkbox
                id="select-all-media"
                checked={
                  allPageSelected
                    ? true
                    : somePageSelected
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={handleSelectAllOnPage}
                aria-label="Select all files on this page"
              />
              <Label
                htmlFor="select-all-media"
                className="text-muted-foreground text-sm font-normal"
              >
                Select all on page
              </Label>
            </div>
          )}

          {/* Extends the shared 2/3-column geometry to 4 at xl — media cards are
              denser than Galleries' and this is the density the page had before
              the migration. */}
          <AdminCardGrid
            label="Media files"
            className="sm:grid-cols-2 xl:grid-cols-4"
          >
            {items.map((item, index) => {
              const isSelected = selectedIds.has(item.id);
              const date = new Date(item.lastModified).toLocaleDateString(
                undefined,
                { year: "numeric", month: "short", day: "numeric" },
              );

              return (
                <li key={item.id}>
                  {/* NOT an INTERACTIVE_CARD: there is no primary link to
                      stretch (a media file has no detail page), so the card's
                      interactive surface stays the Download/Delete buttons and
                      the selection checkbox. `gap-0 py-0 overflow-hidden`
                      cancel the shadcn Card base the same way INTERACTIVE_CARD
                      does, so the thumbnail runs edge-to-edge and clips to the
                      rounded corners; `relative` anchors the checkbox overlay. */}
                  <Card
                    data-state={isSelected ? "selected" : undefined}
                    className={`relative gap-0 overflow-hidden py-0 ${
                      isSelected ? "ring-primary ring-2" : ""
                    }`}
                  >
                    <div className="relative">
                      <MediaThumbnail item={item} />

                      {canBulkDelete && (
                        // Overlaid on the thumbnail, on its own backing: a bare
                        // checkbox over a photo is invisible against half the
                        // images in a library. `bg-background` + `ring-border`
                        // are tokens, so the backing flips with the theme
                        // rather than staying white in dark mode.
                        <div className="bg-background/90 ring-border absolute top-2 left-2 z-10 rounded-md p-1 shadow-sm ring-1 backdrop-blur-sm">
                          <Checkbox
                            checked={isSelected}
                            // Radix reports the new checked state, not the
                            // originating event — a capture-phase listener is
                            // what records shiftKey in time for the range select.
                            onClickCapture={onRowClickCapture}
                            onCheckedChange={() => handleRowToggle(index)}
                            aria-label={`Select ${item.filename}`}
                          />
                        </div>
                      )}
                    </div>

                    <CardContent className="p-3">
                      <div className="mb-2 flex items-start gap-2">
                        <p
                          className="min-w-0 flex-1 truncate text-sm font-medium"
                          title={item.filename}
                        >
                          {item.filename}
                        </p>
                        <UsageBadge item={item} linkUsages={linkUsages} />
                      </div>

                      <p className="text-muted-foreground mb-3 text-xs">
                        {formatBytes(item.size)} &middot; {date}
                      </p>

                      <MediaCardActions
                        item={item}
                        scope={scope}
                        onDeleteConfirm={setDeleteTarget}
                        isDeleting={isDeletePending}
                      />
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </AdminCardGrid>

          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            basePath={basePath}
            itemNoun={ITEM_NOUN}
          />
        </>
      )}

      {/* Single delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <strong className="font-mono text-xs break-all">
                    {deleteTarget.filename}
                  </strong>{" "}
                  will be permanently removed from storage. This cannot be
                  undone.
                  {deleteTarget.usageStatus === "inactive" && (
                    <>
                      {" "}
                      This file is only referenced by templates you&apos;re not
                      using — those leftover template fields will be cleaned up,
                      so nothing breaks if you switch templates later.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletePending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, NOT className. AlertDialogAction wraps a `Button …
                asChild`, so a className lands on the inner Radix element while
                Button still supplies `bg-primary` — and Slot concatenates the
                two without tailwind-merge, so `className="bg-destructive"`
                here renders BLACK. */}
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteFile(deleteTarget.key);
              }}
              disabled={isDeletePending}
            >
              {isDeletePending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} {nounFor(selectedCount)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              {describeSelection(selectedNames, selectedCount, ITEM_NOUN)}. Any
              selected file still in use by your active setup — and your logo
              and favicon — is skipped automatically and left in place.
              Everything else is permanently removed from storage, and there is
              no undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeletePending}>
              Cancel
            </AlertDialogCancel>
            {/* See the note on the single-delete action: `variant`, not className. */}
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={isBulkDeletePending}
            >
              {isBulkDeletePending
                ? "Deleting…"
                : `Delete ${selectedCount} ${nounFor(selectedCount)}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
