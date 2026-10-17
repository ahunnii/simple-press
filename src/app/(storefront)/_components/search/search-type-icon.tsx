import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CircleHelp,
  FileText,
  LayoutGrid,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import type { SiteSearchType } from "~/server/search/site-search-types";

/** Fallback icon for a result row without a thumbnail. */
export const SEARCH_TYPE_ICONS: Record<SiteSearchType, LucideIcon> = {
  products: ShoppingBag,
  services: Sparkles,
  pages: FileText,
  events: CalendarDays,
  faqs: CircleHelp,
  collections: LayoutGrid,
};

export function SearchTypeIcon({
  type,
  className,
}: {
  type: SiteSearchType;
  className?: string;
}) {
  const Icon = SEARCH_TYPE_ICONS[type];
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}
