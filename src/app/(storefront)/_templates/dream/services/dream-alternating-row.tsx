import { cn } from "~/lib/utils";

type DreamAlternatingRowProps = {
  /** Media pane order swaps to the right on desktop; text always leads on mobile. */
  reversed?: boolean;
  media: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Renders a hairline rule under the row (all but the last row in a list). */
  divider?: boolean;
};

/**
 * Shared text/image alternating row used by the services index "Lanes"
 * section and the `dream-lane` service page's story blocks (design.md
 * "Services index → Lanes" and "Service-page variants → dream-lane").
 * Local to `services/` (not the template-wide `shared/`) since only this
 * domain's pages use it.
 *
 * Text always precedes media in DOM order, so mobile naturally reads text
 * first; `reversed` only swaps the desktop grid column order.
 */
export function DreamAlternatingRow({
  reversed,
  media,
  children,
  className,
  divider,
}: DreamAlternatingRowProps) {
  return (
    <div
      className={cn(
        "grid gap-8 py-12 md:grid-cols-2 md:items-center md:gap-14 [&:first-child]:pt-0",
        divider && "border-b border-[var(--dream-line)] last:border-b-0",
        className,
      )}
    >
      <div className={cn(reversed ? "md:order-2" : "md:order-1")}>
        {children}
      </div>
      <div className={cn(reversed ? "md:order-1" : "md:order-2")}>{media}</div>
    </div>
  );
}
