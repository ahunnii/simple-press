/**
 * Image / video upload widgets for template fields (and list-item sub-fields).
 *
 * Split out of `template-field-widgets.tsx` so the list-field editor
 * (`template-list-field-editor.tsx`) can render them without a circular
 * import back into the widgets module. `template-field-widgets.tsx`
 * re-exports both components, so existing imports keep working.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUploadFile } from "@better-upload/client";
import { ChevronDown, Images, Trash, Upload } from "lucide-react";
import { toast } from "sonner";

import { prepareImageForUpload } from "~/lib/image-prep";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Label } from "~/components/ui/label";
import { MediaPickerDialog } from "~/components/media/media-picker-dialog";

import { AdminThumb } from "../../../_components/admin-thumb";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif)$/i.test(file.name)
  );
}

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|ogg|avi|m4v|3gp|mkv)$/i.test(file.name)
  );
}

/** True when the primary pointer is coarse (touch), e.g. a phone. Used to
 *  swap drag/drop copy for tap-to-choose copy on upload dropzones. */
function useCoarsePointer(): boolean {
  const [isCoarse, setIsCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(pointer: coarse)");
    setIsCoarse(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsCoarse(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isCoarse;
}


// ─── TemplateImageUploadField ─────────────────────────────────────────────────

type TemplateImageUploadFieldProps = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  /** Show a "Choose from library" button next to the upload UI. Only pass
   *  `true` when the `media` feature flag is enabled — the picker's query
   *  is gated server-side and would error otherwise. */
  mediaLibraryEnabled?: boolean;
};

export function TemplateImageUploadField({
  value,
  onChange,
  label,
  description,
  disabled,
  mediaLibraryEnabled,
}: TemplateImageUploadFieldProps) {
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCoarsePointer = useCoarsePointer();

  const uploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed");
      setLocalFile(null);
    },
  });

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!localFile || !isImageFile(localFile)) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(localFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  const previewUrl = objectUrl ?? (value && !localFile ? value : null);
  const hasFile = localFile instanceof File;

  const triggerFileInput = useCallback(() => {
    if (disabled || uploader.isPending || isPreparing) return;
    fileInputRef.current?.click();
  }, [disabled, uploader.isPending, isPreparing]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!isImageFile(file)) {
        toast.error("Please select a valid image file");
        return;
      }

      setIsPreparing(true);
      let prepared: File;
      try {
        prepared = await prepareImageForUpload(file);
      } finally {
        setIsPreparing(false);
      }

      if (prepared.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setLocalFile(prepared);
      try {
        const response = await uploader.upload(prepared);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) {
          onChange(fileLocation);
          toast.success("Image uploaded successfully");
          setLocalFile(null);
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload image");
        setLocalFile(null);
      }
    },
    [onChange, uploader],
  );

  const handleRemove = useCallback(() => {
    onChange("");
    setLocalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  const isUploading = uploader.isPending;
  const isBusy = isUploading || isPreparing;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled ?? isBusy}
          aria-label={label ?? "Choose image file"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFileSelect(file);
            }
            e.target.value = "";
          }}
        />

        {previewUrl ? (
          <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
            <AdminThumb
              src={previewUrl}
              alt={hasFile ? localFile.name : "Preview"}
              className="h-16 w-16 shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              {hasFile && (
                <p className="truncate text-sm font-medium">{localFile.name}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {isPreparing
                  ? "Preparing photo…"
                  : isUploading
                    ? "Uploading..."
                    : hasFile
                      ? "Uploading..."
                      : "Current image"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled ?? isBusy}
              aria-label="Remove image"
              className="text-muted-foreground hover:text-destructive shrink-0 pointer-coarse:h-11 pointer-coarse:w-11"
              onClick={handleRemove}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {mediaLibraryEnabled ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled ?? isBusy}
                className="w-full pointer-coarse:h-11"
              >
                {isPreparing ? (
                  <>
                    <span
                      className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
                      aria-hidden="true"
                    />
                    Preparing photo…
                  </>
                ) : isUploading ? (
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
                onSelect={(e) => {
                  e.preventDefault();
                  queueMicrotask(() => triggerFileInput());
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload from device
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
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
            disabled={disabled ?? isBusy}
            onClick={triggerFileInput}
            className="w-full pointer-coarse:h-11"
          >
            {isPreparing ? (
              <>
                <span
                  className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
                  aria-hidden="true"
                />
                Preparing photo…
              </>
            ) : isUploading ? (
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
                {previewUrl ? "Replace image" : "Choose image"}
              </>
            )}
          </Button>
        )}

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
            if (disabled || isBusy) return;
            const file = e.dataTransfer.files?.[0];
            if (file && isImageFile(file)) {
              void handleFileSelect(file);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
            "hover:border-muted-foreground/50 hover:bg-muted/50",
            (disabled ?? isBusy) && "pointer-events-none opacity-50",
          )}
          onClick={triggerFileInput}
        >
          {isPreparing
            ? "Preparing photo…"
            : isUploading
              ? "Uploading…"
              : isCoarsePointer
                ? "Tap to choose a photo"
                : "Drag and drop an image here, or click to browse"}
        </div>
      </div>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}

      {mediaLibraryEnabled && (
        <MediaPickerDialog
          kind="image"
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={(url) => {
            setLocalFile(null);
            onChange(url);
          }}
        />
      )}
    </div>
  );
}

