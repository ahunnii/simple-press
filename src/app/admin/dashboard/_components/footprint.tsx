import type { WidgetSize } from "~/lib/dashboard/widgets";
import { SIZE_SPANS } from "~/lib/dashboard/pack";
import { cn } from "~/lib/utils";

const CELLS = Array.from({ length: 8 }, (_, i) => ({
  col: i % 4,
  row: Math.floor(i / 4),
}));

/**
 * A tiny 4×2 grid with the cells a size occupies filled in, so owners can see
 * how much room a card takes on the full-width (desktop) dashboard.
 * Decorative: the size is always also written out in text next to it.
 */
export function Footprint({
  size,
  className,
}: {
  size: WidgetSize;
  className?: string;
}) {
  const span = SIZE_SPANS[size];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-3.5 w-7 shrink-0 grid-cols-4 grid-rows-2 gap-px",
        className,
      )}
    >
      {CELLS.map(({ col, row }) => (
        <span
          key={`${row}-${col}`}
          className={cn(
            "rounded-[1px]",
            col < span.cols && row < span.rows
              ? "bg-primary"
              : "bg-muted-foreground/20",
          )}
        />
      ))}
    </span>
  );
}
