import { describe, expect, it } from "vitest";

import type { DashboardFeatureKey } from "./widgets";

import {
  cardDataInputSchema,
  isCardInputAvailable,
  toCardDataInput,
} from "./card-data";
import { DEFAULT_DASHBOARD_LAYOUT } from "./layout-schema";
import { WIDGET_IDS, WIDGETS } from "./widgets";

describe("toCardDataInput", () => {
  it("builds a schema-valid input for every widget at every size", () => {
    for (const id of WIDGET_IDS) {
      for (const size of WIDGETS[id].sizes) {
        const input = toCardDataInput({
          widget: id,
          size,
          ...(id === "trend-chart" ? { metric: "net-revenue" as const } : {}),
        });
        expect(cardDataInputSchema.parse(input), `${id} ${size}`).toEqual(
          input,
        );
      }
    }
  });

  it("always emits every key, with null range for range-less widgets", () => {
    expect(toCardDataInput({ widget: "recent-orders", size: "2x2" })).toEqual({
      widget: "recent-orders",
      range: null,
      compare: false,
      series: false,
      metric: null,
    });
  });

  it("fills in the default range and turns comparison on by default", () => {
    expect(toCardDataInput({ widget: "net-revenue", size: "1x1" })).toEqual({
      widget: "net-revenue",
      range: "30d",
      compare: true,
      series: false,
      metric: null,
    });
  });

  it("replaces a range the widget doesn't allow with its default", () => {
    expect(
      toCardDataInput({ widget: "revenue-chart", size: "4x2", range: "today" })
        .range,
    ).toBe("30d");
  });

  it("forces comparison off for all time, point-in-time and no-comparison widgets", () => {
    expect(
      toCardDataInput({ widget: "net-revenue", size: "1x1", range: "all" })
        .compare,
    ).toBe(false);
    expect(
      toCardDataInput({
        widget: "orders-to-fulfill",
        size: "1x1",
        compare: true,
      }).compare,
    ).toBe(false);
    expect(
      toCardDataInput({ widget: "top-products", size: "4x2", compare: true })
        .compare,
    ).toBe(false);
    expect(
      toCardDataInput({
        widget: "net-revenue",
        size: "1x1",
        range: "7d",
        compare: false,
      }).compare,
    ).toBe(false);
  });

  it("asks for a series only for 2x1 sparkline cards", () => {
    expect(toCardDataInput({ widget: "net-revenue", size: "2x1" }).series).toBe(
      true,
    );
    expect(toCardDataInput({ widget: "net-revenue", size: "1x1" }).series).toBe(
      false,
    );
    expect(toCardDataInput({ widget: "mrr", size: "2x1" }).series).toBe(false);
  });

  it("carries the metric only for a trend chart", () => {
    const input = toCardDataInput({
      widget: "trend-chart",
      size: "4x2",
      metric: "donations-total",
    });
    expect(input).toEqual({
      widget: "trend-chart",
      range: "30d",
      compare: true,
      series: false,
      metric: "donations-total",
    });
    // A stray metric on any other widget is not forwarded.
    expect(
      toCardDataInput({
        widget: "net-revenue",
        size: "1x1",
        metric: "visitors",
      }).metric,
    ).toBeNull();
    expect(
      toCardDataInput({ widget: "revenue-chart", size: "4x2" }).metric,
    ).toBeNull();
  });

  it("builds identical objects for the server prefetch and the client read", () => {
    const card = {
      id: "t1",
      widget: "trend-chart" as const,
      size: "4x2" as const,
      metric: "visitors" as const,
    };
    expect(toCardDataInput({ ...card })).toEqual(toCardDataInput(card));
    expect(JSON.stringify(toCardDataInput(card))).toBe(
      JSON.stringify(toCardDataInput({ ...card })),
    );
  });

  it("gives duplicate default cards the same input (shared cache entry)", () => {
    const inputs = DEFAULT_DASHBOARD_LAYOUT.cards.map(toCardDataInput);
    expect(inputs[0]).toEqual({
      widget: "net-revenue",
      range: "today",
      compare: true,
      series: false,
      metric: null,
    });
    expect(
      toCardDataInput({ widget: "gross-revenue", size: "1x1", range: "7d" }),
    ).toEqual(inputs[1]);
  });
});

