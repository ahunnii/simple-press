"use client";

import Link from "next/link";

import { cn } from "~/lib/utils";

export type PinkFilterChipItem = {
  id: string;
  label: string;
  count?: number;
  /** Renders as a Link instead of a button when set. */
  href?: string;
};

type PinkFilterChipsProps = {
  items: PinkFilterChipItem[];
  activeId?: string;
  /** Ignored for href-based (link) chips — navigation handles the state change. */
  onSelect?: (id: string) => void;
  className?: string;
  "aria-label"?: string;
};

/**
 * `px-4 py-2` renders a 37px chip, which is the height design.md calibrated
 * for a hairline strip — it is a filter row, not a button bar, and inflating
 * it everywhere would coarsen the shop and blog headers on desktop.
 *
 * 37px already clears WCAG 2.5.8's 24x24 AA floor, so this is not a
 * compliance fix; it is the template's *own* bar, set at 44px when the
 * 2026-07-29 review raised the mobile nav links to 47-48px. So the floor is
 * applied only where a finger is the input device — `(pointer: coarse)` —
 * and the desktop box is left exactly as designed (audit 2026-07-31, P3-1).
 *
 * `inline-flex` + centring is what lets `min-h` grow the box without the
 * label drifting off-centre; on a bare `<a>` a min-height would leave the
 * text top-aligned.
 */
const CHIP_CLASS =
  "inline-flex items-center justify-center px-4 py-2 text-[14px] font-medium whitespace-nowrap transition-colors [@media(pointer:coarse)]:min-h-11";
/**
 * The hairline chip row: active = ink fill + paper text, resting = paper
 * fill + muted text. Used for shop sort, collection/testimonial filters,
 * blog categories (design.md → Shared component inventory).
 */
export function PinkFilterChips({
  items,
  activeId,
  onSelect,
  className,
  ...rest
}: PinkFilterChipsProps) {
  const ariaLabel = rest["aria-label"] ?? "Filter";
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-[1px]", className)}
      style={{
        background: "var(--pink-line)",
        border: "1px solid var(--pink-line)",
      }}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        const label =
          item.count != null ? `${item.label} (${item.count})` : item.label;
        const style: React.CSSProperties = {
          background: active ? "var(--pink-ink)" : "var(--pink-paper)",
          color: active ? "var(--pink-paper)" : "var(--pink-muted)",
        };

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "true" : undefined}
              className={CHIP_CLASS}
              style={style}
            >
              {label}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect?.(item.id)}
            className={CHIP_CLASS}
            style={style}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