// ─── TemplateVideoUploadField ─────────────────────────────────────────────────

type TemplateVideoUploadFieldProps = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  /** Show a "Choose from library" button next to the upload UI. Only pass
   *  `true` when the `media` feature flag is enabled — the picker's query
   *  is gated server-side and would error otherwise. */
  mediaLibraryEnabled?: boolean;
};

export function TemplateVideoUploadField({
  value,
  onChange,
  label,
  description,
  disabled,
  mediaLibraryEnabled,
}: TemplateVideoUploadFieldProps) {
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploader = useUploadFile({
    api: "/api/upload",
    route: "video",
    onError: (error) => {
      toast.error(error.message ?? "Video upload failed");
      setLocalFile(null);
    },
  });

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!localFile || !isVideoFile(localFile)) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(localFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  const previewUrl = objectUrl ?? (value && !localFile ? value : null);
  const hasFile = localFile instanceof File;

  const triggerFileInput = useCallback(() => {
    if (disabled || uploader.isPending) return;
    fileInputRef.current?.click();
  }, [disabled, uploader.isPending]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!isVideoFile(file)) {
        toast.error("Please select a valid video file");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Video must be less than 50MB");
        return;
      }
      setLocalFile(file);
      try {
        const response = await uploader.upload(file);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) {
          onChange(fileLocation);
          toast.success("Video uploaded successfully");
          setLocalFile(null);
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload video");
        setLocalFile(null);
      }
    },
    [onChange, uploader],
  );

  const handleRemove = useCallback(() => {
    onChange("");
    setLocalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  const isUploading = uploader.isPending;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          disabled={disabled ?? isUploading}
          aria-label={label ?? "Choose video file"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFileSelect(file);
            }
            e.target.value = "";
          }}
        />

        {previewUrl ? (
          <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
            <video
              src={previewUrl}
              controls
              muted
              className="h-16 w-24 shrink-0 rounded-md bg-black object-cover"
            >
              Your browser does not support the video tag.
            </video>
            <div className="min-w-0 flex-1">
              {hasFile && (
                <p className="truncate text-sm font-medium">{localFile.name}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {isUploading
                  ? "Uploading..."
                  : hasFile
                    ? "Uploading..."
                    : "Current video"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled ?? isUploading}
              aria-label="Remove video"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={handleRemove}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {mediaLibraryEnabled ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled ?? isUploading}
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
                    {previewUrl ? "Replace video" : "Choose video"}
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
                onSelect={(e) => {
                  e.preventDefault();
                  queueMicrotask(() => triggerFileInput());
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload from device
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
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
            disabled={disabled ?? isUploading}
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
                {previewUrl ? "Replace video" : "Choose video"}
              </>
            )}
          </Button>
        )}

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
            if (disabled || isUploading) return;
            const file = e.dataTransfer.files?.[0];
            if (file && isVideoFile(file)) {
              void handleFileSelect(file);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
            "hover:border-muted-foreground/50 hover:bg-muted/50",
            (disabled ?? isUploading) && "pointer-events-none opacity-50",
          )}
          onClick={triggerFileInput}
        >
          Drag and drop a video here, or click to browse (max 50MB)
        </div>
      </div>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}

      {mediaLibraryEnabled && (
        <MediaPickerDialog
          kind="video"
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={(url) => {
            setLocalFile(null);
            onChange(url);
          }}
        />
      )}
    </div>
  );
}
