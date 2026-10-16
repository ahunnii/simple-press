"use client";

import type {
  Announcements,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  ScreenReaderInstructions,
  UniqueIdentifier,
} from "@dnd-kit/core";
import type { SortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import { Suspense, useId, useState } from "react";
import Link from "next/link";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";

import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import type { WidgetId } from "~/lib/dashboard/widgets";
import { dashboardRangeLabel } from "~/lib/dashboard/ranges";
import { getWidget, resolveCardRange } from "~/lib/dashboard/widgets";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import { CardErrorBoundary } from "./card-error-boundary";
import {
  cardHref,
  cardLabel,
  cardTitle,
  SIZE_META,
  sizeLabel,
} from "./edit-labels";
import { GhostCells } from "./ghost-cells";
import { DASHBOARD_GRID_CLASSES, WIDGET_SIZE_CLASSES } from "./grid-classes";
import { WidgetFrame } from "./widget-frame";
import { WidgetSkeleton } from "./widget-skeleton";
import { WidgetBody } from "./widgets";

/**
 * Live reorder preview while dragging. `rectSortingStrategy` slides the other
 * cards into their would-be slots; with mixed sizes and `grid-flow-row-dense`
 * that preview is approximate (the browser re-packs on drop). If it reads as
 * jumpy in QA, flip this to false: cards then stay put during the drag, the
 * card under the pointer gets an insertion ring, and the move lands on drop.
 */
const LIVE_REORDER_PREVIEW = true;

const noLiveReorder: SortingStrategy = () => null;

const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "To pick up a card, press Space or Enter. Use the arrow keys to move it, then press Space or Enter again to drop it in its new place. Press Escape to put it back.",
};

/**
 * The card grid. Owns no layout state (the shell does).
 *
 * Each card is `sortable wrapper > frame > error boundary > Suspense > body`,
 * so a slow or failing card (Umami, say) only holds up or breaks itself. The
 * DndContext is always mounted (sorting is disabled outside edit mode) so
 * entering and leaving edit mode never remounts a card or refetches its data.
 *
 * Edit mode adds: dashed ghost cells behind the cards, a drag handle (md and
 * up) ahead of `renderEditControls`, a size chip on each card, and `trailing`
 * (the Add card tile) as the last grid item.
 */
