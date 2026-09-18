import { Sparkle } from "lucide-react";

/**
 * "Most loved" ribbon for a `ServiceItem` with `isSignature: true` — the
 * only place a signature item is called out (design.md craft floor:
 * lucide icons at 1.5px stroke, no emoji). Absolutely positioned by the
 * caller over a photo or card corner.
 */
export function DreamMostLovedBadge() {
  return (
    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--dream-ink)] px-3 py-1 text-[13px] font-medium text-[var(--dream-gold-soft)]">
      <Sparkle aria-hidden="true" strokeWidth={1.5} className="h-3 w-3" />
      Most loved
    </span>
  );
}
