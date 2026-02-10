"use client";

import Image from "next/image";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

import type { FormProductImage } from "../_validators/schema";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type Props = {
  image: FormProductImage;
  index: number;
  onRemove: () => void;
  onUpdateAlt: (alt: string) => void;
};
export function SortableImage({ image, index, onRemove, onUpdateAlt }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: image.url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="space-y-3 rounded-lg border bg-white p-4"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          type="button"
          className="mt-2 cursor-move"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </button>

        {/* Image Preview */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded bg-gray-100">
          <Image
            src={image.url}
            alt={image.altText ?? "Product image"}
            fill
            className="object-cover"
          />
        </div>

        {/* Alt Text Input */}
        <div className="flex-1">
          <Label className="text-xs">Alt Text</Label>
          <Input
            type="text"
            value={image.altText ?? ""}
            onChange={(e) => onUpdateAlt(e.target.value)}
            placeholder="Describe this image..."
            className="mt-1"
          />
          {index === 0 && (
            <p className="mt-1 text-xs text-gray-500">Primary image</p>
          )}
        </div>

        {/* Remove Button */}
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    </div>
  );
}
