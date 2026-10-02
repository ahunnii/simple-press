"use client";

import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Images, Trash, Upload } from "lucide-react";
import { useWatch } from "react-hook-form";
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

/**
 * Matches the image routes' `maxFileSize` in `src/app/api/upload/route.ts`.
 * Checked after `prepareImageForUpload` (which only shrinks raster photos —
 * GIF/SVG/ICO come back unchanged) so an oversized file is rejected on select
 * instead of failing the whole save with a bare upload error.
 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
    // Some browsers (notably Android Chrome) leave `file.type` empty for
    // HEIC/HEIF, so fall back to the extension for those.
    /\.(jpg|jpeg|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name)
  );
}

const SPINNER_CLASS =
  "border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2";

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
  /** Live value of the companion URL field (undefined when there is none). */
  urlValue?: unknown;
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
  urlValue,
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

  // The companion URL moved away from the picked library image (form Reset, or
  // Remove) — drop the stale preview.
  useEffect(() => {
    setLibraryUrl((current) =>
      current !== null && urlValue !== current ? null : current,
    );
  }, [urlValue]);

  const objectUrl = useObjectUrl(hasFile ? value : null);
  const showExisting =
    Boolean(existingPreviewUrl) && !hasFile && !removedExisting;
  const previewUrl =
    objectUrl ??
    (hasFile ? null : libraryUrl) ??
    (showExisting ? (existingPreviewUrl ?? null) : null);

  const [isPreparing, setIsPreparing] = useState(false);

  const busy = disabled === true || isPreparing;
  /** Hidden ": <field>" appended to the generic button text so several
   *  media fields on one page don't announce identically. */
  const nameSuffix = label ? <span className="sr-only">: {label}</span> : null;

  const triggerFileInput = useCallback(() => {
    if (busy) return;
    fileInputRef.current?.click();
  }, [busy, fileInputRef]);

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

  // HEIC -> web-safe, oversized photos downscaled. Runs before the file reaches
  // the form so any downstream size validation sees the prepared file.
  const isPreparingRef = useRef(false);
  const prepareAndSelect = useCallback(
    async (file: File) => {
      if (isPreparingRef.current) return;
      isPreparingRef.current = true;
      setIsPreparing(true);
      try {
        const prepared = await prepareImageForUpload(file);
        if (prepared.size > MAX_IMAGE_BYTES) {
          toast.error(`Skipped "${file.name}": must be less than 5MB`);
          return;
        }
        handleFileSelected(prepared);
      } catch {
        toast.error(`Couldn't process "${file.name}". Try a different image.`);
      } finally {
        isPreparingRef.current = false;
        setIsPreparing(false);
      }
    },
    [handleFileSelected],
  );

  // Drag highlight. `dragenter`/`dragleave` fire for every child the pointer
  // crosses, so a depth counter (not the raw events) drives it.
  const dragDepthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const isFileDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("Files");

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
            disabled={busy}
            aria-label={label ?? "Choose image file"}
            onChange={(e) => {
              // Copy the File out *before* clearing the input — resetting
              // `value` empties the live FileList, and preparing is async.
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void prepareAndSelect(file);
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
                disabled={busy}
                aria-label={label ? `Remove image: ${label}` : "Remove image"}
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
                      {nameSuffix}
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
                    queueMicrotask(() => triggerFileInput());
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
                  {nameSuffix}
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
            aria-disabled={busy}
            data-drag={isDragOver && !disabled && !isPreparing}
            onDragEnter={(e) => {
              if (!isFileDrag(e)) return;
              e.preventDefault();
              dragDepthRef.current += 1;
              setIsDragOver(true);
            }}
            onDragOver={(e) => {
              if (!isFileDrag(e)) return;
              // Always cancel so the browser never navigates to a dropped file.
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(e) => {
              if (!isFileDrag(e)) return;
              dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
              if (dragDepthRef.current === 0) setIsDragOver(false);
            }}
            onDrop={(e) => {
              if (!isFileDrag(e)) return;
              e.preventDefault();
              dragDepthRef.current = 0;
              setIsDragOver(false);
              if (disabled) return;
              if (isPreparing) {
                toast.info("Still preparing the photo — try again in a moment");
                return;
              }
              // Copy out of the live DataTransfer before awaiting anything.
              const file = e.dataTransfer.files[0];
              if (!file) return;
              if (isImageFile(file)) {
                void prepareAndSelect(file);
              } else {
                toast.error(`Skipped "${file.name}": not an image`);
              }
            }}
            className={cn(
              "border-border border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
              "hover:border-muted-foreground/50 hover:bg-muted/50",
              "data-[drag=true]:border-primary data-[drag=true]:bg-primary/5",
              busy && "pointer-events-none opacity-50",
            )}
            onClick={triggerFileInput}
          >
            {isPreparing
              ? "Preparing photo…"
              : "Drag and drop an image here, or click to browse"}
            {nameSuffix}
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
      // `undefined`, not `null`: consumers read a `null` file as "image
      // removed" on submit, which would wipe the URL we just picked.
      form.setValue(
        name,
        undefined as PathValue<CurrentForm, Path<CurrentForm>>,
      );
    },
    [form, name, urlFieldName],
  );

  const handleClearUrl = useCallback(() => {
    if (!urlFieldName) return;
    form.setValue(
      urlFieldName,
      // `null`, not "": consumer URL schemas are `.url().nullable()`, so ""
      // would fail validation invisibly (FormMessage is bound to the file field).
      null as PathValue<CurrentForm, Path<CurrentForm>>,
      { shouldDirty: true },
    );
  }, [form, urlFieldName]);

  // `disabled` keeps the hook unconditional when there is no companion field.
  const urlValue: unknown = useWatch({
    control: form.control,
    name: (urlFieldName ?? name) as Path<CurrentForm>,
    disabled: !urlFieldName,
  });

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
          urlValue={urlFieldName ? urlValue : undefined}
        />
      )}
    />
  );
};
