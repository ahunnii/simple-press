/**
 * The stored dashboard layout (`BusinessMembership.dashboardLayout`): its
 * shape, a strict schema for saves, a lenient parser for reads, and the
 * default layout.
 *
 * Client-safe.
 *
 *   null / unparseable stored value → DEFAULT_DASHBOARD_LAYOUT (usedDefault)
 *   `{ version: 1, cards: [] }`     → kept: an owner who removed every card
 *                                    sees an empty dashboard, not the default
 *                                    coming back.
 */

import { z } from "zod";

import type { DashboardRangeKey } from "~/lib/dashboard/ranges";
import type { WidgetId, WidgetSize } from "~/lib/dashboard/widgets";
import {
  DASHBOARD_RANGE_KEYS,
  isDashboardRangeKey,
} from "~/lib/dashboard/ranges";
import { getWidget, WIDGET_IDS, WIDGET_SIZES } from "~/lib/dashboard/widgets";

export const MAX_DASHBOARD_CARDS = 24;
export const MAX_CARD_ID_LENGTH = 64;
const CARD_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type DashboardCard = {
  /** Unique within the layout; lets the same widget appear more than once. */
  id: string;
  widget: WidgetId;
  size: WidgetSize;
  /** Missing → the widget's default range. Never set for range-less widgets. */
  range?: DashboardRangeKey;
  /** Missing → on. */
  compare?: boolean;
};

export type DashboardLayout = {
  version: 1;
  cards: DashboardCard[];
};

const cardSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(MAX_CARD_ID_LENGTH)
      .regex(
        CARD_ID_PATTERN,
        "Card ids may only use letters, numbers, - and _",
      ),
    widget: z.enum(WIDGET_IDS),
    size: z.enum(WIDGET_SIZES),
    range: z.enum(DASHBOARD_RANGE_KEYS).optional(),
    compare: z.boolean().optional(),
  })
  .strict();

/** Strict validation for `dashboard.saveLayout`. */
export const dashboardLayoutSaveSchema = z
  .object({
    version: z.literal(1),
    cards: z.array(cardSchema).max(MAX_DASHBOARD_CARDS),
  })
  .strict()
  .superRefine((layout, ctx) => {
    const seen = new Set<string>();
    layout.cards.forEach((card, index) => {
      const def = getWidget(card.widget);
      if (seen.has(card.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cards", index, "id"],
          message: `Duplicate card id "${card.id}"`,
        });
      }
      seen.add(card.id);
      if (!def.sizes.includes(card.size)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cards", index, "size"],
          message: `${def.label} can't be ${card.size}`,
        });
      }
      if (card.range !== undefined && !def.allowedRanges.includes(card.range)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cards", index, "range"],
          message: def.supportsRange
            ? `${def.label} can't show "${card.range}"`
            : `${def.label} has no time range`,
        });
      }
    });
  });

function defaultCard(
  widget: WidgetId,
  size: WidgetSize,
  range?: DashboardRangeKey,
): DashboardCard {
  return range
    ? { id: `default-${widget}`, widget, size, range }
    : { id: `default-${widget}`, widget, size };
}

/**
 * Close to the pre-customization dashboard. Ids are deterministic. Four 1×1
 * stats fill one desktop row exactly; Conversion rate (the old optional fifth
 * card) is left to the Add card picker so the default grid has no holes.
 */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  version: 1,
  cards: [
    defaultCard("net-revenue", "1x1", "today"),
    defaultCard("gross-revenue", "1x1", "7d"),
    defaultCard("order-count", "1x1", "7d"),
    defaultCard("avg-order-value", "1x1", "30d"),
    defaultCard("recent-orders", "2x2"),
    defaultCard("low-stock-list", "2x2"),
    defaultCard("revenue-chart", "4x2", "30d"),
    defaultCard("top-products", "4x2", "30d"),
  ],
};

function cloneLayout(layout: DashboardLayout): DashboardLayout {
  return { version: 1, cards: layout.cards.map((card) => ({ ...card })) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Lenient read of a stored layout. Never throws.
 *
 * Drops malformed cards, unknown widgets and duplicate ids; repairs a bad size
 * (→ widget default) or a bad range (→ widget default, or removed when the
 * widget has no range); caps at MAX_DASHBOARD_CARDS. Anything that isn't a
 * version-1 layout object returns a fresh copy of the default.
 */
export function parseDashboardLayout(raw: unknown): {
  layout: DashboardLayout;
  usedDefault: boolean;
} {
  const fallback = () => ({
    layout: cloneLayout(DEFAULT_DASHBOARD_LAYOUT),
    usedDefault: true,
  });

  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.cards)) {
    return fallback();
  }

  const cards: DashboardCard[] = [];
  const seen = new Set<string>();

  for (const item of raw.cards) {
    if (cards.length >= MAX_DASHBOARD_CARDS) break;
    if (!isRecord(item)) continue;

    const { id, widget, size, range, compare } = item;
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      id.length > MAX_CARD_ID_LENGTH ||
      !CARD_ID_PATTERN.test(id) ||
      seen.has(id)
    ) {
      continue;
    }
    if (typeof widget !== "string") continue;
    const def = getWidget(widget);
    if (!def) continue;

    const card: DashboardCard = {
      id,
      widget: def.id,
      size:
        typeof size === "string" &&
        (def.sizes as readonly string[]).includes(size)
          ? (size as WidgetSize)
          : def.defaultSize,
    };

    if (def.supportsRange && range !== undefined) {
      const repaired =
        isDashboardRangeKey(range) && def.allowedRanges.includes(range)
          ? range
          : def.defaultRange;
      if (repaired) card.range = repaired;
    }
    if (typeof compare === "boolean") card.compare = compare;

    seen.add(id);
    cards.push(card);
  }

  return { layout: { version: 1, cards }, usedDefault: false };
}

/**
 * Split a layout into the cards this viewer can see now and the cards whose
 * feature is off (kept so turning the feature back on restores them).
 */
export function splitVisible(
  layout: DashboardLayout,
  availableIds: ReadonlySet<string>,
): { visible: DashboardCard[]; hidden: DashboardCard[] } {
  const visible: DashboardCard[] = [];
  const hidden: DashboardCard[] = [];
  for (const card of layout.cards) {
    (availableIds.has(card.widget) ? visible : hidden).push(card);
  }
  return { visible, hidden };
}

/** A fresh card id. Client-safe; falls back when randomUUID is unavailable (insecure origins). */
export function newCardId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
