"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import type { CardMove, CardPatch } from "./use-dashboard-editor";
import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import type { WidgetId } from "~/lib/dashboard/widgets";
import { Button } from "~/components/ui/button";

import { CardMenu } from "./card-menu";
import { cardLabel } from "./edit-labels";

const MOVE_BUTTON =
  "text-muted-foreground hover:text-foreground size-7 aria-disabled:pointer-events-none aria-disabled:opacity-40";

/**
 * The edit controls in a card's header (after the grid's drag handle):
 * earlier / later buttons below md, where dragging is awkward, then the
 * settings menu. The breakpoint switch is CSS only.
 *
 * The move buttons use `aria-disabled` rather than `disabled` at the ends so
 * keyboard focus stays on the button after moving a card to the first or last
 * position.
 */
export function CardEditControls({
  card,
  index,
  count,
  availableWidgetIds,
  onUpdate,
  onMove,
  onRemove,
}: {
  card: DashboardCard;
  index: number;
  count: number;
  availableWidgetIds: readonly WidgetId[];
  onUpdate: (patch: CardPatch) => void;
  onMove: (move: CardMove) => void;
  onRemove: () => void;
}) {
  const label = cardLabel(card);
  const isFirst = index === 0;
  const isLast = index === count - 1;

  return (
    <>
      <span className="flex items-center md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={MOVE_BUTTON}
          aria-label={`Move ${label} earlier`}
          aria-disabled={isFirst || undefined}
          onClick={() => {
            if (!isFirst) onMove("earlier");
          }}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={MOVE_BUTTON}
          aria-label={`Move ${label} later`}
          aria-disabled={isLast || undefined}
          onClick={() => {
            if (!isLast) onMove("later");
          }}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
      </span>
      <CardMenu
        card={card}
        index={index}
        count={count}
        availableWidgetIds={availableWidgetIds}
        onUpdate={onUpdate}
        onMove={onMove}
        onRemove={onRemove}
      />
    </>
  );
}
