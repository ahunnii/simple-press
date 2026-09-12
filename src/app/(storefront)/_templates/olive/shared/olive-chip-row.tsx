"use client";

import { useRef } from "react";

import type { OliveChipState } from "./olive-chip";
import { cn } from "~/lib/utils";

import { OliveChip } from "./olive-chip";

export type OliveChipRowItem = {
  /** Stable value handed back to `onChange`. */
  value: string;
  /** CSS colour or colour name — see `resolveChipColor`. */
  color: string;
  /** The word this chip stands for. Always reaches assistive tech. */
  label: string;
  state?: OliveChipState;
  /** Focusable but not selectable — a sold-out colour still has to be findable. */
  disabled?: boolean;
};

type OliveChipRowProps = {
  items: OliveChipRowItem[];
  /** Currently chosen value, or `null` for nothing chosen yet. */
  value: string | null;
  onChange: (value: string) => void;
  /** Names the group, e.g. "Colour". Required — a radiogroup without a name is unusable. */
  "aria-label": string;
  /**
   * Render at most this many chips and follow them with a "+N" count.
   * Only use it where the full set is reachable somewhere else (a card that
   * links to its product page) — never for a real chooser, where truncating
   * hides options from every input method.
   */
  max?: number;
  /** Chip diameter in px. Defaults to 22 for a chooser (comfortably above 20). */
  size?: number;
  className?: string;
};

/**
 * OliveChipRow — a radio group of colour chips with roving tabindex.
 *
 * One tab stop for the whole row; Arrow keys move and select, Home/End jump
 * to the ends, and movement wraps. Disabled chips stay reachable so a
 * sold-out colour is discoverable rather than silently absent (the failure
 * mode recorded in the platform accessibility statement).
 */
export function OliveChipRow({
  items,
  value,
  onChange,
  "aria-label": ariaLabel,
  max,
  size = 22,
  className,
}: OliveChipRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  const visible = max !== undefined ? items.slice(0, max) : items;
  const overflow = items.length - visible.length;

  const selectedIndex = visible.findIndex((item) => item.value === value);
  // Nothing chosen yet: the first chip owns the row's single tab stop.
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const radios = () =>
    Array.from(
      rowRef.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [],
    );

  const moveTo = (index: number) => {
    radios()[index]?.focus();
    const item = visible[index];
    if (item && !item.disabled) onChange(item.value);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const count = visible.length;
    if (count === 0) return;

    const active = radios().indexOf(document.activeElement as HTMLElement);
    const from = active >= 0 ? active : tabbableIndex;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveTo((from + 1) % count);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveTo((from - 1 + count) % count);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(count - 1);
        break;
      default:
        break;
    }
  };

  if (items.length === 0) return null;

  return (
    <div
      ref={rowRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn("flex flex-wrap items-center gap-2.5", className)}
    >
      {visible.map((item, index) => (
        <OliveChip
          key={item.value}
          color={item.color}
          label={item.label}
          state={item.state}
          selected={item.value === value}
          disabled={item.disabled}
          interactive
          size={size}
          tabIndex={index === tabbableIndex ? 0 : -1}
          onSelect={() => onChange(item.value)}
        />
      ))}
      {overflow > 0 ? (
        <>
          <span className="olive-caption" aria-hidden="true">
            +{overflow}
          </span>
          <span className="sr-only">{overflow} more not shown here</span>
        </>
      ) : null}
    </div>
  );
}
