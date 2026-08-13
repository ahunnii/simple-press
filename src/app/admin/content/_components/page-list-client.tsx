"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  MoreVertical,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { BulkAction } from "../../_components/admin-bulk-bar";
import type { AdminFilterDef } from "../../_components/admin-filters";
import type { PageStatus } from "~/lib/validators/content-pages";
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

/**
 * ONE table for both admin lists backed by the `Page` model — CMS pages
 * (`/admin/content/pages`) and blog posts (`/admin/content/blog`).
 *
 * The two used to be near-verbatim clones of each other (the blog copy even
 * re-filtered `type === "blog"` over a set the server had already filtered),
 * which is exactly the drift this replaces: they are one model, one set of
 * columns and one pair of bulk procedures. Everything that genuinely differs
 * between them — route, noun, storefront URL shape, whether a Published column
 * and its two date sorts exist — is declared once in `ENTITY` below and
 * selected by the `kind` prop. Filter/sort vocabulary and the status
 * derivation live further out still, in `~/lib/validators/content-pages`,
 * shared with both `page.tsx` files.
 *
 * Policies (`type: "policy"`) are NOT served by this component.
 */

export type PageListKind = "page" | "blog";

/** The row contract: `content.getPages`' select, plus the status the page
 *  derives once via `getPageStatus` and hands down. The client never derives it
 *  itself and never reads a clock during render. */
export type PageListRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  status: PageStatus;
};

type Props = {
  kind: PageListKind;
  /** The current page slice only — filtering/sorting/paging happen in page.tsx. */
  rows: PageListRow[];
  filters: AdminFilterDef[];
  /**
   * Ids of every row matching the current filters, across all pages — or
   * `null` when more than ADMIN_BULK_SELECTION_LIMIT match and
   * `buildTablePage` declined to enumerate them. `null` is NOT `[]`: an empty
   * array is a genuine "nothing matched". See `useAdminTableSelection`, which
   * takes both.
   */
  matchingIds: string[] | null;
  /** Unfiltered total — distinguishes "nothing here yet" from "no matches". */
  totalRows: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** `Business.timeZone`, so every date is formatted with an EXPLICIT zone and
   *  the RSC render and the client's first paint produce identical markup. The
   *  bare `new Date(x).toLocaleDateString()` the old lists used resolves
   *  against the server's zone on one side and the viewer's on the other. */
  timeZone: string;
  /** Mirrors `content.bulkDelete`'s `ownerOnlyProcedure`, resolved
   *  server-side. False OMITS the bulk Delete action rather than disabling it. */
  canBulkDelete: boolean;
};

/** Everything that differs between the two lists, in one place. */
const ENTITY = {
  page: {
    basePath: "/admin/content/pages",
    noun: { one: "page", many: "pages" },
    /** Title-cased for dialog headings and button labels. */
    nounTitle: { one: "Page", many: "Pages" },
    heading: "Pages",
    subheading: "Standalone content pages like About, Contact and FAQ",
    createLabel: "Create Page",
    firstCreateLabel: "Create Your First Page",
    emptyTitle: "No pages yet",
    emptyDescription:
      "Add a standalone page — About, Contact, FAQ — and it gets its own address on your site. To edit homepage sections, use the Site Editor instead.",
    searchPlaceholder: "Search pages…",
    searchAriaLabel: "Search pages by title, URL or excerpt",
    identityHeading: "Page",
    icon: FileText,
    /** Relative on purpose: the admin runs on the tenant's own host, so this
     *  resolves to the right storefront without rebuilding the URL from
     *  `subdomain`/`customDomain` the way the old lists did. */
    storefrontHref: (slug: string) => `/${slug}`,
    /** Blog posts get a Published column; CMS pages have no publish-date sort
     *  to give it a visible cause, and no scheduling control either. */
    showPublishedColumn: false,
  },
  blog: {
    basePath: "/admin/content/blog",
    noun: { one: "blog post", many: "blog posts" },
    nounTitle: { one: "Blog Post", many: "Blog Posts" },
    heading: "Blog Posts",
    subheading: "Write and publish posts for your site's blog",
    createLabel: "Create Blog Post",
    firstCreateLabel: "Create Your First Blog Post",
    emptyTitle: "No blog posts yet",
    emptyDescription:
      "Share news, stories or updates. Posts appear on your site's blog, newest first.",
    searchPlaceholder: "Search blog posts…",
    searchAriaLabel: "Search blog posts by title, URL or excerpt",
    identityHeading: "Post",
    icon: Newspaper,
    storefrontHref: (slug: string) => `/blog/${slug}`,
    showPublishedColumn: true,
  },
} as const;

