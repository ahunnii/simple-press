import type { CSSProperties } from "react";

import { cn } from "~/lib/utils";

import { resolveChipColor } from "./olive-color";

/**
 * Stock and order states a chip may carry. The chrome CSS draws `low` (a leaf
 * dot), `sold-out` (a 45° hatch at half opacity) and `pre-order` (a dashed
 * slate ring); `in-stock` and `coming-soon` are plain swatches whose meaning
 * comes from the label beside them.
 */
export type OliveChipState =
  | "in-stock"
  | "low"
  | "sold-out"
  | "pre-order"
  | "coming-soon";

type OliveChipProps = {
  /**
   * Any CSS colour (`#8b1e3f`, `rgb(...)`, `var(--olive-leaf)`) or a plain
   * colour NAME ("Sage", "Deep Navy") which is mapped through
   * `colorFromName()`. A name this template does not know renders as a
   * hatched paper swatch rather than an invented colour.
   */
  color: string;
  /** The colour, category or state this chip stands for. sr-only + tooltip. */
  label: string;
  selected?: boolean;
  state?: OliveChipState;
  /** Rendered diameter in px. Defaults to 20 (the chrome's 1.25rem). */
  size?: number;
  /** Render a `<button role="radio">` instead of an inert `<span>`. */
  interactive?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  /** Roving tabindex, supplied by `OliveChipRow`. Ignored when not interactive. */
  tabIndex?: number;
  /**
   * Default true: the label is added as sr-only text so a colour that only
   * exists as a colour still reaches assistive tech. Set false when the same
   * word is already visible beside the chip (a category tab, a status pill) —
   * the chip is then hidden from the accessibility tree so it is not read
   * twice. Never set false when the chip is the only carrier of the meaning.
   */
  srOnlyLabel?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveChip — the template's one piece of ornament that is never ornament.
 *
 * A chip appears where a colour is a real choice (a variant colour, a
 * category tab) or where a state needs a mark (stock, order status). It is
 * never a kicker, never a bullet and never sits above a heading. Styling is
 * the chrome's `olive-chip` class plus its `data-selected` / `data-state`
 * attributes; this component only resolves the swatch and the semantics.
 *
 * The label is always in the accessibility tree — a colour that only exists
 * as a colour is invisible to a screen reader and to anyone who cannot
 * distinguish it.
 */
export function OliveChip({
  color,
  label,
  selected = false,
  state,
  size = 20,
  interactive = false,
  onSelect,
  disabled = false,
  tabIndex,
  srOnlyLabel = true,
  className,
  style,
}: OliveChipProps) {
  const swatch = resolveChipColor(color);

  const chipStyle: CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: swatch.color,
    // An unknown name is drawn as an absence, not a guess: paper ground with a
    // hairline hatch, the owner's own word carried by the label and tooltip.
    ...(swatch.unknown
      ? {
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0 3px, var(--olive-hairline-strong) 3px 4px)",
        }
      : {}),
    ...style,
  };

  const content = srOnlyLabel ? <span className="sr-only">{label}</span> : null;

  if (interactive) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-disabled={disabled || undefined}
        data-selected={selected ? "true" : undefined}
        data-state={state}
        data-value={label}
        tabIndex={tabIndex}
        title={label}
        className={cn("olive-chip", className)}
        style={chipStyle}
        onClick={disabled ? undefined : onSelect}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      aria-hidden={srOnlyLabel ? undefined : "true"}
      data-selected={selected ? "true" : undefined}
      data-state={state}
      title={label}
      className={cn("olive-chip", className)}
      style={chipStyle}
    >
      {content}
    </span>
  );
}
