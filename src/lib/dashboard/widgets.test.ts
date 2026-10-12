import { describe, expect, it } from "vitest";

import type { DashboardFeatureKey } from "./widgets";
import { FEATURE_REGISTRY } from "~/lib/features/registry";

import {
  availableWidgetIds,
  effectiveCompare,
  getWidget,
  isWidgetAvailable,
  isWidgetId,
  resolveCardRange,
  resolveWidgetHref,
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
        "top-products",
        "total-customers",
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
        expect(def.sparkline, def.id).toBe(!def.isPointInTime);
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
      ].sort(),
    );
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
