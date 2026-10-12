import type { DashboardLayout } from "~/lib/dashboard/layout-schema";
import { Skeleton } from "~/components/ui/skeleton";

import { DASHBOARD_GRID_CLASSES } from "./grid-classes";
import { WidgetFrame } from "./widget-frame";
import { WidgetSkeleton } from "./widget-skeleton";

/**
 * The card grid in its loading state, laid out from a layout's footprints.
 * Used by `loading.tsx` (with the default layout) so the page doesn't reflow
 * once the real layout arrives.
 */
export function DashboardSkeleton({ layout }: { layout: DashboardLayout }) {
  return (
    <div
      className={DASHBOARD_GRID_CLASSES}
      aria-busy="true"
      aria-label="Loading dashboard cards"
    >
      {layout.cards.map((card) => (
        <WidgetFrame key={card.id} card={card} isEditing>
          <WidgetSkeleton size={card.size} />
        </WidgetFrame>
      ))}
    </div>
  );
}

/** Title-shaped placeholder pair for `loading.tsx`'s page header. */
export function DashboardHeaderSkeleton() {
  return (
    <div className="mb-6">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-2 h-5 w-72" />
    </div>
  );
}
