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
 * (`multiple: true`, images only) toggles library tiles into an ordered
 * selection confirmed via a sticky "Add N images" footer, and the Upload tab
 * accepts several files at once (uploaded through the multi-file `images`
 * route). `maxSelect` caps the selection at pick time; `excludeUrls` locks
 * tiles that are already in use.
 */
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useUploadFile, useUploadFiles } from "@better-upload/client";
import { Search, Upload } from "lucide-react";
import { toast } from "sonner";

import type { MediaItem } from "~/components/media/media-grid";
import { prepareImageForUpload } from "~/lib/image-prep";
import { getStoredPath, ROUTE_MAX_FILES } from "~/lib/uploads";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MediaKind = "image" | "video";

const MAX_UPLOAD_SIZE: Record<MediaKind, number> = {
  image: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

const MAX_UPLOAD_LABEL: Record<MediaKind, string> = {
  image: "5MB",
  video: "50MB",
};

// `favicon` is deliberately absent: the favicon route overwrites a fixed key
// (`{biz}/favicon.<ext>`) in place, so any product/page that picked it would
// silently change the next time the owner uploads a new favicon.
const IMAGE_ITEM_KINDS = new Set(["image", "gallery", "logo", "testimonial"]);

function itemMatchesKind(item: MediaItem, kind: MediaKind): boolean {
  return kind === "video"
    ? item.kind === "video"
    : IMAGE_ITEM_KINDS.has(item.kind);
}

function pluralizeImages(n: number): string {
  return `${n} image${n === 1 ? "" : "s"}`;
}

function fileMatchesKind(file: File, kind: MediaKind): boolean {
  if (kind === "image") {
    return (
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif)$/i.test(file.name)
    );
  }
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|ogg|avi|m4v|3gp|mkv)$/i.test(file.name)
  );
}

// ─── UploadDropzone ───────────────────────────────────────────────────────────

