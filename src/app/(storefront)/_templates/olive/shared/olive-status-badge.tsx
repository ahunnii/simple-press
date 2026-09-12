import type { CSSProperties } from "react";

import type { OliveChipState } from "./olive-chip";
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
  open: { label: "Open", color: "var(--olive-sage-bright)" },
  pending: { label: "Pending", color: "var(--olive-slate)" },
  processing: { label: "Processing", color: "var(--olive-slate-deep)" },
  completed: { label: "Completed", color: "var(--olive-leaf)" },
  fulfilled: { label: "Fulfilled", color: "var(--olive-leaf)" },
  shipped: { label: "Shipped", color: "var(--olive-sage)" },
  cancelled: { label: "Cancelled", color: "var(--olive-ink-soft)" },
  refunded: { label: "Refunded", color: "var(--olive-slate)" },
  active: { label: "Active", color: "var(--olive-sage-bright)" },
  paused: { label: "Paused", color: "var(--olive-slate-deep)" },
  past_due: {
    label: "Past due",
    color: "var(--olive-error)",
    textColor: "var(--olive-error)",
  },
  "in-stock": { label: "In stock", color: "var(--olive-sage-bright)" },
  low: { label: "Low stock", color: "var(--olive-leaf)", chipState: "low" },
  "sold-out": {
    label: "Sold out",
    color: "var(--olive-ink-soft)",
    chipState: "sold-out",
  },
  "pre-order": {
    label: "Pre-order",
    color: "var(--olive-slate-deep)",
    chipState: "pre-order",
  },
  "coming-soon": {
    label: "Coming soon",
    color: "var(--olive-sage-bright)",
    chipState: "coming-soon",
  },
};

type OliveStatusBadgeProps = {
  status: OliveStatus;
  /** Override the default wording (an owner's own order status, say). */
  label?: string;
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveStatusBadge — a state, said in a word and marked with a chip.
 *
 * The chip is the template's one piece of colour language and the label is the
 * meaning; neither stands alone, so the badge survives greyscale, colour
 * blindness and a screen reader. The chip is `aria-hidden` because the word
 * beside it already carries the state.
 */
export function OliveStatusBadge({
  status,
  label,
  size = "md",
  className,
  style,
}: OliveStatusBadgeProps) {
  const spec = STATUS[status];
  const text = label ?? spec.label;

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      style={{
        backgroundColor: "var(--olive-paper)",
        border: "1px solid var(--olive-hairline)",
        borderRadius: "999px",
        padding: size === "sm" ? "0.1875rem 0.5rem" : "0.3125rem 0.6875rem",
        ...style,
      }}
    >
      <OliveChip
        color={spec.color}
        label={text}
        state={spec.chipState}
        size={size === "sm" ? 12 : 14}
        srOnlyLabel={false}
      />
      <span
        className="olive-label"
        style={{
          color: spec.textColor ?? "var(--olive-ink)",
          fontSize: size === "sm" ? "0.6875rem" : "0.75rem",
        }}
      >
        {text}
      </span>
    </span>
  );
}
