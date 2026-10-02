"use client";

import { useId } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

import type { FormProductImage } from "../_validators/schema";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { AdminThumb } from "../../_components/admin-thumb";

type Props = {
  image: FormProductImage;
  index: number;
  onRemove: () => void;
  onUpdateAlt: (alt: string) => void;
};
export function SortableImage({ image, index, onRemove, onUpdateAlt }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: image.url });
  const altInputId = useId();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card space-y-3 rounded-lg border p-4"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          type="button"
          className="mt-2 cursor-move"
          {...attributes}
          {...listeners}
          aria-label={`Reorder image ${index + 1}`}
        >
          <GripVertical
            className="text-muted-foreground h-5 w-5"
            aria-hidden="true"
          />
        </button>

        {/* Image Preview */}
        <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded">
          <AdminThumb
            src={image.url}
            alt={image.altText ?? "Product image"}
            loading="lazy"
            className="h-24 w-24 object-cover"
          />
        </div>

        {/* Alt Text Input */}
        <div className="flex-1">
          <Label htmlFor={altInputId} className="text-xs">
            Alt Text
            <span className="sr-only"> for image {index + 1}</span>
          </Label>
          <Input
            id={altInputId}
            type="text"
            value={image.altText ?? ""}
            onChange={(e) => onUpdateAlt(e.target.value)}
            placeholder="Describe this image..."
            className="mt-1"
          />
          {index === 0 && (
            <p className="text-muted-foreground mt-1 text-xs">Primary image</p>
          )}
        </div>

        {/* Remove Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remove image ${index + 1}`}
        >
          <X className="text-destructive h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
