import { cn } from "~/lib/utils";

type Props = {
  /** Optional caption rendered under the mark. */
  label?: string;
  /** CSS `aspect-ratio`, e.g. `"1 / 1"`. Omit when the parent sizes it. */
  aspect?: string;
  /** Render on the black surface instead of cream (hero/custom bands). */
  onBlack?: boolean;
  className?: string;
};

/**
 * Designed stand-in for every empty image slot in umsc — a cream tile
 * carrying the round UM mark, so a fresh store never shows a bare rectangle.
 * `onBlack` swaps to a faint gold-glow treatment for dark surfaces (hero
 * fallback, custom band). Server-safe. Design authority: docs/templates/umsc/design.md.
 */
export function UmscImageFallback({
  label,
  aspect,
  onBlack = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-3 border",
        onBlack
          ? "border-[var(--umsc-line-gold)] bg-[var(--umsc-black)]"
          : "border-[var(--umsc-line)] bg-[var(--umsc-cream)]",
        className,
      )}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          "umsc-serif flex size-12 items-center justify-center rounded-full border text-[15px] tracking-[0.04em]",
          onBlack
            ? "border-[var(--umsc-line-gold)] text-[var(--umsc-gold-soft)]"
            : "border-[var(--umsc-line)] text-[var(--umsc-gold-ink)]",
        )}
        style={
          onBlack
            ? {
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--umsc-gold) 16%, transparent) 0%, transparent 72%)",
              }
            : undefined
        }
      >
        UM
      </span>
      {label && (
        <span
          className={cn(
            "umsc-sans max-w-[24ch] px-4 text-center text-[12px] tracking-[0.04em]",
            onBlack
              ? "text-[var(--umsc-cream-on-black)]"
              : "text-[var(--umsc-muted)]",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * True when `src` is a real, owner-supplied image — not empty and not the
 * platform's generic `/placeholder.svg`. Callers use this to decide between
 * rendering `<Image>` and `<UmscImageFallback>`.
 */
export function hasCustomImage(src: string | undefined | null): boolean {
  return !!src && src.trim().length > 0 && src !== "/placeholder.svg";
}
