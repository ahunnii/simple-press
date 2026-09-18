import { cn } from "~/lib/utils";

/**
 * Order/subscription status → tinted pill, umsc palette. Shared by Orders,
 * Order Detail, and Subscriptions. Every pairing keeps text on the constant
 * form-state tokens (`--umsc-error`/`--umsc-success`) or ink/gold-ink/muted —
 * never gold as text (design.md: "gold never text on light").
 */
const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  open: {
    background: "color-mix(in srgb, var(--umsc-gold) 20%, transparent)",
    color: "var(--umsc-gold-ink)",
  },
  active: {
    background: "color-mix(in srgb, var(--umsc-gold) 20%, transparent)",
    color: "var(--umsc-gold-ink)",
  },
  pending: {
    background: "color-mix(in srgb, var(--umsc-gold) 14%, transparent)",
    color: "var(--umsc-gold-ink)",
  },
  incomplete: {
    background: "color-mix(in srgb, var(--umsc-gold) 14%, transparent)",
    color: "var(--umsc-gold-ink)",
  },
  completed: {
    background: "color-mix(in srgb, var(--umsc-ink) 8%, transparent)",
    color: "var(--umsc-ink)",
  },
  cancelled: {
    background: "color-mix(in srgb, var(--umsc-muted) 16%, transparent)",
    color: "var(--umsc-muted)",
  },
  refunded: {
    background: "color-mix(in srgb, var(--umsc-muted) 16%, transparent)",
    color: "var(--umsc-muted)",
  },
  paused: {
    background: "color-mix(in srgb, var(--umsc-muted) 16%, transparent)",
    color: "var(--umsc-muted)",
  },
  past_due: {
    background: "color-mix(in srgb, var(--umsc-error) 14%, transparent)",
    color: "var(--umsc-error)",
  },
};

const DEFAULT_STYLE = {
  background: "color-mix(in srgb, var(--umsc-muted) 12%, transparent)",
  color: "var(--umsc-muted)",
};

function defaultLabel(status: string): string {
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

type Props = {
  status: string;
  /** Override the auto-formatted label (e.g. `SUBSCRIPTION_STATUS_LABELS`). */
  label?: string;
  className?: string;
};

export function UmscOrderStatusBadge({ status, label, className }: Props) {
  const style = STATUS_STYLE[status] ?? DEFAULT_STYLE;
  return (
    <span
      className={cn(
        "umsc-tabular umsc-sans inline-flex items-center rounded-[var(--radius)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em]",
        className,
      )}
      style={style}
    >
      {label ?? defaultLabel(status)}
    </span>
  );
}