describe("cardDataInputSchema", () => {
  it("rejects a range the widget doesn't allow", () => {
    expect(
      cardDataInputSchema.safeParse({
        widget: "recent-orders",
        range: "7d",
        compare: false,
        series: false,
      }).success,
    ).toBe(false);
    expect(
      cardDataInputSchema.safeParse({
        widget: "revenue-chart",
        range: "today",
        compare: true,
        series: false,
      }).success,
    ).toBe(false);
  });

  it("rejects unknown widgets and extra keys", () => {
    expect(
      cardDataInputSchema.safeParse({
        widget: "nope",
        range: null,
        compare: false,
        series: false,
      }).success,
    ).toBe(false);
    expect(
      cardDataInputSchema.safeParse({
        widget: "mrr",
        range: null,
        compare: false,
        series: false,
        size: "1x1",
      }).success,
    ).toBe(false);
  });
});

describe("cardDataInputSchema metric", () => {
  const base = { range: "30d", compare: true, series: false } as const;
  const ok = (input: unknown) => cardDataInputSchema.safeParse(input).success;

  it("requires a plottable metric for trend-chart", () => {
    expect(ok({ ...base, widget: "trend-chart", metric: "visitors" })).toBe(
      true,
    );
    expect(ok({ ...base, widget: "trend-chart", metric: null })).toBe(false);
    expect(ok({ ...base, widget: "trend-chart" })).toBe(false);
    expect(ok({ ...base, widget: "trend-chart", metric: "mrr" })).toBe(false);
    expect(
      ok({ ...base, widget: "trend-chart", metric: "conversion-rate" }),
    ).toBe(false);
    expect(ok({ ...base, widget: "trend-chart", metric: "trend-chart" })).toBe(
      false,
    );
    expect(ok({ ...base, widget: "trend-chart", metric: "nope" })).toBe(false);
  });

  it("forbids a metric on every other widget", () => {
    expect(ok({ ...base, widget: "net-revenue", metric: "visitors" })).toBe(
      false,
    );
    expect(ok({ ...base, widget: "net-revenue", metric: null })).toBe(true);
    expect(ok({ ...base, widget: "net-revenue" })).toBe(true);
  });

  it("applies the trend chart's own range rules (no Today)", () => {
    expect(
      ok({
        ...base,
        range: "today",
        widget: "trend-chart",
        metric: "visitors",
      }),
    ).toBe(false);
  });
});

describe("isCardInputAvailable", () => {
  const avail = (on: DashboardFeatureKey[], umamiConfigured = false) => ({
    isEnabled: (key: DashboardFeatureKey) => on.includes(key),
    umamiConfigured,
  });

  it("gates a stat card on its own feature", () => {
    expect(
      isCardInputAvailable(
        { widget: "donations-total", metric: null },
        avail(["donations"]),
      ),
    ).toBe(true);
    expect(
      isCardInputAvailable(
        { widget: "donations-total", metric: null },
        avail([]),
      ),
    ).toBe(false);
  });

  it("gates a trend chart on the metric it plots, not just on any metric", () => {
    const donations = avail(["donations"]);
    expect(
      isCardInputAvailable(
        { widget: "trend-chart", metric: "donations-total" },
        donations,
      ),
    ).toBe(true);
    // Trend chart itself is available (donations is plottable) but this metric is not.
    expect(
      isCardInputAvailable(
        { widget: "trend-chart", metric: "net-revenue" },
        donations,
      ),
    ).toBe(false);
    expect(
      isCardInputAvailable(
        { widget: "trend-chart", metric: "visitors" },
        avail(["analytics"], false),
      ),
    ).toBe(false);
    expect(
      isCardInputAvailable(
        { widget: "trend-chart", metric: "visitors" },
        avail(["analytics"], true),
      ),
    ).toBe(true);
    expect(
      isCardInputAvailable({ widget: "trend-chart", metric: null }, donations),
    ).toBe(false);
  });
});
