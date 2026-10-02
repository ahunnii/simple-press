/**
 * Upload dropzone for the Media Library flows (picker "Upload new" tab and
 * the Media Library dialog): dashed drop target + hidden file input + a
 * "Choose …" button that flips to a spinner while busy.
 *
 * Also the single home of the client-side media upload limits and the
 * `fileMatchesKind` check, so the picker, the library dialog and
 * `useBatchedImageUpload` all agree on them.
 *
 * Not to be confused with `~/components/ui/upload-dropzone`, a separate
 * generic dropzone.
 */
"use client";

import { useCallback, useRef } from "react";
import { Upload } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

export type MediaKind = "image" | "video";

export const MAX_UPLOAD_SIZE: Record<MediaKind, number> = {
  image: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

export const MAX_UPLOAD_LABEL: Record<MediaKind, string> = {
  image: "5MB",
  video: "50MB",
};

export function fileMatchesKind(file: File, kind: MediaKind): boolean {
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

export type UploadDropzoneProps = {
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
  /** Replaces the default "Max {size}" line under the drop target. */
  helperText?: string;
  /**
   * While busy (preparing or uploading), replaces the button's default
   * "Preparing photos…" / "Uploading…" text — e.g. "Uploading 20 of 50…".
   */
  progressLabel?: string;
};

export function UploadDropzone({
  kind,
  isUploading,
  isPreparing,
  multiple = false,
  onFiles,
  helperText,
  progressLabel,
}: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const label = kind === "image" ? "image" : "video";
  const isBusy = isUploading || Boolean(isPreparing);

  const triggerFileInput = useCallback(() => {
    if (isBusy) return;
    fileInputRef.current?.click();
  }, [isBusy]);

  const spinner = (
    <span
      className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
      aria-hidden="true"
    />
  );

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
          {helperText ?? `Max ${MAX_UPLOAD_LABEL[kind]}`}
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
        {isBusy && progressLabel ? (
          <>
            {spinner}
            {progressLabel}
          </>
        ) : isPreparing ? (
          <>
            {spinner}
            {multiple ? "Preparing photos…" : "Preparing photo…"}
          </>
        ) : isUploading ? (
          <>
            {spinner}
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
