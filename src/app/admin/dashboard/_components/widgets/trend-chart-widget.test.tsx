import type { ReactNode } from "react";
import type * as Recharts from "recharts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrendChartCardData } from "~/lib/dashboard/card-data";
import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import { getWidget } from "~/lib/dashboard/widgets";

import { seriesDot } from "./series-dots";
import { TrendChartWidget } from "./trend-chart-widget";

// happy-dom has no layout, so ResponsiveContainer would render nothing; give
// it a fixed size so the chart (and its legend-free SVG) mounts.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof Recharts>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="chart-box">{children}</div>
    ),
  };
});

function makeCard(metric: DashboardCard["metric"]): DashboardCard {
  return {
    id: "c1",
    widget: "trend-chart",
    size: "4x2",
    range: "30d",
    metric,
  };
}

function makeData(
  overrides: Partial<TrendChartCardData> = {},
): TrendChartCardData {
  return {
    kind: "trendChart",
    metric: "donations-total",
    metricLabel: "Donations",
    format: "currency",
    style: "bar",
    granularity: "day",
    points: [
      { key: "2026-10-01", label: "Oct 1", value: 5000 },
      { key: "2026-10-02", label: "Oct 2", value: 2500 },
    ],
    previousPoints: null,
    total: 7500,
    previousTotal: null,
    comparisonLabel: null,
    ...overrides,
  };
}

function renderWidget(data: TrendChartCardData) {
  return render(
    <TrendChartWidget
      card={makeCard(data.metric)}
      def={getWidget("trend-chart")}
      data={data}
      href="/admin/donations"
    />,
  );
}

describe("TrendChartWidget", () => {
  it("shows the total formatted by the metric's format", () => {
    renderWidget(makeData());
    expect(screen.getByText("$75.00")).toBeTruthy();
  });

  it("shows a dash when the total can't be computed", () => {
    renderWidget(makeData({ total: null }));
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("shows the note under the total", () => {
    renderWidget(makeData({ note: "Daily numbers can add up to more." }));
    expect(screen.getByText("Daily numbers can add up to more.")).toBeTruthy();
  });

  it("colours a rise in a down-good metric (refunds) as bad", () => {
    renderWidget(
      makeData({
        metric: "refunds",
        metricLabel: "Refunds",
        total: 2000,
        previousTotal: 1000,
        comparisonLabel: "vs last 30 days",
      }),
    );
    const chip = screen.getByText(/vs last 30 days/);
    expect(chip.className).toContain("text-red-600");
  });

  it("shows the empty state when every point is zero", () => {
    renderWidget(
      makeData({
        points: [
          { key: "a", label: "A", value: 0 },
          { key: "b", label: "B", value: 0 },
        ],
        total: 0,
      }),
    );
    expect(screen.getByText("Nothing to chart yet")).toBeTruthy();
    expect(
      screen.getByText("Donations will show here once there's activity."),
    ).toBeTruthy();
  });

  it("shows the empty state when there are no points", () => {
    renderWidget(makeData({ points: [], total: null }));
    expect(screen.getByText("Nothing to chart yet")).toBeTruthy();
  });

  it("renders a line chart with a previous-period line without crashing", () => {
    const { container } = renderWidget(
      makeData({
        metric: "avg-order-value",
        metricLabel: "Average order",
        style: "line",
        previousPoints: [{ key: "p1", label: "Sep 1", value: 1000 }],
        previousTotal: 1000,
        comparisonLabel: "vs previous 30 days",
      }),
    );
    expect(screen.getByTestId("chart-box")).toBeTruthy();
    expect(container.textContent).toContain("vs previous 30 days");
  });

  it("shows the empty state when every average bucket is null", () => {
    renderWidget(
      makeData({
        metric: "avg-order-value",
        metricLabel: "Average order",
        style: "line",
        points: [
          { key: "a", label: "A", value: null },
          { key: "b", label: "B", value: null },
        ],
        total: null,
      }),
    );
    expect(screen.getByText("Nothing to chart yet")).toBeTruthy();
  });

  it("renders a line with null gaps, an isolated point and a null previous point", () => {
    const { container } = renderWidget(
      makeData({
        metric: "donation-average",
        metricLabel: "Average gift",
        style: "line",
        points: [
          { key: "a", label: "Oct 1", value: null },
          { key: "b", label: "Oct 2", value: 2500 },
          { key: "c", label: "Oct 3", value: null },
          { key: "d", label: "Oct 4", value: 1000 },
          { key: "e", label: "Oct 5", value: 3000 },
        ],
        previousPoints: [
          { key: "p1", label: "Sep 1", value: null },
          { key: "p2", label: "Sep 2", value: 1200 },
        ],
        total: 2000,
        previousTotal: 1200,
        comparisonLabel: "vs previous 5 days",
      }),
    );
    expect(screen.getByTestId("chart-box")).toBeTruthy();
    expect(container.textContent).toContain("vs previous 5 days");
  });
});

describe("seriesDot", () => {
  const dot = (values: Array<number | null>, index: number, all = false) =>
    seriesDot(values, { color: "red", radius: 3, all })({
      key: `k${index}`,
      index,
      cx: 10,
      cy: 20,
    });

  it("never draws a dot for a null point", () => {
    expect(dot([null, 5, null], 0, true).type).toBe("g");
  });

  it("draws a dot for a point with null neighbours", () => {
    expect(dot([null, 5, null], 1).type).toBe("circle");
    expect(dot([5], 0).type).toBe("circle");
  });

  it("draws no dot inside a run unless `all` is set", () => {
    expect(dot([1, 2, 3], 1).type).toBe("g");
    expect(dot([1, 2, 3], 1, true).type).toBe("circle");
  });

  it("draws no dot without a position", () => {
    const el = seriesDot([5], { color: "red", radius: 3 })({
      index: 0,
      cx: null,
      cy: null,
    });
    expect(el.type).toBe("g");
  });
});