export function DashboardGrid({
  cards,
  isEditing = false,
  renderEditControls,
  onReorder,
  trailing,
  highlightId,
  widgetHrefs,
  canEdit = false,
  hasAvailableWidgets = false,
  onAddCard,
}: {
  cards: DashboardCard[];
  isEditing?: boolean;
  renderEditControls?: (card: DashboardCard, index: number) => ReactNode;
  /** Edit mode: the cards in their new order after a drag. */
  onReorder?: (cards: DashboardCard[]) => void;
  /** Edit mode: rendered as the last grid item (the Add card tile). */
  trailing?: ReactNode;
  /** A card to ring briefly (just added). */
  highlightId?: string | null;
  /** Per-store card links that differ from the registry's `href`. */
  widgetHrefs?: Partial<Record<WidgetId, string>>;
  /** False for viewers without edit rights (staff, platform admins). */
  canEdit?: boolean;
  /** Whether this store can show at least one card right now. */
  hasAvailableWidgets?: boolean;
  /** Empty state: enter edit mode and open the add-card dialog. */
  onAddCard?: () => void;
}) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);

  if (cards.length === 0 && !isEditing) {
    if (canEdit && hasAvailableWidgets) {
      return (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-foreground text-base font-medium">
            No cards on your dashboard yet.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Add cards for the parts of your site you want to keep an eye on.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onAddCard}
          >
            Add a card
          </Button>
        </div>
      );
    }
    if (canEdit) {
      return (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-foreground text-base font-medium">
            No cards on your dashboard yet.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Cards show up when you turn on features like Forms, Analytics,
            Donations or Invoices.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/admin/settings/features">Turn on features</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        There&apos;s nothing to show on the dashboard yet.
      </div>
    );
  }

  const count = cards.length;
  const indexOf = (id: UniqueIdentifier) =>
    cards.findIndex((card) => card.id === id);
  const labelOf = (id: UniqueIdentifier) => {
    const card = cards.find((c) => c.id === id);
    return card ? cardLabel(card) : "Card";
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${labelOf(active.id)}. Position ${indexOf(active.id) + 1} of ${count}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${labelOf(active.id)} is over position ${indexOf(over.id) + 1} of ${count}.`
        : `${labelOf(active.id)} is not over a position.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${labelOf(active.id)} dropped at position ${indexOf(over.id) + 1} of ${count}.`
        : `${labelOf(active.id)} dropped back at position ${indexOf(active.id) + 1} of ${count}.`,
    onDragCancel: ({ active }) =>
      `Move cancelled. ${labelOf(active.id)} is back at position ${indexOf(active.id) + 1} of ${count}.`,
  };

  const clearDrag = () => {
    setActiveId(null);
    setOverId(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    clearDrag();
    if (!over || active.id === over.id) return;
    const from = indexOf(active.id);
    const to = indexOf(over.id);
    if (from === -1 || to === -1) return;
    onReorder?.(arrayMove(cards, from, to));
  };

  const activeCard = activeId
    ? cards.find((card) => card.id === activeId)
    : undefined;

  return (
    <div className="grid grid-cols-1">
      {isEditing && <GhostCells cards={cards} />}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{
          announcements,
          screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
        }}
        onDragStart={({ active }: DragStartEvent) => setActiveId(active.id)}
        onDragOver={({ over }: DragOverEvent) => setOverId(over?.id ?? null)}
        onDragEnd={handleDragEnd}
        onDragCancel={clearDrag}
      >
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={LIVE_REORDER_PREVIEW ? rectSortingStrategy : noLiveReorder}
          disabled={!isEditing}
        >
          <div
            className={cn(DASHBOARD_GRID_CLASSES, "col-start-1 row-start-1")}
          >
            {cards.map((card, index) => (
              <SortableCard
                key={card.id}
                card={card}
                isEditing={isEditing}
                isHighlighted={highlightId === card.id}
                isDropTarget={
                  !LIVE_REORDER_PREVIEW &&
                  overId === card.id &&
                  activeId !== card.id
                }
                editControls={renderEditControls?.(card, index)}
                href={cardHref(card, widgetHrefs)}
              />
            ))}
            {isEditing && trailing}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeCard ? <DragPreview card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SortableCard({
  card,
  isEditing,
  isHighlighted,
  isDropTarget,
  editControls,
  href,
}: {
  card: DashboardCard;
  isEditing: boolean;
  isHighlighted: boolean;
  isDropTarget: boolean;
  editControls: ReactNode;
  href: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: !isEditing });

  const label = cardLabel(card);

  return (
    <div
      ref={setNodeRef}
      data-card-id={card.id}
      // Translate, not Transform: with mixed sizes the strategy's scale would
      // stretch a 1×1 to a 2×2's box mid-drag.
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative min-w-0",
        WIDGET_SIZE_CLASSES[card.size],
        isDragging && "z-10 opacity-40",
      )}
    >
      <WidgetFrame
        card={card}
        isEditing={isEditing}
        href={href}
        className={cn(
          "transition-shadow duration-300",
          isEditing && "ring-primary/15 ring-2",
          isDropTarget && "ring-primary ring-2",
          isHighlighted &&
            "ring-primary ring-offset-background ring-2 ring-offset-2",
        )}
      >
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <CardErrorBoundary onReset={reset}>
              <Suspense fallback={<WidgetSkeleton size={card.size} />}>
                <WidgetBody card={card} href={href} />
              </Suspense>
            </CardErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </WidgetFrame>
      {isEditing && (
        // Edit controls sit in a bar along the card's bottom edge rather than
        // the header, so a 1×1 card's title and range stay readable.
        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2">
          <div className="bg-background/95 pointer-events-auto flex items-center rounded-md border shadow-xs">
            <button
              ref={setActivatorNodeRef}
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Drag to move ${label}`}
              className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 hidden size-7 cursor-grab touch-none items-center justify-center rounded-md outline-none focus-visible:ring-[3px] active:cursor-grabbing md:inline-flex"
            >
              <GripVertical className="size-4" aria-hidden="true" />
            </button>
            {editControls}
          </div>
          <span
            aria-hidden="true"
            className="bg-background/90 text-muted-foreground rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-medium tabular-nums"
          >
            {SIZE_META[card.size].dims}
          </span>
        </div>
      )}
    </div>
  );
}

/** What follows the pointer while dragging: title, range and footprint only. */
function DragPreview({ card }: { card: DashboardCard }) {
  const def = getWidget(card.widget);
  const range = resolveCardRange(def, card.range);
  return (
    <div className="bg-card ring-primary/40 flex h-full w-full cursor-grabbing flex-col gap-2 rounded-xl border p-4 shadow-xl ring-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground truncate text-sm font-medium">
          {cardTitle(card)}
        </span>
        {range && (
          <Badge variant="secondary" className="font-normal">
            {dashboardRangeLabel(range)}
          </Badge>
        )}
      </div>
      <span className="text-muted-foreground mt-auto text-xs">
        {sizeLabel(card.size)}
      </span>
    </div>
  );
}
