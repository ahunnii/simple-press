import { afterEach, describe, expect, it, vi } from "vitest";

import type { DashboardLayout } from "./layout-schema";

import {
  dashboardLayoutSaveSchema,
  DEFAULT_DASHBOARD_LAYOUT,
  MAX_DASHBOARD_CARDS,
  newCardId,
  parseDashboardLayout,
  splitVisible,
} from "./layout-schema";

const layout = (cards: unknown[]) => ({ version: 1, cards });

describe("DEFAULT_DASHBOARD_LAYOUT", () => {
  it("passes the strict save schema", () => {
    expect(
      dashboardLayoutSaveSchema.safeParse(DEFAULT_DASHBOARD_LAYOUT).success,
    ).toBe(true);
  });

  it("uses deterministic ids", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT.cards.map((c) => c.id)).toEqual([
      "default-net-revenue",
      "default-gross-revenue",
      "default-order-count",
      "default-avg-order-value",
      "default-recent-orders",
      "default-low-stock-list",
      "default-revenue-chart",
      "default-top-products",
    ]);
  });
});

describe("parseDashboardLayout", () => {
  it.each([
    null,
    undefined,
    "x",
    42,
    [],
    {},
    { version: 2, cards: [] },
    { version: 1 },
  ])("falls back to the default for %j", (raw) => {
    const result = parseDashboardLayout(raw);
    expect(result.usedDefault).toBe(true);
    expect(result.layout).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("returns a copy of the default, not the shared object", () => {
    const { layout: parsed } = parseDashboardLayout(null);
    parsed.cards[0]!.size = "2x1";
    expect(DEFAULT_DASHBOARD_LAYOUT.cards[0]!.size).toBe("1x1");
  });

  it("keeps an intentionally empty layout", () => {
    expect(parseDashboardLayout(layout([]))).toEqual({
      layout: { version: 1, cards: [] },
      usedDefault: false,
    });
  });

  it("round-trips a valid layout", () => {
    const stored: DashboardLayout = {
      version: 1,
      cards: [
        { id: "a", widget: "mrr", size: "2x1" },
        {
          id: "b",
          widget: "net-revenue",
          size: "1x1",
          range: "week",
          compare: false,
        },
        { id: "c", widget: "net-revenue", size: "2x1", range: "all" },
      ],
    };
    expect(parseDashboardLayout(stored)).toEqual({
      layout: stored,
      usedDefault: false,
    });
  });

  it("drops malformed cards, unknown widgets and duplicate ids", () => {
    const { layout: parsed, usedDefault } = parseDashboardLayout(
      layout([
        null,
        "card",
        { widget: "mrr", size: "1x1" }, // no id
        { id: "", widget: "mrr", size: "1x1" },
        { id: "has space", widget: "mrr", size: "1x1" },
        { id: "x".repeat(65), widget: "mrr", size: "1x1" },
        { id: "a", widget: "retired-widget", size: "1x1" },
        { id: "b", widget: "mrr", size: "1x1" },
        { id: "b", widget: "refunds", size: "1x1" },
      ]),
    );
    expect(usedDefault).toBe(false);
    expect(parsed.cards).toEqual([{ id: "b", widget: "mrr", size: "1x1" }]);
  });

  it("repairs bad sizes and ranges", () => {
    const { layout: parsed } = parseDashboardLayout(
      layout([
        { id: "a", widget: "recent-orders", size: "1x1", range: "7d" },
        { id: "b", widget: "revenue-chart", size: "2x2", range: "today" },
        { id: "c", widget: "net-revenue", size: "huge", range: "fortnight" },
        { id: "d", widget: "net-revenue", size: "1x1", compare: "yes" },
      ]),
    );
    expect(parsed.cards).toEqual([
      { id: "a", widget: "recent-orders", size: "2x2" },
      { id: "b", widget: "revenue-chart", size: "2x2", range: "30d" },
      { id: "c", widget: "net-revenue", size: "1x1", range: "30d" },
      { id: "d", widget: "net-revenue", size: "1x1" },
    ]);
  });

  it("caps at the card limit", () => {
    const cards = Array.from({ length: 30 }, (_, i) => ({
      id: `c${i}`,
      widget: "order-count",
      size: "1x1",
    }));
    const { layout: parsed } = parseDashboardLayout(layout(cards));
    expect(parsed.cards).toHaveLength(MAX_DASHBOARD_CARDS);
    expect(parsed.cards.at(-1)?.id).toBe("c23");
  });
});

describe("dashboardLayoutSaveSchema", () => {
  const ok = (cards: unknown[]) =>
    dashboardLayoutSaveSchema.safeParse(layout(cards)).success;

  it("accepts duplicate widgets with distinct ids", () => {
    expect(
      ok([
        { id: "a", widget: "net-revenue", size: "1x1", range: "today" },
        {
          id: "b",
          widget: "net-revenue",
          size: "2x1",
          range: "year",
          compare: false,
        },
      ]),
    ).toBe(true);
    expect(ok([])).toBe(true);
  });

  it.each([
    ["unknown widget", [{ id: "a", widget: "nope", size: "1x1" }]],
    ["size not allowed", [{ id: "a", widget: "mrr", size: "2x2" }]],
    [
      "range not allowed",
      [{ id: "a", widget: "revenue-chart", size: "4x2", range: "today" }],
    ],
    [
      "range on range-less widget",
      [{ id: "a", widget: "recent-orders", size: "2x2", range: "7d" }],
    ],
    [
      "unknown range",
      [{ id: "a", widget: "refunds", size: "1x1", range: "14d" }],
    ],
    [
      "duplicate ids",
      [
        { id: "a", widget: "mrr", size: "1x1" },
        { id: "a", widget: "refunds", size: "1x1" },
      ],
    ],
    ["id too long", [{ id: "x".repeat(65), widget: "mrr", size: "1x1" }]],
    ["id with spaces", [{ id: "a b", widget: "mrr", size: "1x1" }]],
    ["extra key", [{ id: "a", widget: "mrr", size: "1x1", color: "red" }]],
    [
      "too many cards",
      Array.from({ length: 25 }, (_, i) => ({
        id: `c${i}`,
        widget: "mrr",
        size: "1x1",
      })),
    ],
  ])("rejects %s", (_name, cards) => {
    expect(ok(cards)).toBe(false);
  });

  it("rejects a wrong version or extra top-level keys", () => {
    expect(
      dashboardLayoutSaveSchema.safeParse({ version: 2, cards: [] }).success,
    ).toBe(false);
    expect(
      dashboardLayoutSaveSchema.safeParse({ version: 1, cards: [], extra: 1 })
        .success,
    ).toBe(false);
  });
});

describe("splitVisible", () => {
  it("separates cards whose widget is unavailable, keeping order", () => {
    const { visible, hidden } = splitVisible(
      DEFAULT_DASHBOARD_LAYOUT,
      new Set(["net-revenue", "recent-orders", "top-products"]),
    );
    expect(visible.map((c) => c.widget)).toEqual([
      "net-revenue",
      "recent-orders",
      "top-products",
    ]);
    expect(hidden).toHaveLength(DEFAULT_DASHBOARD_LAYOUT.cards.length - 3);
  });
});

describe("newCardId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("produces unique ids the save schema accepts", () => {
    const a = newCardId();
    const b = newCardId();
    expect(a).not.toBe(b);
    expect(
      dashboardLayoutSaveSchema.safeParse(
        layout([
          { id: a, widget: "mrr", size: "1x1" },
          { id: b, widget: "mrr", size: "1x1" },
        ]),
      ).success,
    ).toBe(true);
  });

  it("falls back when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {});
    const id = newCardId();
    expect(id).toMatch(/^c-[a-z0-9]+-[a-z0-9]+$/);
    expect(id.length).toBeLessThanOrEqual(64);
  });
});
