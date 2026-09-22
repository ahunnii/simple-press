"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Images, Upload, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MediaPickerDialog } from "~/components/media/media-picker-dialog";

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

  const triggerFileInput = () => fileInputRef.current?.click();

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
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileChange(f);
          e.target.value = "";
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
            disabled={disabled}
            aria-label="Remove image"
            className="text-muted-foreground hover:text-destructive shrink-0"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {showLibraryPicker ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {previewUrl ? "Replace image" : "Choose image"}
              <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width)"
          >
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                queueMicrotask(triggerFileInput);
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
          disabled={disabled}
          onClick={triggerFileInput}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {previewUrl ? "Replace image" : "Choose image"}
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
