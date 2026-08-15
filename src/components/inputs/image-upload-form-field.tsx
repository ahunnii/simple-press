"use client";

import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Images, Trash, Upload } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { MediaPickerDialog } from "~/components/media/media-picker-dialog";

/**
 * Shown when a preview URL fails to load. Admin-only surface, so this is a
 * genuine "this image is broken" signal — unlike the storefront, where
 * `/placeholder.svg` doubles as a "no image set" sentinel that hides sections.
 */
const BROKEN_IMAGE_SRC = "/placeholder.svg";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  existingPreviewUrl?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /**
   * Adds a "Choose from library" option beside "Upload from device". Only pass
   * `true` when the `media` feature flag is enabled — `media.list` is gated
   * server-side and throws FORBIDDEN when the flag is off. Requires
   * `urlFieldName`; without it the picker has nowhere to write and stays off.
   */
  mediaLibraryEnabled?: boolean;
  /**
   * Companion field holding the persisted URL string. Required with
   * `mediaLibraryEnabled` — a library image is already in S3, so it is written
   * straight to this field rather than deferred as a `File` on `name`.
   */
  urlFieldName?: Path<CurrentForm>;
};

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)
  );
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !isImageFile(file)) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

type InnerProps = {
  field: { value: unknown; onChange: (v: File | null | undefined) => void };
  disabled?: boolean;
  existingPreviewUrl?: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  className?: string;
  label?: string;
  description?: string;
  /** Set together with `onLibrarySelect` — see `Props.mediaLibraryEnabled`. */
  mediaLibraryEnabled?: boolean;
  onLibrarySelect?: (url: string) => void;
  /** Set whenever a companion URL field exists, picker or not. */
  onClearUrl?: () => void;
};

function ImageUploadFormFieldInner({
  field,
  disabled,
  existingPreviewUrl,
  fileInputRef,
  className,
  label,
  description,
  mediaLibraryEnabled,
  onLibrarySelect,
  onClearUrl,
}: InnerProps) {
  const value = field.value as File | null | undefined;
  const hasFile = value instanceof File;
  const [removedExisting, setRemovedExisting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // A library image picked in this session. It is already persisted to the
  // companion URL field by `onLibrarySelect`, but `existingPreviewUrl` is the
  // server value from the last render, so the preview needs its own copy.
  const [libraryUrl, setLibraryUrl] = useState<string | null>(null);
  // The exact preview URL that failed to load, so a stored image whose object
  // has since been deleted (or was imported pointing at another site) renders
  // the placeholder instead of a broken-image icon. Keyed on the URL rather
  // than a boolean so it self-clears when a different image is selected, and
  // so a failing placeholder can't loop: once set, `src` is already the
  // placeholder and the handler writes the same value back.
  const [failedPreviewSrc, setFailedPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (value === undefined) setRemovedExisting(false);
  }, [value]);

  const objectUrl = useObjectUrl(hasFile ? value : null);
  const showExisting =
    Boolean(existingPreviewUrl) && !hasFile && !removedExisting;
  const previewUrl =
    objectUrl ??
    (hasFile ? null : libraryUrl) ??
    (showExisting ? (existingPreviewUrl ?? null) : null);

  const triggerFileInput = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled, fileInputRef]);

  // A device file always wins over a previously picked library image, so the
  // stale library preview has to go with it.
  const handleFileSelected = useCallback(
    (file: File) => {
      setRemovedExisting(false);
      setLibraryUrl(null);
      field.onChange(file);
    },
    [field],
  );

  const showLibraryPicker = Boolean(mediaLibraryEnabled && onLibrarySelect);

  return (
    <FormItem className={cn("col-span-full", className)}>
      {label && <FormLabel>{label}</FormLabel>}
      <FormControl>
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
            aria-label={label ?? "Choose image file"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelected(file);
              }
              e.target.value = "";
            }}
          />
          {previewUrl ? (
            <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- an
                  arbitrary S3 URL (or a blob: preview) at a fixed 64px;
                  next/image's loader buys nothing here and would need a
                  remote-pattern entry per storage host. */}
              <img
                src={
                  failedPreviewSrc === previewUrl
                    ? BROKEN_IMAGE_SRC
                    : previewUrl
                }
                alt={hasFile ? value.name : "Preview"}
                className="h-16 w-16 shrink-0 rounded-md object-cover"
                onError={() => setFailedPreviewSrc(previewUrl)}
              />
              <div className="min-w-0 flex-1">
                {hasFile && (
                  <p className="truncate text-sm font-medium">{value.name}</p>
                )}
                <p className="text-muted-foreground text-xs">
                  {hasFile
                    ? "New image selected. Upload on submit."
                    : previewUrl === libraryUrl
                      ? "Chosen from your library. Save to apply."
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
                onClick={() => {
                  setRemovedExisting(true);
                  setLibraryUrl(null);
                  field.onChange(null);
                  // Only set when the caller passed `urlFieldName` — clears the
                  // companion URL so Remove actually unsets the stored image
                  // on save, instead of only dropping the pending file.
                  onClearUrl?.();
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
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
              disabled={disabled}
              onClick={triggerFileInput}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {previewUrl ? "Replace image" : "Choose image"}
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
              if (disabled) return;
              const file = e.dataTransfer.files?.[0];
              if (file && isImageFile(file)) {
                handleFileSelected(file);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              "border-border border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
              "hover:border-muted-foreground/50 hover:bg-muted/50",
              disabled && "pointer-events-none opacity-50",
            )}
            onClick={triggerFileInput}
          >
            Drag and drop an image here, or click to browse
          </div>
        </div>
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />

      {showLibraryPicker && (
        <MediaPickerDialog
          kind="image"
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={(url) => {
            // Already in S3 — nothing to defer. `onLibrarySelect` writes the
            // URL to the companion field and clears the deferred `File` slot.
            setRemovedExisting(false);
            setLibraryUrl(url);
            onLibrarySelect?.(url);
          }}
        />
      )}
    </FormItem>
  );
}

export const ImageUploadFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  disabled,
  existingPreviewUrl,
  inputRef,
  mediaLibraryEnabled,
  urlFieldName,
}: Props<CurrentForm>) => {
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = inputRef ?? localInputRef;

  // The picker needs both props; clearing the companion URL needs only
  // `urlFieldName`. Existing call sites pass neither, so both stay off there.
  const pickerEnabled = Boolean(mediaLibraryEnabled && urlFieldName);

  const handleLibrarySelect = useCallback(
    (url: string) => {
      if (!urlFieldName) return;
      form.setValue(
        urlFieldName,
        url as PathValue<CurrentForm, Path<CurrentForm>>,
        { shouldDirty: true },
      );
      form.setValue(name, null as PathValue<CurrentForm, Path<CurrentForm>>);
    },
    [form, name, urlFieldName],
  );

  const handleClearUrl = useCallback(() => {
    if (!urlFieldName) return;
    form.setValue(
      urlFieldName,
      "" as PathValue<CurrentForm, Path<CurrentForm>>,
      { shouldDirty: true },
    );
  }, [form, urlFieldName]);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <ImageUploadFormFieldInner
          field={field}
          disabled={disabled}
          existingPreviewUrl={existingPreviewUrl}
          fileInputRef={fileInputRef}
          className={className}
          label={label}
          description={description}
          mediaLibraryEnabled={pickerEnabled}
          onLibrarySelect={pickerEnabled ? handleLibrarySelect : undefined}
          onClearUrl={urlFieldName ? handleClearUrl : undefined}
        />
      )}
    />
  );
};
