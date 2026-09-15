"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "~/lib/utils";

type OliveQuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  /** Omit for untracked stock. When set, the plus button stops at it. */
  max?: number;
  /**
   * What is being counted, e.g. "Off-duty sweater". Folded into the group and
   * button labels so a page with several steppers is navigable.
   */
  itemLabel?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * OliveQuantityStepper — minus, a readout, plus.
 *
 * Both controls are 44px targets (`olive-icon-btn`), which is the whole reason
 * this is not a number input on a phone. The count itself is a static readout
 * with a polite live region beside it, so the new value is announced once
 * rather than on every keystroke of a typed field, and each button says which
 * direction it goes and to what.
 */
export function OliveQuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  itemLabel,
  disabled = false,
  className,
}: OliveQuantityStepperProps) {
  const suffix = itemLabel ? ` of ${itemLabel}` : "";
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div
      role="group"
      aria-label={`Quantity${suffix}`}
      className={cn("inline-flex items-center", className)}
      style={{
        border: "1px solid var(--olive-hairline-strong)",
        borderRadius: "999px",
      }}
    >
      <button
        type="button"
        className="olive-icon-btn"
        aria-label={`Decrease quantity${suffix}`}
        disabled={disabled || atMin}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus aria-hidden="true" className="h-4 w-4" />
      </button>

      <span
        className="olive-price min-w-8 text-center tabular-nums"
        aria-hidden="true"
      >
        {value}
      </span>

      <button
        type="button"
        className="olive-icon-btn"
        aria-label={`Increase quantity${suffix}`}
        disabled={disabled || atMax}
        onClick={() =>
          onChange(max === undefined ? value + 1 : Math.min(max, value + 1))
        }
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>

      <span className="sr-only" aria-live="polite">
        Quantity{suffix}: {value}
      </span>
    </div>
  );
}
