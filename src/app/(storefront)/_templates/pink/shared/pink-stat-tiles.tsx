export type PinkStat = { value: string; label: string; _id?: string };

type PinkStatTilesProps = {
  stats: PinkStat[];
  /** 2-up (default) or 4-up grid. */
  columns?: 2 | 4;
  className?: string;
};

/**
 * Numeral + label tiles on `--pink-ink-panel`, `gap: 2px`. Used by
 * testimonials/services page headers and product/homepage stat rows
 * (design.md → Shared component inventory).
 *
 * Numeral scale per design.md → Typography: `clamp(26px, 2.4vw, 33px)` / 700
 * / `-.02em to -.03em` / line-height 1.
 */
export function PinkStatTiles({ stats, columns = 2, className }: PinkStatTilesProps) {
  if (stats.length === 0) return null;
  return (
    <div
      className={`grid gap-[2px] ${columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}${className ? ` ${className}` : ""}`}
    >
      {stats.map((stat, i) => (
        <div
          key={stat._id ?? `${stat.label}-${i}`}
          className="flex flex-col gap-1.5 px-5 py-4"
          style={{ background: "var(--pink-ink-panel)" }}
        >
          <span
            className="pink-display"
            style={{
              fontSize: "clamp(26px, 2.4vw, 33px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1,
              color: "var(--pink-paper)",
            }}
          >
            {stat.value}
          </span>
          <span className="pink-label-dark">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