function UploadDropzone({
  kind,
  isUploading,
  isPreparing,
  multiple = false,
  onFiles,
}: {
  kind: MediaKind;
  isUploading: boolean;
  isPreparing?: boolean;
  /** Accept several files per pick/drop (multi mode, images only). */
  multiple?: boolean;
  /**
   * Picked/dropped files. Single mode always receives exactly one file;
   * multi mode receives every file (kind filtering is the parent's job on
   * the picker path so it can toast what was skipped).
   */
  onFiles: (files: File[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const label = kind === "image" ? "image" : "video";
  const isBusy = isUploading || Boolean(isPreparing);

  const triggerFileInput = useCallback(() => {
    if (isBusy) return;
    fileInputRef.current?.click();
  }, [isBusy]);

  return (
    <div className="space-y-3 py-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={kind === "image" ? "image/*" : "video/*"}
        multiple={multiple || undefined}
        className="hidden"
        disabled={isBusy}
        aria-label={multiple ? `Choose ${label} files` : `Choose ${label} file`}
        onChange={(e) => {
          if (multiple) {
            // Copy BEFORE resetting `value` — clearing the input empties the
            // live FileList in Chrome, so reading after the reset sees nothing.
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length > 0) onFiles(files);
            return;
          }
          const file = e.target.files?.[0];
          if (file) onFiles([file]);
          e.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            triggerFileInput();
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (isBusy) return;
          if (multiple) {
            const files = Array.from(e.dataTransfer.files ?? []).filter(
              (file) => fileMatchesKind(file, kind),
            );
            if (files.length > 0) onFiles(files);
            return;
          }
          const file = e.dataTransfer.files?.[0];
          if (file && fileMatchesKind(file, kind)) onFiles([file]);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={triggerFileInput}
        className={cn(
          "border-muted-foreground/25 rounded-lg border-2 border-dashed p-10 text-center text-sm transition-colors",
          "hover:border-muted-foreground/50 hover:bg-muted/50",
          isBusy && "pointer-events-none opacity-50",
        )}
      >
        <Upload
          className="text-muted-foreground mx-auto mb-2 h-6 w-6"
          aria-hidden="true"
        />
        {multiple ? (
          <>Drag and drop {label}s here, or click to browse</>
        ) : (
          <>
            Drag and drop {kind === "image" ? "an image" : "a video"} here, or
            click to browse
          </>
        )}
        <p className="text-muted-foreground mt-1 text-xs">
          Max {MAX_UPLOAD_LABEL[kind]}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isBusy}
        onClick={triggerFileInput}
        className="w-full"
      >
        {isPreparing ? (
          <>
            <span
              className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
              aria-hidden="true"
            />
            {multiple ? "Preparing photos…" : "Preparing photo…"}
          </>
        ) : isUploading ? (
          <>
            <span
              className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
              aria-hidden="true"
            />
            {multiple ? "Uploading…" : "Uploading..."}
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Choose {label}
            {multiple ? "s" : ""}
          </>
        )}
      </Button>
    </div>
  );
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

/**
 * Opt-in multi-pick (images only). `onSelectMany` receives URLs in pick
 * order (library: click order; upload: file order). `maxSelect` caps how
 * many can be added in one go (omit for no cap); `excludeUrls` are shown
 * disabled as "Added".
 */
type MediaPickerMultiProps = MediaPickerBaseProps & {
  kind: "image";
  multiple: true;
  onSelectMany: (urls: string[]) => void;
  maxSelect?: number;
  excludeUrls?: string[];
};

export type MediaPickerDialogProps =
  | MediaPickerSingleProps
  | MediaPickerMultiProps;

/** Server-side `maxFiles` of the multi-file `images` upload route. */
const IMAGES_ROUTE_BATCH_SIZE = ROUTE_MAX_FILES.images ?? 10;

export function MediaPickerDialog(props: MediaPickerDialogProps) {
  const { kind, open, onOpenChange, allowUpload = false } = props;
  const isMulti = props.multiple === true;
  const onSelect = props.multiple ? undefined : props.onSelect;
  const onSelectMany = props.multiple ? props.onSelectMany : undefined;
  const maxSelect = props.multiple ? props.maxSelect : undefined;
  const excludeUrls = props.multiple ? props.excludeUrls : undefined;

  const [tab, setTab] = useState<"library" | "upload">("library");
  const [q, setQ] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  // Multi mode only: ordered selection (click order → gallery order).
  const [selected, setSelected] = useState<string[]>([]);
  // Multi mode only: spans every batch of a multi-file upload — the hook's
  // own `isPending` drops back to false between batches.
  const [isUploadingMany, setIsUploadingMany] = useState(false);
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
      if (!itemMatchesKind(item, kind)) return false;
      if (!needle) return true;
      const filename = getFilename(item.key).toLowerCase();
      return (
        filename.includes(needle) || item.key.toLowerCase().includes(needle)
      );
    });
  }, [data, q, kind]);

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
            ? "You can't add any more images"
            : `You can add ${maxSelect} more image${maxSelect === 1 ? "" : "s"}`,
        );
        return;
      }
      setSelected([...selected, item.url]);
    },
    [excludedSet, maxSelect, selected],
  );

  const handleAddSelected = useCallback(() => {
    if (selected.length === 0) return;
    onSelectMany?.(selected);
    closeDialog();
  }, [closeDialog, onSelectMany, selected]);

  // Both uploaders are always instantiated (hooks can't be conditional);
  // single mode uses `uploader`, multi mode uses `multiUploader`.
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

  const multiUploader = useUploadFiles({ api: "/api/upload", route: "images" });

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
        // 3. Normalize (HEIC transcode / downscale) in parallel. Never throws.
        setIsPreparing(true);
        let prepared: File[];
        try {
          prepared = await Promise.all(
            kept.map((file) => prepareImageForUpload(file)),
          );
        } finally {
          setIsPreparing(false);
        }

        // 4. Size gate, after prep so big phone photos get a chance to shrink.
        const valid = prepared.filter((file) => {
          if (file.size <= MAX_UPLOAD_SIZE.image) return true;
          toast.error(
            `Skipped "${file.name}": must be less than ${MAX_UPLOAD_LABEL.image}`,
          );
          return false;
        });
        if (valid.length === 0) return;

        // 5. Upload in route-sized batches. URLs are correlated back to the
        // input by File identity (name fallback) — `result.files` order isn't
        // guaranteed, and the caller's gallery order depends on ours.
        setIsUploadingMany(true);
        const urls: string[] = [];
        const failedNames: string[] = [];
        try {
          for (let i = 0; i < valid.length; i += IMAGES_ROUTE_BATCH_SIZE) {
            const batch = valid.slice(i, i + IMAGES_ROUTE_BATCH_SIZE);
            const result = await multiUploader.uploadAsync(batch);
            const unmatched = [...result.files];
            for (const file of batch) {
              // Identity first; the name fallback consumes its match so two
              // same-named files (phones love "image.jpg") never share a URL.
              let idx = unmatched.findIndex((uf) => uf.raw === file);
              if (idx === -1) {
                idx = unmatched.findIndex((uf) => uf.name === file.name);
              }
              const uploaded = idx === -1 ? undefined : unmatched[idx];
              if (idx !== -1) unmatched.splice(idx, 1);
              const url = uploaded ? getStoredPath(uploaded) : "";
              if (url) urls.push(url);
              else failedNames.push(file.name);
            }
          }
        } catch (error) {
          console.error("Upload error:", error);
          toast.error("Failed to upload images");
          // Earlier batches may have landed — surface them in the library.
          if (urls.length > 0) void utils.media.list.invalidate();
          return;
        } finally {
          setIsUploadingMany(false);
        }

        if (failedNames.length > 0) {
          toast.error(`Failed to upload: ${failedNames.join(", ")}`);
        }
        // Nothing landed → stay open so the owner can retry.
        if (urls.length === 0) return;

        // 6. Hand the new URLs to the caller and close.
        if (limitSkipped > 0) {
          toast.warning(
            `Added ${urls.length} of ${total} images — ${limitSkipped} skipped (limit reached)`,
          );
        } else {
          toast.success(`${pluralizeImages(urls.length)} uploaded`);
        }
        void utils.media.list.invalidate();
        onSelectMany?.([...selected, ...urls]);
        closeDialog();
      })();
    },
    [closeDialog, maxSelect, multiUploader, onSelectMany, selected, utils],
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
              <DialogTitle>Choose images</DialogTitle>
              <DialogDescription>
                {allowUpload
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
                      ? "No images in your media library yet. Upload some from the Upload tab."
                      : "No images in your media library yet."
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
                  isUploading={isUploadingMany}
                  isPreparing={isPreparing}
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
                Add {pluralizeImages(selectedCount)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
