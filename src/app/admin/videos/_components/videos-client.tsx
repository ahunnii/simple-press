"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  ListVideo,
  MoreVertical,
  Pencil,
  Plus,
  Radio,
  Search,
  Settings2,
  Trash2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import {
  resolveVideoThumbnail,
  resolveVideoTitle,
  videoSourceBadgeText,
} from "~/lib/validators/videos";
import { youtubeWatchUrl } from "~/lib/youtube/parse";
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

import { AdminEmpty } from "../../_components/admin-empty";
import { AdminFilters } from "../../_components/admin-filters";
import { AdminThumb } from "../../_components/admin-thumb";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_CELL_TIGHT,
  TABLE_HEAD,
  TABLE_HEAD_TIGHT,
} from "../../_components/admin-table-style";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";
import { AddVideoDialog } from "./add-video-dialog";

/**
 * Videos is the playbook's §7 drag-to-reorder case, and it adopts the shared
 * primitives SELECTIVELY. What it takes: `AdminFilters` (search only), the
 * `AdminEmpty` states, the table style tokens, and the loading-toast grammar.
 * What it deliberately does NOT take, and why:
 *
 * - **Pagination.** Reorder and paging are mutually exclusive — you cannot
 *   drag a row onto a page it isn't on, and a reorder rewrites the very
 *   `sortOrder` the paginator sorts by, shuffling rows out from under the
 *   drag that just landed. The owner reorders; that wins.
 * - **Selection + bulk bar.** There are no bulk endpoints on `videos`, and a
 *   checkbox column competes with the drag handle for the same left gutter.
 * - **A sort control.** The order IS the sort. Offering "Name A–Z" next to a
 *   list whose whole purpose is a hand-arranged sequence would present two
 *   orderings and honour one.
 *
 * Search is offered, and it turns reorder OFF while active (see
 * `reorderEnabled`): dropping row 3 onto row 5 of a *filtered* list would
 * write sortOrder 0..n over a subset, silently re-sequencing every row the
 * search hid.
 */

const BASE_PATH = "/admin/videos";
const ITEM_NOUN = { one: "video", many: "videos" } as const;

const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_DRAG = TABLE_HEAD_TIGHT;
const TD_DRAG = TABLE_CELL_TIGHT;

/** Written once — shown above the table and on the inert drag handles. */
const REORDER_DISABLED_HINT =
  "Reordering is turned off while searching — clear the search to drag videos into order.";

/**
 * The ONE place this fallback is written. The desktop Channel cell and the
 * `md:hidden` reflow line both render from it, so the two cannot drift into
 * reading like different states (§5e one-constant rule).
 */
const UNKNOWN_CHANNEL = "Unknown channel";

export type VideoRow = RouterOutputs["videos"]["getAll"][number];
type Source = RouterOutputs["videos"]["listSources"][number];

type Props = {
  /** Which tab the URL selected — the page owns this via `pickParam`. */
  tab: "published" | "drafts";
  /** ACTIVE tab only, already search-filtered, server order preserved. */
  rows: VideoRow[];
  /** Trimmed search term. `""` ⇒ reorder is enabled. */
  search: string;
  /** Unfiltered per-tab totals — the empty-state gates read these, never `rows`. */
  publishedCount: number;
  draftsCount: number;
  sources: RouterOutputs["videos"]["listSources"];
};

function formatPublishedDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

const TAB_CLASS =
  "focus-visible:outline-ring inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
const TAB_ACTIVE = "border-primary text-primary";
const TAB_INACTIVE =
  "text-muted-foreground hover:border-border hover:text-foreground border-transparent";

/**
 * Published / Drafts tab nav, styled to match `TestimonialsTabs`.
 *
 * Deliberate divergence from that component: these links CARRY the current
 * search across the switch, where Testimonials navigates to a clean URL. The
 * reason is that Testimonials' two tabs are different entities with different
 * filter params, while both tabs here are the same entity searched over the
 * same fields — so "search for a title, then flip to Drafts to see whether
 * the missing one is unpublished" is the natural workflow, and dropping the
 * term mid-hunt would be the surprising behaviour.
 *
 * Counts are always the UNFILTERED per-tab totals: a tab label that shrank as
 * you typed would be reporting the search, not the tab.
 */
