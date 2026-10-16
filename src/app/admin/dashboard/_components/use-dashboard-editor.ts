"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  DashboardCard,
  DashboardLayout,
} from "~/lib/dashboard/layout-schema";
import type { WidgetId } from "~/lib/dashboard/widgets";
import { MAX_DASHBOARD_CARDS, newCardId } from "~/lib/dashboard/layout-schema";
import { defaultTrendMetric, getWidget } from "~/lib/dashboard/widgets";

import { cardLabel, layoutSignature } from "./edit-labels";

export type CardMove = "start" | "earlier" | "later" | "end";

export type CardPatch = Partial<
  Pick<DashboardCard, "size" | "range" | "compare" | "metric">
>;

function targetIndex(move: CardMove, from: number, count: number): number {
  switch (move) {
    case "start":
      return 0;
    case "earlier":
      return Math.max(0, from - 1);
    case "later":
      return Math.min(count - 1, from + 1);
    case "end":
      return count - 1;
  }
}

function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/**
 * Dashboard edit state: the saved cards, the draft being edited, and the
 * operations the toolbar / card menu / drag-and-drop apply to the draft.
 *
 * `hiddenCount` is the number of stored cards whose feature is off right now.
 * The editor never sees them, but the server re-attaches them on save, so they
 * count toward the 24-card cap.
 *
 * Each mutating operation returns an owner-facing sentence for the polite
 * live region (the shell announces it), or null when nothing changed.
 */
export function useDashboardEditor({
  initialCards,
  initialHiddenCount,
  availableWidgetIds,
}: {
  initialCards: DashboardCard[];
  initialHiddenCount: number;
  availableWidgetIds: readonly WidgetId[];
}) {
  const available = useMemo(
    () => new Set<string>(availableWidgetIds),
    [availableWidgetIds],
  );
  const [savedCards, setSavedCards] = useState(initialCards);
  const [draftCards, setDraftCards] = useState(initialCards);
  const [hiddenCount, setHiddenCount] = useState(initialHiddenCount);
  const [isEditing, setIsEditing] = useState(false);

  // Adopt fresh server props (after `router.refresh()` or a navigation that
  // re-renders the page) while not editing, so the saved cards never lag the
  // stored layout. Adjusting state during render, keyed by content.
  const incomingSignature = `${layoutSignature(initialCards)}|${initialHiddenCount}`;
  const [seenSignature, setSeenSignature] = useState(incomingSignature);
  if (incomingSignature !== seenSignature && !isEditing) {
    setSeenSignature(incomingSignature);
    setSavedCards(initialCards);
    setDraftCards(initialCards);
    setHiddenCount(initialHiddenCount);
  }

  const isDirty =
    isEditing && layoutSignature(draftCards) !== layoutSignature(savedCards);
  const totalCount = draftCards.length + hiddenCount;
  const isFull = totalCount >= MAX_DASHBOARD_CARDS;

  const start = useCallback(() => {
    setDraftCards(savedCards);
    setIsEditing(true);
  }, [savedCards]);

  const cancel = useCallback(() => {
    setDraftCards(savedCards);
    setIsEditing(false);
  }, [savedCards]);

  /** Adopt a layout the server returned (save / reset) and leave edit mode. */
  const commit = useCallback(
    (layout: DashboardLayout) => {
      const visible = layout.cards.filter((card) => available.has(card.widget));
      setSavedCards(visible);
      setDraftCards(visible);
      setHiddenCount(layout.cards.length - visible.length);
      setIsEditing(false);
    },
    [available],
  );

  const add = (widget: WidgetId): { id: string; message: string } | null => {
    if (isFull) return null;
    const def = getWidget(widget);
    const card: DashboardCard = {
      id: newCardId(),
      widget,
      size: def.defaultSize,
    };
    if (def.supportsRange && def.defaultRange) card.range = def.defaultRange;
    if (def.kind === "trendChart") {
      // A Trend chart is always about one number; with none available there is
      // nothing to plot (the add dialog doesn't offer it then).
      const metric = defaultTrendMetric(available);
      if (!metric) return null;
      card.metric = metric;
    }
    const count = draftCards.length + 1;
    setDraftCards([...draftCards, card]);
    return {
      id: card.id,
      message: `Added ${cardLabel(card)} at position ${count} of ${count}.`,
    };
  };

  const remove = (id: string): string | null => {
    const card = draftCards.find((c) => c.id === id);
    if (!card) return null;
    setDraftCards(draftCards.filter((c) => c.id !== id));
    return `Removed ${cardLabel(card)}.`;
  };

  const move = (id: string, to: CardMove): string | null => {
    const from = draftCards.findIndex((c) => c.id === id);
    if (from === -1) return null;
    const dest = targetIndex(to, from, draftCards.length);
    if (dest === from) return null;
    setDraftCards(moveItem(draftCards, from, dest));
    return `${cardLabel(draftCards[from]!)} moved to position ${dest + 1} of ${draftCards.length}.`;
  };

  const update = (id: string, patch: CardPatch) => {
    setDraftCards((cards) =>
      cards.map((card) => (card.id === id ? { ...card, ...patch } : card)),
    );
  };

  return {
    savedCards,
    draftCards,
    /** What the grid shows: the draft while editing, the saved cards otherwise. */
    cards: isEditing ? draftCards : savedCards,
    hiddenCount,
    totalCount,
    isFull,
    isEditing,
    isDirty,
    start,
    cancel,
    commit,
    add,
    remove,
    move,
    update,
    reorder: setDraftCards,
  };
}
