import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import { dashboardRangeLabel } from "~/lib/dashboard/ranges";
import { getWidget, resolveCardRange } from "~/lib/dashboard/widgets";
import { cn } from "~/lib/utils";
import { Card } from "~/components/ui/card";

import { WIDGET_SIZE_CLASSES } from "./grid-classes";

/**
 * The card shell every widget renders inside: title, range line, link to the
 * full page, and (edit mode, P5) a slot for drag handle / menu controls.
 *
 * The frame sits OUTSIDE the card's Suspense + error boundary so the title and
 * footprint are on screen while data streams in, and stay put if a card fails.
 *
 * No `"use client"`: pure markup, used by the client grid and by server
 * skeletons alike.
 */
export function WidgetFrame({
  card,
  children,
  isEditing = false,
  editControls,
  className,
  href: hrefOverride,
}: {
  card: Pick<DashboardCard, "widget" | "size" | "range">;
  children: ReactNode;
  /** Edit mode: links go inert so a drag or click on a card never navigates. */
  isEditing?: boolean;
  /** P5 slot: rendered at the right of the header (drag handle, card menu). */
  editControls?: ReactNode;
  className?: string;
  /** This store's link for the card when it differs from `def.href` (`resolveWidgetHref`). */
  href?: string;
}) {
  const def = getWidget(card.widget);
  const href = hrefOverride ?? def.href;
  const range = resolveCardRange(def, card.range);
  const showLink = !isEditing && !!href;

  return (
    <Card
      data-widget={def.id}
      data-size={card.size}
      className={cn(
        "h-full min-w-0 gap-2 overflow-hidden py-4",
        WIDGET_SIZE_CLASSES[card.size],
        className,
      )}
    >
      {/* Title and range stack so a 1×1 card's title keeps its full width
          next to the edit controls instead of sharing a row with a badge. */}
      <div className="flex shrink-0 items-start justify-between gap-2 px-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm leading-5 font-medium">
            {showLink ? (
              <Link
                href={href}
                className="text-muted-foreground hover:text-foreground group inline-flex max-w-full items-center gap-1 transition-colors"
              >
                <span className="truncate">{def.label}</span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              </Link>
            ) : (
              <span className="text-muted-foreground block truncate">
                {def.label}
              </span>
            )}
          </h3>
          {range && (
            <p className="text-muted-foreground/80 truncate text-xs leading-4">
              {dashboardRangeLabel(range)}
            </p>
          )}
        </div>
        {editControls && (
          <div className="-mt-1 -mr-2 flex shrink-0 items-center gap-0.5">
            {editControls}
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col px-4",
          // Room for the edit bar along the bottom edge.
          isEditing && "pointer-events-none pb-7 select-none",
        )}
      >
        {children}
      </div>
    </Card>
  );
}
