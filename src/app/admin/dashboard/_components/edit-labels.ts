import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import type { WidgetDef, WidgetSize } from "~/lib/dashboard/widgets";
import { dashboardRangeLabel } from "~/lib/dashboard/ranges";
import { getWidget, resolveCardRange } from "~/lib/dashboard/widgets";

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

/** "Gross revenue, Last 7 days" — the card's name for menus and announcements. */
export function cardLabel(
  card: Pick<DashboardCard, "widget" | "range">,
): string {
  const def = getWidget(card.widget);
  const range = resolveCardRange(def, card.range);
  return range ? `${def.label}, ${dashboardRangeLabel(range)}` : def.label;
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
      ];
    }),
  );
}
