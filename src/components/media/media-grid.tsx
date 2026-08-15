/* eslint-disable @next/next/no-img-element */
/**
 * Shared presentational pieces for rendering media library items.
 *
 * `MediaThumbnail`, `formatBytes`, `getFilename`, and `isImageKind` are
 * extracted from `media-library-client.tsx` so both the full Media Library
 * page and the `MediaPickerDialog` (template-field "choose from library"
 * picker) render thumbnails identically.
 *
 * `MediaGrid` is a new selectable grid used by the picker — the full Media
 * Library page has its own richer grid (usage badges, delete/download
 * actions, used/unused filter) that isn't a fit for a picker dialog, so it
 * is NOT built on top of `MediaGrid`.
 */
"use client";

import { File, Video } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaItem = RouterOutputs["media"]["list"]["items"][number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const val = bytes / Math.pow(1024, i);
  return `${i === 0 ? val.toString() : val.toFixed(1)} ${units[i] ?? "B"}`;
}

export function getFilename(key: string): string {
  return key.split("/").pop() ?? key;
}

const IMAGE_KINDS = new Set([
  "image",
  "gallery",
  "logo",
  "favicon",
  "testimonial",
]);

export function isImageKind(kind: string): boolean {
  return IMAGE_KINDS.has(kind);
}

// ─── MediaThumbnail ───────────────────────────────────────────────────────────

export function MediaThumbnail({ item }: { item: MediaItem }) {
  const filename = getFilename(item.key);

  if (isImageKind(item.kind)) {
    return (
      <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-t-md">
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
    <div className="bg-muted flex aspect-video w-full items-center justify-center rounded-t-md">
      {item.kind === "video" ? (
        <Video className="text-muted-foreground h-10 w-10" aria-hidden="true" />
      ) : (
        <File className="text-muted-foreground h-10 w-10" aria-hidden="true" />
      )}
    </div>
  );
}

// ─── MediaGrid ────────────────────────────────────────────────────────────────

/**
 * Selectable grid of media items — clicking a card fires `onSelect`. Used by
 * `MediaPickerDialog`. Callers are responsible for filtering/searching the
 * `items` array before passing it in.
 */
export function MediaGrid({
  items,
  onSelect,
  emptyMessage = "No files match your search.",
}: {
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const filename = getFilename(item.key);
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item)}
            className="group focus-visible:ring-ring rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
            aria-label={`Select ${filename}`}
          >
            <Card className="group-hover:border-primary group-focus-visible:border-primary overflow-hidden transition-colors">
              <MediaThumbnail item={item} />
              <CardContent className="p-2">
                <p className="truncate text-xs font-medium" title={filename}>
                  {filename}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {formatBytes(item.size)}
                </p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
