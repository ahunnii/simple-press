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

import type { BusinessTypeId } from "~/lib/admin/setup-plan";
import type { DashboardRangeKey } from "~/lib/dashboard/ranges";
import type { WidgetId, WidgetSize } from "~/lib/dashboard/widgets";
import { isBusinessTypeId } from "~/lib/admin/setup-plan";
import {
  DASHBOARD_RANGE_KEYS,
  isDashboardRangeKey,
} from "~/lib/dashboard/ranges";
import {
  defaultTrendMetric,
  getWidget,
  isPlottableMetric,
  PLOTTABLE_METRIC_IDS,
  WIDGET_IDS,
  WIDGET_SIZES,
  WIDGETS,
} from "~/lib/dashboard/widgets";

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
  /**
   * The number a `trend-chart` card plots (a plottable widget id). Required on
   * trend cards, never set on any other widget.
   */
  metric?: WidgetId;
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
    metric: z.enum(WIDGET_IDS).optional(),
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
      if (def.kind === "trendChart") {
        if (!isPlottableMetric(card.metric)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cards", index, "metric"],
            message:
              card.metric === undefined
                ? `${def.label} needs a metric to plot`
                : `${def.label} can't plot "${String(card.metric)}"`,
          });
        }
      } else if (card.metric !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cards", index, "metric"],
          message: `${def.label} has no metric`,
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
  metric?: WidgetId,
): DashboardCard {
  return {
    id: `default-${widget}`,
    widget,
    size,
    ...(range ? { range } : {}),
    ...(metric ? { metric } : {}),
  };
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

/**
 * Defaults for the business types whose stores have no products (and so no
 * Orders card). `products` and legacy (null type) stores use
 * `DEFAULT_DASHBOARD_LAYOUT`. Cards whose feature is off are hidden at read
 * time, so a type default can name widgets a given store hasn't enabled; the
 * fill rule below tops the row back up.
 */
export const DEFAULT_LAYOUTS_BY_TYPE: Record<
  Exclude<BusinessTypeId, "products">,
  DashboardLayout
> = {
  donations: {
    version: 1,
    cards: [
      defaultCard("donations-total", "1x1", "30d"),
      defaultCard("donations-count", "1x1", "30d"),
      defaultCard("donors-count", "1x1", "30d"),
      defaultCard("donation-average", "1x1", "30d"),
      defaultCard("email-subscribers", "1x1"),
      defaultCard("form-submissions", "1x1", "30d"),
      defaultCard("visitors", "1x1", "30d"),
      defaultCard("upcoming-events", "1x1"),
      defaultCard("trend-chart", "4x2", "30d", "donations-total"),
    ],
  },
  services: {
    version: 1,
    cards: [
      defaultCard("form-submissions", "1x1", "30d"),
      defaultCard("quote-requests", "1x1", "30d"),
      defaultCard("invoices-outstanding", "1x1"),
      defaultCard("invoices-collected", "1x1", "30d"),
      defaultCard("upcoming-events", "1x1"),
      defaultCard("testimonials-pending", "1x1"),
      defaultCard("new-customers", "1x1", "30d"),
      defaultCard("visitors", "1x1", "30d"),
      defaultCard("trend-chart", "4x2", "30d", "form-submissions"),
    ],
  },
  informational: {
    version: 1,
    cards: [
      defaultCard("visitors", "1x1", "30d"),
      defaultCard("form-submissions", "1x1", "30d"),
      defaultCard("upcoming-events", "1x1"),
      defaultCard("testimonials-pending", "1x1"),
      defaultCard("email-subscribers", "1x1"),
      defaultCard("new-customers", "1x1", "30d"),
      defaultCard("total-customers", "1x1"),
      defaultCard("trend-chart", "4x2", "30d", "visitors"),
    ],
  },
};

/**
 * The default layout for a business type. Null (legacy) and unrecognized
 * types get `DEFAULT_DASHBOARD_LAYOUT`. The result is shared: clone before
 * mutating (`parseDashboardLayout` does).
 */
export function getDefaultLayout(
  businessType: string | null | undefined,
): DashboardLayout {
  if (isBusinessTypeId(businessType) && businessType !== "products") {
    return DEFAULT_LAYOUTS_BY_TYPE[businessType];
  }
  return DEFAULT_DASHBOARD_LAYOUT;
}

/** Stats per desktop row. */
const STATS_PER_ROW = 4;

/**
 * Complete a never-customized dashboard's last row of stats. Many default
 * cards need a feature the store doesn't have, so after hiding them the 4-col
 * grid can be left with a short row (or nothing at all). Appends AVAILABLE
 * stat widgets not already in the layout, in catalog order, as 1x1 cards with
 * their default range, until the number of visible 1x1 stats is a multiple of
 * 4 (or there are none left to add). With no visible card at all it fills one
 * full row, so a store never opens to an empty dashboard.
 *
 * Call only on a layout that came from the default (`usedDefault`): a saved
 * layout is the owner's choice and is never altered.
 */
export function fillDefaultStatRow(
  layout: DashboardLayout,
  availableIds: ReadonlySet<string>,
): DashboardLayout {
  const visible = layout.cards.filter((card) =>
    isCardVisible(card, availableIds),
  );
  const statCount = visible.filter(
    (card) => card.size === "1x1" && getWidget(card.widget).kind === "stat",
  ).length;

  let missing = (STATS_PER_ROW - (statCount % STATS_PER_ROW)) % STATS_PER_ROW;
  if (missing === 0 && visible.length === 0) missing = STATS_PER_ROW;
  if (missing === 0) return cloneLayout(layout);

  const present = new Set(layout.cards.map((card) => card.widget));
  const added: DashboardCard[] = [];
  for (const id of WIDGET_IDS) {
    if (added.length >= missing) break;
    const def = WIDGETS[id];
    if (def.kind !== "stat" || present.has(id) || !availableIds.has(id)) {
      continue;
    }
    added.push(defaultCard(id, "1x1", def.defaultRange ?? undefined));
  }

  const cards = [...layout.cards.map((card) => ({ ...card })), ...added];
  return { version: 1, cards: cards.slice(0, MAX_DASHBOARD_CARDS) };
}

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
 * widget has no range); strips `metric` from non-trend widgets and repairs a
 * trend card's bad `metric`; caps at MAX_DASHBOARD_CARDS. Anything that isn't a
 * version-1 layout object returns a fresh copy of the default, which is
 * `options.defaultLayout` (the business type's, see `getDefaultLayout`) or
 * `DEFAULT_DASHBOARD_LAYOUT` when omitted.
 */
export function parseDashboardLayout(
  raw: unknown,
  options: {
    defaultLayout?: DashboardLayout;
    /**
     * Widget ids this viewer can use. Only consulted to repair a Trend chart
     * whose `metric` is missing or invalid (→ the first available plottable
     * metric, or the card is dropped when there is none). Omitted → every
     * plottable metric counts as available.
     */
    availableIds?: ReadonlySet<string>;
  } = {},
): {
  layout: DashboardLayout;
  usedDefault: boolean;
} {
  const fallback = () => ({
    layout: cloneLayout(options.defaultLayout ?? DEFAULT_DASHBOARD_LAYOUT),
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

    if (def.kind === "trendChart") {
      // A valid but currently-unavailable metric is kept (the card is hidden
      // until its feature returns); only a bad one is repaired.
      const metric = isPlottableMetric(item.metric)
        ? item.metric
        : defaultTrendMetric(options.availableIds ?? PLOTTABLE_METRIC_IDS);
      if (!metric) continue;
      card.metric = metric;
    }

    seen.add(id);
    cards.push(card);
  }

  return { layout: { version: 1, cards }, usedDefault: false };
}

/**
 * Whether a card shows for this viewer: its widget is available and, for a
 * Trend chart, so is the metric it plots.
 */
export function isCardVisible(
  card: Pick<DashboardCard, "widget" | "metric">,
  availableIds: ReadonlySet<string>,
): boolean {
  if (!availableIds.has(card.widget)) return false;
  if (getWidget(card.widget).kind !== "trendChart") return true;
  return card.metric !== undefined && availableIds.has(card.metric);
}

/**
 * Split a layout into the cards this viewer can see now and the cards whose
 * feature is off (kept so turning the feature back on restores them). A Trend
 * chart counts as hidden while the metric it plots is unavailable.
 */
export function splitVisible(
  layout: DashboardLayout,
  availableIds: ReadonlySet<string>,
): { visible: DashboardCard[]; hidden: DashboardCard[] } {
  const visible: DashboardCard[] = [];
  const hidden: DashboardCard[] = [];
  for (const card of layout.cards) {
    (isCardVisible(card, availableIds) ? visible : hidden).push(card);
  }
  return { visible, hidden };
}

/** A fresh card id. Client-safe; falls back when randomUUID is unavailable (insecure origins). */
export function newCardId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
