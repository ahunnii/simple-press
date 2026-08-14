"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Eye,
  EyeOff,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { BulkAction } from "../../_components/admin-bulk-bar";
import type { AdminFilterDef } from "../../_components/admin-filters";
import type { EventStatus, EventWhen } from "~/lib/validators/events";
import type { RouterOutputs } from "~/trpc/react";
import { formatEventDate } from "~/lib/events/format";
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
import { AdminThumb } from "../../_components/admin-thumb";
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

// The row shape `events.getAll` returns, plus the two derivations the page
// computes once (via `getEventStatus`/`getEventWhen` in
// `~/lib/validators/events`) and hands down. The client never derives either
// itself, and in particular never calls `Date.now()` during render — the old
// client did, to split its Upcoming/Past tabs, which is a latent SSR/hydration
// hazard: a row whose cutoff falls between the server render and the client's
// first paint would land on different sides of the split.
export type EventRow = RouterOutputs["events"]["getAll"][number] & {
  status: EventStatus;
  when: EventWhen;
};

type Props = {
  /** The current page slice only — filtering/sorting/paging happen in page.tsx. */
  events: EventRow[];
  /** Business.timeZone — every date shown here goes through formatEventDate. */
  timeZone: string;
  filters: AdminFilterDef[];
  /**
   * Ids of every row matching the current filters, across all pages — or
   * `null` when more than ADMIN_BULK_SELECTION_LIMIT match and
   * `buildTablePage` declined to enumerate them. `null` is NOT `[]`: an empty
   * array is a genuine "nothing matched". See `useAdminTableSelection`, which
   * takes both.
   */
  matchingIds: string[] | null;
  /** Unfiltered total — distinguishes "no events yet" from "no matches". */
  totalEvents: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Mirrors `events.bulkDelete`'s `ownerOnlyProcedure`, resolved
   *  server-side. False OMITS the bulk Delete action rather than disabling it. */
  canBulkDelete: boolean;
};

const BASE_PATH = "/admin/events";
const ITEM_NOUN = { one: "event", many: "events" } as const;

const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_CHECKBOX = TABLE_HEAD_TIGHT;
const TD_CHECKBOX = TABLE_CELL_TIGHT;

/** "3 of 5" — a bulk op silently touching fewer rows than asked must say so. */
const shortfallMessage = createShortfallMessage(ITEM_NOUN);

/**
 * The ONE place these words are written. The desktop Status badge and the
 * `md:hidden` reflow line both render from this map, so the two cannot drift.
 *
 * This collapses the old table's *additive* badges — a `Published`/`Draft`
 * badge with a separate `Archived` badge appended — into the single derived
 * status `getEventStatus` computes with priority archived ▸ draft ▸ published.
 * The old pairing could read "Published · Archived", which named two states
 * for a row that is, to a shopper, simply gone.
 */
const STATUS_LABEL: Record<EventStatus, string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

// `success` for published rather than the old table's `default` (solid primary
// fill): Collections' Published, Discounts' Active and Reviews' Published all
// use `success` for the same "this is the live, good state" meaning.
const STATUS_BADGE_VARIANT: Record<
  EventStatus,
  "success" | "secondary" | "outline"
> = {
  published: "success",
  draft: "secondary",
  archived: "outline",
};

