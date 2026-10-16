import { describe, expect, it } from "vitest";

import type { DashboardFeatureKey } from "./widgets";
import { FEATURE_REGISTRY } from "~/lib/features/registry";

import {
  availableWidgetIds,
  defaultTrendMetric,
  effectiveCompare,
  getWidget,
  isPlottableMetric,
  isWidgetAvailable,
  isWidgetId,
  PLOTTABLE_METRIC_IDS,
  resolveCardRange,
  resolveWidgetHref,
  TREND_METRIC_CANDIDATES,
  trendChartTitle,
  trendMetricGroups,
  trendMetricLabel,
  trendStyle,
  WIDGET_FAMILIES,
  WIDGET_IDS,
  WIDGETS,
} from "./widgets";

const defs = WIDGET_IDS.map((id) => WIDGETS[id]);

describe("widget registry", () => {
  it("keeps its persisted ids (never rename — add a new id instead)", () => {
    expect([...WIDGET_IDS].sort()).toEqual(
      [
        "active-subscribers",
        "avg-order-value",
        "conversion-rate",
        "donation-average",
        "donations-count",
        "donations-total",
        "donors-count",
        "email-subscribers",
        "form-submissions",
        "gross-revenue",
        "invoices-collected",
        "invoices-outstanding",
        "invoices-overdue",
        "low-stock-count",
        "low-stock-list",
        "mrr",
        "net-revenue",
        "new-customers",
        "order-count",
        "orders-awaiting-payment",
        "orders-cancelled",
        "orders-fulfilled",
        "orders-to-fulfill",
        "quote-requests",
        "recent-orders",
        "refunds",
        "revenue-chart",
        "testimonials-pending",
        "top-products",
        "total-customers",
        "trend-chart",
        "upcoming-events",
        "visitors",
      ].sort(),
    );
    for (const id of WIDGET_IDS) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("gates only on flag keys that exist in the feature registry", () => {
    for (const def of defs) {
      for (const key of [
        ...(def.requires.flags ?? []),
        ...(def.requires.anyFlags ?? []),
      ]) {
        expect(FEATURE_REGISTRY[key], `${def.id} → ${key}`).toBeDefined();
      }
    }
  });

  it("has self-consistent definitions", () => {
    const families = new Set(WIDGET_FAMILIES.map((f) => f.family));
    for (const def of defs) {
      expect(def.sizes, def.id).toContain(def.defaultSize);
      expect(families.has(def.family), def.id).toBe(true);
      expect(def.href, def.id).toMatch(/^\/admin\//);
      if (def.supportsRange) {
        expect(def.defaultRange, def.id).not.toBeNull();
        expect(def.allowedRanges, def.id).toContain(def.defaultRange);
      } else {
        expect(def.defaultRange, def.id).toBeNull();
        expect(def.allowedRanges, def.id).toEqual([]);
      }
      if (def.isPointInTime) {
        expect(def.supportsRange, def.id).toBe(false);
        expect(def.supportsComparison, def.id).toBe(false);
        expect(def.sparkline, def.id).toBe(false);
      }
      if (def.kind === "stat") {
        expect(def.sizes, def.id).toEqual(["1x1", "2x1"]);
        // Conversion rate has no per-bucket series, so no sparkline.
        expect(def.sparkline, def.id).toBe(
          !def.isPointInTime && def.id !== "conversion-rate",
        );
      } else {
        expect(def.sizes, def.id).toEqual(["2x2", "4x2"]);
        expect(def.sparkline, def.id).toBe(false);
      }
      if (["recentOrders", "lowStock", "topProducts"].includes(def.kind)) {
        for (const size of def.sizes) {
          expect(def.itemsBySize?.[size], `${def.id} ${size}`).toBeGreaterThan(
            0,
          );
        }
      }
    }
  });

  it("matches the plan's specific rules", () => {
    expect(getWidget("revenue-chart").allowedRanges).not.toContain("today");
    expect(getWidget("refunds").deltaPolarity).toBe("down-good");
    expect(getWidget("orders-cancelled").deltaPolarity).toBe("down-good");
    expect(getWidget("orders-to-fulfill").isPointInTime).toBe(true);
    expect(getWidget("orders-awaiting-payment").isPointInTime).toBe(true);
    expect(getWidget("recent-orders").supportsRange).toBe(false);
    expect(getWidget("conversion-rate").format).toBe("percent");
    expect(getWidget("invoices-outstanding").requires.anyFlags).toEqual([
      "invoices",
      "quickbooks",
    ]);
    // Low stock covers products and inventory-item pools: either feature.
    for (const id of ["low-stock-count", "low-stock-list"] as const) {
      expect(getWidget(id).requires, id).toEqual({
        anyFlags: ["products", "inventory"],
      });
    }
    expect(getWidget("upcoming-events").requires).toEqual({
      flags: ["events"],
    });
    expect(getWidget("testimonials-pending").requires).toEqual({
      flags: ["testimonials"],
    });
    expect(getWidget("testimonials-pending").deltaPolarity).toBe("down-good");
    expect(getWidget("email-subscribers").requires).toEqual({
      flags: ["emailMarketing"],
    });
    for (const id of [
      "upcoming-events",
      "testimonials-pending",
      "email-subscribers",
    ] as const) {
      expect(getWidget(id).isPointInTime, id).toBe(true);
      expect(getWidget(id).format, id).toBe("count");
    }
    expect(getWidget("visitors").requires).toEqual({
      flags: ["analytics"],
      umami: true,
    });
  });

  it("looks widgets up by id", () => {
    expect(isWidgetId("mrr")).toBe(true);
    expect(isWidgetId("toString")).toBe(false);
    expect(isWidgetId(42)).toBe(false);
    expect(getWidget("nope")).toBeUndefined();
    expect(getWidget("mrr").id).toBe("mrr");
  });
});

describe("isWidgetAvailable", () => {
  const ctx = (on: DashboardFeatureKey[], umamiConfigured = false) => ({
    isEnabled: (key: DashboardFeatureKey) => on.includes(key),
    umamiConfigured,
  });

  it("requires every flag in `flags`", () => {
    expect(isWidgetAvailable(getWidget("gross-revenue"), ctx(["orders"]))).toBe(
      true,
    );
    expect(isWidgetAvailable(getWidget("gross-revenue"), ctx([]))).toBe(false);
  });

  it("accepts either invoices or QuickBooks", () => {
    const def = getWidget("invoices-overdue");
    expect(isWidgetAvailable(def, ctx(["invoices"]))).toBe(true);
    expect(isWidgetAvailable(def, ctx(["quickbooks"]))).toBe(true);
    expect(isWidgetAvailable(def, ctx(["orders"]))).toBe(false);
  });

  it("needs Umami configured for traffic cards", () => {
    const def = getWidget("visitors");
    expect(isWidgetAvailable(def, ctx(["analytics"], false))).toBe(false);
    expect(isWidgetAvailable(def, ctx(["analytics"], true))).toBe(true);
    expect(isWidgetAvailable(def, ctx([], true))).toBe(false);
  });

  it("lists available ids", () => {
    const ids = availableWidgetIds(ctx(["donations"]));
    expect([...ids].sort()).toEqual(
      [
        "donation-average",
        "donations-count",
        "donations-total",
        "donors-count",
        // Trend chart: available once any plottable metric is.
        "trend-chart",
      ].sort(),
    );
  });
});

describe("trend chart", () => {
  const ctx = (on: DashboardFeatureKey[], umamiConfigured = false) => ({
    isEnabled: (key: DashboardFeatureKey) => on.includes(key),
    umamiConfigured,
  });

  it("plots exactly these ids, as bars except averages (lines)", () => {
    expect([...PLOTTABLE_METRIC_IDS]).toEqual([
      "gross-revenue",
      "net-revenue",
      "refunds",
      "order-count",
      "avg-order-value",
      "orders-fulfilled",
      "orders-cancelled",
      "donations-total",
      "donations-count",
      "donors-count",
      "donation-average",
      "invoices-collected",
      "new-customers",
      "quote-requests",
      "form-submissions",
      "visitors",
    ]);
    const lines = PLOTTABLE_METRIC_IDS.filter(
      (id) => trendStyle(id) === "line",
    );
    expect(lines).toEqual(["avg-order-value", "donation-average"]);
  });

  it("only plots ranged stats (never point-in-time, charts or conversion rate)", () => {
    for (const id of PLOTTABLE_METRIC_IDS) {
      const def = getWidget(id);
      expect(def.kind, id).toBe("stat");
      expect(def.isPointInTime, id).toBe(false);
      expect(def.supportsRange, id).toBe(true);
    }
    for (const id of [
      "conversion-rate",
      "mrr",
      "total-customers",
      "revenue-chart",
      "trend-chart",
      "top-products",
      "invoices-outstanding",
    ]) {
      expect(isPlottableMetric(id), id).toBe(false);
    }
    expect(isPlottableMetric("visitors")).toBe(true);
    expect(isPlottableMetric("nope")).toBe(false);
    expect(isPlottableMetric(undefined)).toBe(false);
  });

  it("keeps the registry's candidate list in sync with the plottable stats", () => {
    expect([...TREND_METRIC_CANDIDATES]).toEqual([...PLOTTABLE_METRIC_IDS]);
    expect(getWidget("trend-chart").requires.anyWidget).toEqual([
      ...PLOTTABLE_METRIC_IDS,
    ]);
  });

  it("drops conversion rate's sparkline (it has no series)", () => {
    expect(getWidget("conversion-rate").sparkline).toBe(false);
    expect(getWidget("visitors").sparkline).toBe(true);
  });

  it("sits in the Charts group beside Revenue chart, ahead of Sales", () => {
    expect(WIDGET_FAMILIES[0]).toEqual({ family: "charts", label: "Charts" });
    expect(getWidget("revenue-chart").family).toBe("charts");
    expect(getWidget("trend-chart").family).toBe("charts");
    expect(getWidget("trend-chart")).toMatchObject({
      kind: "trendChart",
      label: "Trend chart",
      sizes: ["2x2", "4x2"],
      defaultSize: "4x2",
      defaultRange: "30d",
      supportsComparison: true,
    });
    expect(getWidget("trend-chart").allowedRanges).not.toContain("today");
  });

  it("is available only when at least one plottable metric is", () => {
    const def = getWidget("trend-chart");
    expect(isWidgetAvailable(def, ctx([]))).toBe(false);
    // Analytics flag alone isn't enough: Umami must be configured.
    expect(isWidgetAvailable(def, ctx(["analytics"], false))).toBe(false);
    expect(isWidgetAvailable(def, ctx(["analytics"], true))).toBe(true);
    expect(isWidgetAvailable(def, ctx(["donations"]))).toBe(true);
    expect(isWidgetAvailable(def, ctx(["forms"]))).toBe(true);
    // Point-in-time-only features have nothing to plot.
    expect(isWidgetAvailable(def, ctx(["events", "testimonials"]))).toBe(false);
    expect(availableWidgetIds(ctx(["events"])).has("trend-chart")).toBe(false);
  });

  it("picks the store's headline number first", () => {
    expect(
      defaultTrendMetric(new Set(["net-revenue", "donations-total"])),
    ).toBe("net-revenue");
    expect(
      defaultTrendMetric(new Set(["visitors", "form-submissions", "refunds"])),
    ).toBe("form-submissions");
    expect(defaultTrendMetric(["visitors", "new-customers"])).toBe("visitors");
    expect(
      defaultTrendMetric(new Set(["new-customers", "quote-requests"])),
    ).toBe("new-customers");
    // Falls to catalog order, ignoring non-plottable ids.
    expect(
      defaultTrendMetric(new Set(["mrr", "quote-requests", "refunds"])),
    ).toBe("refunds");
    expect(defaultTrendMetric(new Set(["mrr", "recent-orders"]))).toBeNull();
    expect(defaultTrendMetric(new Set())).toBeNull();
  });

  it("labels the metric and the card", () => {
    expect(trendMetricLabel("donations-total")).toBe("Donations");
    expect(trendChartTitle("donations-total")).toBe("Donations over time");
  });

  it("groups available metrics by family for the Shows picker", () => {
    const groups = trendMetricGroups(
      new Set(["net-revenue", "avg-order-value", "visitors", "mrr"]),
    );
    expect(groups.map((g) => g.family)).toEqual(["sales", "traffic"]);
    expect(groups[0]!.metrics).toEqual([
      { id: "net-revenue", label: "Net revenue", style: "bar" },
      { id: "avg-order-value", label: "Average order", style: "line" },
    ]);
    expect(trendMetricGroups(new Set())).toEqual([]);
  });
});

describe("resolveCardRange / effectiveCompare", () => {
  it("falls back to the default range and is null for range-less widgets", () => {
    expect(resolveCardRange(getWidget("gross-revenue"), undefined)).toBe("30d");
    expect(resolveCardRange(getWidget("gross-revenue"), "week")).toBe("week");
    expect(resolveCardRange(getWidget("revenue-chart"), "today")).toBe("30d");
    expect(resolveCardRange(getWidget("recent-orders"), "7d")).toBeNull();
  });

  it("is on by default and off where comparison makes no sense", () => {
    expect(effectiveCompare({ range: "7d" }, getWidget("net-revenue"))).toBe(
      true,
    );
    expect(effectiveCompare({}, getWidget("net-revenue"))).toBe(true);
    expect(
      effectiveCompare(
        { range: "7d", compare: false },
        getWidget("net-revenue"),
      ),
    ).toBe(false);
    expect(effectiveCompare({ range: "all" }, getWidget("net-revenue"))).toBe(
      false,
    );
    expect(effectiveCompare({}, getWidget("orders-to-fulfill"))).toBe(false);
    expect(effectiveCompare({ range: "30d" }, getWidget("top-products"))).toBe(
      false,
    );
    expect(effectiveCompare({ range: "30d" }, getWidget("revenue-chart"))).toBe(
      true,
    );
  });
});

describe("resolveWidgetHref", () => {
  const only =
    (...on: DashboardFeatureKey[]) =>
    (key: DashboardFeatureKey) =>
      on.includes(key);

  it("sends low-stock cards to Inventory when Products is off", () => {
    for (const id of ["low-stock-count", "low-stock-list"] as const) {
      expect(resolveWidgetHref(getWidget(id), only("inventory"))).toBe(
        "/admin/inventory",
      );
      expect(
        resolveWidgetHref(getWidget(id), only("products", "inventory")),
      ).toBe("/admin/products");
    }
  });

  it("uses the registry href for widgets without a fallback", () => {
    expect(resolveWidgetHref(getWidget("net-revenue"), only())).toBe(
      getWidget("net-revenue").href,
    );
  });
});
