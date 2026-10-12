"use client";

import { DollarSign } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { WidgetProps } from "./types";

import { DeltaChip } from "../delta-chip";
import { formatCurrency, formatCurrencyCompact } from "../format";
import { WidgetEmptyState } from "./empty-state";

const SERIES_LABELS: Record<string, string> = {
  net: "Net",
  refunded: "Refunded",
};

export function RevenueChartWidget({
  card,
  def,
  data,
}: WidgetProps<"revenueChart">) {
  const hasRevenue = data.buckets.some(
    (b) => b.gross !== 0 || b.refunded !== 0,
  );

  if (data.buckets.length === 0 || !hasRevenue) {
    return (
      <WidgetEmptyState
        icon={DollarSign}
        title="No revenue data yet"
        hint="Revenue will be tracked here once you start making sales"
      />
    );
  }

  const compact = card.size === "2x2";
  const { gross, refunded, net } = data.totals;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="shrink-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-2xl font-bold tabular-nums">
            {formatCurrency(net)}
          </span>
          <span className="text-muted-foreground text-xs">
            net
            {refunded > 0 && (
              <>
                {" "}
                &middot; {formatCurrency(gross)} gross &middot; &minus;
                {formatCurrency(refunded)} refunded
              </>
            )}
          </span>
        </div>
        {data.previousNet !== null && data.comparisonLabel && (
          <DeltaChip
            current={net}
            previous={data.previousNet}
            label={data.comparisonLabel}
            polarity={def.deltaPolarity}
          />
        )}
      </div>

      {/* Positioned parent + absolute child: ResponsiveContainer needs a box
          with a real height, and percent heights don't resolve inside flex. */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.buckets}
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
                tickFormatter={(value: number) => formatCurrencyCompact(value)}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  SERIES_LABELS[name] ?? name,
                ]}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="net" stackId="revenue" fill="var(--chart-1)" />
              <Bar
                dataKey="refunded"
                stackId="revenue"
                fill="var(--chart-5)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
