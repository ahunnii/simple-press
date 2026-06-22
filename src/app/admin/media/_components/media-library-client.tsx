/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Download,
  File,
  Images,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaItem = RouterOutputs["media"]["list"]["items"][number];

type KindFilter =
  | "all"
  | "image"
  | "video"
  | "logo"
  | "favicon"
  | "testimonial"
  | "gallery"
  | "other";

type UsedFilter = "all" | "used" | "unused";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${i === 0 ? val.toString() : val.toFixed(1)} ${units[i] ?? "B"}`;
}

function getFilename(key: string): string {
  return key.split("/").pop() ?? key;
}

const IMAGE_KINDS = new Set(["image", "gallery", "logo", "favicon", "testimonial"]);

function isImageKind(kind: string): boolean {
  return IMAGE_KINDS.has(kind);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MediaThumbnail({ item }: { item: MediaItem }) {
  const filename = getFilename(item.key);

  if (isImageKind(item.kind)) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-t-md bg-muted">
        <img
          src={item.url}
          alt={filename}
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-200"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-t-md bg-muted">
      {item.kind === "video" ? (
        <Video className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      ) : (
        <File className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      )}
    </div>
  );
}

function UsageBadge({ item }: { item: MediaItem }) {
  const count = item.usedBy.length;

  if (count === 0) {
    return (
      <Badge variant="secondary" className="text-xs text-muted-foreground">
        Unused
      </Badge>
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
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Referenced by
        </p>
        <ul className="space-y-1.5">
          {item.usedBy.map((usage, i) => (
            <li key={i} className="text-sm">
              {usage.adminHref ? (
                <Link
                  href={usage.adminHref}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {usage.location}
                  {usage.entityLabel ? ` — ${usage.entityLabel}` : ""}
                </Link>
              ) : (
                <span className="text-foreground">
                  {usage.location}
                  {usage.entityLabel ? ` — ${usage.entityLabel}` : ""}
                </span>
              )}
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
  businessId,
  onDeleteConfirm,
  isDeleting,
}: {
  item: MediaItem;
  businessId: string;
  onDeleteConfirm: (item: MediaItem) => void;
  isDeleting: boolean;
}) {
  const downloadMutation = api.media.getDownloadUrl.useMutation({
    onSuccess: ({ url }) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = getFilename(item.key);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate download link");
    },
  });

  const inUse = item.usedBy.length > 0;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={() => downloadMutation.mutate({ key: item.key, businessId })}
        disabled={downloadMutation.isPending}
        aria-label={`Download ${getFilename(item.key)}`}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        {downloadMutation.isPending ? "Getting link…" : "Download"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive flex-1 border-destructive/30"
        onClick={() => onDeleteConfirm(item)}
        disabled={inUse || isDeleting}
        aria-label={
          inUse
            ? `Cannot delete ${getFilename(item.key)} — file is in use`
            : `Delete ${getFilename(item.key)}`
        }
        title={inUse ? "Cannot delete — file is in use" : undefined}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Delete
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  items: MediaItem[];
  businessId: string;
};

export function MediaLibraryClient({ items, businessId }: Props) {
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  // Read initial filter state from URL
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [kind, setKind] = useState<KindFilter>(
    (searchParams.get("type") as KindFilter | null) ?? "all",
  );
  const [used, setUsed] = useState<UsedFilter>(
    (searchParams.get("used") as UsedFilter | null) ?? "all",
  );

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);

  // ── URL sync helper ─────────────────────────────────────────────────────────

  // Sync filters to the URL via history.replaceState (NOT router.replace) so
  // shareable URLs are preserved WITHOUT re-running the server component's
  // expensive media.list scan on every keystroke. Filtering is in-memory.
  const pushParams = useCallback(
    (nextQ: string, nextType: KindFilter, nextUsed: UsedFilter) => {
      const p = new URLSearchParams();
      if (businessId) p.set("businessId", businessId);
      if (nextQ) p.set("q", nextQ);
      if (nextType !== "all") p.set("type", nextType);
      if (nextUsed !== "all") p.set("used", nextUsed);
      const qs = p.toString();
      window.history.replaceState(null, "", qs ? `/admin/media?${qs}` : "/admin/media");
    },
    [businessId],
  );

  const handleQChange = (val: string) => {
    setQ(val);
    pushParams(val, kind, used);
  };

  const handleKindChange = (val: KindFilter) => {
    setKind(val);
    pushParams(q, val, used);
  };

  const handleUsedChange = (val: UsedFilter) => {
    setUsed(val);
    pushParams(q, kind, val);
  };

  const handleClearFilters = () => {
    setQ("");
    setKind("all");
    setUsed("all");
    const p = new URLSearchParams();
    if (businessId) p.set("businessId", businessId);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `/admin/media?${qs}` : "/admin/media");
  };

  // ── In-memory filtering ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((item) => {
      if (needle) {
        const filename = getFilename(item.key).toLowerCase();
        if (!filename.includes(needle) && !item.key.toLowerCase().includes(needle)) {
          return false;
        }
      }
      if (kind !== "all" && item.kind !== kind) return false;
      if (used === "used" && item.usedBy.length === 0) return false;
      if (used === "unused" && item.usedBy.length > 0) return false;
      return true;
    });
  }, [items, q, kind, used]);

  // ── Delete mutation ─────────────────────────────────────────────────────────

  const deleteMutation = api.media.delete.useMutation({
    onMutate: () => {
      toast.loading("Deleting file…", { id: "media-delete" });
    },
    onSuccess: () => {
      toast.dismiss("media-delete");
      toast.success("File deleted");
      setDeleteTarget(null);
      void utils.media.list.invalidate();
    },
    onError: (err) => {
      toast.dismiss("media-delete");
      toast.error(err.message || "Failed to delete file");
      // Keep deleteTarget open so user sees the error
      setDeleteTarget(null);
    },
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ key: deleteTarget.key, businessId });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const isFiltering = q !== "" || kind !== "all" || used !== "all";

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Images className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-medium">No media uploaded yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Files will appear here once you upload images, videos, or other
            media to your store.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Filter bar */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Search by filename…"
              value={q}
              onChange={(e) => handleQChange(e.target.value)}
              className="pl-10"
              aria-label="Search media files"
            />
          </div>

          {/* Kind filter */}
          <div className="w-full md:w-44">
            <Select
              value={kind}
              onValueChange={(v) => handleKindChange(v as KindFilter)}
            >
              <SelectTrigger aria-label="Filter by file type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="logo">Logo</SelectItem>
                <SelectItem value="favicon">Favicon</SelectItem>
                <SelectItem value="testimonial">Testimonials</SelectItem>
                <SelectItem value="gallery">Gallery</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Used/unused filter */}
          <div className="w-full md:w-40">
            <Select
              value={used}
              onValueChange={(v) => handleUsedChange(v as UsedFilter)}
            >
              <SelectTrigger aria-label="Filter by usage">
                <SelectValue placeholder="All files" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="used">In Use</SelectItem>
                <SelectItem value="unused">Unused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear filters + result count */}
          {isFiltering && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {filtered.length}{" "}
                {filtered.length === 1 ? "result" : "results"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                aria-label="Clear all filters"
              >
                <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </Button>
            </div>
          )}

          {!isFiltering && (
            <span className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "file" : "files"}
            </span>
          )}
        </div>
      </div>

      {/* Grid or no-match empty state */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              No files match your search or filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const filename = getFilename(item.key);
            const date = new Date(item.lastModified).toLocaleDateString(
              undefined,
              { year: "numeric", month: "short", day: "numeric" },
            );

            return (
              <Card key={item.key} className="overflow-hidden">
                <MediaThumbnail item={item} />
                <CardContent className="p-3">
                  <div className="mb-2 flex items-start gap-2">
                    <p
                      className="min-w-0 flex-1 truncate text-sm font-medium"
                      title={filename}
                    >
                      {filename}
                    </p>
                    <UsageBadge item={item} />
                  </div>

                  <p className="mb-3 text-xs text-muted-foreground">
                    {formatBytes(item.size)} &middot; {date}
                  </p>

                  <MediaCardActions
                    item={item}
                    businessId={businessId}
                    onDeleteConfirm={setDeleteTarget}
                    isDeleting={deleteMutation.isPending}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
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
                    {getFilename(deleteTarget.key)}
                  </strong>{" "}
                  will be permanently removed from storage. This cannot be
                  undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
