"use client";

import { TrendingUp } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { WidgetProps } from "./types";
import { getWidget } from "~/lib/dashboard/widgets";

import { DeltaChip } from "../delta-chip";
import { formatAxisValue, formatStatValue } from "../format";
import { WidgetEmptyState } from "./empty-state";
import { seriesDot } from "./series-dots";

const SERIES_LABELS: Record<string, string> = {
  value: "This period",
  prev: "Previous period",
};

/** Short series get a dot on every real point; longer ones only on lone points. */
const DOT_ALL_MAX_POINTS = 31;

/** What the tooltip says for a bucket with nothing to average. */
function emptyBucketText(metric: string): string {
  if (metric === "avg-order-value") return "No orders";
  if (metric === "donation-average") return "No gifts";
  return "\u2014";
}

type ChartRow = {
  key: string;
  label: string;
  /** null = nothing to average in that bucket (the line breaks). */
  value: number | null;
  /** Previous-period value at the same position; undefined past the shorter window. */
  prev?: number | null;
};

/**
 * Any plottable number over time. Sums and counts draw as bars, averages as a
 * line; when comparing, the previous period is a muted dashed line behind it.
 * Format and good/bad direction come from the plotted number's own definition
 * (refunds going up is bad), not from the Trend chart's.
 */
export function TrendChartWidget({ card, data }: WidgetProps<"trendChart">) {
  const { format, style, points, previousPoints, metricLabel } = data;
  const metricDef = getWidget(data.metric);

  if (
    points.length === 0 ||
    points.every((p) => p.value === null || p.value === 0)
  ) {
    return (
      <WidgetEmptyState
        icon={TrendingUp}
        title="Nothing to chart yet"
        hint={`${metricLabel} will show here once there's activity.`}
      />
    );
  }

  const compact = card.size === "2x2";
  const rows: ChartRow[] = points.map((point, index) => {
    const row: ChartRow = {
      key: point.key,
      label: point.label,
      value: point.value,
    };
    const prev = previousPoints?.[index];
    if (prev) row.prev = prev.value;
    return row;
  });
  const hasPrevious = previousPoints !== null && previousPoints.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="shrink-0">
        <div className="text-2xl font-bold tabular-nums">
          {data.total === null ? (
            <span className="text-muted-foreground">&mdash;</span>
          ) : (
            formatStatValue(data.total, format)
          )}
        </div>
        {data.total !== null &&
          data.previousTotal !== null &&
          data.comparisonLabel && (
            <DeltaChip
              current={data.total}
              previous={data.previousTotal}
              label={data.comparisonLabel}
              polarity={metricDef.deltaPolarity}
            />
          )}
        {data.note && (
          <p className="text-muted-foreground/80 mt-0.5 text-xs">{data.note}</p>
        )}
      </div>

      {/* Positioned parent + absolute child: ResponsiveContainer needs a box
          with a real height, and percent heights don't resolve inside flex. */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={rows}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={compact ? 32 : 20}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                width={48}
                tickLine={false}
                axisLine={false}
                allowDecimals={format !== "count"}
                tickFormatter={(value: number) =>
                  formatAxisValue(value, format)
                }
              />
              <Tooltip
                cursor={
                  style === "bar"
                    ? { fill: "var(--muted)", opacity: 0.5 }
                    : undefined
                }
                // Keep null buckets in the tooltip so they can say "No orders".
                filterNull={false}
                formatter={(value: unknown, name: string) => [
                  typeof value === "number"
                    ? formatStatValue(value, format)
                    : emptyBucketText(data.metric),
                  SERIES_LABELS[name] ?? name,
                ]}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: 12,
                }}
              />
              {hasPrevious && (
                <Line
                  type="monotone"
                  dataKey="prev"
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.6}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  connectNulls={false}
                  dot={seriesDot(
                    rows.map((r) => r.prev),
                    { color: "var(--muted-foreground)", radius: 2 },
                  )}
                  activeDot={false}
                  isAnimationActive={false}
                />
              )}
              {style === "bar" ? (
                <Bar
                  dataKey="value"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={seriesDot(
                    rows.map((r) => r.value),
                    {
                      color: "var(--chart-1)",
                      radius: 3,
                      all: rows.length <= DOT_ALL_MAX_POINTS,
                    },
                  )}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
