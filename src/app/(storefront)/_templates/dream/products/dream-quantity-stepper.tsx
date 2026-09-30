import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
  /** Id of a stock hint the increase button should point screen readers to. */
  describedBy?: string;
};

/**
 * Paper pill quantity stepper with hairline border — shared by the simple
 * and variant buy paths so both read identically. Icons are lucide at the
 * template's 1.5px stroke (design.md craft floor).
 */
export function DreamQuantityStepper({
  value,
  onDecrement,
  onIncrement,
  canDecrement,
  canIncrement,
  describedBy,
}: Props) {
  return (
    <div
      role="group"
      aria-label="Quantity"
      className="inline-flex h-12 shrink-0 items-center rounded-[var(--dream-radius-pill)] border border-[var(--dream-line)] bg-[var(--dream-white)]"
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={!canDecrement}
        aria-label="Decrease quantity"
        className="grid size-12 place-items-center rounded-full text-[var(--dream-ink)] transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus className="size-4" strokeWidth={1.5} aria-hidden="true" />
      </button>
      <span
        className="w-8 text-center text-[15px] font-semibold tabular-nums"
        aria-live="polite"
        aria-atomic="true"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={!canIncrement}
        aria-label="Increase quantity"
        aria-describedby={describedBy}
        className="grid size-12 place-items-center rounded-full text-[var(--dream-ink)] transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Plus className="size-4" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
