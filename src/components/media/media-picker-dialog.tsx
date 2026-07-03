/**
 * Media picker dialog — lets an owner/manager choose an image or video for a
 * template field either from the existing Media Library or by uploading a
 * new file (same `/api/upload` + `useUploadFile` pattern as the inline
 * upload widgets in `template-field-widgets.tsx`).
 *
 * Callers MUST only render this component's trigger when the `media`
 * feature flag is enabled — `media.list` is gated server-side and throws
 * FORBIDDEN when the flag is off.
 */
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useUploadFile } from "@better-upload/client";
import { Search, Upload } from "lucide-react";
import { toast } from "sonner";

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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import type { MediaItem } from "~/components/media/media-grid";
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

const IMAGE_ITEM_KINDS = new Set([
  "image",
  "gallery",
  "logo",
  "favicon",
  "testimonial",
]);

function itemMatchesKind(item: MediaItem, kind: MediaKind): boolean {
  return kind === "video" ? item.kind === "video" : IMAGE_ITEM_KINDS.has(item.kind);
}

function fileMatchesKind(file: File, kind: MediaKind): boolean {
  if (kind === "image") {
    return (
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)
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
  onFileSelect,
}: {
  kind: MediaKind;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const label = kind === "image" ? "image" : "video";

  const triggerFileInput = useCallback(() => {
    if (isUploading) return;
    fileInputRef.current?.click();
  }, [isUploading]);

  return (
    <div className="space-y-3 py-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={kind === "image" ? "image/*" : "video/*"}
        className="hidden"
        disabled={isUploading}
        aria-label={`Choose ${label} file`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
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
          if (isUploading) return;
          const file = e.dataTransfer.files?.[0];
          if (file && fileMatchesKind(file, kind)) onFileSelect(file);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={triggerFileInput}
        className={cn(
          "border-muted-foreground/25 rounded-lg border-2 border-dashed p-10 text-center text-sm transition-colors",
          "hover:border-muted-foreground/50 hover:bg-muted/50",
          isUploading && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="text-muted-foreground mx-auto mb-2 h-6 w-6" aria-hidden="true" />
        Drag and drop {kind === "image" ? "an image" : "a video"} here, or click
        to browse
        <p className="text-muted-foreground mt-1 text-xs">
          Max {MAX_UPLOAD_LABEL[kind]}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={triggerFileInput}
        className="w-full"
      >
        {isUploading ? (
          <>
            <span
              className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
              aria-hidden="true"
            />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Choose {label}
          </>
        )}
      </Button>
    </div>
  );
}

// ─── MediaPickerDialog ────────────────────────────────────────────────────────

export type MediaPickerDialogProps = {
  kind: MediaKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
};

export function MediaPickerDialog({
  kind,
  open,
  onOpenChange,
  onSelect,
}: MediaPickerDialogProps) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [q, setQ] = useState("");
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

  const handleSelectItem = useCallback(
    (item: MediaItem) => {
      onSelect(item.url);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  const uploader = useUploadFile({
    api: "/api/upload",
    route: kind,
    onError: (error) => {
      toast.error(
        error.message ?? `${kind === "image" ? "Image" : "Video"} upload failed`,
      );
    },
  });

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!fileMatchesKind(file, kind)) {
        toast.error(`Please select a valid ${kind} file`);
        return;
      }
      if (file.size > MAX_UPLOAD_SIZE[kind]) {
        toast.error(
          `${kind === "image" ? "Image" : "Video"} must be less than ${MAX_UPLOAD_LABEL[kind]}`,
        );
        return;
      }
      void (async () => {
        try {
          const response = await uploader.upload(file);
          const fileLocation =
            (response.file.objectInfo.metadata?.pathname as
              | string
              | undefined) ?? "";
          if (fileLocation) {
            toast.success(
              `${kind === "image" ? "Image" : "Video"} uploaded successfully`,
            );
            void utils.media.list.invalidate();
            onSelect(fileLocation);
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQ("");
          setTab("library");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] w-full flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Choose {kind === "image" ? "an image" : "a video"}
          </DialogTitle>
          <DialogDescription>
            Select an existing file from your media library, or upload a new
            one.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "library" | "upload")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload new</TabsTrigger>
          </TabsList>

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
            ) : (
              <MediaGrid
                items={filtered}
                onSelect={handleSelectItem}
                emptyMessage={
                  q
                    ? "No files match your search."
                    : `No ${kind}s in your media library yet. Upload one from the Upload tab.`
                }
              />
            )}
          </TabsContent>

          <TabsContent
            value="upload"
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <UploadDropzone
              kind={kind}
              isUploading={uploader.isPending}
              onFileSelect={handleFileSelect}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
