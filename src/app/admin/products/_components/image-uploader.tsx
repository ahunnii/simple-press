"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useUploadFiles } from "@better-upload/client";
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
import { getStoredPath } from "~/lib/uploads";
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
  const uploadFiles = useUploadFiles({
    api: "/api/upload",
    route: "image",
    onUploadComplete: (data) => {
      const newImages: FormProductImage[] = data.files.map((file, i) => ({
        url: getStoredPath(file),
        altText: null,
        sortOrder: images.length + i,
      }));
      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    },
    onError: () => {
      alert("Failed to upload image");
    },
  });

  const isUploading = uploadFiles.isPending;

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const valid = getValidImageFiles(files);
    if (valid.length === 0) return;
    e.target.value = "";
    await uploadFiles.upload(valid);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.setAttribute("data-drag", "false");
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    const valid = getValidImageFiles(files);
    if (valid.length === 0) return;
    await uploadFiles.upload(valid);
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
    const updated = images.filter((_, i) => i !== index);
    // Re-index sort orders
    const reindexed = updated.map((img, idx) => ({
      ...img,
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
            <p className="text-sm text-gray-500">
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
                disabled={isUploading}
                title="Upload images"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("image-upload")?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload images
                  </>
                )}
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
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-gray-600">No images yet</p>
            <p className="mb-4 text-sm text-gray-500">
              Drag and drop images here, or click to select multiple (JPG, PNG,
              WebP)
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("image-upload")?.click()}
              disabled={isUploading}
            >
              Select images
            </Button>
          </div>
        )}

        {canUploadMore && images.length > 0 && (
          <div
            className="data-[drag=true]:border-primary data-[drag=true]:bg-primary/5 rounded-lg border-2 border-dashed border-gray-200 p-6 text-center transition-colors"
            data-drag="false"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <p className="text-sm text-gray-500">
              Drag and drop more images here, or use the button above
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Tip: Drag images to reorder. First image is the primary image.
        </p>
      </div>
    </Card>
  );
}
