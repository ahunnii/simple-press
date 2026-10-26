/**
 * Media picker dialog — lets an owner/manager choose an image or video for a
 * template field either from the existing Media Library or by uploading a
 * new file (same `/api/upload` + `useUploadFile` pattern as the inline
 * upload widgets in `template-field-widgets.tsx`).
 *
 * Callers MUST only render this component's trigger when the `media`
 * feature flag is enabled — `media.list` is gated server-side and throws
 * FORBIDDEN when the flag is off.
 *
 * Single mode (default) picks one file and closes. Multi mode
 * (`multiple: true`, images by default) toggles library tiles into an ordered
 * selection confirmed via a sticky "Add N images" footer, and the Upload tab
 * accepts several files at once (batched through `useBatchedImageUpload` on
 * the `images` route — uploads stay images-only even when `kinds` adds
 * videos). `maxSelect` caps the selection at pick time; `excludeUrls` locks
 * tiles that are already in use.
 */
"use client";

import { useCallback, useMemo, useState } from "react";
import { useUploadFile } from "@better-upload/client";
import { Search } from "lucide-react";
import { toast } from "sonner";

import type { MediaItem } from "~/components/media/media-grid";
import type { MediaKind } from "~/components/media/upload-dropzone";
import { prepareImageForUpload } from "~/lib/image-prep";
import { api } from "~/trpc/react";
import { useBatchedImageUpload } from "~/hooks/use-batched-image-upload";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { getFilename, MediaGrid } from "~/components/media/media-grid";
import {
  fileMatchesKind,
  MAX_UPLOAD_LABEL,
  MAX_UPLOAD_SIZE,
  UploadDropzone,
} from "~/components/media/upload-dropzone";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// `favicon` is deliberately absent: the favicon route overwrites a fixed key
// (`{biz}/favicon.<ext>`) in place, so any product/page that picked it would
// silently change the next time the owner uploads a new favicon.
const IMAGE_ITEM_KINDS = new Set(["image", "gallery", "logo", "testimonial"]);

function itemMatchesKind(item: MediaItem, kind: MediaKind): boolean {
  return kind === "video"
    ? item.kind === "video"
    : IMAGE_ITEM_KINDS.has(item.kind);
}

function pluralizeImages(n: number, noun = "image"): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

// ─── MediaPickerDialog ────────────────────────────────────────────────────────

type MediaPickerBaseProps = {
  kind: MediaKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Show the "Upload new" tab. Off by default: uploads there go to storage
   * immediately, while every current caller already offers "Upload from
   * device", which defers the upload until the form is saved. Only opt in
   * where the picker is the sole way to add a file.
   */
  allowUpload?: boolean;
};

/** Default: pick one file; the dialog closes on pick. */
type MediaPickerSingleProps = MediaPickerBaseProps & {
  multiple?: false;
  onSelect: (url: string) => void;
};

/** One multi-mode pick, so a mixed-kind caller knows what each URL is. */
export type MediaPickerPick = { url: string; kind: MediaKind };

/**
 * Opt-in multi-pick (images unless `kinds` says otherwise). `onSelectMany`
 * receives URLs in pick order (library: click order; upload: file order),
 * plus the same picks with their kind. `maxSelect` caps how many can be added
 * in one go (omit for no cap); `excludeUrls` are shown disabled as "Added".
 */
type MediaPickerMultiProps = MediaPickerBaseProps & {
  kind: "image";
  multiple: true;
  onSelectMany: (urls: string[], picks: MediaPickerPick[]) => void;
  maxSelect?: number;
  excludeUrls?: string[];
  /**
   * Library kinds to list. Defaults to `[kind]` (images). Pass
   * `["image", "video"]` to mix videos into the grid; the Upload tab stays
   * images-only.
   */
  kinds?: readonly MediaKind[];
  /** Per-kind caps on top of `maxSelect` (e.g. `{ video: 2 }`). */
  maxSelectByKind?: Partial<Record<MediaKind, number>>;
  /** Extra library filter (e.g. only video formats the caller can use). */
  acceptItem?: (item: MediaItem) => boolean;
};

