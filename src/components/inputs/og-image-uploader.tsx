"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Images, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { prepareImageForUpload } from "~/lib/image-prep";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MediaPickerDialog } from "~/components/media/media-picker-dialog";

/**
 * Matches the image routes' `maxFileSize` in `src/app/api/upload/route.ts`.
 * Checked after `prepareImageForUpload` (which only shrinks raster photos —
 * GIF/SVG/ICO come back unchanged) so an oversized file is rejected on select
 * instead of failing the whole save with a bare upload error.
 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const SPINNER_CLASS =
  "border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2";

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    // Some browsers (notably Android Chrome) leave `file.type` empty for
    // HEIC/HEIF, so fall back to the extension for those.
    /\.(jpg|jpeg|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name)
  );
}

export function OgImageUploader({
  file,
  existingUrl,
  fileInputRef,
  onFileChange,
  onRemove,
  disabled,
  mediaLibraryEnabled,
  onLibrarySelect,
}: {
  file: File | null;
  existingUrl?: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (f: File) => void;
  onRemove: () => void;
  disabled?: boolean;
  /**
   * Adds a "Choose from library" option beside "Upload from device". Only
   * pass `true` when the `media` feature flag is enabled — `media.list` is
   * gated server-side and throws FORBIDDEN when the flag is off. Requires
   * `onLibrarySelect`.
   */
  mediaLibraryEnabled?: boolean;
  onLibrarySelect?: (url: string) => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const isPreparingRef = useRef(false);
  const busy = disabled === true || isPreparing;

  // HEIC -> web-safe, oversized photos downscaled, then the 5MB cap. Runs
  // before the file reaches the caller so it only ever sees an uploadable file.
  const prepareAndSelect = async (f: File) => {
    if (isPreparingRef.current) return;
    if (!isImageFile(f)) {
      toast.error(`Skipped "${f.name}": not an image`);
      return;
    }
    isPreparingRef.current = true;
    setIsPreparing(true);
    try {
      const prepared = await prepareImageForUpload(f);
      if (prepared.size > MAX_IMAGE_BYTES) {
        toast.error(`Skipped "${f.name}": must be less than 5MB`);
        return;
      }
      onFileChange(prepared);
    } catch {
      toast.error(`Couldn't process "${f.name}". Try a different image.`);
    } finally {
      isPreparingRef.current = false;
      setIsPreparing(false);
    }
  };

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewUrl = objectUrl ?? existingUrl ?? null;
  const showLibraryPicker = Boolean(mediaLibraryEnabled && onLibrarySelect);

  const triggerFileInput = () => {
    if (busy) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        ref={(el) => {
          (
            fileInputRef as React.MutableRefObject<HTMLInputElement | null>
          ).current = el;
        }}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          // Copy the File out *before* clearing the input — resetting `value`
          // empties the live FileList, and preparing is async.
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void prepareAndSelect(f);
        }}
      />
      {previewUrl && (
        <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="OG image preview"
            className="h-16 w-16 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">
              {file
                ? "New image selected. Upload on submit."
                : "Existing image."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={busy}
            aria-label="Remove image"
            className="text-muted-foreground hover:text-destructive shrink-0"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {showLibraryPicker ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              className="w-full"
            >
              {isPreparing ? (
                <>
                  <span className={SPINNER_CLASS} aria-hidden="true" />
                  Preparing photo…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {previewUrl ? "Replace image" : "Choose image"}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width)"
          >
            <DropdownMenuItem
              onSelect={() => {
                queueMicrotask(triggerFileInput);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload from device
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                queueMicrotask(() => setPickerOpen(true));
              }}
            >
              <Images className="mr-2 h-4 w-4" />
              Choose from library
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={triggerFileInput}
          className="w-full"
        >
          {isPreparing ? (
            <>
              <span className={SPINNER_CLASS} aria-hidden="true" />
              Preparing photo…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {previewUrl ? "Replace image" : "Choose image"}
            </>
          )}
        </Button>
      )}
      {showLibraryPicker && onLibrarySelect ? (
        <MediaPickerDialog
          kind="image"
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={onLibrarySelect}
        />
      ) : null}
    </div>
  );
}
