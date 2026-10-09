"use client";

import { Minus, Plus } from "lucide-react";

type GloveQtyStepperProps = {
  value: number;
  itemLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
  /** Inventory ceiling; the plus button disables at this quantity. */
  max?: number;
};

/**
 * Hairline − 2 + stepper with 40px buttons. The count is announced politely
 * when it changes; every button names the item it acts on.
 */
export function GloveQtyStepper({
  value,
  itemLabel,
  onDecrement,
  onIncrement,
  max,
}: GloveQtyStepperProps) {
  const atMax = max !== undefined && value >= max;
  return (
    <div className="inline-flex items-center rounded-[3px] border border-[var(--glove-line)] bg-[var(--glove-paper)]">
      <button
        type="button"
        onClick={onDecrement}
        disabled={value <= 1}
        aria-label={`Decrease quantity of ${itemLabel}`}
        className="inline-flex size-10 items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <span
        className="glove-body w-9 text-center text-[15px] font-bold text-[var(--glove-ink)]"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="sr-only">Quantity </span>
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={atMax}
        aria-label={`Increase quantity of ${itemLabel}`}
        className="inline-flex size-10 items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
