import type { CSSProperties } from "react";

import type { OliveChipState } from "./olive-chip";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { OliveChip } from "./olive-chip";

/**
 * Every state the template needs to say out loud: order lifecycle,
 * subscription lifecycle, and stock.
 */
export type OliveStatus =
  | "open"
  | "pending"
  | "processing"
  | "completed"
  | "fulfilled"
  | "shipped"
  | "cancelled"
  | "refunded"
  | "active"
  | "paused"
  | "past_due"
  | "in-stock"
  | "low"
  | "sold-out"
  | "pre-order"
  | "coming-soon";

type StatusSpec = {
  label: string;
  /** Swatch token for the chip. Never the only carrier of the meaning. */
  color: string;
  /** Chip state attribute, where the chrome CSS draws one. */
  chipState?: OliveChipState;
  /** Overrides the label colour. Only `past_due` needs it. */
  textColor?: string;
};

/**
 * Red is reserved for a problem the reader has to fix. A cancelled order is
 * finished, not broken, so it gets the quiet ink-soft chip; only `past_due`
 * — money that will stop arriving unless someone acts — takes the error token.
 */
const STATUS: Record<OliveStatus, StatusSpec> = {
  open: { label: "Open", color: "var(--olive-moss)" },
  pending: { label: "Pending", color: "var(--olive-taupe)" },
  processing: { label: "Processing", color: "var(--olive-taupe-ink)" },
  completed: { label: "Completed", color: "var(--olive-moss-deep)" },
  fulfilled: { label: "Fulfilled", color: "var(--olive-moss-deep)" },
  shipped: { label: "Shipped", color: "var(--olive-moss)" },
  cancelled: { label: "Cancelled", color: "var(--olive-ink-soft)" },
  refunded: { label: "Refunded", color: "var(--olive-taupe)" },
  active: { label: "Active", color: "var(--olive-moss)" },
  paused: { label: "Paused", color: "var(--olive-taupe-ink)" },
  past_due: {
    label: "Past due",
    color: "var(--olive-error)",
    textColor: "var(--olive-error)",
  },
  "in-stock": { label: "In stock", color: "var(--olive-moss)" },
  low: {
    label: "Low stock",
    color: "var(--olive-moss-deep)",
    chipState: "low",
  },
  "sold-out": {
    label: "Sold out",
    color: "var(--olive-ink-soft)",
    chipState: "sold-out",
  },
  "pre-order": {
    label: "Pre-order",
    color: "var(--olive-taupe-ink)",
    chipState: "pre-order",
  },
  "coming-soon": {
    label: "Coming soon",
    color: "var(--olive-moss)",
    chipState: "coming-soon",
  },
};

type OliveStatusBadgeProps = {
  status: OliveStatus;
  /** Override the default wording (an owner's own order status, say). */
  label?: string;
  /** Full template field key, when `label` is a live-patchable field. */
  labelFieldKey?: string;
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveStatusBadge — a state, said in tracked caps inside a square hairline
 * frame and marked with a small swatch dot.
 *
 * The chip is the template's one piece of colour language and the label is the
 * meaning; neither stands alone, so the badge survives greyscale, colour
 * blindness and a screen reader. The chip is `aria-hidden` because the word
 * beside it already carries the state.
 */
export function OliveStatusBadge({
  status,
  label,
  labelFieldKey,
  size = "md",
  className,
  style,
}: OliveStatusBadgeProps) {
  const spec = STATUS[status];
  const text = label ?? spec.label;

  return (
    <span
      className={cn("olive-status-badge", className)}
      style={{
        padding: size === "sm" ? "0.25rem 0.5rem" : "0.375rem 0.75rem",
        ...style,
      }}
    >
      <OliveChip
        color={spec.color}
        label={text}
        state={spec.chipState}
        size={size === "sm" ? 8 : 10}
        srOnlyLabel={false}
      />
      <span
        className="olive-label"
        style={{
          color: spec.textColor ?? "var(--olive-espresso)",
          fontSize: size === "sm" ? "0.625rem" : "0.6875rem",
        }}
        {...(labelFieldKey ? fieldAttr(labelFieldKey) : {})}
      >
        {text}
      </span>
    </span>
  );
}
