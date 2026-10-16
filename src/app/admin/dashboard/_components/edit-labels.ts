import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import type { WidgetDef, WidgetId, WidgetSize } from "~/lib/dashboard/widgets";
import { dashboardRangeLabel } from "~/lib/dashboard/ranges";
import {
  getWidget,
  resolveCardRange,
  trendChartTitle,
} from "~/lib/dashboard/widgets";

/** Owner-facing name and footprint for each size ("Wide", "2×1"). */
export const SIZE_META: Record<WidgetSize, { name: string; dims: string }> = {
  "1x1": { name: "Small", dims: "1×1" },
  "2x1": { name: "Wide", dims: "2×1" },
  "2x2": { name: "Large", dims: "2×2" },
  "4x2": { name: "Full width", dims: "4×2" },
};

/** "Wide · 2×1" */
export function sizeLabel(size: WidgetSize): string {
  return `${SIZE_META[size].name} · ${SIZE_META[size].dims}`;
}

/** What a size adds for this widget, or null ("Adds a trend line", "Shows 5 rows"). */
export function sizeHint(def: WidgetDef, size: WidgetSize): string | null {
  if (size === "2x1" && def.sparkline) return "Adds a trend line";
  const rows = def.itemsBySize?.[size];
  if (rows) return `Shows ${rows} rows`;
  return null;
}

/**
 * The card's title: the widget's label, except a Trend chart, which is named
 * for the number it plots ("Donations over time") so several of them stay
 * tellable apart.
 */
export function cardTitle(
  card: Pick<DashboardCard, "widget" | "metric">,
): string {
  const def = getWidget(card.widget);
  return card.metric ? trendChartTitle(card.metric) : def.label;
}

/** "Gross revenue, Last 7 days" — the card's name for menus and announcements. */
export function cardLabel(
  card: Pick<DashboardCard, "widget" | "range" | "metric">,
): string {
  const def = getWidget(card.widget);
  const title = cardTitle(card);
  const range = resolveCardRange(def, card.range);
  return range ? `${title}, ${dashboardRangeLabel(range)}` : title;
}

/**
 * Where a card links. A Trend chart goes to the page of the number it plots
 * (its own def's href is a placeholder); every other card uses its own def.
 * `widgetHrefs` holds this store's overrides (see `resolveWidgetHref`), keyed
 * by widget id.
 */
export function cardHref(
  card: Pick<DashboardCard, "widget" | "metric">,
  widgetHrefs?: Partial<Record<WidgetId, string>>,
): string {
  const id = card.metric ?? card.widget;
  return widgetHrefs?.[id] ?? getWidget(id).href;
}

/**
 * Canonical form for dirty checks: a card whose range or comparison was set to
 * the value it already had by default compares equal to the untouched card.
 */
export function layoutSignature(cards: readonly DashboardCard[]): string {
  return JSON.stringify(
    cards.map((card) => {
      const def = getWidget(card.widget);
      return [
        card.id,
        card.widget,
        card.size,
        resolveCardRange(def, card.range),
        card.compare ?? true,
        card.metric ?? null,
      ];
    }),
  );
}
