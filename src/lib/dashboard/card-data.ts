/**
 * The `dashboard.cardData` contract: its input (and the ONE function that
 * builds it) plus the JSON-safe output union the widget renderers consume.
 *
 * Client-safe.
 *
 * Always build the input with `toCardDataInput`. The page prefetches each
 * card on the server and the client re-reads it with `useSuspenseQuery`; if
 * the two inputs differ by so much as a missing `range: null`, the cache keys
 * differ and every card fetches twice.
 *
 * Money is integer cents everywhere. Dates are ISO strings.
 */

import { z } from "zod";

import type { OrderOptionsHint } from "~/lib/customizer/display";
import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import type { DashboardRangeKey } from "~/lib/dashboard/ranges";
import type {
  TrendStyle,
  WidgetAvailabilityContext,
  WidgetFormat,
  WidgetId,
} from "~/lib/dashboard/widgets";
import { DASHBOARD_RANGE_KEYS } from "~/lib/dashboard/ranges";
import {
  effectiveCompare,
  getWidget,
  isPlottableMetric,
  isWidgetAvailable,
  resolveCardRange,
  WIDGET_IDS,
} from "~/lib/dashboard/widgets";

// ── Input ──────────────────────────────────────────────────────────────────

export const cardDataInputSchema = z
  .object({
    widget: z.enum(WIDGET_IDS),
    /** null for range-less widgets; undefined is treated as the widget default. */
    range: z.enum(DASHBOARD_RANGE_KEYS).nullable().optional(),
    compare: z.boolean(),
    /** Include a sparkline series (2x1 stat cards). */
    series: z.boolean(),
    /**
     * The plotted metric: a plottable id for `trend-chart`, null (or omitted)
     * for every other widget. `toCardDataInput` always sends it.
     */
    metric: z.enum(WIDGET_IDS).nullable().optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const def = getWidget(input.widget);
    if (def.kind === "trendChart") {
      if (!isPlottableMetric(input.metric)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["metric"],
          message: "A trend chart needs a metric it can plot",
        });
      }
    } else if (input.metric != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metric"],
        message: `${def.label} has no metric`,
      });
    }
    if (input.range == null) return;
    if (!def.allowedRanges.includes(input.range)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["range"],
        message: def.supportsRange
          ? `${def.label} can't show "${input.range}"`
          : `${def.label} has no time range`,
      });
    }
  });

export type CardDataInput = {
  widget: WidgetId;
  range: DashboardRangeKey | null;
  compare: boolean;
  series: boolean;
  /** Set only for `trend-chart`; null for every other widget. */
  metric: WidgetId | null;
};

/**
 * Whether the card this input asks for can show for the store: its widget is
 * available and, for a Trend chart, so is the metric it plots.
 */
export function isCardInputAvailable(
  input: { widget: WidgetId; metric?: WidgetId | null },
  availability: WidgetAvailabilityContext,
): boolean {
  const def = getWidget(input.widget);
  if (!isWidgetAvailable(def, availability)) return false;
  if (def.kind !== "trendChart") return true;
  return (
    input.metric != null &&
    isPlottableMetric(input.metric) &&
    isWidgetAvailable(getWidget(input.metric), availability)
  );
}

/** The only builder of `dashboard.cardData` input. See the module doc. */
export function toCardDataInput(
  card: Pick<DashboardCard, "widget" | "size" | "range" | "compare"> & {
    metric?: WidgetId;
  },
): CardDataInput {
  const def = getWidget(card.widget);
  const range = resolveCardRange(def, card.range);
  return {
    widget: card.widget,
    range,
    compare: effectiveCompare({ range, compare: card.compare }, def),
    series: card.size === "2x1" && def.sparkline,
    // Always present (null off trend cards) so the prefetch and the client
    // build identical objects.
    metric: def.kind === "trendChart" ? (card.metric ?? null) : null,
  };
}

// ── Output ─────────────────────────────────────────────────────────────────

export type SeriesPoint = {
  /** Bucket key: "YYYY-MM-DD" or "YYYY-MM". */
  key: string;
  /** Axis / tooltip label, e.g. "Oct 12" or "Oct 2026". */
  label: string;
  /**
   * Sums and counts zero-fill empty buckets with 0. null = nothing to average
   * in that bucket (an average over zero orders / gifts): charts break the
   * line there instead of plotting a $0 average.
   */
  value: number | null;
};

