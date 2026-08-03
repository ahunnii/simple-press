"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useEffect, useState } from "react";
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
  Pencil,
  Plus,
  Radio,
  Settings2,
  Trash2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { AdminEmpty } from "../../_components/admin-empty";
import { AddVideoDialog } from "./add-video-dialog";

type Video = RouterOutputs["videos"]["getAll"][number];
type Source = RouterOutputs["videos"]["listSources"][number];

type Props = {
  videos: RouterOutputs["videos"]["getAll"];
  sources: RouterOutputs["videos"]["listSources"];
};

/** `titleOverride ?? title` — the same resolution the storefront uses. */
function resolvedTitle(v: Video): string {
  return v.titleOverride ?? v.title;
}

function resolvedThumbnail(v: Video): string | null {
  return v.thumbnailOverride ?? v.thumbnailUrl;
}

function formatPublishedDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function VideosClient({ videos: initialVideos, sources }: Props) {
  const utils = api.useUtils();
  const router = useRouter();

  const [videos, setVideos] = useState(initialVideos);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Re-sync local state when the server page hands down fresh data (e.g.
  // after router.refresh()). Drag reorder and delete mutate `videos` directly
  // for instant feedback, so this is a no-op for them once the prop catches up.
  useEffect(() => {
    setVideos(initialVideos);
  }, [initialVideos]);

  const sourceMap = new Map<string, Source>(sources.map((s) => [s.id, s]));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const reorderMutation = api.videos.reorder.useMutation({
    onError: () => {
      toast.error("Failed to save new order");
      void utils.videos.invalidate();
      router.refresh();
    },
  });

  const updateMutation = api.videos.update.useMutation({
    onSuccess: (data) => {
      toast.success(data.published ? "Video published" : "Video unpublished");
      void utils.videos.invalidate();
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update video");
      void utils.videos.invalidate();
    },
  });

  const deleteMutation = api.videos.delete.useMutation({
    onMutate: () => toast.loading("Deleting video..."),
    onSuccess: () => {
      toast.dismiss();
      toast.success("Video deleted");
      void utils.videos.invalidate();
      router.refresh();
      setDeleteId(null);
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to delete video");
    },
  });

  const published = videos
    .filter((v) => v.published)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const drafts = videos
    .filter((v) => !v.published)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDragEnd =
    (tab: "published" | "draft") => (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const list = tab === "published" ? published : drafts;
      const oldIndex = list.findIndex((v) => v.id === active.id);
      const newIndex = list.findIndex((v) => v.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(list, oldIndex, newIndex);
      const reorderedIds = reordered.map((v) => v.id);
      const reorderedIdSet = new Set(reorderedIds);

      // Reorder only ever touches one tab's worth of ids — sortOrder within
      // the other tab (draft vs published) is left untouched, matching the
      // reorder mutation's scope (it writes sortOrder = index for exactly the
      // ids it's given). Overlapping ranges between tabs are harmless: the
      // storefront only ever queries published videos.
      setVideos((prev) => {
        const untouched = prev.filter((v) => !reorderedIdSet.has(v.id));
        const withNewOrder = reordered.map((v, i) => ({ ...v, sortOrder: i }));
        return [...untouched, ...withNewOrder];
      });

      reorderMutation.mutate({ ids: reorderedIds });
    };

  const deletingVideo = videos.find((v) => v.id === deleteId);
  const hasVideos = videos.length > 0;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Videos</h1>
          <p>Manage the YouTube videos shown on your site</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/videos/sources">
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
                <Link href="/admin/videos/sources">
                  Connect a channel or playlist
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <Tabs defaultValue="published">
          <TabsList>
            <TabsTrigger value="published">
              Published ({published.length})
            </TabsTrigger>
            <TabsTrigger value="draft">Draft ({drafts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="published" className="mt-4">
            {published.length === 0 ? (
              <AdminEmpty
                icon={Youtube}
                title="Nothing published"
                description="Publish a video below, or add a new one, so it shows up on your site."
              />
            ) : (
              <VideoList
                videos={published}
                sourceMap={sourceMap}
                sensors={sensors}
                onDragEnd={handleDragEnd("published")}
                onTogglePublish={(v) =>
                  updateMutation.mutate({ id: v.id, published: !v.published })
                }
                onDelete={setDeleteId}
                togglePendingId={
                  updateMutation.isPending
                    ? updateMutation.variables?.id
                    : undefined
                }
              />
            )}
          </TabsContent>

          <TabsContent value="draft" className="mt-4">
            {drafts.length === 0 ? (
              <AdminEmpty
                icon={Youtube}
                title="No drafts"
                description="Videos synced from a playlist you haven't set to auto-publish land here for review before they go live."
              />
            ) : (
              <VideoList
                videos={drafts}
                sourceMap={sourceMap}
                sensors={sensors}
                onDragEnd={handleDragEnd("draft")}
                onTogglePublish={(v) =>
                  updateMutation.mutate({ id: v.id, published: !v.published })
                }
                onDelete={setDeleteId}
                togglePendingId={
                  updateMutation.isPending
                    ? updateMutation.variables?.id
                    : undefined
                }
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      <AddVideoDialog open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
                    ? `"${resolvedTitle(deletingVideo)}" came from a channel or playlist you follow.`
                    : "This video came from a channel or playlist you follow."}{" "}
                  Deleting it now won&apos;t keep it away — the next sync will
                  add it back while it&apos;s still in that feed. To hide it for
                  good, unpublish it instead.
                </>
              ) : (
                <>
                  Are you sure you want to delete
                  {deletingVideo
                    ? ` "${resolvedTitle(deletingVideo)}"`
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
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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

type VideoListProps = {
  videos: Video[];
  sourceMap: Map<string, Source>;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  onTogglePublish: (video: Video) => void;
  onDelete: (id: string) => void;
  togglePendingId: string | undefined;
};

function VideoList({
  videos,
  sourceMap,
  sensors,
  onDragEnd,
  onTogglePublish,
  onDelete,
  togglePendingId,
}: VideoListProps) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={videos.map((v) => v.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {videos.map((video) => (
            <SortableVideoRow
              key={video.id}
              video={video}
              source={video.sourceId ? sourceMap.get(video.sourceId) : undefined}
              isToggling={togglePendingId === video.id}
              onTogglePublish={() => onTogglePublish(video)}
              onDelete={() => onDelete(video.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SortableVideoRow({
  video,
  source,
  isToggling,
  onTogglePublish,
  onDelete,
}: {
  video: Video;
  source: Source | undefined;
  isToggling: boolean;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const title = resolvedTitle(video);
  const thumbnail = resolvedThumbnail(video);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-3 rounded-lg border p-3"
    >
      <button
        type="button"
        aria-label={`Drag to reorder ${title}`}
        className="focus-visible:ring-ring text-muted-foreground hover:text-foreground flex h-9 w-9 shrink-0 cursor-move items-center justify-center focus-visible:ring-1 focus-visible:outline-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {thumbnail ? (
        <div className="bg-muted relative h-12 w-20 shrink-0 overflow-hidden rounded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
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

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/videos/${video.id}`}
            className="truncate text-sm font-medium hover:underline"
          >
            {title}
          </Link>
          {video.sourceId === null ? (
            <Badge variant="outline" className="text-xs">
              Added manually
            </Badge>
          ) : source ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              {source.kind === "playlist" ? (
                <ListVideo className="h-3 w-3" />
              ) : (
                <Radio className="h-3 w-3" />
              )}
              {source.label ??
                (source.kind === "playlist" ? "Playlist" : "Channel")}
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground truncate text-xs">
          {video.channelTitle ?? "Unknown channel"} ·{" "}
          {formatPublishedDate(video.publishedAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild
          aria-label={`Watch "${title}" on YouTube`}
          title="Watch on YouTube"
        >
          <a
            href={youtubeWatchUrl(video.youtubeId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild
          aria-label={`Edit ${title}`}
          title="Edit"
        >
          <Link href={`/admin/videos/${video.id}`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive/80"
          aria-label={`Delete ${title}`}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
