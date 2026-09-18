/**
 * Order/subscription status → tinted pill, dream palette. Shared by Orders,
 * Order Detail, and Subscriptions. Deliberately avoids `--dream-rose` as
 * small-pill text (design.md: rose passes AA only at ≥18px) — every style
 * below pairs a tinted background with ink/gold-ink/soft/error text, all of
 * which are legible at any size per the palette table.
 */
const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  // In progress / awaiting action — warm gold.
  open: {
    background: "color-mix(in srgb, var(--dream-gold) 20%, transparent)",
    color: "var(--dream-gold-ink)",
  },
  active: {
    background: "color-mix(in srgb, var(--dream-gold) 20%, transparent)",
    color: "var(--dream-gold-ink)",
  },
  pending: {
    background: "color-mix(in srgb, var(--dream-gold) 14%, transparent)",
    color: "var(--dream-gold-ink)",
  },
  incomplete: {
    background: "color-mix(in srgb, var(--dream-gold) 14%, transparent)",
    color: "var(--dream-gold-ink)",
  },
  // Settled / done — quiet ink.
  completed: {
    background: "color-mix(in srgb, var(--dream-ink) 8%, transparent)",
    color: "var(--dream-ink)",
  },
  // No longer active, but not urgent — muted soft.
  cancelled: {
    background: "color-mix(in srgb, var(--dream-soft) 16%, transparent)",
    color: "var(--dream-soft)",
  },
  refunded: {
    background: "color-mix(in srgb, var(--dream-soft) 16%, transparent)",
    color: "var(--dream-soft)",
  },
  paused: {
    background: "color-mix(in srgb, var(--dream-soft) 16%, transparent)",
    color: "var(--dream-soft)",
  },
  // Needs attention — error tone, still on the constant form-state token.
  past_due: {
    background: "color-mix(in srgb, var(--dream-error) 14%, transparent)",
    color: "var(--dream-error)",
  },
};

const DEFAULT_STYLE = {
  background: "color-mix(in srgb, var(--dream-soft) 12%, transparent)",
  color: "var(--dream-soft)",
};

export function dreamStatusStyle(status: string): {
  background: string;
  color: string;
} {
  return STATUS_STYLE[status] ?? DEFAULT_STYLE;
}

function defaultStatusLabel(status: string): string {
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

type Props = {
  status: string;
  /** Override the auto-formatted label (e.g. `SUBSCRIPTION_STATUS_LABELS`). */
  label?: string;
  className?: string;
};

/** Tinted status pill — keeps semantic meaning legible without leaning on rose. */
export function DreamOrderStatusBadge({ status, label, className }: Props) {
  const style = dreamStatusStyle(status);
  return (
    <span
      className={
        "inline-flex items-center rounded-[var(--dream-radius-pill)] px-2.5 py-1 text-[12px] font-semibold tabular-nums " +
        (className ?? "")
      }
      style={style}
    >
      {label ?? defaultStatusLabel(status)}
    </span>
  );
}
