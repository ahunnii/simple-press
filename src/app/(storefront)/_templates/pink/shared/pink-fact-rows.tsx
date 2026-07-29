export type PinkFactRow = { label: string; value: string; _id?: string };

type PinkFactRowsProps = {
  rows: PinkFactRow[];
  className?: string;
};

/**
 * Stacked `gap: 2px` label/value rows on `--pink-ink-panel`. Used inside
 * `PinkPhotoHeader`'s fact-rows slot and stat-style panels throughout the
 * dark interior pages (design.md → Shared component inventory).
 */
export function PinkFactRows({ rows, className }: PinkFactRowsProps) {
  if (rows.length === 0) return null;
  return (
    <dl className={`flex flex-col gap-[2px]${className ? ` ${className}` : ""}`}>
      {rows.map((row, i) => (
        <div
          key={row._id ?? `${row.label}-${i}`}
          className="flex items-baseline justify-between gap-6 px-5 py-3.5"
          style={{ background: "var(--pink-ink-panel)" }}
        >
          <dt className="pink-label-dark">{row.label}</dt>
          <dd
            className="pink-display text-right"
            style={{ color: "var(--pink-paper)", fontSize: "15px", fontWeight: 600 }}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