export type MediaPickerDialogProps =
  | MediaPickerSingleProps
  | MediaPickerMultiProps;

export function MediaPickerDialog(props: MediaPickerDialogProps) {
  const { kind, open, onOpenChange, allowUpload = false } = props;
  const isMulti = props.multiple === true;
  const onSelect = props.multiple ? undefined : props.onSelect;
  const onSelectMany = props.multiple ? props.onSelectMany : undefined;
  const maxSelect = props.multiple ? props.maxSelect : undefined;
  const excludeUrls = props.multiple ? props.excludeUrls : undefined;
  const multiKinds = props.multiple ? props.kinds : undefined;
  const maxSelectByKind = props.multiple ? props.maxSelectByKind : undefined;
  const acceptItem = props.multiple ? props.acceptItem : undefined;
  // Kinds the library grid lists. Single mode: exactly `kind`.
  const listKinds = useMemo<readonly MediaKind[]>(
    () => (multiKinds && multiKinds.length > 0 ? multiKinds : [kind]),
    [multiKinds, kind],
  );
  const mixedKinds = listKinds.length > 1;
  // Noun for multi-mode copy: "image" normally, "item" for a mixed grid.
  const itemNoun = mixedKinds ? "item" : "image";

  const [tab, setTab] = useState<"library" | "upload">("library");
  const [q, setQ] = useState("");
  // Single mode only: prep state for the one picked file (multi mode reads
  // `batchUploader.isPreparing`).
  const [isPreparing, setIsPreparing] = useState(false);
  // Multi mode only: ordered selection (click order → gallery order).
  const [selected, setSelected] = useState<string[]>([]);
  const utils = api.useUtils();

  // Only fetch while the dialog is open — media.list is gated behind the
  // `media` flag, and re-fetching every mount would be wasteful anyway.
  const { data, isLoading, isError } = api.media.list.useQuery(
    {},
    { enabled: open },
  );

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const needle = q.trim().toLowerCase();
    return items.filter((item) => {
      if (!listKinds.some((k) => itemMatchesKind(item, k))) return false;
      if (acceptItem && !acceptItem(item)) return false;
      if (!needle) return true;
      const filename = getFilename(item.key).toLowerCase();
      return (
        filename.includes(needle) || item.key.toLowerCase().includes(needle)
      );
    });
  }, [data, q, listKinds, acceptItem]);

  // URL → kind for every listed item, so selections (stored as URLs) can be
  // counted per kind and handed back with their kind.
  const kindByUrl = useMemo(() => {
    const map = new Map<string, MediaKind>();
    for (const item of data?.items ?? []) {
      map.set(item.url, item.kind === "video" ? "video" : "image");
    }
    return map;
  }, [data]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const excludedSet = useMemo(() => new Set(excludeUrls ?? []), [excludeUrls]);

  const resetState = useCallback(() => {
    setQ("");
    setTab("library");
    setSelected([]);
  }, []);

  // Multi-mode close paths (Cancel / Add / upload done) go through here so
  // the selection never leaks into the next open.
  const closeDialog = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  const handleSelectItem = useCallback(
    (item: MediaItem) => {
      onSelect?.(item.url);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  const handleToggleItem = useCallback(
    (item: MediaItem) => {
      if (excludedSet.has(item.url)) return;
      if (selected.includes(item.url)) {
        // Deselecting is always allowed, even at the cap.
        setSelected(selected.filter((url) => url !== item.url));
        return;
      }
      // Cap is enforced at pick time so "Add" can never overshoot.
      if (maxSelect !== undefined && selected.length >= maxSelect) {
        toast.error(
          maxSelect <= 0
            ? `You can't add any more ${itemNoun}s`
            : `You can add ${maxSelect} more ${itemNoun}${maxSelect === 1 ? "" : "s"}`,
        );
        return;
      }
      const itemKind: MediaKind = item.kind === "video" ? "video" : "image";
      const kindCap = maxSelectByKind?.[itemKind];
      if (kindCap !== undefined) {
        const kindSelected = selected.filter(
          (url) => (kindByUrl.get(url) ?? "image") === itemKind,
        ).length;
        if (kindSelected >= kindCap) {
          toast.error(
            kindCap <= 0
              ? `You can't add any more ${itemKind}s`
              : `You can add ${kindCap} more ${itemKind}${kindCap === 1 ? "" : "s"}`,
          );
          return;
        }
      }
      setSelected([...selected, item.url]);
    },
    [excludedSet, itemNoun, kindByUrl, maxSelect, maxSelectByKind, selected],
  );

  const handleAddSelected = useCallback(() => {
    if (selected.length === 0) return;
    onSelectMany?.(
      selected,
      selected.map((url) => ({ url, kind: kindByUrl.get(url) ?? "image" })),
    );
    closeDialog();
  }, [closeDialog, kindByUrl, onSelectMany, selected]);

  // Both uploaders are always instantiated (hooks can't be conditional);
  // single mode uses `uploader`, multi mode uses `batchUploader`.
  const uploader = useUploadFile({
    api: "/api/upload",
    route: kind,
    onError: (error) => {
      toast.error(
        error.message ??
          `${kind === "image" ? "Image" : "Video"} upload failed`,
      );
    },
  });

  const batchUploader = useBatchedImageUpload("images");
  const { uploadImages } = batchUploader;

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!fileMatchesKind(file, kind)) {
        toast.error(`Please select a valid ${kind} file`);
        return;
      }
      void (async () => {
        let prepared = file;
        if (kind === "image") {
          setIsPreparing(true);
          try {
            prepared = await prepareImageForUpload(file);
          } finally {
            setIsPreparing(false);
          }
        }
        if (prepared.size > MAX_UPLOAD_SIZE[kind]) {
          toast.error(
            `${kind === "image" ? "Image" : "Video"} must be less than ${MAX_UPLOAD_LABEL[kind]}`,
          );
          return;
        }
        try {
          const response = await uploader.upload(prepared);
          const fileLocation =
            (response.file.objectInfo.metadata?.pathname as
              | string
              | undefined) ?? "";
          if (fileLocation) {
            toast.success(
              `${kind === "image" ? "Image" : "Video"} uploaded successfully`,
            );
            void utils.media.list.invalidate();
            onSelect?.(fileLocation);
            onOpenChange(false);
          }
        } catch (error) {
          console.error("Upload error:", error);
          toast.error(`Failed to upload ${kind}`);
        }
      })();
    },
    [kind, onOpenChange, onSelect, uploader, utils],
  );

  const handleFilesSelectMany = useCallback(
    (files: File[]) => {
      // 1. Kind filter — say what was skipped rather than dropping silently.
      const candidates: File[] = [];
      for (const file of files) {
        if (fileMatchesKind(file, "image")) candidates.push(file);
        else toast.error(`Skipped "${file.name}": not an image`);
      }
      if (candidates.length === 0) return;

      // 2. Truncate to the remaining slots BEFORE any prep/upload work, so
      // nothing over the cap is ever uploaded. Library tiles already ticked
      // count against the cap — they're handed back alongside the uploads.
      const remaining = (maxSelect ?? Infinity) - selected.length;
      if (remaining <= 0) {
        toast.error(
          selected.length > 0
            ? "Your library selection uses the remaining slots — unselect an image to upload new ones"
            : "You can't add any more images",
        );
        return;
      }
      const total = candidates.length;
      const kept = candidates.slice(0, remaining);
      const limitSkipped = total - kept.length;

      void (async () => {
        // 3. Prep → size gate → upload, one route-sized batch at a time. The
        // hook keeps input order and never toasts; the wording lives here.
        const { urls, failedNames, oversizedNames, aborted } =
          await uploadImages(kept);

        for (const name of oversizedNames) {
          toast.error(
            `Skipped "${name}": must be less than ${MAX_UPLOAD_LABEL.image}`,
          );
        }

        if (aborted) {
          toast.error("Failed to upload images");
          // Earlier batches may have landed — surface them in the library.
          if (urls.length > 0) void utils.media.list.invalidate();
          return;
        }

        if (failedNames.length > 0) {
          toast.error(`Failed to upload: ${failedNames.join(", ")}`);
        }
        // Nothing landed → stay open so the owner can retry.
        if (urls.length === 0) return;

        // 4. Hand the new URLs to the caller and close.
        if (limitSkipped > 0) {
          toast.warning(
            `Added ${urls.length} of ${total} images — ${limitSkipped} skipped (limit reached)`,
          );
        } else {
          toast.success(`${pluralizeImages(urls.length)} uploaded`);
        }
        void utils.media.list.invalidate();
        const all = [...selected, ...urls];
        onSelectMany?.(
          all,
          all.map((url) => ({ url, kind: kindByUrl.get(url) ?? "image" })),
        );
        closeDialog();
      })();
    },
    [
      closeDialog,
      kindByUrl,
      maxSelect,
      onSelectMany,
      selected,
      uploadImages,
      utils,
    ],
  );

  const selectedCount = selected.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] w-full flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          {isMulti ? (
            <>
              <DialogTitle>
                {mixedKinds ? "Choose photos or videos" : "Choose images"}
              </DialogTitle>
              <DialogDescription>
                {mixedKinds
                  ? allowUpload
                    ? "Select one or more photos or videos from your media library, or upload new photos."
                    : "Select one or more photos or videos from your media library."
                  : allowUpload
                    ? "Select one or more images from your media library, or upload new ones."
                    : "Select one or more images from your media library."}
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>
                Choose {kind === "image" ? "an image" : "a video"}
              </DialogTitle>
              <DialogDescription>
                {allowUpload
                  ? "Select an existing file from your media library, or upload a new one."
                  : "Select an existing file from your media library."}
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "library" | "upload")}
          className="flex min-h-0 flex-1 flex-col"
        >
          {allowUpload && (
            <TabsList>
              <TabsTrigger value="library">Library</TabsTrigger>
              <TabsTrigger value="upload">Upload new</TabsTrigger>
            </TabsList>
          )}

          <TabsContent
            value="library"
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <div className="relative mb-3">
              <Search
                className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                type="text"
                placeholder="Search by filename…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
                aria-label="Search media library"
              />
            </div>

            {isLoading ? (
              <p className="text-muted-foreground py-12 text-center text-sm">
                Loading media…
              </p>
            ) : isError ? (
              <p className="text-muted-foreground py-12 text-center text-sm">
                Couldn&apos;t load your media library.
              </p>
            ) : isMulti ? (
              <MediaGrid
                items={filtered}
                onSelect={handleToggleItem}
                selectedKeys={selectedSet}
                disabledKeys={excludedSet}
                disabledLabel="Added"
                emptyMessage={
                  q
                    ? "No files match your search."
                    : allowUpload
                      ? `No ${mixedKinds ? "photos or videos" : "images"} in your media library yet. Upload some from the Upload tab.`
                      : `No ${mixedKinds ? "photos or videos" : "images"} in your media library yet.`
                }
              />
            ) : (
              <MediaGrid
                items={filtered}
                onSelect={handleSelectItem}
                emptyMessage={
                  q
                    ? "No files match your search."
                    : `No ${kind}s in your media library yet.${allowUpload ? " Upload one from the Upload tab." : ""}`
                }
              />
            )}
          </TabsContent>

          {allowUpload && (
            <TabsContent
              value="upload"
              className="min-h-0 flex-1 overflow-y-auto"
            >
              {isMulti ? (
                <UploadDropzone
                  kind="image"
                  multiple
                  isUploading={batchUploader.isUploading}
                  isPreparing={batchUploader.isPreparing}
                  onFiles={handleFilesSelectMany}
                />
              ) : (
                <UploadDropzone
                  kind={kind}
                  isUploading={uploader.isPending}
                  isPreparing={isPreparing}
                  onFiles={(files) => {
                    const file = files[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              )}
            </TabsContent>
          )}
        </Tabs>

        {isMulti && tab === "library" && (
          // Outside the scrolling TabsContent, so it stays pinned to the
          // bottom of the dialog while the grid scrolls.
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {selectedCount} selected
              {maxSelect !== undefined &&
                ` · ${Math.max(maxSelect - selectedCount, 0)} left`}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleAddSelected}
              >
                Add {pluralizeImages(selectedCount, itemNoun)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
