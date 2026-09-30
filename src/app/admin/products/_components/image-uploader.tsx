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
    { images, onImagesChange, maxImages = 10, mediaLibraryEnabled },
    ref,
  ) {
    // A real, stable-per-mount DOM id (not a hardcoded literal) so multiple
    // uploaders could render on one page without colliding.
    const inputId = useId();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
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

    const getValidImageFiles = async (
      fileList: FileList | File[],
    ): Promise<File[]> => {
      const files = Array.from(fileList);
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
      if (candidates.length === 0) return [];

      setIsPreparing(true);
      let prepared: File[];
      try {
        prepared = await Promise.all(
          candidates.map((file) => prepareImageForUpload(file)),
        );
      } finally {
        setIsPreparing(false);
      }

      const valid: File[] = [];
      for (const file of prepared) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Skipped "${file.name}": must be less than 5MB`);
          continue;
        }
        valid.push(file);
      }
      const remaining = maxImages - images.length;
      return valid.slice(0, Math.max(0, remaining));
    };

    const addPendingFiles = (files: File[]) => {
      const pending: FormProductImage[] = files.map((file, i) => {
        const url = URL.createObjectURL(file);
        pendingObjectUrlsRef.current.add(url);
        return {
          url,
          altText: null,
          sortOrder: images.length + i,
          file,
        };
      });
      onImagesChange([...images, ...pending]);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      e.target.value = "";
      void (async () => {
        const valid = await getValidImageFiles(files);
        if (valid.length === 0) return;
        addPendingFiles(valid);
      })();
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.setAttribute("data-drag", "false");
      const files = e.dataTransfer.files;
      if (!files?.length) return;
      void (async () => {
        const valid = await getValidImageFiles(files);
        if (valid.length === 0) return;
        addPendingFiles(valid);
      })();
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      e.currentTarget.setAttribute("data-drag", "true");
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.setAttribute("data-drag", "false");
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

    const triggerFileInput = () => fileInputRef.current?.click();

    const handleLibrarySelect = (url: string) => {
      if (images.length >= maxImages) {
        toast.error(`You can add at most ${maxImages} images`);
        return;
      }
      if (images.some((img) => img.url === url)) {
        toast.error("That image is already in the gallery");
        return;
      }
      onImagesChange([
        ...images,
        { url, altText: null, sortOrder: images.length },
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
      <Card className="p-6">
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
              className="data-[drag=true]:border-primary data-[drag=true]:bg-primary/5 rounded-lg border-2 border-dashed p-12 text-center transition-colors"
              data-drag="false"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-foreground mb-2">No images yet</p>
              <p className="text-muted-foreground mb-4 text-sm">
                Drag and drop images here, or click to select multiple (JPG,
                PNG, WebP)
              </p>
              {addButton("Select images")}
            </div>
          )}

          {canUploadMore && images.length > 0 && (
            <div
              className="data-[drag=true]:border-primary data-[drag=true]:bg-primary/5 border-border rounded-lg border-2 border-dashed p-6 text-center transition-colors"
              data-drag="false"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p className="text-muted-foreground text-sm">
                Drag and drop more images here, or use the button above
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
        {showLibraryPicker && (
          <MediaPickerDialog
            kind="image"
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onSelect={handleLibrarySelect}
          />
        )}
      </Card>
    );
  },
);
