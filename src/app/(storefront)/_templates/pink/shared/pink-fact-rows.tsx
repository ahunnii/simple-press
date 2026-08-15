import { cn } from "~/lib/utils";

export type PinkFactRow = { label: string; value: string; _id?: string };

type PinkFactRowsProps = {
  rows: PinkFactRow[];
  /**
   * `dark` (default) is the original treatment, still correct inside
   * `PinkPhotoHeader` where the rows sit over a photograph. `paper` is for the
   * light surfaces — `PinkPageHeader` became a light band on 2026-07-31 and
   * dark rows inside it read as a stray black slab.
   */
  surface?: "dark" | "paper";
  className?: string;
};

/**
 * Stacked `gap: 2px` label/value rows (design.md → Shared component
 * inventory). Dark rows sit on `--pink-ink-panel`; paper rows sit on the pink
 * wash so they read as a grouped block on a white page.
 */
export function PinkFactRows({
  rows,
  surface = "dark",
  className,
}: PinkFactRowsProps) {
  if (rows.length === 0) return null;
  const dark = surface === "dark";
  return (
    <dl className={cn("flex flex-col gap-[2px]", className)}>
      {rows.map((row, i) => (
        <div
          key={row._id ?? `${row.label}-${i}`}
          className="flex items-baseline justify-between gap-6 px-5 py-3.5"
          style={{
            background: dark ? "var(--pink-ink-panel)" : "var(--pink-panel)",
          }}
        >
          <dt className={dark ? "pink-label-dark" : "pink-label"}>
            {row.label}
          </dt>
          <dd
            className="pink-display text-right"
            style={{
              color: dark ? "var(--pink-paper)" : "var(--pink-ink)",
              // rem, not px, so a raised browser font size scales it (WCAG 1.4.4).
              fontSize: "0.9375rem",
              fontWeight: 600,
            }}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
