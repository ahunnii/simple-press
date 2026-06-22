/* eslint-disable @next/next/no-img-element */
"use client";

import type { GalleryImage } from "generated/prisma";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";

type Props = {
  image: GalleryImage;
  onDelete: (id: string) => void;
  onEdit: (image: GalleryImage) => void;
};

// Sortable Image Component
export function SortableImage({ image, onDelete, onEdit }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
    >
      <img
        src={image.url}
        alt={image.altText ?? ""}
        loading="lazy"
        className="h-full w-full object-cover"
      />

      <div
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="absolute top-2 left-2 cursor-grab rounded bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-white" aria-hidden="true" />
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="secondary"
          size="sm"
          aria-label="Edit image"
          onClick={() => onEdit(image)}
          className="h-8 w-8 p-0"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          variant="destructive"
          size="sm"
          aria-label="Delete image"
          onClick={() => onDelete(image.id)}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {image.caption && (
        <div className="absolute right-0 bottom-0 left-0 truncate bg-black/70 p-2 text-xs text-white">
          {image.caption}
        </div>
      )}

      {/* Alt Text Indicator */}
      {image.altText && (
        <div className="absolute bottom-0 left-0 rounded-tr bg-blue-600 px-2 py-0.5 text-xs text-white">
          ALT
        </div>
      )}
    </div>
  );
}
