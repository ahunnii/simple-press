import { cn } from "~/lib/utils";

type PinkBadgeProps = {
  children: React.ReactNode;
  /** rose (default) — new/open/featured. ink — closed/archive/sold. */
  tone?: "rose" | "ink";
  className?: string;
};

/**
 * Square corner badge, `12px`/600, white on rose (or on ink for a
 * "closed/archive" state). Design.md → Shared component inventory.
 */
export function PinkBadge({
  children,
  tone = "rose",
  className,
}: PinkBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap uppercase",
        className,
      )}
      style={{
        background: tone === "ink" ? "var(--pink-ink)" : "var(--pink-rose)",
        color: "var(--pink-on-accent)",
      }}
    >
      {children}
    </span>
  );
}
