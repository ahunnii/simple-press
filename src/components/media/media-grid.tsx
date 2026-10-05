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

import { Check, File, Video } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { formatBytes } from "~/lib/format-bytes";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaItem = RouterOutputs["media"]["list"]["items"][number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Lives in a plain (non-"use client") module so server components can call it
// too — a function imported from this "use client" file is a client reference
// on the server, not callable. Re-exported for existing client importers.
export { formatBytes };

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
 *
 * Optional selection mode (multi-pick): pass `selectedKeys` to render each
 * tile as a toggle (`aria-pressed` + checkbox overlay + ring when selected),
 * and `disabledKeys` to lock tiles that can't be picked (e.g. already in the
 * product gallery), labelled with `disabledLabel`. Both sets are keyed by
 * `item.url` — callers deal in public URLs, not storage keys. With none of
 * these props the grid renders exactly as the single-pick grid always has.
 */
export function MediaGrid({
  items,
  onSelect,
  emptyMessage = "No files match your search.",
  selectedKeys,
  disabledKeys,
  disabledLabel = "Unavailable",
}: {
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  emptyMessage?: string;
  /** URLs of selected items. Passing this turns tiles into toggles. */
  selectedKeys?: ReadonlySet<string>;
  /** URLs of items that can't be picked; rendered dimmed + disabled. */
  disabledKeys?: ReadonlySet<string>;
  /** Badge text on disabled tiles, e.g. "Added". */
  disabledLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const selectable = selectedKeys !== undefined;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const filename = getFilename(item.key);
        const isSelected = selectedKeys?.has(item.url) ?? false;
        const isDisabled = disabledKeys?.has(item.url) ?? false;
        const hasOverlay = selectable || isDisabled;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item)}
            disabled={isDisabled || undefined}
            aria-pressed={selectable && !isDisabled ? isSelected : undefined}
            className={cn(
              "group focus-visible:ring-ring rounded-md text-left focus-visible:ring-2 focus-visible:outline-none",
              isDisabled && "cursor-not-allowed opacity-50",
            )}
            aria-label={
              isDisabled
                ? `${filename} (${disabledLabel})`
                : `Select ${filename}`
            }
          >
            <Card
              className={cn(
                "group-hover:border-primary group-focus-visible:border-primary overflow-hidden transition-colors",
                isSelected && "ring-primary ring-2",
                isDisabled && "group-hover:border-border",
              )}
            >
              {hasOverlay ? (
                <div className="relative">
                  <MediaThumbnail item={item} />
                  {selectable && !isDisabled && (
                    // Decorative checkbox look-alike — the tile <button> owns
                    // the click and the `aria-pressed` state. Deliberately NOT
                    // the Radix `Checkbox`: that renders a <button>, and a
                    // button nested in a button is invalid DOM (React warns,
                    // and click/focus behaviour gets unreliable). Same backing
                    // as the Media Library overlay so it reads over any photo.
                    <span
                      aria-hidden="true"
                      className="bg-background/90 ring-border pointer-events-none absolute top-2 left-2 z-10 rounded-md p-1 shadow-sm ring-1 backdrop-blur-sm"
                    >
                      <span
                        data-state={isSelected ? "checked" : "unchecked"}
                        className="border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary grid size-4 place-content-center rounded-[4px] border shadow-xs"
                      >
                        {isSelected && <Check className="size-3.5" />}
                      </span>
                    </span>
                  )}
                  {isDisabled && (
                    <Badge
                      variant="secondary"
                      aria-hidden="true"
                      className="pointer-events-none absolute top-2 left-2 z-10 shadow-sm"
                    >
                      {disabledLabel}
                    </Badge>
                  )}
                </div>
              ) : (
                <MediaThumbnail item={item} />
              )}
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
