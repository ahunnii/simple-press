"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown, Images, Upload } from "lucide-react";
import { toast } from "sonner";

import type { FormProductImage } from "../_validators/schema";
import { prepareImageForUpload } from "~/lib/image-prep";
import { cn } from "~/lib/utils";
import { MAX_PRODUCT_IMAGES } from "~/lib/validators/product";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MediaPickerDialog } from "~/components/media/media-picker-dialog";

import { SortableImage } from "./sortable-image";

type Props = {
  images: FormProductImage[];
  onImagesChange: (images: FormProductImage[]) => void;
  maxImages?: number;
  /**
   * Adds a "Choose from library" option beside "Upload from device". Only
   * pass `true` when the `media` feature flag is enabled — `media.list` is
   * gated server-side and throws FORBIDDEN when the flag is off.
   */
  mediaLibraryEnabled?: boolean;
};

/**
 * Imperative handle so a parent (e.g. product-form's Reset / "Save & create
 * another" flows) can discard any pending, not-yet-uploaded gallery images
 * without having to reach into this component's internals. `reset()` revokes
 * every tracked blob: URL and clears the underlying file input so the same
 * file can be re-selected afterward.
 */
export type ImageUploaderHandle = {
  reset: () => void;
};

export const ImageUploader = forwardRef<ImageUploaderHandle, Props>(
  function ImageUploader(
    {
      images,
      onImagesChange,
      maxImages = MAX_PRODUCT_IMAGES,
      mediaLibraryEnabled,
    },
    ref,
  ) {
    // A real, stable-per-mount DOM id (not a hardcoded literal) so multiple
    // uploaders could render on one page without colliding.
    const inputId = useId();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    // Latest `images` for code that runs after an await (image prep can take
    // seconds for HEIC) — the closure's `images` would be stale by then.
    const imagesRef = useRef(images);
    imagesRef.current = images;
    // Track all blob: URLs we've created so we can revoke them on unmount.
    const pendingObjectUrlsRef = useRef<Set<string>>(new Set());

    // On unmount, revoke any remaining pending blob: URLs.
    useEffect(() => {
      const tracked = pendingObjectUrlsRef.current;
      return () => {
        for (const url of tracked) {
          URL.revokeObjectURL(url);
        }
        tracked.clear();
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          for (const url of pendingObjectUrlsRef.current) {
            URL.revokeObjectURL(url);
          }
          pendingObjectUrlsRef.current.clear();
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      }),
      [],
    );

    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    const [isPreparing, setIsPreparing] = useState(false);

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    const limitReachedMessage = `This product already has ${maxImages} images — remove one to add more`;

    const addPendingFiles = (files: File[]) => {
      const current = imagesRef.current;
      const pending: FormProductImage[] = files.map((file, i) => {
        const url = URL.createObjectURL(file);
        pendingObjectUrlsRef.current.add(url);
        return {
          url,
          altText: null,
          sortOrder: current.length + i,
          file,
        };
      });
      onImagesChange([...current, ...pending]);
    };

    const addFiles = async (files: File[]) => {
      const candidates: File[] = [];
      for (const file of files) {
        // Some browsers (notably Android Chrome) leave `file.type` empty for
        // HEIC/HEIF, so fall back to the extension for those.
        if (
          file.type.startsWith("image/") ||
          /\.(heic|heif)$/i.test(file.name)
        ) {
          candidates.push(file);
        } else {
          toast.error(`Skipped "${file.name}": not an image`);
        }
      }
      if (candidates.length === 0) return;

      // Truncate before prep so we don't HEIC-convert files we'd throw away.
      const slots = maxImages - imagesRef.current.length;
      if (slots <= 0) {
        toast.error(limitReachedMessage);
        return;
      }
      const kept = candidates.slice(0, slots);

      setIsPreparing(true);
      let prepared: File[];
      try {
        prepared = await Promise.all(
          kept.map((file) => prepareImageForUpload(file)),
        );
      } finally {
        setIsPreparing(false);
      }

      const valid: File[] = [];
      let oversized = 0;
      for (const file of prepared) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Skipped "${file.name}": must be less than 5MB`);
          oversized++;
          continue;
        }
        valid.push(file);
      }

      // Re-check against the live gallery: something may have been added
      // (e.g. from the library) while we were preparing.
      const remaining = Math.max(0, maxImages - imagesRef.current.length);
      const toAdd = valid.slice(0, remaining);
      if (toAdd.length > 0) addPendingFiles(toAdd);

      // Oversized files already got their own toast, so they aren't counted
      // in the limit summary.
      const total = candidates.length - oversized;
      const skipped = total - toAdd.length;
      if (skipped > 0) {
        if (toAdd.length === 0) {
          toast.error(limitReachedMessage);
        } else {
          toast.warning(
            `Added ${toAdd.length} of ${total} images — products can have at most ${maxImages} (${skipped} skipped)`,
          );
        }
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Copy out of the live FileList *before* clearing the input — resetting
      // `value` empties that list, and the async work below would see nothing.
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (files.length === 0) return;
      void addFiles(files);
    };

    // Whole-card drop target. `dragenter`/`dragleave` fire for every child the
    // pointer crosses, so a depth counter (not the raw events) drives the
    // highlight.
    const dragDepthRef = useRef(0);
    const [isDragOver, setIsDragOver] = useState(false);

    const isFileDrag = (e: React.DragEvent) =>
      Array.from(e.dataTransfer.types).includes("Files");

    const handleDragEnter = (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setIsDragOver(true);
    };

    const handleDragOver = (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      // Always cancel so the browser never navigates to a dropped file.
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };

    const handleDragLeave = (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragOver(false);
      if (isPreparing) {
        toast.info("Still preparing photos — try again in a moment");
        return;
      }
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      void addFiles(files);
    };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;

      if (active.id !== over?.id) {
        const oldIndex = images.findIndex((img) => img.url === active.id);
        const newIndex = images.findIndex((img) => img.url === over?.id);

        const reordered = arrayMove(images, oldIndex, newIndex);

        // Update sort orders
        const updated = reordered.map((img, idx) => ({
          ...img,
          sortOrder: idx,
        }));

        onImagesChange(updated);
      }
    };

    const removeImage = (index: number) => {
      const img = images[index];
      // Revoke blob: URL if this is a pending (not-yet-uploaded) image.
      if (img?.file) {
        URL.revokeObjectURL(img.url);
        pendingObjectUrlsRef.current.delete(img.url);
      }
      const updated = images.filter((_, i) => i !== index);
      // Re-index sort orders
      const reindexed = updated.map((item, idx) => ({
        ...item,
        sortOrder: idx,
      }));
      onImagesChange(reindexed);
    };

    const updateAltText = (index: number, altText: string) => {
      const updated = [...images];
      updated[index] = { ...updated[index]!, altText };
      onImagesChange(updated);
    };

    const canUploadMore = images.length < maxImages;
    const showLibraryPicker = Boolean(mediaLibraryEnabled);

    const triggerFileInput = () => {
      if (isPreparing) return;
      fileInputRef.current?.click();
    };

    const handleZoneKeyDown = (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      triggerFileInput();
    };

    // The picker already caps selection at the remaining slots; the checks here
    // are a backstop for a gallery that changed while the dialog was open.
    const handleLibrarySelectMany = (urls: string[]) => {
      const current = imagesRef.current;
      const existing = new Set(current.map((img) => img.url));
      const fresh = [...new Set(urls)].filter((url) => !existing.has(url));
      if (fresh.length < urls.length) {
        toast.info("Skipped images that are already in the gallery");
      }
      const remaining = Math.max(0, maxImages - current.length);
      if (fresh.length > 0 && remaining === 0) {
        toast.error(limitReachedMessage);
        return;
      }
      const toAdd = fresh.slice(0, remaining);
      if (toAdd.length < fresh.length) {
        toast.warning(
          `Added ${toAdd.length} of ${fresh.length} images — products can have at most ${maxImages} (${fresh.length - toAdd.length} skipped)`,
        );
      }
      if (toAdd.length === 0) return;
      onImagesChange([
        ...current,
        ...toAdd.map((url, i) => ({
          url,
          altText: null,
          sortOrder: current.length + i,
        })),
      ]);
    };

    const addButton = (label: string) =>
      showLibraryPicker ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" disabled={isPreparing}>
              {isPreparing ? (
                <>
                  <span
                    className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
                    aria-hidden="true"
                  />
                  Preparing photos…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {label}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
          onClick={triggerFileInput}
          disabled={isPreparing}
        >
          {isPreparing ? (
            <>
              <span
                className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
                aria-hidden="true"
              />
              Preparing photos…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {label}
            </>
          )}
        </Button>
      );

    return (
      <>
        <Card
          className="group p-6"
          data-drag={isDragOver && canUploadMore && !isPreparing}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Product Images</h3>
                <p className="text-muted-foreground text-sm">
                  {images.length} of {maxImages} images
                </p>
              </div>

              {canUploadMore && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id={inputId}
                    accept="image/*"
                    multiple
                    disabled={isPreparing}
                    onChange={handleFileSelect}
                    className="hidden"
                    title="Upload images"
                  />
                  {addButton("Add images")}
                </div>
              )}
            </div>

            {images.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={images.map((img) => img.url)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {images.map((image, index) => (
                      <SortableImage
                        key={image.url}
                        image={image}
                        index={index}
                        onRemove={() => removeImage(index)}
                        onUpdateAlt={(alt) => updateAltText(index, alt)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div
                role="button"
                tabIndex={0}
                aria-label="Select images to upload"
                aria-disabled={isPreparing}
                className={cn(
                  "group-data-[drag=true]:border-primary group-data-[drag=true]:bg-primary/5 rounded-lg border-2 border-dashed p-12 text-center transition-colors",
                  isPreparing
                    ? "cursor-not-allowed opacity-60"
                    : "hover:bg-muted/40 cursor-pointer",
                )}
                onClick={triggerFileInput}
                onKeyDown={handleZoneKeyDown}
              >
                <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <p className="text-foreground mb-2">No images yet</p>
                <p className="text-muted-foreground mb-4 text-sm">
                  Drag and drop images here, or click to select multiple (JPG,
                  PNG, WebP)
                </p>
                {/* Keep the button/dropdown from also bubbling a click to the zone. */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {addButton("Select images")}
                </div>
              </div>
            )}

            {canUploadMore && images.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                aria-label="Select more images to upload"
                aria-disabled={isPreparing}
                className={cn(
                  "group-data-[drag=true]:border-primary group-data-[drag=true]:bg-primary/5 border-border rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                  isPreparing
                    ? "cursor-not-allowed opacity-60"
                    : "hover:bg-muted/40 cursor-pointer",
                )}
                onClick={triggerFileInput}
                onKeyDown={handleZoneKeyDown}
              >
                <p className="text-muted-foreground text-sm">
                  Drag and drop more images here, or click to browse
                </p>
              </div>
            )}

            <p className="text-muted-foreground text-xs">
              Tip: Drag images to reorder. First image is the primary image.
              {images.some((img) => img.file) && (
                <span className="ml-1 text-amber-600">
                  Pending images upload when you save.
                </span>
              )}
            </p>
          </div>
        </Card>
        {/* Outside the Card on purpose: React events bubble through portals, so
          a file dropped on the picker's upload zone would otherwise also hit
          the Card's drop handler and be added twice. */}
        {showLibraryPicker && (
          <MediaPickerDialog
            kind="image"
            multiple
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            maxSelect={Math.max(0, maxImages - images.length)}
            excludeUrls={images.map((img) => img.url)}
            onSelectMany={handleLibrarySelectMany}
          />
        )}
      </>
    );
  },
);
