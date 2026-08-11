import { cn } from "~/lib/utils";

/**
 * Section heading — terracotta-red omnes-pro 700 at the design.md section
 * scale (3.0625rem/3.375 desktop → 2.25rem below the 1025px desktop
 * breakpoint). The `dark` variant swaps to charcoal, used by the headings the
 * source renders near-black ("HANDY RELOCATIONS MOVERS IN ACTION", the
 * credentials band).
 *
 * Red on white is 3.4:1 — large text only, which this always is (min 2.25rem
 * ≥ 24px bold). Never reuse this class for body copy.
 */
export function RelocationSectionHeading({
  children,
  as: As = "h2",
  dark = false,
  className,
  fieldAttrs,
  id,
}: {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  dark?: boolean;
  className?: string;
  /** Spread `fieldAttr(...)` here when the heading renders exactly one field. */
  fieldAttrs?: Record<string, string>;
  id?: string;
}) {
  return (
    <As
      id={id}
      {...fieldAttrs}
      className={cn(
        "[font-family:var(--font-relocation-display)] text-[2.25rem] leading-[1.1] font-bold tracking-[-0.01em] text-balance min-[1025px]:text-[3.0625rem] min-[1025px]:leading-[3.375rem]",
        dark
          ? "text-[var(--relocation-charcoal)]"
          : "text-[var(--relocation-red)]",
        className,
      )}
    >
      {children}
    </As>
  );
}
