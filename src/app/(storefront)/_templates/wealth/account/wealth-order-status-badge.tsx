/** Order/subscription status → badge colors, wealth palette. Shared by Orders, Order Detail, and Subscriptions. */
export function statusStyles(status: string): { background: string; color: string } {
  switch (status) {
    case "open":
    case "active":
      return {
        background: "color-mix(in srgb, var(--wealth-primary) 14%, transparent)",
        color: "var(--wealth-primary)",
      };
    case "completed":
      return {
        background: "color-mix(in srgb, var(--wealth-accent) 30%, transparent)",
        color: "var(--wealth-btn-ink)",
      };
    case "cancelled":
      return {
        background: "var(--wealth-surface)",
        color: "var(--wealth-muted)",
      };
    case "refunded":
    case "paused":
      return {
        background: "color-mix(in srgb, var(--wealth-eyebrow) 16%, transparent)",
        color: "var(--wealth-eyebrow)",
      };
    case "past_due":
      return {
        background: "color-mix(in srgb, var(--wealth-error) 14%, transparent)",
        color: "var(--wealth-error)",
      };
    default:
      return {
        background: "var(--wealth-surface)",
        color: "var(--wealth-ink)",
      };
  }
}