const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_CHECKBOX = TABLE_HEAD_TIGHT;
const TD_CHECKBOX = TABLE_CELL_TIGHT;

/**
 * The ONE place these words are written. The desktop Status badge and the
 * `md:hidden` reflow line both render from these maps, so the two cannot
 * drift. Keys are `getPageStatus`'s output — "scheduled" is unreachable on the
 * pages list, which passes `allowScheduled: false`.
 */
const STATUS_LABEL: Record<PageStatus, string> = {
  published: "Published",
  scheduled: "Scheduled",
  draft: "Draft",
};

// `success` for published, matching Collections, Discounts, Reviews and Events:
// it is the live, good state.
const STATUS_BADGE_VARIANT: Record<
  PageStatus,
  "success" | "secondary" | "outline"
> = {
  published: "success",
  scheduled: "outline",
  draft: "secondary",
};

/** Fixed locale + explicit zone = the same string on the server and in the
 *  browser. See the `timeZone` prop's note. */
function formatPageDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(date);
}

export function PageListClient({
  kind,
  rows,
  filters,
  matchingIds,
  totalRows,
  totalCount,
  totalPages,
  page,
  pageSize,
  timeZone,
  canBulkDelete,
}: Props) {
  const entity = ENTITY[kind];
  const {
    basePath,
    noun: ITEM_NOUN,
    nounTitle,
    storefrontHref,
    showPublishedColumn,
  } = entity;
  const EmptyIcon = entity.icon;

  /** "3 of 5" — a bulk op silently touching fewer rows than asked must say so.
   *  Built per render rather than at module scope because the noun is a prop. */
  const shortfallMessage = createShortfallMessage(ITEM_NOUN);

  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ── Selection ──────────────────────────────────────────────────────────────
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
    rowIds: rows.map((row) => row.id),
    matchingIds,
    totalCount,
    page,
    searchParams,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const afterWrite = () => {
    void utils.content.invalidate();
    router.refresh();
  };

  const deleteMutation = api.content.deletePage.useMutation({
    onMutate: loadingToast(`Deleting ${ITEM_NOUN.one}…`),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(`${nounTitle.one} deleted`);
      pruneSelection([variables.id]);
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? `Failed to delete ${ITEM_NOUN.one}`);
    },
  });

  // Separate from `bulkPublishMutation` so undo's own success toast doesn't
  // offer another Undo, which would let the two ping-pong indefinitely.
  const undoPublishMutation = api.content.bulkSetPublished.useMutation({
    onMutate: loadingToast("Undoing…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        `Undone — ${data.count} ${
          data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
        } ${variables.published ? "published" : "unpublished"}`,
      );
      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to undo");
    },
  });

  const bulkPublishMutation = api.content.bulkSetPublished.useMutation({
    onMutate: (variables) => ({
      toastId: toast.loading(
        variables.published
          ? `Publishing ${ITEM_NOUN.many}…`
          : `Unpublishing ${ITEM_NOUN.many}…`,
      ),
    }),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.published ? "published" : "unpublished";
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, verb));
      } else {
        // Undo targets `data.changedIds` — the rows this call actually
        // flipped, computed server-side — NOT `variables.ids`. Re-sending the
        // whole selection inverted would touch rows that were already in the
        // target state before this call, which is a second unwanted edit
        // dressed up as a recovery. Nothing flipped means nothing to undo, so
        // the toast drops the action rather than offering a no-op.
        const undoable = data.changedIds;
        toast.success(
          `${data.count} ${
            data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
          } ${verb}`,
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
      toast.error(error.message ?? `Failed to update ${ITEM_NOUN.many}`);
    },
  });

  const bulkDeleteMutation = api.content.bulkDelete.useMutation({
    onMutate: loadingToast(`Deleting ${ITEM_NOUN.many}…`),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, "deleted"));
      } else {
        toast.success(
          `${data.count} ${
            data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
          } deleted`,
        );
      }

      pruneSelection(variables.ids);
      setBulkDeleteOpen(false);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? `Failed to delete ${ITEM_NOUN.many}`);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Confirm-dialog context. Only rows on the current page have names available
  // here; `describeSelection` handles the shortfall in the copy.
  const selectedOnPageRows = rows.filter((row) => selectedIds.has(row.id));
  const selectedTitles = selectedOnPageRows.map((row) => row.title);
  const deleteTarget = rows.find((row) => row.id === deleteId);

  // Warn about storefront pages disappearing only when that's actually true.
  // A selection can reach past this page, and unseen rows might be published —
  // so an incomplete view has to assume the warning applies rather than omit it.
  const selectionReachesPastPage = selectedCount > selectedOnPageRows.length;
  const anySelectedPublished =
    selectionReachesPastPage || selectedOnPageRows.some((row) => row.published);

  const overCap = createOverCapGuard(selectedCount, ITEM_NOUN);
  /** Delete's cap is well below the selection cap, so it can be unavailable
   *  while Publish/Unpublish are fine — the bar disables that one action and
   *  says why, rather than letting the click fail. */
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
    // Omitted, not disabled, for a MANAGER: `content.bulkDelete` is
    // `ownerOnlyProcedure`, and a button that only ever produces a FORBIDDEN
    // toast is worse than no button. The procedure remains the enforcement.
    ...(canBulkDelete
      ? [
          {
            label: "Delete",
            icon: Trash2,
            variant: "destructive" as const,
            // `disabledReason` stops the click being worth making; this still
            // re-checks the cap BEFORE opening the dialog, for a selection
            // grown past it between render and click.
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

  const hasRows = totalRows > 0;
  const hasResults = rows.length > 0;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>{entity.heading}</h1>
          <p>{entity.subheading}</p>
        </div>
        <Button asChild>
          <Link href={`${basePath}/new`}>
            <Plus className="mr-2 h-4 w-4" />
            {entity.createLabel}
          </Link>
        </Button>
      </div>

      {!hasRows ? (
        <AdminEmpty
          icon={EmptyIcon}
          title={entity.emptyTitle}
          description={entity.emptyDescription}
          action={
            <Button asChild>
              <Link href={`${basePath}/new`}>
                <Plus className="mr-2 h-4 w-4" />
                {entity.firstCreateLabel}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={basePath}
            searchPlaceholder={entity.searchPlaceholder}
            // Names the fields actually matched — the placeholder has no room,
            // and a bare "Search pages" leaves a screen-reader user guessing
            // whether typing a URL or a word from the excerpt will hit.
            searchAriaLabel={entity.searchAriaLabel}
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
            selectAllMatching={
              canEscalate || isEscalated
                ? {
                    total: totalCount,
                    onSelect: handleSelectAllMatching,
                    isEscalated,
                    // Describes what's blocked — selecting *all* matches — not
                    // the action itself.
                    disabledReason: escalationDisabledReason,
                  }
                : undefined
            }
          />

          {!hasResults ? (
            <AdminEmpty
              icon={Search}
              title={`No ${ITEM_NOUN.many} match your filters`}
              // AdminEmpty renders its own "Try adjusting your search or
              // filters." line when `filtered` — don't say it twice.
              filtered
              action={
                <Button variant="outline" asChild>
                  <Link href={basePath}>Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <Card className={TABLE_CARD}>
                <Table>
                  <TableCaption className="sr-only">
                    {entity.heading}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={`w-10 ${TH_CHECKBOX}`}>
                        <Checkbox
                          id={`select-all-${kind}`}
                          checked={
                            allPageSelected
                              ? true
                              : somePageSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={handleSelectAllOnPage}
                          aria-label={`Select all ${ITEM_NOUN.many} on this page`}
                        />
                      </TableHead>
                      <TableHead scope="col" className={TH}>
                        {entity.identityHeading}
                      </TableHead>
                      {showPublishedColumn && (
                        <TableHead
                          scope="col"
                          className={`hidden md:table-cell ${TH}`}
                        >
                          Published
                        </TableHead>
                      )}
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Updated
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
                    {rows.map((row, index) => {
                      const isSelected = selectedIds.has(row.id);
                      // Computed once and reused by the mobile reflow line, so
                      // the two can never disagree.
                      const updatedLabel = formatPageDate(
                        row.updatedAt,
                        timeZone,
                      );
                      const publishedLabel = row.publishedAt
                        ? formatPageDate(row.publishedAt, timeZone)
                        : null;
                      const statusLabel = STATUS_LABEL[row.status];

                      return (
                        <TableRow
                          key={row.id}
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell className={TD_CHECKBOX}>
                            <Checkbox
                              checked={isSelected}
                              onClickCapture={onRowClickCapture}
                              onCheckedChange={() => handleRowToggle(index)}
                              aria-label={`Select ${row.title}`}
                            />
                          </TableCell>

                          <TableCell className={`${TD} whitespace-normal`}>
                            <div className="flex items-center gap-3">
                              {row.image ? (
                                <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded">
                                  {/* eslint-disable-next-line @next/next/no-img-element -- cover images are arbitrary URLs (S3, or whatever host a WordPress import carried in) rendered at a fixed 40px; next/image would need a remote-pattern entry per host and buys nothing at this size. */}
                                  <img
                                    src={row.image}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                                  <EmptyIcon
                                    aria-hidden="true"
                                    className="text-muted-foreground h-4 w-4"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                {/* The link wraps the TITLE only, not the cell
                                    — an anchor around the thumbnail and every
                                    text line reads to assistive tech as one
                                    link named by all of it run together. */}
                                <Link
                                  href={`${basePath}/${row.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {row.title}
                                </Link>
                                {row.excerpt && (
                                  <p className="text-muted-foreground line-clamp-1 text-sm">
                                    {row.excerpt}
                                  </p>
                                )}
                                {/* The slug is a search field and the row's
                                    real address, so it stays visible at every
                                    width — unlike the columns below, which the
                                    reflow line picks up under md. */}
                                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                                  <span className="truncate">
                                    {storefrontHref(row.slug)}
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className="md:hidden"
                                  >
                                    ·
                                  </span>
                                  {showPublishedColumn && (
                                    <>
                                      <span className="md:hidden">
                                        {publishedLabel
                                          ? `Published ${publishedLabel}`
                                          : "Never published"}
                                      </span>
                                      <span
                                        aria-hidden="true"
                                        className="md:hidden"
                                      >
                                        ·
                                      </span>
                                    </>
                                  )}
                                  <span className="md:hidden">
                                    Updated {updatedLabel}
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className="md:hidden"
                                  >
                                    ·
                                  </span>
                                  <span className="md:hidden">
                                    {statusLabel}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {showPublishedColumn && (
                            <TableCell
                              className={`hidden md:table-cell ${TD} text-muted-foreground`}
                            >
                              {publishedLabel ?? "—"}
                            </TableCell>
                          )}

                          <TableCell
                            className={`hidden md:table-cell ${TD} text-muted-foreground`}
                          >
                            {updatedLabel}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            <Badge variant={STATUS_BADGE_VARIANT[row.status]}>
                              {statusLabel}
                            </Badge>
                          </TableCell>

                          <TableCell className={`${TD} text-right`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">
                                    Actions for {row.title}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`${basePath}/${row.id}`}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                {row.published && (
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={storefrontHref(row.slug)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={`View ${row.title} on storefront (opens in new tab)`}
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      View on storefront
                                    </a>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(row.id)}
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
                basePath={basePath}
                itemNoun={ITEM_NOUN}
              />
            </>
          )}
        </>
      )}

      {/* Single Delete Confirmation Dialog — replaces the native `confirm()`
          the two old lists used, which is unstyleable, unfocusable-trappable
          and blocks the main thread. */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            {/* Name in the TITLE, consequence in the description — the title is
                the line people actually read before clicking through. */}
            <AlertDialogTitle>
              {deleteTarget
                ? `Delete “${deleteTarget.title}”?`
                : `Delete ${ITEM_NOUN.one}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.published
                ? `Its page at ${storefrontHref(deleteTarget.slug)} will stop working. `
                : ""}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, NOT className. AlertDialogAction wraps a `Button …
                asChild`, so a className lands on the inner Radix element while
                Button still supplies `bg-primary` — and Slot concatenates the
                two without tailwind-merge, so CSS order decides and primary
                wins. A `className="bg-destructive"` here renders BLACK. */}
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteMutation.mutate({ id: deleteId });
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
              {selectedCount === 1 ? nounTitle.one : nounTitle.many}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              {describeSelection(selectedTitles, selectedCount, ITEM_NOUN)}.
              {anySelectedPublished
                ? ` Published ${ITEM_NOUN.many} will stop working on your storefront.`
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
                : `Delete ${selectedCount} ${
                    selectedCount === 1 ? nounTitle.one : nounTitle.many
                  }`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
