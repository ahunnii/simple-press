import { cn } from "~/lib/utils";

/**
 * Order-status pill styling for the two bamboo account order screens.
 *
 * Token-only, and every pairing clears WCAG AA on its own surface:
 * cream-on-pine 8.3:1, pine-on-sage 6.3:1, pine-on-sage-deep ~5.5:1,
 * cream-on-terracotta-deep ~5.5:1, ink-soft-on-paper ~7:1 (see design.md's
 * palette table). Colour is never the only signal — the status word itself is
 * always rendered next to it.
 */
const STATUS_SURFACES: Record<string, string> = {
  open: "bg-[var(--bamboo-sage)] text-[var(--bamboo-pine)]",
  completed: "bg-[var(--bamboo-pine)] text-[var(--bamboo-cream)]",
  cancelled: "bg-[var(--bamboo-terracotta-deep)] text-[var(--bamboo-cream)]",
  refunded:
    "border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-paper)] text-[var(--bamboo-ink-soft)]",
};

/** Everything else (pending, on-hold, …) reads as "in progress". */
const STATUS_FALLBACK =
  "bg-[var(--bamboo-sage-deep)] text-[var(--bamboo-pine)]";

export function bambooStatusPillClass(status: string) {
  return cn(
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize",
    STATUS_SURFACES[status] ?? STATUS_FALLBACK,
  );
}