export type StatCardData = {
  kind: "stat";
  /** null when the value can't be computed (e.g. an average over zero orders). */
  value: number | null;
  format: WidgetFormat;
  /** Previous-window value; null when comparison is off or unavailable. */
  previous: number | null;
  /** e.g. "vs last week"; null when comparison is off. */
  comparisonLabel: string | null;
  /** Secondary lines under the number ("−$12.00 refunded", "3 overdue"). */
  detail: string[];
  /** Only when the input asked for `series`. */
  series?: SeriesPoint[];
  /** Caveat shown small, e.g. "Gifts without an email aren't counted". */
  note?: string;
};

export type RecentOrderRow = {
  id: string;
  orderNumber: number;
  customerName: string;
  /** cents */
  total: number;
  status: string;
  paymentStatus: string;
  /** ISO */
  createdAt: string;
  /** Set when a line carries product-customizer options. */
  optionsHint: OrderOptionsHint | null;
};

export type RecentOrdersCardData = {
  kind: "recentOrders";
  orders: RecentOrderRow[];
};

export type LowStockVariantRow = {
  id: string;
  /** Variant name. */
  name: string;
  productId: string;
  productName: string;
  inventoryQty: number;
};

export type LowStockPoolRow = {
  id: string;
  name: string;
  /** May be ≤ 0 — render as out of stock / broken, not merely low. */
  inventoryQty: number;
  lowInventoryThreshold: number | null;
};

export type LowStockCardData = {
  kind: "lowStock";
  variants: LowStockVariantRow[];
  pools: LowStockPoolRow[];
  /** Everything low, before the list was trimmed to fit the card. */
  totalCount: number;
};

export type TopProductRow = {
  productId: string | null;
  productName: string;
  imageUrl: string | null;
  /** cents */
  revenue: number;
  unitsSold: number;
};

export type TopProductsCardData = {
  kind: "topProducts";
  products: TopProductRow[];
};

export type RevenueBucket = {
  key: string;
  label: string;
  /** cents */
  gross: number;
  refunded: number;
  net: number;
};

export type RevenueChartCardData = {
  kind: "revenueChart";
  granularity: "day" | "month";
  buckets: RevenueBucket[];
  totals: { gross: number; refunded: number; net: number };
  /** Previous-window net; null when comparison is off. */
  previousNet: number | null;
  comparisonLabel: string | null;
};

/**
 * One metric over time. `total` / `previousTotal` are exactly the metric's own
 * stat card value for the same range, so the header number never disagrees
 * with the stat card.
 */
export type TrendChartCardData = {
  kind: "trendChart";
  /** The plotted widget id (a plottable stat). */
  metric: WidgetId;
  /** The metric's label, e.g. "Donations". */
  metricLabel: string;
  format: WidgetFormat;
  /** "bar" for sums and counts, "line" for averages. */
  style: TrendStyle;
  granularity: "day" | "month";
  /** The current window, one point per bucket (zero-filled). */
  points: SeriesPoint[];
  /**
   * The previous window, index-aligned with `points` for the ghost line; null
   * when comparison is off. Lengths can differ (a month has more days than
   * another): align by index and stop at the shorter.
   */
  previousPoints: SeriesPoint[] | null;
  /** null when the value can't be computed (average over zero gifts). */
  total: number | null;
  previousTotal: number | null;
  /** e.g. "vs last 30 days"; null when comparison is off. */
  comparisonLabel: string | null;
  /** Caveat shown small under the chart, when the metric has one. */
  note?: string;
};

export type UnavailableReason = "feature-off" | "umami-unavailable" | "error";

export type UnavailableCardData = {
  kind: "unavailable";
  reason: UnavailableReason;
  message: string;
};

export type CardData =
  | StatCardData
  | RecentOrdersCardData
  | LowStockCardData
  | TopProductsCardData
  | RevenueChartCardData
  | TrendChartCardData
  | UnavailableCardData;

export function unavailableCardData(
  reason: UnavailableReason,
  message: string,
): UnavailableCardData {
  return { kind: "unavailable", reason, message };
}
