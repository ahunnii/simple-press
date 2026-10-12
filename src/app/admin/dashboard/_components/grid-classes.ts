import type { WidgetSize } from "~/lib/dashboard/widgets";

/**
 * Grid footprint per widget size. Literal strings only — Tailwind v4 scans
 * source text, so these can't be built from fragments.
 *
 * Columns: 1 on mobile, 2 from md, 4 from lg. A "4x2" therefore spans the full
 * row at every breakpoint from md up.
 */
export const WIDGET_SIZE_CLASSES: Record<WidgetSize, string> = {
  "1x1": "",
  "2x1": "md:col-span-2",
  "2x2": "md:col-span-2 row-span-2",
  "4x2": "md:col-span-2 lg:col-span-4 row-span-2",
};

/**
 * The dashboard grid. Fixed row height (`auto-rows-[11rem]`) is what makes the
 * sizes mean something: a 1x1 is one row, a "x2" card is two rows plus the gap
 * (25.5rem).
 */
export const DASHBOARD_GRID_CLASSES =
  "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 grid-flow-row-dense auto-rows-[11rem]";

/**
 * Edit-mode ghost grid: the same gap and row height as the card grid, one
 * variant per breakpoint (columns 1 / 2 / 4), switched in CSS so there's no JS
 * breakpoint. Keep in step with DASHBOARD_GRID_CLASSES.
 */
export const GHOST_GRID_VARIANTS = [
  {
    columns: 1,
    className: "grid gap-6 auto-rows-[11rem] grid-cols-1 md:hidden",
  },
  {
    columns: 2,
    className:
      "hidden gap-6 auto-rows-[11rem] md:grid md:grid-cols-2 lg:hidden",
  },
  {
    columns: 4,
    className: "hidden gap-6 auto-rows-[11rem] lg:grid lg:grid-cols-4",
  },
] as const;
