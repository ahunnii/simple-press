import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import { packDense } from "~/lib/dashboard/pack";
import { cn } from "~/lib/utils";

import { GHOST_GRID_VARIANTS } from "./grid-classes";

/**
 * Edit mode: a dashed outline for every grid cell, drawn BEHIND the cards so
 * the empty slots (and one spare row) show where cards can go.
 *
 * Rendered as siblings of the card grid in the same CSS grid area
 * (`col-start-1 row-start-1`), so the stack is as tall as the taller of the
 * two — the spare row stays visible even when the card grid ends earlier.
 * Row counts come from `packDense`, which mirrors the browser's
 * `grid-auto-flow: row dense` placement.
 */
export function GhostCells({
  cards,
  className,
}: {
  cards: ReadonlyArray<Pick<DashboardCard, "size">>;
  className?: string;
}) {
  return (
    <>
      {GHOST_GRID_VARIANTS.map(({ columns, className: variantClassName }) => {
        const rows = packDense(cards, columns).rows + 1;
        return (
          <div
            key={columns}
            aria-hidden="true"
            className={cn(
              "pointer-events-none col-start-1 row-start-1",
              variantClassName,
              className,
            )}
          >
            {Array.from({ length: rows * columns }, (_, i) => (
              <div
                key={i}
                className="border-foreground/15 bg-background/30 rounded-xl border border-dashed"
              />
            ))}
          </div>
        );
      })}
    </>
  );
}
