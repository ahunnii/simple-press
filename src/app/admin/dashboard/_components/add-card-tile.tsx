"use client";

import { Plus } from "lucide-react";

import { MAX_DASHBOARD_CARDS } from "~/lib/dashboard/layout-schema";

/**
 * Edit mode's last grid item: a dashed 1×1 that opens the Add card dialog.
 * Grid auto-placement (dense) drops it into the first free slot.
 */
export function AddCardTile({
  isFull,
  disabled = false,
  onClick,
}: {
  isFull: boolean;
  /** e.g. while a save is in flight. */
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-add-card-tile=""
      onClick={onClick}
      disabled={isFull || disabled}
      className="border-foreground/25 text-muted-foreground hover:border-primary/60 hover:bg-background/70 hover:text-foreground focus-visible:ring-ring/50 disabled:hover:border-foreground/25 flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
    >
      {isFull ? (
        <>
          <span>Dashboard is full</span>
          <span className="text-xs font-normal">
            {MAX_DASHBOARD_CARDS} cards is the limit. Remove one to add another.
          </span>
        </>
      ) : (
        <>
          <span className="bg-background flex size-9 items-center justify-center rounded-full border">
            <Plus className="size-4" aria-hidden="true" />
          </span>
          Add card
        </>
      )}
    </button>
  );
}
