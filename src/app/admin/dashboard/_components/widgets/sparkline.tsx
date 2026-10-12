"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import type { SeriesPoint } from "~/lib/dashboard/card-data";

/** A tiny axis-less area chart. Fills its (positioned) parent. */
export function Sparkline({
  series,
  label,
}: {
  series: SeriesPoint[];
  /** Accessible summary, e.g. "Gross revenue trend". */
  label: string;
}) {
  if (series.length < 2) return null;

  return (
    <div
      className="relative min-w-0 flex-1 self-stretch"
      role="img"
      aria-label={label}
    >
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={1.5}
              fill="var(--chart-1)"
              fillOpacity={0.15}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
