"use client";

import { useEffect, useRef, useState } from "react";

import type { OliveCartAddedDetail } from "../layout/olive-toast";
import { cn } from "~/lib/utils";

import { OLIVE_CART_ADDED_EVENT } from "../layout/olive-toast";
import { OliveButton, OliveQuantityStepper } from "../shared";

/** Matches `.olive-btn[data-commit="true"]`'s animation-duration in globals.css. */
const COMMIT_MS = 460;

/**
 * Tell the layout's toast that something landed in the bag.
 *
 * Call it AFTER a successful `addItem`, never optimistically — the card is a
 * confirmation, and the header's badge pulses off the cart count on its own.
 */
export function announceOliveCartAdded(name: string) {
  window.dispatchEvent(
    new CustomEvent<OliveCartAddedDetail>(OLIVE_CART_ADDED_EVENT, {
      detail: { name },
    }),
  );
}

type OliveBuyRowProps = {
  quantity: number;
  onQuantityChange: (value: number) => void;
  /** Largest quantity that can still be added. Omit for untracked stock. */
  max?: number;
  /** Folded into the stepper's labels so several steppers stay distinguishable. */
  itemLabel: string;
  onAdd: () => void;
  disabled?: boolean;
  className?: string;
};

/**
 * OliveBuyRow — the stepper and the one button that does the thing.
 *
 * Shared by both purchase paths (a plain product and a chosen variant) so the
 * gesture is identical either way: pick a number, press the sage pill. The
 * confirmation is the toast and the badge, not a button that changes its mind
 * about what it says.
 */
export function OliveBuyRow({
  quantity,
  onQuantityChange,
  max,
  itemLabel,
  onAdd,
  disabled = false,
  className,
}: OliveBuyRowProps) {
  // The press-commit connects this click to the toast/badge that follow —
  // see `shared/olive-button.tsx`'s `committed` prop. Restarting it on a
  // rapid repeat click needs one reduced-motion-free frame at `false` first
  // (the same `setOpen(false)` → `requestAnimationFrame` idiom `OliveToast`
  // uses to replay its own entrance), or re-setting `true` while it is
  // already `true` is a no-op.
  const [committed, setCommitted] = useState(false);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

  const handleAdd = () => {
    onAdd();
    setCommitted(false);
    requestAnimationFrame(() => setCommitted(true));
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => setCommitted(false), COMMIT_MS);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <OliveQuantityStepper
        value={quantity}
        onChange={onQuantityChange}
        max={max}
        itemLabel={itemLabel}
        disabled={disabled}
      />
      <OliveButton
        variant="primary"
        size="lg"
        onClick={handleAdd}
        disabled={disabled}
        committed={committed}
        className="min-w-[11rem] flex-1"
      >
        Add to bag
      </OliveButton>
    </div>
  );
}
