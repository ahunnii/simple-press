import type { WidgetSize } from "~/lib/dashboard/widgets";
import { Skeleton } from "~/components/ui/skeleton";

/**
 * Loading placeholder for a card's body (the frame supplies the title). Shaped
 * like the real content so the grid doesn't shift when data lands.
 */
export function WidgetSkeleton({ size }: { size: WidgetSize }) {
  if (size === "1x1" || size === "2x1") {
    return (
      <div className="flex flex-1 items-start gap-4" aria-hidden="true">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        {size === "2x1" && <Skeleton className="h-full flex-1 rounded-md" />}
      </div>
    );
  }

  if (size === "4x2") {
    return (
      <div className="flex-1 pb-1" aria-hidden="true">
        <Skeleton className="h-full w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}
