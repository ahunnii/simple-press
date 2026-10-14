"use client";

import type { ComponentProps } from "react";
import { useMemo } from "react";

import type { WidgetId } from "~/lib/dashboard/widgets";
import { MAX_DASHBOARD_CARDS } from "~/lib/dashboard/layout-schema";
import { dashboardRangeLabel } from "~/lib/dashboard/ranges";
import { WIDGET_FAMILIES, WIDGET_IDS, WIDGETS } from "~/lib/dashboard/widgets";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

import { sizeLabel } from "./edit-labels";
import { Footprint } from "./footprint";

/**
 * The card catalog: every widget this store can show, grouped by family
 * (families with nothing available are left out). Picking one adds it to the
 * end of the draft and closes the dialog.
 *
 * Widgets already on the dashboard stay addable — the same widget twice with
 * different time ranges is a supported layout — and carry an "On dashboard"
 * badge.
 */
export function AddCardDialog({
  open,
  onOpenChange,
  availableWidgetIds,
  presentWidgetIds,
  totalCount,
  onAdd,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableWidgetIds: readonly WidgetId[];
  /** Widgets already in the draft. */
  presentWidgetIds: ReadonlySet<WidgetId>;
  /** Draft cards plus hidden cards: what counts toward the cap. */
  totalCount: number;
  onAdd: (widget: WidgetId) => void;
  /** Lets the shell move focus to the new card instead of the opener. */
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
}) {
  const isFull = totalCount >= MAX_DASHBOARD_CARDS;

  const groups = useMemo(() => {
    const available = new Set(availableWidgetIds);
    return WIDGET_FAMILIES.map(({ family, label }) => ({
      family,
      label,
      widgets: WIDGET_IDS.filter(
        (id) => available.has(id) && WIDGETS[id].family === family,
      ).map((id) => WIDGETS[id]),
    })).filter((group) => group.widgets.length > 0);
  }, [availableWidgetIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>Add a card</DialogTitle>
          <DialogDescription>
            {isFull
              ? `Your dashboard is full (${MAX_DASHBOARD_CARDS} cards). Remove a card to add another.`
              : `New cards go at the end. Change a card's size or time range from its settings. ${totalCount} of ${MAX_DASHBOARD_CARDS} cards used.`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {groups.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No cards are available. Turn on features like Orders or Donations
              in Settings to get cards for them.
            </p>
          )}
          {groups.map((group) => (
            <section
              key={group.family}
              aria-labelledby={`add-card-${group.family}`}
            >
              <h3
                id={`add-card-${group.family}`}
                className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase"
              >
                {group.label}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {group.widgets.map((def) => (
                  <li key={def.id}>
                    <button
                      type="button"
                      disabled={isFull}
                      onClick={() => onAdd(def.id)}
                      className="hover:bg-accent focus-visible:ring-ring/50 flex h-full w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Footprint size={def.defaultSize} className="mt-1" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {def.label}
                          </span>
                          {presentWidgetIds.has(def.id) && (
                            <Badge variant="secondary" className="font-normal">
                              On dashboard
                            </Badge>
                          )}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {def.description}
                        </span>
                        <span className="text-muted-foreground mt-1 text-xs">
                          {sizeLabel(def.defaultSize)}
                          {def.defaultRange &&
                            ` · ${dashboardRangeLabel(def.defaultRange)}`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
