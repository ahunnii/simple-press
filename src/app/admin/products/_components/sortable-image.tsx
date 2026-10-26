"use client";

import { useId, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Play, X } from "lucide-react";

import type { FormProductImage } from "../_validators/schema";
import { isFilenameAltText } from "~/lib/images/alt-text";
import { isVideoMedia } from "~/lib/products/media";
import { formatVideoDuration } from "~/lib/video-prep";
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
  const isVideo = isVideoMedia(image);
  const noun = isVideo ? "video" : "image";
  // Length read from the preview <video> when the uploader didn't know it.
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const durationSec = image.durationSec ?? loadedDuration;
  // Old uploads stored the file name as alt text. Show the field empty and say
  // what was there; the product form clears it on save unless it's replaced.
  const staleFilename = isFilenameAltText(image.altText);
  const previewAlt = staleFilename
    ? isVideo
      ? "Product video"
      : "Product image"
    : (image.altText ?? (isVideo ? "Product video" : "Product image"));

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
          aria-label={`Reorder ${noun} ${index + 1}`}
        >
          <GripVertical
            className="text-muted-foreground h-5 w-5"
            aria-hidden="true"
          />
        </button>

        {/* Preview */}
        <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded">
          {!isVideo ? (
            <AdminThumb
              src={image.url}
              alt={previewAlt}
              loading="lazy"
              className="h-24 w-24 object-cover"
            />
          ) : image.posterUrl ? (
            <AdminThumb
              src={image.posterUrl}
              alt={previewAlt}
              loading="lazy"
              className="h-24 w-24 object-cover"
            />
          ) : (
            <video
              src={`${image.url}#t=0.1`}
              muted
              playsInline
              preload="metadata"
              aria-label={previewAlt}
              className="h-24 w-24 object-cover"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                if (Number.isFinite(d) && d > 0) setLoadedDuration(d);
              }}
            />
          )}
          {isVideo && (
            <>
              <span
                className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                aria-hidden="true"
              >
                <Play className="ml-px h-3 w-3 fill-current" />
              </span>
              {durationSec ? (
                <span className="absolute right-1 bottom-1 rounded bg-black/60 px-1 text-[10px] leading-4 font-medium text-white tabular-nums">
                  <span className="sr-only">Length </span>
                  {formatVideoDuration(durationSec)}
                </span>
              ) : null}
            </>
          )}
        </div>

        {/* Alt Text Input */}
        <div className="flex-1">
          <Label htmlFor={altInputId} className="text-xs">
            {isVideo ? "Description" : "Alt Text"}
            <span className="sr-only">
              {" "}
              for {noun} {index + 1}
            </span>
          </Label>
          <Input
            id={altInputId}
            type="text"
            value={staleFilename ? "" : (image.altText ?? "")}
            onChange={(e) => onUpdateAlt(e.target.value)}
            placeholder={
              isVideo ? "What the video shows..." : "Describe this image..."
            }
            className="mt-1"
          />
          {staleFilename && (
            <p className="text-muted-foreground mt-1 text-xs">
              Was &quot;{image.altText?.trim()}&quot; — describe what&apos;s in
              the {isVideo ? "video" : "photo"} instead.
            </p>
          )}
          {index === 0 && !isVideo && (
            <p className="text-muted-foreground mt-1 text-xs">
              Primary photo — shown on product cards and at checkout
            </p>
          )}
          {isVideo && (
            <p className="text-muted-foreground mt-1 text-xs">
              Plays muted on a loop in your shop
            </p>
          )}
        </div>

        {/* Remove Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remove ${noun} ${index + 1}`}
        >
          <X className="text-destructive h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
