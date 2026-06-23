"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useEffect, useRef } from "react";
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
import { Upload } from "lucide-react";

import type { FormProductImage } from "../_validators/schema";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

import { SortableImage } from "./sortable-image";

type Props = {
  images: FormProductImage[];
  onImagesChange: (images: FormProductImage[]) => void;
  maxImages?: number;
};

export function ImageUploader({
  images,
  onImagesChange,
  maxImages = 10,
}: Props) {
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const getValidImageFiles = (fileList: FileList | File[]): File[] => {
    const files = Array.from(fileList);
    const valid: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        alert(`Skipped "${file.name}": not an image`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`Skipped "${file.name}": must be less than 5MB`);
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
    const valid = getValidImageFiles(files);
    if (valid.length === 0) return;
    e.target.value = "";
    addPendingFiles(valid);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.setAttribute("data-drag", "false");
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    const valid = getValidImageFiles(files);
    if (valid.length === 0) return;
    addPendingFiles(valid);
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
                type="file"
                id="image-upload"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                title="Upload images"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("image-upload")?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Add images
              </Button>
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
              Drag and drop images here, or click to select multiple (JPG, PNG,
              WebP)
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              Select images
            </Button>
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
    </Card>
  );
}
