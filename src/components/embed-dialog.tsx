"use client";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { EmbedFrame } from "~/components/embed-frame";

/**
 * Renders a trigger button that opens an iframe embed inside a dialog.
 *
 * Use this for `displayMode: "dialog"` embeds — both TipTap rich-text nodes
 * and template fields of type `iframe`.
 *
 * The dialog content fills up to 90 vh / max-w-3xl and uses `EmbedFrame`
 * in fill mode so the iframe stretches to its container rather than being
 * constrained by its own max-width setting.
 */
export function EmbedDialog({
  src,
  title,
  aspectRatio,
  height,
  triggerLabel = "Open",
  className,
}: {
  src: string;
  title: string;
  aspectRatio?: string;
  height?: number;
  triggerLabel?: string;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={className}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <EmbedFrame
            src={src}
            title={title}
            aspectRatio={aspectRatio}
            height={height}
            fill
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
