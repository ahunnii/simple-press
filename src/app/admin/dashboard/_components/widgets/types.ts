import type { ReactNode } from "react";

import type { CardData } from "~/lib/dashboard/card-data";
import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import type { WidgetDef, WidgetKind } from "~/lib/dashboard/widgets";

/** Props every widget body receives, with `data` narrowed to its kind. */
export type WidgetProps<K extends WidgetKind> = {
  card: DashboardCard;
  def: WidgetDef;
  data: Extract<CardData, { kind: K }>;
  /** This store's link for the card (`def.href` or its fallback). */
  href: string;
};

export type Renderer = (props: {
  card: DashboardCard;
  def: WidgetDef;
  data: CardData;
  href: string;
}) => ReactNode;
