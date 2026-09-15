"use client";

import type { OliveCartAddedDetail } from "../layout/olive-toast";
import { cn } from "~/lib/utils";

import { OLIVE_CART_ADDED_EVENT } from "../layout/olive-toast";
import { OliveButton, OliveQuantityStepper } from "../shared";

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
        onClick={onAdd}
        disabled={disabled}
        className="min-w-[11rem] flex-1"
      >
        Add to bag
      </OliveButton>
    </div>
  );
}
