"use client";

import * as React from "react";
import Image from "next/image";
import { XIcon } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

type Props = {
  src: string;
  /** Event name. Fliers carry words, so this is never decorative. */
  alt: string;
  /** The trigger — typically the card's flier thumbnail. */
  children: React.ReactNode;
  /** Extra classes for the dialog panel, so a template can apply its own tokens. */
  panelClassName?: string;
  closeLabel?: string;
};

/**
 * Single-image lightbox for viewing an event flier at full size. Built on the
 * shared shadcn Dialog (Radix) so focus trap, Escape-to-close, scroll lock,
 * aria-modal, and focus restore all come for free. Deliberately NOT a copy of
 * the multi-image gallery lightboxes elsewhere in the repo — no prev/next, no
 * thumbnails, one image only.
 */
export function EventFlierLightbox({
  src,
  alt,
  children,
  panelClassName,
  closeLabel = "Close",
}: Props) {
  return (
    <Dialog>
      {/*
       * DialogTrigger asChild would hand the trigger role straight to
       * `children`, which is fragile — callers may pass a plain <img> or
       * <div> that isn't focusable. Wrapping in a real <button> here makes
       * every call site keyboard-operable and properly announced by
       * construction, regardless of what `children` turns out to be.
       */}
      <DialogTrigger asChild>
        <button
          type="button"
          className="block w-full cursor-zoom-in appearance-none border-0 bg-transparent p-0 text-left"
          aria-label={`View flier for ${alt}`}
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Sized for a poster rather than the default form-dialog width.
          "max-w-[92vw] gap-0 overflow-hidden p-0 sm:max-w-3xl",
          // NOTE: Radix portals this content to document.body, outside any
          // template-scoped CSS (e.g. the `pink` template sets `--radius: 0`
          // and force-resets `border-radius` on descendants of `.pink`, which
          // does not reach here). `panelClassName` is the escape hatch —
          // merge it last so a template can re-apply its own tokens directly
          // on the panel instead of relying on ancestor scoping.
          panelClassName,
        )}
      >
        <DialogTitle className="sr-only">{`${alt} — enlarged flier`}</DialogTitle>
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={1600}
          className="h-auto max-h-[88vh] w-full object-contain"
        />
        <DialogClose
          aria-label={closeLabel}
          className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white opacity-90 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
