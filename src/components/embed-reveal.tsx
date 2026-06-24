"use client";

import { useState } from "react";

import { AnimatePresence, motion } from "motion/react";

import { Button } from "~/components/ui/button";
import { EmbedFrame } from "~/components/embed-frame";
import { cn } from "~/lib/utils";

type EmbedRevealProps = {
  src: string;
  height?: number;
  title: string;
  className?: string;
  /** Trigger button label. Defaults to "Book Now". */
  triggerLabel?: string;
  /** Optional className applied to the trigger button (template-specific styling). */
  triggerClassName?: string;
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
            <EmbedFrame src={src} height={height} title={title} className="w-full" />
          </motion.div>
        ) : (
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(triggerClassName)}
          >
            {triggerLabel}
          </Button>
        )}
      </AnimatePresence>
    </div>
  );
}
