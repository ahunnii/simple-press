import type { ReactNode } from "react";
import type * as Recharts from "recharts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Sparkline } from "./sparkline";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof Recharts>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="chart-box">{children}</div>
    ),
  };
});

describe("Sparkline", () => {
  it("draws a series with gaps and a lone point without crashing", () => {
    render(
      <Sparkline
        label="Average order trend"
        series={[
          { key: "a", label: "A", value: null },
          { key: "b", label: "B", value: 900 },
          { key: "c", label: "C", value: null },
          { key: "d", label: "D", value: 1000 },
          { key: "e", label: "E", value: 1100 },
        ]}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Average order trend" }),
    ).toBeTruthy();
    expect(screen.getByTestId("chart-box")).toBeTruthy();
  });

  it("draws nothing when every bucket is null", () => {
    const { container } = render(
      <Sparkline
        label="Average gift trend"
        series={[
          { key: "a", label: "A", value: null },
          { key: "b", label: "B", value: null },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
