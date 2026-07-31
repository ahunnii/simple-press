"use client";

import Link from "next/link";

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
      className={`flex flex-wrap gap-[1px]${className ? ` ${className}` : ""}`}
      style={{ background: "var(--pink-line)", border: "1px solid var(--pink-line)" }}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        const label = item.count != null ? `${item.label} (${item.count})` : item.label;
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
              className="px-4 py-2 text-[14px] font-medium whitespace-nowrap transition-colors"
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
            className="px-4 py-2 text-[14px] font-medium whitespace-nowrap transition-colors"
            style={style}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
