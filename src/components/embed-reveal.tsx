"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";
import { EmbedFrame } from "~/components/embed-frame";

type EmbedRevealProps = {
  src: string;
  height?: number;
  title: string;
  className?: string;
  /** Trigger button label. Defaults to "Book Now". */
  triggerLabel?: string;
  /** Optional className applied to the trigger button (template-specific styling). */
  triggerClassName?: string;
  /** Named aspect-ratio preset forwarded to EmbedFrame. */
  aspectRatio?: string;
  /** Named max-width preset forwarded to EmbedFrame. */
  maxWidth?: string;
};

/**
 * Hides an `EmbedFrame` behind a trigger button. On click, the iframe animates
 * open inline into the surrounding section (height + opacity). The mounted
 * `EmbedFrame` shows its own loading skeleton while the external site loads.
 */
export function EmbedReveal({
  src,
  height,
  title,
  className,
  triggerLabel = "Book Now",
  triggerClassName,
  aspectRatio,
  maxWidth,
}: EmbedRevealProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="embed"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <EmbedFrame
              src={src}
              height={height}
              title={title}
              aspectRatio={aspectRatio}
              maxWidth={maxWidth}
              className="w-full"
            />
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(triggerClassName ?? buttonVariants())}
          >
            {triggerLabel}
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
