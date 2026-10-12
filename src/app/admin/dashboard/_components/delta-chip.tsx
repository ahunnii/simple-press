import type { DeltaPolarity } from "~/lib/dashboard/widgets";
import { cn } from "~/lib/utils";

/**
 * Period-over-period delta chip: coloured arrow + percent change, or a muted
 * em dash when the prior period is zero (no baseline) or the metric is
 * unchanged.
 *
 * `polarity` says which direction is good: "up-good" (revenue) paints a rise
 * green; "down-good" (refunds, cancellations) paints a rise red.
 */
export function DeltaChip({
  current,
  previous,
  label,
  polarity = "up-good",
  className,
}: {
  current: number;
  previous: number;
  /** Full comparison label, e.g. "vs last week". */
  label: string;
  polarity?: DeltaPolarity;
  className?: string;
}) {
  const pct =
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  if (pct === null || pct === 0) {
    return (
      <p className={cn("text-muted-foreground text-xs", className)}>
        &mdash; {label}
      </p>
    );
  }

  const up = pct > 0;
  const good = polarity === "up-good" ? up : !up;
  return (
    <p
      className={cn(
        "text-xs font-medium",
        good
          ? "text-green-600 dark:text-green-500"
          : "text-red-600 dark:text-red-500",
        className,
      )}
    >
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Up" : "Down"}</span> {Math.abs(pct)}%{" "}
      {label}
    </p>
  );
}
