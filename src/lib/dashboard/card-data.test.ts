import { describe, expect, it } from "vitest";

import { cardDataInputSchema, toCardDataInput } from "./card-data";
import { DEFAULT_DASHBOARD_LAYOUT } from "./layout-schema";
import { WIDGET_IDS, WIDGETS } from "./widgets";

describe("toCardDataInput", () => {
  it("builds a schema-valid input for every widget at every size", () => {
    for (const id of WIDGET_IDS) {
      for (const size of WIDGETS[id].sizes) {
        const input = toCardDataInput({ widget: id, size });
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
    });
  });

  it("fills in the default range and turns comparison on by default", () => {
    expect(toCardDataInput({ widget: "net-revenue", size: "1x1" })).toEqual({
      widget: "net-revenue",
      range: "30d",
      compare: true,
      series: false,
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

  it("gives duplicate default cards the same input (shared cache entry)", () => {
    const inputs = DEFAULT_DASHBOARD_LAYOUT.cards.map(toCardDataInput);
    expect(inputs[0]).toEqual({
      widget: "net-revenue",
      range: "today",
      compare: true,
      series: false,
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
