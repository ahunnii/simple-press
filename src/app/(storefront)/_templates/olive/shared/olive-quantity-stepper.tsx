"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

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
 *
 * The readout bumps up and down (translateY 0 → -2px → 0) when the value
 * changes, via a 240ms animation. The bump is driven by a data attribute set
 * when the value changes; the attribute clears after the animation.
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
  const reduced = useReducedMotion();
  const [bump, setBump] = useState(false);
  const previousValue = useRef(value);

  useEffect(() => {
    if (value !== previousValue.current && !reduced) {
      setBump(true);
      previousValue.current = value;
      const timer = setTimeout(() => setBump(false), 240);
      return () => clearTimeout(timer);
    }
    previousValue.current = value;
  }, [value, reduced]);

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
        className="olive-price olive-qty-readout min-w-8 text-center tabular-nums"
        data-bump={bump ? "true" : undefined}
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
