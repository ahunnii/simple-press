import { describe, expect, it } from "vitest";

import type { WidgetSize } from "./widgets";

import { packDense } from "./pack";

const cards = (...sizes: WidgetSize[]) => sizes.map((size) => ({ size }));

describe("packDense — 4 columns", () => {
  it("fills beside a tall card before starting a new row", () => {
    const result = packDense(
      cards("2x2", "1x1", "1x1", "1x1", "1x1", "4x2"),
      4,
    );
    expect(result.positions).toEqual([
      { col: 0, row: 0, cols: 2, rows: 2 },
      { col: 2, row: 0, cols: 1, rows: 1 },
      { col: 3, row: 0, cols: 1, rows: 1 },
      { col: 2, row: 1, cols: 1, rows: 1 },
      { col: 3, row: 1, cols: 1, rows: 1 },
      { col: 0, row: 2, cols: 4, rows: 2 },
    ]);
    expect(result.rows).toBe(4);
  });

  it("backfills earlier holes (dense), like grid-auto-flow: row dense", () => {
    const result = packDense(cards("1x1", "4x2", "1x1", "2x1"), 4);
    expect(result.positions).toEqual([
      { col: 0, row: 0, cols: 1, rows: 1 },
      { col: 0, row: 1, cols: 4, rows: 2 },
      { col: 1, row: 0, cols: 1, rows: 1 },
      { col: 2, row: 0, cols: 2, rows: 1 },
    ]);
    expect(result.rows).toBe(3);
  });

  it("returns no rows for no cards", () => {
    expect(packDense([], 4)).toEqual({ positions: [], rows: 0 });
  });
});

describe("packDense — 2 columns", () => {
  it("clamps 4-wide cards to the grid and backfills a single hole", () => {
    const result = packDense(cards("4x2", "1x1", "2x1", "1x1"), 2);
    expect(result.positions).toEqual([
      { col: 0, row: 0, cols: 2, rows: 2 },
      { col: 0, row: 2, cols: 1, rows: 1 },
      { col: 0, row: 3, cols: 2, rows: 1 },
      { col: 1, row: 2, cols: 1, rows: 1 },
    ]);
    expect(result.rows).toBe(4);
  });
});

describe("packDense — 1 column", () => {
  it("stacks every card, keeping row spans", () => {
    const result = packDense(cards("1x1", "2x2", "2x1"), 1);
    expect(result.positions).toEqual([
      { col: 0, row: 0, cols: 1, rows: 1 },
      { col: 0, row: 1, cols: 1, rows: 2 },
      { col: 0, row: 3, cols: 1, rows: 1 },
    ]);
    expect(result.rows).toBe(4);
  });

  it("treats a non-positive column count as one column", () => {
    expect(packDense(cards("2x1"), 0).positions).toEqual([
      { col: 0, row: 0, cols: 1, rows: 1 },
    ]);
  });
});
