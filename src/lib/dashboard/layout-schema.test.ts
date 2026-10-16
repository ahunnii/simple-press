import { afterEach, describe, expect, it, vi } from "vitest";

import type { DashboardLayout } from "./layout-schema";
import type { DashboardFeatureKey } from "./widgets";
import { BUSINESS_TYPE_IDS } from "~/lib/admin/setup-plan";

import {
  dashboardLayoutSaveSchema,
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_LAYOUTS_BY_TYPE,
  fillDefaultStatRow,
  getDefaultLayout,
  isCardVisible,
  MAX_DASHBOARD_CARDS,
  newCardId,
  parseDashboardLayout,
  splitVisible,
} from "./layout-schema";
import { availableWidgetIds, getWidget } from "./widgets";

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

describe("trend chart cards", () => {
  const trend = (extra: Record<string, unknown> = {}) => ({
    id: "t",
    widget: "trend-chart",
    size: "4x2",
    ...extra,
  });
  const saveOk = (cards: unknown[]) =>
    dashboardLayoutSaveSchema.safeParse(layout(cards)).success;
  const available = (...on: DashboardFeatureKey[]) =>
    availableWidgetIds({
      isEnabled: (k) => on.includes(k),
      umamiConfigured: false,
    });

  it("strict save: metric is required, plottable, and forbidden elsewhere", () => {
    expect(saveOk([trend({ metric: "donations-total" })])).toBe(true);
    expect(saveOk([trend()])).toBe(false);
    expect(saveOk([trend({ metric: "mrr" })])).toBe(false);
    expect(saveOk([trend({ metric: "conversion-rate" })])).toBe(false);
    expect(saveOk([trend({ metric: "revenue-chart" })])).toBe(false);
    expect(saveOk([trend({ metric: "trend-chart" })])).toBe(false);
    expect(saveOk([trend({ metric: "not-a-widget" })])).toBe(false);
    expect(
      saveOk([
        { id: "a", widget: "net-revenue", size: "1x1", metric: "visitors" },
      ]),
    ).toBe(false);
    expect(saveOk([trend({ metric: "visitors", size: "2x1" })])).toBe(false);
    expect(saveOk([trend({ metric: "visitors", range: "today" })])).toBe(false);
  });

  it("lenient parse keeps a valid metric, even one that is unavailable now", () => {
    const { layout: parsed } = parseDashboardLayout(
      layout([trend({ metric: "visitors", range: "7d", compare: false })]),
      { availableIds: available("donations") },
    );
    expect(parsed.cards).toEqual([
      {
        id: "t",
        widget: "trend-chart",
        size: "4x2",
        range: "7d",
        compare: false,
        metric: "visitors",
      },
    ]);
  });

  it("repairs a missing or invalid metric to the first available plottable one", () => {
    const { layout: parsed } = parseDashboardLayout(
      layout([
        trend({ id: "a" }),
        trend({ id: "b", metric: "mrr" }),
        trend({ id: "c", metric: 42 }),
        trend({ id: "d", metric: "trend-chart" }),
      ]),
      { availableIds: available("donations", "forms") },
    );
    expect(parsed.cards.map((c) => c.metric)).toEqual([
      "donations-total",
      "donations-total",
      "donations-total",
      "donations-total",
    ]);
    const forms = parseDashboardLayout(layout([trend()]), {
      availableIds: available("forms", "quoteCalculator"),
    });
    expect(forms.layout.cards[0]?.metric).toBe("form-submissions");
  });

  it("drops a trend card with a bad metric when nothing is plottable", () => {
    const { layout: parsed } = parseDashboardLayout(
      layout([
        trend({ id: "a" }),
        { id: "b", widget: "mrr", size: "1x1" },
        trend({ id: "c", metric: "donations-total" }),
      ]),
      { availableIds: available("events") },
    );
    // "a" has nothing to repair to; "c" is valid so it stays (hidden later).
    expect(parsed.cards.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("without an availability set, repairs to the headline plottable metric", () => {
    const { layout: parsed } = parseDashboardLayout(layout([trend()]));
    expect(parsed.cards[0]?.metric).toBe("net-revenue");
  });

  it("strips metric from every other widget", () => {
    const { layout: parsed } = parseDashboardLayout(
      layout([
        { id: "a", widget: "net-revenue", size: "1x1", metric: "visitors" },
        { id: "b", widget: "revenue-chart", size: "4x2", metric: "visitors" },
      ]),
    );
    expect(parsed.cards).toEqual([
      { id: "a", widget: "net-revenue", size: "1x1" },
      { id: "b", widget: "revenue-chart", size: "4x2" },
    ]);
  });

  it("round-trips through the strict schema once parsed", () => {
    const { layout: parsed } = parseDashboardLayout(
      layout([trend({ metric: "avg-order-value", range: "year" })]),
    );
    expect(dashboardLayoutSaveSchema.safeParse(parsed).success).toBe(true);
  });

  it("splitVisible hides a trend card while its metric's feature is off", () => {
    const cards = [
      { id: "a", widget: "trend-chart", size: "4x2", metric: "visitors" },
      {
        id: "b",
        widget: "trend-chart",
        size: "4x2",
        metric: "donations-total",
      },
    ] as DashboardLayout["cards"];
    const donationsOnly = available("donations");
    expect(donationsOnly.has("trend-chart")).toBe(true);
    const { visible, hidden } = splitVisible(
      { version: 1, cards },
      donationsOnly,
    );
    expect(visible.map((c) => c.id)).toEqual(["b"]);
    expect(hidden.map((c) => c.id)).toEqual(["a"]);
    // Nothing plottable on: the trend-chart widget itself is unavailable.
    expect(
      splitVisible({ version: 1, cards }, available("events")).visible,
    ).toEqual([]);
  });

  it("isCardVisible needs the metric on a trend card and ignores it elsewhere", () => {
    const ids = available("donations");
    expect(
      isCardVisible({ widget: "trend-chart", metric: "donations-total" }, ids),
    ).toBe(true);
    expect(isCardVisible({ widget: "trend-chart" }, ids)).toBe(false);
    expect(isCardVisible({ widget: "donations-total" }, ids)).toBe(true);
    expect(isCardVisible({ widget: "mrr" }, ids)).toBe(false);
  });

  it("a hidden default trend chart doesn't count as a visible card when filling", () => {
    // Informational default with nothing on: the trend chart (visitors) is
    // hidden, so the empty-dashboard rule still fills a whole row of stats.
    const ids = available("donations");
    const filled = fillDefaultStatRow(getDefaultLayout("informational"), ids);
    expect(splitVisible(filled, ids).visible.map((c) => c.widget)).toEqual([
      "donations-total",
      "donations-count",
      "donors-count",
      "donation-average",
    ]);
  });

  it("does not count a trend chart toward the 4-stat row", () => {
    const ids = available("donations");
    const base = getDefaultLayout("donations");
    const filled = fillDefaultStatRow(base, ids);
    // 4 donation stats + the (visible) trend chart: the row is already full.
    expect(filled).toEqual(base);
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

const widgetsOf = (l: DashboardLayout) => l.cards.map((c) => c.widget);

describe("getDefaultLayout / per-type defaults", () => {
  it("returns today's default, exactly, for products, null and unknown types", () => {
    expect(getDefaultLayout("products")).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(getDefaultLayout(null)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(getDefaultLayout(undefined)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(getDefaultLayout("restaurant")).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(getDefaultLayout("toString")).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("donations", () => {
    expect(widgetsOf(getDefaultLayout("donations"))).toEqual([
      "donations-total",
      "donations-count",
      "donors-count",
      "donation-average",
      "email-subscribers",
      "form-submissions",
      "visitors",
      "upcoming-events",
      "trend-chart",
    ]);
  });

  it("services", () => {
    expect(widgetsOf(getDefaultLayout("services"))).toEqual([
      "form-submissions",
      "quote-requests",
      "invoices-outstanding",
      "invoices-collected",
      "upcoming-events",
      "testimonials-pending",
      "new-customers",
      "visitors",
      "trend-chart",
    ]);
  });

  it("informational", () => {
    expect(widgetsOf(getDefaultLayout("informational"))).toEqual([
      "visitors",
      "form-submissions",
      "upcoming-events",
      "testimonials-pending",
      "email-subscribers",
      "new-customers",
      "total-customers",
      "trend-chart",
    ]);
  });

  it("ends each type default with a 4x2/30d trend chart on its headline number", () => {
    const expected = {
      donations: "donations-total",
      services: "form-submissions",
      informational: "visitors",
    } as const;
    for (const [type, metric] of Object.entries(expected)) {
      const last = getDefaultLayout(type).cards.at(-1);
      expect(last, type).toEqual({
        id: "default-trend-chart",
        widget: "trend-chart",
        size: "4x2",
        range: "30d",
        metric,
      });
    }
    // Products and legacy stores keep Revenue chart and gain no trend chart.
    expect(widgetsOf(DEFAULT_DASHBOARD_LAYOUT)).not.toContain("trend-chart");
    expect(widgetsOf(DEFAULT_DASHBOARD_LAYOUT)).toContain("revenue-chart");
  });

  it("gives every business type a default that passes the save schema", () => {
    for (const type of BUSINESS_TYPE_IDS) {
      const l = getDefaultLayout(type);
      expect(dashboardLayoutSaveSchema.safeParse(l).success, type).toBe(true);
      expect(new Set(l.cards.map((c) => c.id)).size, type).toBe(l.cards.length);
    }
    expect(Object.keys(DEFAULT_LAYOUTS_BY_TYPE).sort()).toEqual([
      "donations",
      "informational",
      "services",
    ]);
  });

  it("gives point-in-time widgets no range, ranged widgets 30d", () => {
    for (const l of Object.values(DEFAULT_LAYOUTS_BY_TYPE)) {
      for (const card of l.cards) {
        const def = getWidget(card.widget);
        expect(card.range ?? null, card.widget).toBe(
          def.supportsRange ? "30d" : null,
        );
        expect(card.size, card.widget).toBe(
          def.kind === "trendChart" ? "4x2" : "1x1",
        );
      }
    }
  });
});

describe("parseDashboardLayout with a default layout", () => {
  it("uses the given default when nothing is stored, as a copy", () => {
    const defaultLayout = getDefaultLayout("donations");
    const { layout: parsed, usedDefault } = parseDashboardLayout(null, {
      defaultLayout,
    });
    expect(usedDefault).toBe(true);
    expect(parsed).toEqual(defaultLayout);
    expect(parsed).not.toBe(defaultLayout);
    expect(parsed.cards[0]).not.toBe(defaultLayout.cards[0]);
  });

  it("keeps the legacy default when no option is passed", () => {
    expect(parseDashboardLayout(null).layout).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("ignores the default for a stored layout, even an empty one", () => {
    const defaultLayout = getDefaultLayout("services");
    const stored = layout([{ id: "a", widget: "mrr", size: "1x1" }]);
    const result = parseDashboardLayout(stored, { defaultLayout });
    expect(result.usedDefault).toBe(false);
    expect(widgetsOf(result.layout)).toEqual(["mrr"]);
    expect(parseDashboardLayout(layout([]), { defaultLayout })).toEqual({
      layout: { version: 1, cards: [] },
      usedDefault: false,
    });
  });
});

describe("fillDefaultStatRow", () => {
  const available = (...on: DashboardFeatureKey[]) =>
    availableWidgetIds({
      isEnabled: (k) => on.includes(k),
      umamiConfigured: false,
    });

  it("leaves a full row alone", () => {
    const ids = available("forms", "quoteCalculator", "events", "testimonials");
    const base = getDefaultLayout("services");
    // form-submissions, quote-requests, upcoming-events, testimonials-pending
    // Plus the trend chart, whose metric (form-submissions) is on too.
    const visible = splitVisible(base, ids).visible;
    expect(visible.filter((c) => c.size === "1x1")).toHaveLength(4);
    expect(fillDefaultStatRow(base, ids)).toEqual(base);
  });

  it("completes a short row with the next available stat in catalog order", () => {
    // Informational with forms + events + email marketing = 3 visible stats.
    const ids = available("forms", "events", "emailMarketing", "orders");
    const base = getDefaultLayout("informational");
    const filled = fillDefaultStatRow(base, ids);
    expect(filled.cards.slice(0, base.cards.length)).toEqual(base.cards);
    expect(filled.cards.slice(base.cards.length)).toEqual([
      {
        id: "default-gross-revenue",
        widget: "gross-revenue",
        size: "1x1",
        range: "30d",
      },
    ]);
    expect(splitVisible(filled, ids).visible).toHaveLength(4);
  });

  it("gives point-in-time fillers no range", () => {
    const ids = available("forms", "events", "emailMarketing", "subscriptions");
    const filled = fillDefaultStatRow(getDefaultLayout("informational"), ids);
    expect(filled.cards.at(-1)).toEqual({
      id: "default-active-subscribers",
      widget: "active-subscribers",
      size: "1x1",
    });
  });

  it("never adds a widget that is already in the layout", () => {
    const ids = available("forms", "events", "emailMarketing", "donations");
    const filled = fillDefaultStatRow(getDefaultLayout("informational"), ids);
    const widgets = widgetsOf(filled);
    expect(new Set(widgets).size).toBe(widgets.length);
  });

  it("stops when there is nothing left to add", () => {
    const ids = available("forms");
    const filled = fillDefaultStatRow(getDefaultLayout("informational"), ids);
    expect(splitVisible(filled, ids).visible.map((c) => c.widget)).toEqual([
      "form-submissions",
    ]);
    expect(filled.cards).toHaveLength(
      getDefaultLayout("informational").cards.length,
    );
  });

  it("fills a whole row when nothing at all is visible", () => {
    const ids = available("donations");
    const filled = fillDefaultStatRow(getDefaultLayout("informational"), ids);
    expect(splitVisible(filled, ids).visible.map((c) => c.widget)).toEqual([
      "donations-total",
      "donations-count",
      "donors-count",
      "donation-average",
    ]);
  });

  it("leaves the legacy default alone when orders are on", () => {
    const ids = available("orders", "products", "inventory");
    expect(fillDefaultStatRow(DEFAULT_DASHBOARD_LAYOUT, ids)).toEqual(
      DEFAULT_DASHBOARD_LAYOUT,
    );
  });

  it("does not mutate its input", () => {
    const base = getDefaultLayout("donations");
    const snapshot = JSON.parse(JSON.stringify(base)) as DashboardLayout;
    fillDefaultStatRow(base, available("donations", "orders"));
    expect(base).toEqual(snapshot);
  });
});
