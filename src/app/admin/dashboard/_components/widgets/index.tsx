"use client";

import type { ComponentType } from "react";

import type { Renderer, WidgetProps } from "./types";
import type { CardData } from "~/lib/dashboard/card-data";
import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import type { WidgetKind } from "~/lib/dashboard/widgets";
import { getWidget } from "~/lib/dashboard/widgets";

import { useCardData } from "../use-card-data";
import { LowStockWidget } from "./low-stock-widget";
import { RecentOrdersWidget } from "./recent-orders-widget";
import { RevenueChartWidget } from "./revenue-chart-widget";
import { StatWidget } from "./stat-widget";
import { TopProductsWidget } from "./top-products-widget";
import { TrendChartWidget } from "./trend-chart-widget";
import { UnavailableState } from "./unavailable-state";

/**
 * Adapts a widget component that wants `data` narrowed to its kind into a
 * `Renderer` that takes the full `CardData` union. A kind mismatch (the server
 * answered with a different shape than the registry says) renders the
 * unavailable state instead of crashing the card.
 */
function renderer<K extends WidgetKind>(
  kind: K,
  Component: ComponentType<WidgetProps<K>>,
): Renderer {
  return function KindRenderer({ card, def, data, href }) {
    if (data.kind !== kind) {
      return <UnavailableState message="This card couldn't be displayed." />;
    }
    return (
      <Component
        card={card}
        def={def}
        data={data as WidgetProps<K>["data"]}
        href={href}
      />
    );
  };
}

export const WIDGET_RENDERERS: Record<WidgetKind, Renderer> = {
  stat: renderer("stat", StatWidget),
  recentOrders: renderer("recentOrders", RecentOrdersWidget),
  lowStock: renderer("lowStock", LowStockWidget),
  topProducts: renderer("topProducts", TopProductsWidget),
  revenueChart: renderer("revenueChart", RevenueChartWidget),
  trendChart: renderer("trendChart", TrendChartWidget),
};

/**
 * One card's body: reads its data (suspending), then routes to the renderer
 * for the widget's kind. Wrap in Suspense + CardErrorBoundary (the grid does).
 */
export function WidgetBody({
  card,
  href,
}: {
  card: DashboardCard;
  /** Per-store link override (see `resolveWidgetHref`). */
  href?: string;
}) {
  const data: CardData = useCardData(card);
  const def = getWidget(card.widget);

  if (data.kind === "unavailable") {
    return <UnavailableState message={data.message} />;
  }

  const Render = WIDGET_RENDERERS[def.kind];
  return <Render card={card} def={def} data={data} href={href ?? def.href} />;
}