export function EventsClient({
  events,
  timeZone,
  filters,
  matchingIds,
  totalEvents,
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
    rowIds: events.map((event) => event.id),
    matchingIds,
    totalCount,
    page,
    searchParams,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const afterWrite = () => {
    void utils.events.invalidate();
    router.refresh();
  };

  // `events.delete` takes a BARE string id, not `{ id }` — unlike the bulk
  // procedures below.
  const deleteMutation = api.events.delete.useMutation({
    onMutate: loadingToast("Deleting event…"),
    onSuccess: (_data, id, context) => {
      dismissLoadingToast(context);
      toast.success("Event deleted");
      pruneSelection([id]);
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _id, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete event");
    },
  });

  // Per-row archive toggle. No `pruneSelection` here (unlike delete): the row
  // stays in the list, only its flags change — same as Reviews' per-row
  // approve/hide.
  const archiveMutation = api.events.setArchived.useMutation({
    onMutate: loadingToast("Updating event…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        variables.isArchived
          ? "Event archived — it's hidden from your site"
          : "Event moved back to upcoming",
      );
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update event");
    },
  });

  // Separate from `bulkPublishMutation` so undo's own success toast doesn't
  // offer another Undo, which would let the two ping-pong indefinitely.
  const undoPublishMutation = api.events.bulkSetPublished.useMutation({
    onMutate: loadingToast("Undoing…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.published ? "published" : "unpublished";
      toast.success(
        `Undone — ${data.count} ${
          data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
        } ${verb}`,
      );
      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to undo");
    },
  });

  const bulkPublishMutation = api.events.bulkSetPublished.useMutation({
    // Direction-aware, unlike a single "Updating…": putting a season's dates
    // live and pulling them back down are different enough operations to name
    // while they run.
    onMutate: (variables) => ({
      toastId: toast.loading(
        variables.published ? "Publishing events…" : "Unpublishing events…",
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
        // dressed up as a recovery.
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
      toast.error(error.message ?? "Failed to update events");
    },
  });

  // Same split, same reason, for the archive/unarchive pair.
  const undoArchiveMutation = api.events.bulkSetArchived.useMutation({
    onMutate: loadingToast("Undoing…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.isArchived ? "archived" : "unarchived";
      toast.success(
        `Undone — ${data.count} ${
          data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
        } ${verb}`,
      );
      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to undo");
    },
  });

  const bulkArchiveMutation = api.events.bulkSetArchived.useMutation({
    onMutate: (variables) => ({
      toastId: toast.loading(
        variables.isArchived ? "Archiving events…" : "Unarchiving events…",
      ),
    }),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.isArchived ? "archived" : "unarchived";
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, verb));
      } else {
        const undoable = data.changedIds;
        const plural = data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many;
        toast.success(
          // Echoes the per-row copy above ("Event archived — it's hidden from
          // your site"): archiving is the one bulk action here with a
          // consequence the verb alone doesn't name.
          variables.isArchived
            ? `${data.count} ${plural} archived — ${
                data.count === 1 ? "it's" : "they're"
              } hidden from your site`
            : `${data.count} ${plural} ${verb}`,
          undoable.length > 0
            ? {
                action: {
                  label: "Undo",
                  onClick: () =>
                    undoArchiveMutation.mutate({
                      ids: undoable,
                      isArchived: !variables.isArchived,
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
      toast.error(error.message ?? "Failed to update events");
    },
  });

  const bulkDeleteMutation = api.events.bulkDelete.useMutation({
    onMutate: loadingToast("Deleting events…"),
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
      toast.error(error.message ?? "Failed to delete events");
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const selectedOnPageRows = events.filter((event) =>
    selectedIds.has(event.id),
  );
  const selectedNames = selectedOnPageRows.map((event) => event.name);
  const deleteTarget = events.find((event) => event.id === deleteId);

  const overCap = createOverCapGuard(selectedCount, ITEM_NOUN);
  const capReason = createCapDisabledReason(selectedCount, ITEM_NOUN);
  const deleteCapReason = capReason(ADMIN_BULK_DELETE_LIMIT, "delete");

  const handleBulkPublish = (published: boolean) => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_SELECTION_LIMIT, "update")) {
      return;
    }
    bulkPublishMutation.mutate({ ids: [...selectedIds], published });
  };

  const handleBulkArchive = (isArchived: boolean) => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_SELECTION_LIMIT, "update")) {
      return;
    }
    bulkArchiveMutation.mutate({ ids: [...selectedIds], isArchived });
  };

  const handleBulkDelete = () => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_DELETE_LIMIT, "delete")) {
      return;
    }
    bulkDeleteMutation.mutate({ ids: [...selectedIds] });
  };

  // The undo mutations count: they write to the same rows the bulk bar acts
  // on, so leaving the bar live during an undo lets a second bulk action race
  // it.
  const isBulkPending =
    bulkPublishMutation.isPending ||
    undoPublishMutation.isPending ||
    bulkArchiveMutation.isPending ||
    undoArchiveMutation.isPending ||
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
      label: "Archive",
      icon: Archive,
      onClick: () => handleBulkArchive(true),
      pending:
        bulkArchiveMutation.isPending &&
        bulkArchiveMutation.variables?.isArchived === true,
    },
    {
      label: "Unarchive",
      icon: ArchiveRestore,
      onClick: () => handleBulkArchive(false),
      pending:
        bulkArchiveMutation.isPending &&
        bulkArchiveMutation.variables?.isArchived === false,
    },
    // Omitted, not disabled, for a MANAGER: `bulkDelete` is
    // `ownerOnlyProcedure`, and a button that only ever produces a FORBIDDEN
    // toast is worse than no button. The procedure remains the enforcement.
    ...(canBulkDelete
      ? [
          {
            label: "Delete",
            icon: Trash2,
            variant: "destructive" as const,
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

  const hasEvents = totalEvents > 0;
  const hasResults = events.length > 0;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Events</h1>
          <p>Manage the markets, pop-ups, and dates shown on your site</p>
        </div>
        <Button asChild>
          <Link href={`${BASE_PATH}/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Link>
        </Button>
      </div>

      {!hasEvents ? (
        <AdminEmpty
          icon={CalendarDays}
          title="No events yet"
          description="Add a market, pop-up, or workshop date so shoppers can see when to find you."
          action={
            <Button asChild>
              <Link href={`${BASE_PATH}/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Event
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search events…"
            searchAriaLabel="Search events by name or location"
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
                    disabledReason: escalationDisabledReason,
                  }
                : undefined
            }
          />

          {!hasResults ? (
            <AdminEmpty
              icon={Search}
              title="No events match your filters"
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
                  <TableCaption className="sr-only">Events</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={`w-10 ${TH_CHECKBOX}`}>
                        <Checkbox
                          id="select-all-events"
                          checked={
                            allPageSelected
                              ? true
                              : somePageSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={handleSelectAllOnPage}
                          aria-label="Select all events on this page"
                        />
                      </TableHead>
                      <TableHead scope="col" className={TH}>
                        Event
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Date
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Location
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
                    {/* No row-level onClick / cursor-pointer: whole-row
                        navigation was dropped in the migration and no migrated
                        table has it. It fights the checkbox cell (every
                        selection click needs a stopPropagation escape hatch)
                        and it is keyboard-unreachable — a `<tr>` is not
                        focusable. The name link and the Edit item are the
                        navigation. */}
                    {events.map((event, index) => {
                      const isSelected = selectedIds.has(event.id);
                      // Computed once and reused by the mobile reflow line, so
                      // the two can never disagree.
                      const dateLabel = formatEventDate(event, timeZone);
                      const isArchiving =
                        archiveMutation.isPending &&
                        archiveMutation.variables?.id === event.id;

                      return (
                        <TableRow
                          key={event.id}
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell className={TD_CHECKBOX}>
                            <Checkbox
                              checked={isSelected}
                              onClickCapture={onRowClickCapture}
                              onCheckedChange={() => handleRowToggle(index)}
                              aria-label={`Select ${event.name}`}
                            />
                          </TableCell>

                          <TableCell className={`${TD} whitespace-normal`}>
                            <div className="flex items-center gap-3">
                              {event.coverImage ? (
                                <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded">
                                  <AdminThumb
                                    src={event.coverImage}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                                  <CalendarDays className="text-muted-foreground h-4 w-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                {/* The link wraps the NAME only, not the cell —
                                    an anchor around the thumbnail and both text
                                    lines reads to assistive tech as one link
                                    named by all of it run together. */}
                                <Link
                                  href={`${BASE_PATH}/${event.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {event.name}
                                </Link>
                                {/* Below md the Date/Location/Status columns
                                    are hidden — reflow them here. */}
                                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                                  <span>{dateLabel}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{event.location ?? "—"}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{STATUS_LABEL[event.status]}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {dateLabel}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {event.location ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            <Badge variant={STATUS_BADGE_VARIANT[event.status]}>
                              {STATUS_LABEL[event.status]}
                            </Badge>
                          </TableCell>

                          <TableCell className={`${TD} text-right`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">
                                    Actions for {event.name}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`${BASE_PATH}/${event.id}`}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>

                                {/* Keyed off the row's own `isArchived` flag,
                                    not a tab: the old client offered Archive on
                                    the Upcoming tab and Move-to-upcoming on the
                                    Past tab, which mislabelled the action for a
                                    still-unarchived event that had merely
                                    ended. */}
                                {event.isArchived ? (
                                  <DropdownMenuItem
                                    disabled={isArchiving}
                                    onClick={() =>
                                      archiveMutation.mutate({
                                        id: event.id,
                                        isArchived: false,
                                      })
                                    }
                                  >
                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                    Move to upcoming
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    disabled={isArchiving}
                                    title="Archiving also hides this event from your site"
                                    onClick={() =>
                                      archiveMutation.mutate({
                                        id: event.id,
                                        isArchived: true,
                                      })
                                    }
                                  >
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archive (hides from your site)
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(event.id)}
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
            <AlertDialogTitle>
              {deleteTarget
                ? `Delete “${deleteTarget.name}”?`
                : "Delete event?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear from your site immediately. This action cannot
              be undone.
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
                wins. A `className="bg-destructive"` here renders BLACK (the bug
                the old events table shipped). */}
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
              Delete {selectedCount} {selectedCount === 1 ? "event" : "events"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              {describeSelection(selectedNames, selectedCount, ITEM_NOUN)}.{" "}
              {selectedCount === 1 ? "It" : "They"} will disappear from your
              storefront immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? "Deleting…"
                : `Delete ${selectedCount} ${
                    selectedCount === 1 ? "event" : "events"
                  }`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
