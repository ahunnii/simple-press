import { cn } from "~/lib/utils";

type PinkHairlineGridProps = {
  children: React.ReactNode;
  /** Tailwind grid-cols-* utility classes (responsive). Default: 1 col → 3 at md. */
  columnsClassName?: string;
  /** paper (default) bleeds --pink-line through a 1px gap; dark sits on --pink-ink-panel with a 2px gap. */
  tone?: "paper" | "dark";
  className?: string;
  sectionAttrs?: Record<string, string>;
};

/**
 * The signature "hairline grid": cells bleed the scope's line color through
 * a 1px (paper) or 2px (dark) gap instead of drawing borders. Used by promise
 * cards, spec tables, provided/bring pairs, event cards, booking steps,
 * filter rows — see design.md → Shared component inventory.
 */
export function PinkHairlineGrid({
  children,
  columnsClassName = "grid-cols-1 md:grid-cols-3",
  tone = "paper",
  className,
  sectionAttrs,
}: PinkHairlineGridProps) {
  return (
    <div
      className={cn(
        "grid",
        columnsClassName,
        tone === "dark" ? "pink-hairline-grid-dark" : "pink-hairline-grid",
        className,
      )}
      {...sectionAttrs}
    >
      {children}
    </div>
  );
}
