/**
 * Status-badge palette for bamboo's account pages (orders, order detail,
 * subscriptions). Tokens only — never stock Tailwind hues, which read as
 * off-brand blue/yellow against the forest/gold/cream system.
 *
 * Five tones, each measured ≥ WCAG AA 4.5:1 for the badge's text-xs label on
 * a cream card (2026-09-25: progress 11.35, success 10.02, attention 9.63,
 * danger 5.89, neutral 6.63):
 * - progress  — in flight (open order): forest tint + hairline ring
 * - success   — done / live (completed order, active subscription): solid forest
 * - attention — waiting on something (pending, paused): gold-soft
 * - danger    — needs action or failed (cancelled order, past-due): destructive tint
 * - neutral   — closed out quietly (refunded, cancelled/incomplete subscription)
 */
const TONES = {
  progress:
    "bg-[var(--bam-forest)]/10 text-[var(--bam-forest-deep)] ring-1 ring-inset ring-[var(--bam-forest)]/25",
  success: "bg-[var(--bam-forest)] text-[var(--bam-cream)]",
  attention: "bg-[var(--bam-gold-soft)] text-[var(--bam-forest-deep)]",
  // Plain `text-destructive` on its own 10% tint measures 4.16:1 — mixed
  // 15% toward black it's 5.89:1 and still reads as the same red.
  danger:
    "bg-destructive/10 text-[color-mix(in_oklab,var(--destructive)_85%,black)]",
  neutral: "bg-[var(--bam-cream-deep)] text-muted-foreground",
} as const;

export function bambooOrderStatusClass(status: string) {
  switch (status) {
    case "open":
      return TONES.progress;
    case "completed":
      return TONES.success;
    case "cancelled":
      return TONES.danger;
    case "refunded":
      return TONES.neutral;
    default:
      return TONES.attention;
  }
}

export function bambooSubscriptionStatusClass(status: string) {
  switch (status) {
    case "active":
      return TONES.success;
    case "past_due":
      return TONES.danger;
    case "cancelled":
    case "incomplete":
      return TONES.neutral;
    default:
      return TONES.attention;
  }
}
