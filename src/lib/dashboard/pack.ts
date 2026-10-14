/**
 * A first-fit packer that mirrors CSS `grid-auto-flow: row dense`.
 *
 * Client-safe. The live grid lets the browser place cards; this exists so
 * edit mode can draw ghost cells for the empty slots and so the placement can
 * be unit-tested. It follows the CSS auto-placement algorithm for items with
 * no explicit position: in dense mode each item searches again from the first
 * row and column, taking the first slot where its whole span is free.
 */

import type { WidgetSize } from "~/lib/dashboard/widgets";

export const SIZE_SPANS: Record<WidgetSize, { cols: number; rows: number }> = {
  "1x1": { cols: 1, rows: 1 },
  "2x1": { cols: 2, rows: 1 },
  "2x2": { cols: 2, rows: 2 },
  "4x2": { cols: 4, rows: 2 },
};

export type PackedPosition = {
  /** 0-based column. */
  col: number;
  /** 0-based row. */
  row: number;
  /** Column span after clamping to the grid width. */
  cols: number;
  rows: number;
};

/**
 * Place cards in order on a `columns`-wide grid. Column spans wider than the
 * grid are clamped (as CSS does when `span N` exceeds the explicit columns);
 * row spans are kept. `rows` is the total row count used.
 */
export function packDense(
  cards: ReadonlyArray<{ size: WidgetSize }>,
  columns: number,
): { positions: PackedPosition[]; rows: number } {
  const width = Math.max(1, Math.floor(columns));
  const occupied: boolean[][] = [];
  const isFree = (row: number, col: number) => !occupied[row]?.[col];
  const fits = (row: number, col: number, cols: number, rows: number) => {
    if (col + cols > width) return false;
    for (let r = row; r < row + rows; r++) {
      for (let c = col; c < col + cols; c++) {
        if (!isFree(r, c)) return false;
      }
    }
    return true;
  };

  const positions: PackedPosition[] = [];
  let totalRows = 0;

  for (const card of cards) {
    const span = SIZE_SPANS[card.size];
    const cols = Math.min(span.cols, width);
    const rows = span.rows;

    let placed: PackedPosition | null = null;
    for (let row = 0; placed === null; row++) {
      for (let col = 0; col + cols <= width; col++) {
        if (fits(row, col, cols, rows)) {
          placed = { col, row, cols, rows };
          break;
        }
      }
    }

    for (let r = placed.row; r < placed.row + rows; r++) {
      const line = (occupied[r] ??= []);
      for (let c = placed.col; c < placed.col + cols; c++) line[c] = true;
    }
    totalRows = Math.max(totalRows, placed.row + rows);
    positions.push(placed);
  }

  return { positions, rows: totalRows };
}
