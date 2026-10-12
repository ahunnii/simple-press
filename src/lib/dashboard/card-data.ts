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

import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import type { DashboardRangeKey } from "~/lib/dashboard/ranges";
import type { WidgetFormat, WidgetId } from "~/lib/dashboard/widgets";
import { DASHBOARD_RANGE_KEYS } from "~/lib/dashboard/ranges";
import {
  effectiveCompare,
  getWidget,
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
  })
  .strict()
  .superRefine((input, ctx) => {
    const def = getWidget(input.widget);
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
};

/** The only builder of `dashboard.cardData` input. See the module doc. */
export function toCardDataInput(
  card: Pick<DashboardCard, "widget" | "size" | "range" | "compare">,
): CardDataInput {
  const def = getWidget(card.widget);
  const range = resolveCardRange(def, card.range);
  return {
    widget: card.widget,
    range,
    compare: effectiveCompare({ range, compare: card.compare }, def),
    series: card.size === "2x1" && def.sparkline,
  };
}

// ── Output ─────────────────────────────────────────────────────────────────

export type SeriesPoint = {
  /** Bucket key: "YYYY-MM-DD" or "YYYY-MM". */
  key: string;
  /** Axis / tooltip label, e.g. "Oct 12" or "Oct 2026". */
  label: string;
  value: number;
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
  | UnavailableCardData;

export function unavailableCardData(
  reason: UnavailableReason,
  message: string,
): UnavailableCardData {
  return { kind: "unavailable", reason, message };
}