function VideosTabs({
  tab,
  search,
  publishedCount,
  draftsCount,
}: {
  tab: "published" | "drafts";
  search: string;
  publishedCount: number;
  draftsCount: number;
}) {
  const hrefFor = (target: "published" | "drafts") => {
    const params = new URLSearchParams();
    if (target === "drafts") params.set("tab", "drafts");
    if (search) params.set("search", search);
    const query = params.toString();
    return query ? `${BASE_PATH}?${query}` : BASE_PATH;
  };

  return (
    <nav aria-label="Video views" className="border-border mb-6 border-b">
      <div className="-mb-px flex">
        <Link
          href={hrefFor("published")}
          aria-current={tab === "published" ? "page" : undefined}
          className={`${TAB_CLASS} ${tab === "published" ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          Published ({publishedCount})
        </Link>
        <Link
          href={hrefFor("drafts")}
          aria-current={tab === "drafts" ? "page" : undefined}
          className={`${TAB_CLASS} ${tab === "drafts" ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          Drafts ({draftsCount})
        </Link>
      </div>
    </nav>
  );
}

export function VideosClient({
  tab,
  rows: rowsProp,
  search,
  publishedCount,
  draftsCount,
  sources,
}: Props) {
  const utils = api.useUtils();
  const router = useRouter();

  // Local rows exist for ONE reason: an optimistic drag reorder, so the row
  // stays where it was dropped instead of snapping back until the server
  // round-trip lands.
  //
  // Re-synced DURING RENDER rather than in an effect. `rowsProp` now genuinely
  // varies (tab switch, search submit, router.refresh()), and the old
  // `useEffect(() => setVideos(initialVideos), [initialVideos])` painted one
  // frame of the PREVIOUS tab's rows before the effect flushed. Adjusting
  // state during render is React's supported pattern for exactly this — the
  // same one `AdminFilters` uses to re-seed its search box.
  const [localRows, setLocalRows] = useState(rowsProp);
  const [lastRowsProp, setLastRowsProp] = useState(rowsProp);
  if (rowsProp !== lastRowsProp) {
    setLastRowsProp(rowsProp);
    setLocalRows(rowsProp);
  }

  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Shared by the header button and the global empty state's action.
  const [addOpen, setAddOpen] = useState(false);

  const sourceMap = new Map<string, Source>(sources.map((s) => [s.id, s]));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const afterWrite = () => {
    void utils.videos.invalidate();
    router.refresh();
  };

  // Deliberately SILENT on success (stated deviation from §5g's toast-on-every-
  // write rule): dragging is a high-frequency, directly-visible gesture — the
  // row is already where the owner put it — and a toast per drop turns
  // arranging a dozen videos into a dozen dismissals.
  //
  // Failure still speaks, and the invalidate/refresh IS the rollback: the
  // server's order replaces the optimistic one.
  const reorderMutation = api.videos.reorder.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to save new order");
      void utils.videos.invalidate();
      router.refresh();
    },
  });

  const updateMutation = api.videos.update.useMutation({
    onMutate: loadingToast("Updating video…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success(data.published ? "Video published" : "Video unpublished");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update video");
    },
  });

  const deleteMutation = api.videos.delete.useMutation({
    onMutate: loadingToast("Deleting video…"),
    onSuccess: (_data, _id, context) => {
      dismissLoadingToast(context);
      toast.success("Video deleted");
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _id, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete video");
    },
  });

  // Only the row being toggled loses its button, not every row's.
  const togglePendingId = updateMutation.isPending
    ? updateMutation.variables?.id
    : undefined;

  // ── Reorder ────────────────────────────────────────────────────────────────

  const reorderEnabled = search === "";

  const handleDragEnd = (event: DragEndEvent) => {
    // Belt and braces: the handles are inert while searching, but a drag
    // already in flight when the results change must not write a subset order.
    if (search !== "") return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localRows.findIndex((v) => v.id === active.id);
    const newIndex = localRows.findIndex((v) => v.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // `localRows` is one tab's worth of videos, so the ids sent are one tab's
    // worth too — which is exactly `videos.reorder`'s scope (it writes
    // sortOrder = index for precisely the ids it's given). The other tab's
    // sortOrder values are left alone, and the resulting overlap between the
    // two ranges is harmless: the storefront only ever queries published
    // videos, so the two sequences never share a list.
    const reordered = arrayMove(localRows, oldIndex, newIndex).map((v, i) => ({
      ...v,
      sortOrder: i,
    }));

    setLocalRows(reordered);
    reorderMutation.mutate({ ids: reordered.map((v) => v.id) });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const deletingVideo = localRows.find((v) => v.id === deleteId);
  const hasVideos = publishedCount + draftsCount > 0;
  const tabTotal = tab === "published" ? publishedCount : draftsCount;
  const clearSearchHref =
    tab === "drafts" ? `${BASE_PATH}?tab=drafts` : BASE_PATH;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Videos</h1>
          <p>Manage the YouTube videos shown on your site</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`${BASE_PATH}/sources`}>
              <Settings2 className="mr-2 h-4 w-4" />
              Channels &amp; Playlists
            </Link>
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Video
          </Button>
        </div>
      </div>

      {!hasVideos ? (
        // Gated on the UNFILTERED totals across BOTH tabs: a search matching
        // nothing must never tell a store with 40 videos that it has none.
        <AdminEmpty
          icon={Youtube}
          title="No videos yet"
          description="Paste a YouTube link to add your first video, or connect a channel or playlist so new uploads show up automatically."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Video
              </Button>
              <Button variant="outline" asChild>
                <Link href={`${BASE_PATH}/sources`}>
                  Connect a channel or playlist
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <VideosTabs
            tab={tab}
            search={search}
            publishedCount={publishedCount}
            draftsCount={draftsCount}
          />

          {/* `filters={[]}` hides the popover entirely — there is nothing to
              filter beyond the tab, which is its own nav. No `onFiltersChange`
              either: that callback exists to drop a multi-select, and this
              table has no selection. */}
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search videos…"
            searchAriaLabel="Search videos by title, channel, or playlist name"
            filters={[]}
            resultCount={rowsProp.length}
            itemNoun={ITEM_NOUN}
          />

          {tabTotal === 0 ? (
            // The tab's own unfiltered emptiness wins over the search gate —
            // searching inside an empty tab should say the tab is empty, not
            // blame the query. NOT `filtered`, for the same reason.
            tab === "published" ? (
              <AdminEmpty
                icon={Youtube}
                title="Nothing published"
                description="Publish a video from Drafts, or add a new one, so it shows up on your site."
              />
            ) : (
              <AdminEmpty
                icon={Youtube}
                title="No drafts"
                description="Videos synced from a playlist you haven't set to auto-publish land here for review before they go live."
              />
            )
          ) : rowsProp.length === 0 ? (
            <AdminEmpty
              icon={Search}
              title="No videos match your search"
              filtered
              action={
                <Button variant="outline" asChild>
                  {/* Clears the search but KEEPS the tab — landing back on
                      Published after searching Drafts would look like the
                      button navigated somewhere else. */}
                  <Link href={clearSearchHref}>Clear search</Link>
                </Button>
              }
            />
          ) : (
            <>
              {!reorderEnabled && (
                <p className="text-muted-foreground mb-3 text-sm">
                  {REORDER_DISABLED_HINT}
                </p>
              )}

              <Card className={TABLE_CARD}>
                {/* No DragOverlay: the dragged element is a `<tr>`, and a row
                    cloned into an overlay is rendered outside the `<table>`
                    that gives its cells their widths — it collapses to content
                    width mid-drag. The in-place transform + `bg-card` on the
                    dragging row is the correct treatment for a table. */}
                {/* The stable `id` is load-bearing: without it dnd-kit mints
                    the handles' `aria-describedby` target from a global
                    counter (`DndDescribedBy-0`, `-1`, …) that counts
                    differently on the server than in the browser — a
                    guaranteed hydration mismatch under SSR. */}
                <DndContext
                  id="videos-reorder"
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableCaption className="sr-only">Videos</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col" className={`w-10 ${TH_DRAG}`}>
                          <span className="sr-only">Reorder</span>
                        </TableHead>
                        <TableHead scope="col" className={TH}>
                          Video
                        </TableHead>
                        <TableHead
                          scope="col"
                          className={`hidden md:table-cell ${TH}`}
                        >
                          Channel
                        </TableHead>
                        <TableHead
                          scope="col"
                          className={`hidden md:table-cell ${TH}`}
                        >
                          Date
                        </TableHead>
                        <TableHead scope="col" className={`${TH} text-right`}>
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <SortableContext
                      items={localRows.map((v) => v.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <TableBody>
                        {/* No row-level onClick / cursor-pointer: whole-row
                            navigation is not a pattern any migrated table has,
                            it is keyboard-unreachable (a `<tr>` is not
                            focusable), and here it would fight the drag handle
                            for the same pointer gesture. The title link and the
                            Edit button are the navigation. */}
                        {localRows.map((video) => (
                          <SortableVideoRow
                            key={video.id}
                            video={video}
                            source={
                              video.sourceId
                                ? sourceMap.get(video.sourceId)
                                : undefined
                            }
                            reorderEnabled={reorderEnabled}
                            isToggling={togglePendingId === video.id}
                            onTogglePublish={() =>
                              updateMutation.mutate({
                                id: video.id,
                                published: !video.published,
                              })
                            }
                            onDelete={() => setDeleteId(video.id)}
                          />
                        ))}
                      </TableBody>
                    </SortableContext>
                  </Table>
                </DndContext>
              </Card>
            </>
          )}
        </>
      )}

      <AddVideoDialog open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete video?</AlertDialogTitle>
            <AlertDialogDescription>
              {/* Two genuinely different outcomes, so two different warnings.
                  A source-backed video is re-created by the next sync while it
                  is still in the feed, which makes "delete" the wrong tool for
                  "I don't want this on my site" — unpublishing is owner-owned
                  and sync never reverts it. Saying "cannot be undone" alone
                  would be actively misleading here. */}
              {deletingVideo?.sourceId ? (
                <>
                  {deletingVideo
                    ? `"${resolveVideoTitle(deletingVideo)}" came from a channel or playlist you follow.`
                    : "This video came from a channel or playlist you follow."}{" "}
                  Deleting it now won&apos;t keep it away — the next sync will
                  add it back while it&apos;s still in that feed. To hide it for
                  good, unpublish it instead.
                </>
              ) : (
                <>
                  Are you sure you want to delete
                  {deletingVideo
                    ? ` "${resolveVideoTitle(deletingVideo)}"`
                    : " this video"}
                  ? You added it by hand, so nothing will bring it back. This
                  action cannot be undone.
                </>
              )}
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
                this file shipped before the migration). */}
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SortableVideoRow({
  video,
  source,
  reorderEnabled,
  isToggling,
  onTogglePublish,
  onDelete,
}: {
  video: VideoRow;
  source: Source | undefined;
  reorderEnabled: boolean;
  isToggling: boolean;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const title = resolveVideoTitle(video);
  const thumbnail = resolveVideoThumbnail(video);
  const dateLabel = formatPublishedDate(video.publishedAt);

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      // A transformed row is still transparent by default, so the rows it
      // travels over show through it. Lift it and give it the card's own
      // background for the duration of the drag.
      className={isDragging ? "bg-card relative z-10" : undefined}
    >
      <TableCell className={TD_DRAG}>
        {reorderEnabled ? (
          <button
            type="button"
            aria-label={`Drag to reorder ${title}`}
            className="focus-visible:ring-ring text-muted-foreground hover:text-foreground flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center focus-visible:ring-1 focus-visible:outline-none active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          // Rendered WITHOUT the sortable attributes/listeners rather than
          // merely styled down — an inert-looking handle that still starts a
          // drag would write a subset order (see `reorderEnabled`).
          //
          // `aria-disabled` rather than `disabled`, and still in the tab order:
          // a keyboard user who reaches for reordering should hear that it is
          // unavailable, which a control removed from the tab order cannot
          // tell them. The name stays row-specific and short — the full reason
          // is the visible hint above the table, and repeating that sentence on
          // every row would make the list unusable to read through.
          <button
            type="button"
            aria-disabled="true"
            aria-label={`Reorder ${title} — unavailable while searching`}
            title={REORDER_DISABLED_HINT}
            className="focus-visible:ring-ring text-muted-foreground/40 flex h-9 w-9 shrink-0 cursor-default items-center justify-center focus-visible:ring-1 focus-visible:outline-none"
          >
            <GripVertical aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </TableCell>

      <TableCell className={`${TD} whitespace-normal`}>
        <div className="flex items-center gap-3">
          {thumbnail ? (
            <div className="bg-muted relative h-12 w-20 shrink-0 overflow-hidden rounded">
              <AdminThumb
                src={thumbnail}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted flex h-12 w-20 shrink-0 items-center justify-center rounded">
              <Youtube className="text-muted-foreground h-4 w-4" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* The link wraps the TITLE only, not the cell — an anchor
                  around the thumbnail, the badge and the reflow line reads to
                  assistive tech as one link named by all of it run together. */}
              <Link
                href={`${BASE_PATH}/${video.id}`}
                className="font-medium hover:underline"
              >
                {title}
              </Link>
              {/* Badge TEXT comes from `videoSourceBadgeText`, which the
                  page's search predicate also matches against — the badge is
                  the string owners will type to find a source's videos, so
                  the two must not drift. Variant and icon stay local (they're
                  presentation, not vocabulary). */}
              {video.sourceId === null ? (
                <Badge variant="outline" className="text-xs">
                  {videoSourceBadgeText(video, source)}
                </Badge>
              ) : source ? (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {source.kind === "playlist" ? (
                    <ListVideo className="h-3 w-3" />
                  ) : (
                    <Radio className="h-3 w-3" />
                  )}
                  {videoSourceBadgeText(video, source)}
                </Badge>
              ) : null}
            </div>

            {/* Below md the Channel/Date columns are hidden — reflow them
                here, from the same values those cells render. */}
            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
              <span>{video.channelTitle ?? UNKNOWN_CHANNEL}</span>
              <span aria-hidden="true">·</span>
              <span>{dateLabel}</span>
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className={`hidden md:table-cell ${TD}`}>
        {video.channelTitle ?? (
          <span className="text-muted-foreground">{UNKNOWN_CHANNEL}</span>
        )}
      </TableCell>

      <TableCell className={`hidden md:table-cell ${TD}`}>
        {dateLabel}
      </TableCell>

      <TableCell className={`${TD} text-right`}>
        <div className="flex items-center justify-end gap-1">
          {/* The publish toggle stays INLINE, outside the kebab — a stated
              divergence from the other migrated tables' all-in-the-menu rule.
              Videos has no bulk bar, so this toggle is the ONLY publish
              mechanism, and it carries the page's core loop: a channel sync
              with auto-publish off lands a pile of drafts, and the owner
              reviews and publishes them one by one. Two clicks on a menu that
              reopens per row would tax exactly that workflow. Everything
              else lives in the standard kebab below. */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onTogglePublish}
            disabled={isToggling}
            aria-label={
              video.published ? `Unpublish ${title}` : `Publish ${title}`
            }
            title={video.published ? "Unpublish" : "Publish"}
          >
            {video.published ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions for {title}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a
                  href={youtubeWatchUrl(video.youtubeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Watch on YouTube
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${BASE_PATH}/${video.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
