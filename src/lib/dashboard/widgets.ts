import type { DashboardRangeKey } from "~/lib/dashboard/ranges";
import { DASHBOARD_RANGE_KEYS } from "~/lib/dashboard/ranges";

/**
 * Dashboard widget registry — metadata only (no renderers, no queries).
 *
 * Client-safe. The edit UI reads labels / sizes / ranges from here, the layout
 * parser validates stored cards against it, and the server metrics switch on
 * `id` and `kind`.
 *
 * WIDGET IDS ARE PERSISTED in `BusinessMembership.dashboardLayout`. Never
 * rename one; retire it by removing the entry (the lenient parser drops unknown
 * widgets) and add a new id instead.
 */

/**
 * Feature-flag keys the dashboard gates on. A subset of the keys in
 * `FEATURE_REGISTRY` (which is typed `Record<string, …>`, so there is no key
 * union to import); `widgets.test.ts` asserts every one exists there.
 */
export type DashboardFeatureKey =
  | "orders"
  | "products"
  | "inventory"
  | "donations"
  | "invoices"
  | "quickbooks"
  | "subscriptions"
  | "customerAccounts"
  | "quoteCalculator"
  | "forms"
  | "analytics"
  | "events"
  | "testimonials"
  | "emailMarketing";

export const WIDGET_SIZES = ["1x1", "2x1", "2x2", "4x2"] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];

export type WidgetFamily =
  | "charts"
  | "sales"
  | "inventory"
  | "donations"
  | "invoices"
  | "subscriptions"
  | "customers"
  | "traffic";

export type WidgetKind =
  | "stat"
  | "recentOrders"
  | "lowStock"
  | "topProducts"
  | "revenueChart"
  | "trendChart";

/** How the Trend chart draws a metric: sums/counts as bars, averages as a line. */
export type TrendStyle = "bar" | "line";

export type WidgetFormat = "currency" | "count" | "percent";
export type DeltaPolarity = "up-good" | "down-good";

export type WidgetRequirements = {
  /** Every one of these flags must be on. */
  flags?: readonly DashboardFeatureKey[];
  /** At least one of these flags must be on. */
  anyFlags?: readonly DashboardFeatureKey[];
  /** Umami must be configured for the store. */
  umami?: boolean;
  /**
   * At least one of these OTHER widgets must be available. Ids are strings
   * (not `WidgetId`) so a def can name widgets declared after it.
   */
  anyWidget?: readonly string[];
};

export type WidgetHrefFallback = {
  unlessFlag: DashboardFeatureKey;
  href: string;
};

export type WidgetDef = {
  id: WidgetId;
  label: string;
  description: string;
  family: WidgetFamily;
  kind: WidgetKind;
  requires: WidgetRequirements;
  sizes: readonly WidgetSize[];
  defaultSize: WidgetSize;
  supportsRange: boolean;
  /** Empty when `supportsRange` is false. */
  allowedRanges: readonly DashboardRangeKey[];
  /** null when `supportsRange` is false. */
  defaultRange: DashboardRangeKey | null;
  supportsComparison: boolean;
  /** A count "right now" (open orders, active subscribers): no range, no comparison. */
  isPointInTime: boolean;
  deltaPolarity: DeltaPolarity;
  /** Shows a sparkline at 2x1. */
  sparkline: boolean;
  /**
   * Present = this stat can be plotted by the Trend chart (its stat family
   * builds a per-bucket series), drawn as bars or a line. Sums and counts are
   * "bar"; averages are "line".
   */
  trend?: TrendStyle;
  format: WidgetFormat;
  /** Where the card links to. */
  href: string;
  /**
   * Link used instead of `href` when `unlessFlag` is off, because `href`'s page
   * would show "feature disabled" (low stock on an inventory-only store).
   * Resolve with `resolveWidgetHref`.
   */
  hrefFallback?: WidgetHrefFallback;
  /** Row count for list widgets, per size. */
  itemsBySize?: Partial<Record<WidgetSize, number>>;
};

const ALL_RANGES = DASHBOARD_RANGE_KEYS;
const NO_TODAY_RANGES = DASHBOARD_RANGE_KEYS.filter((k) => k !== "today");
const STAT_SIZES = ["1x1", "2x1"] as const satisfies readonly WidgetSize[];
const WIDE_SIZES = ["2x2", "4x2"] as const satisfies readonly WidgetSize[];
const LIST_ITEMS = { "2x2": 5, "4x2": 10 } as const;

type StatInput = {
  label: string;
  description: string;
  family: WidgetFamily;
  requires: WidgetRequirements;
  format: WidgetFormat;
  href: string;
  hrefFallback?: WidgetHrefFallback;
  deltaPolarity?: DeltaPolarity;
  /** Plottable by the Trend chart; see `WidgetDef.trend`. */
  trend?: TrendStyle;
  /** Set false when the family builds no per-bucket series. */
  sparkline?: boolean;
};

/** A ranged stat: 1x1 / 2x1, any range, comparison + sparkline. */
function rangedStat(input: StatInput) {
  return {
    ...input,
    kind: "stat",
    sizes: STAT_SIZES,
    defaultSize: "1x1",
    supportsRange: true,
    allowedRanges: ALL_RANGES,
    defaultRange: "30d",
    supportsComparison: true,
    isPointInTime: false,
    deltaPolarity: input.deltaPolarity ?? "up-good",
    sparkline: input.sparkline ?? true,
  } as const;
}

/** A "right now" stat: no range, no comparison, no sparkline. */
function pointInTimeStat(input: StatInput) {
  return {
    ...input,
    kind: "stat",
    sizes: STAT_SIZES,
    defaultSize: "1x1",
    supportsRange: false,
    allowedRanges: [],
    defaultRange: null,
    supportsComparison: false,
    isPointInTime: true,
    deltaPolarity: input.deltaPolarity ?? "up-good",
    sparkline: false,
  } as const;
}

const ORDERS = { flags: ["orders"] } as const satisfies WidgetRequirements;
/**
 * Low stock covers products/variants (`products`) and inventory-item pools
 * (`inventory`); either one is enough to have something to watch.
 */
const STOCK = {
  anyFlags: ["products", "inventory"],
} as const satisfies WidgetRequirements;
/** Products is disabled on an inventory-only store; send owners to Inventory. */
const STOCK_HREF_FALLBACK = {
  unlessFlag: "products",
  href: "/admin/inventory",
} as const satisfies WidgetHrefFallback;
const DONATIONS = {
  flags: ["donations"],
} as const satisfies WidgetRequirements;
const INVOICES = {
  anyFlags: ["invoices", "quickbooks"],
} as const satisfies WidgetRequirements;
const SUBSCRIPTIONS = {
  flags: ["subscriptions"],
} as const satisfies WidgetRequirements;
const CUSTOMERS = {
  flags: ["customerAccounts"],
} as const satisfies WidgetRequirements;
const TRAFFIC = {
  flags: ["analytics"],
  umami: true,
} as const satisfies WidgetRequirements;

/**
 * The ids `trend-chart` can plot, spelled out because the def for
 * `trend-chart` is built before `WIDGETS` exists. `widgets.test.ts` asserts
 * this equals `PLOTTABLE_METRIC_IDS` (every def with a `trend`).
 */
export const TREND_METRIC_CANDIDATES = [
  "gross-revenue",
  "net-revenue",
  "refunds",
  "order-count",
  "avg-order-value",
  "orders-fulfilled",
  "orders-cancelled",
  "donations-total",
  "donations-count",
  "donors-count",
  "donation-average",
  "invoices-collected",
  "new-customers",
  "quote-requests",
  "form-submissions",
  "visitors",
] as const;

/** Every widget, keyed by its persisted id. Object order = catalog order. */
const DEFS = {
  // ── Sales ────────────────────────────────────────────────────────────────
  "gross-revenue": rangedStat({
    trend: "bar",
    label: "Gross revenue",
    description: "Sales before refunds. Cancelled orders are left out.",
    family: "sales",
    requires: ORDERS,
    format: "currency",
    href: "/admin/finances",
  }),
  "net-revenue": rangedStat({
    trend: "bar",
    label: "Net revenue",
    description: "Sales minus refunds, matching Finances.",
    family: "sales",
    requires: ORDERS,
    format: "currency",
    href: "/admin/finances",
  }),
  refunds: rangedStat({
    trend: "bar",
    label: "Refunds",
    description: "Money refunded to customers.",
    family: "sales",
    requires: ORDERS,
    format: "currency",
    href: "/admin/finances",
    deltaPolarity: "down-good",
  }),
  "order-count": rangedStat({
    trend: "bar",
    label: "Orders",
    description: "Paid orders placed.",
    family: "sales",
    requires: ORDERS,
    format: "count",
    href: "/admin/orders",
  }),
  "avg-order-value": rangedStat({
    trend: "line",
    label: "Average order",
    description: "Net revenue (after refunds) divided by paid orders.",
    family: "sales",
    requires: ORDERS,
    format: "currency",
    href: "/admin/finances",
  }),
  "orders-to-fulfill": pointInTimeStat({
    label: "Orders to fulfill",
    description: "Paid orders waiting to be packed, shipped or picked up.",
    family: "sales",
    requires: ORDERS,
    format: "count",
    href: "/admin/orders",
  }),
  "orders-awaiting-payment": pointInTimeStat({
    label: "Awaiting payment",
    description: "Orders placed but not yet paid.",
    family: "sales",
    requires: ORDERS,
    format: "count",
    href: "/admin/orders",
  }),
  "orders-fulfilled": rangedStat({
    trend: "bar",
    label: "Orders fulfilled",
    description: "Of orders placed in range, how many are now fulfilled.",
    family: "sales",
    requires: ORDERS,
    format: "count",
    href: "/admin/orders",
  }),
  "orders-cancelled": rangedStat({
    trend: "bar",
    label: "Orders cancelled",
    description: "Of orders placed in range, how many are now cancelled.",
    family: "sales",
    requires: ORDERS,
    format: "count",
    href: "/admin/orders",
    deltaPolarity: "down-good",
  }),
  "recent-orders": {
    label: "Recent orders",
    description: "The latest orders placed.",
    family: "sales",
    kind: "recentOrders",
    requires: ORDERS,
    sizes: WIDE_SIZES,
    defaultSize: "2x2",
    supportsRange: false,
    allowedRanges: [],
    defaultRange: null,
    supportsComparison: false,
    isPointInTime: true,
    deltaPolarity: "up-good",
    sparkline: false,
    format: "currency",
    href: "/admin/orders",
    itemsBySize: LIST_ITEMS,
  },
  "revenue-chart": {
    label: "Revenue chart",
    description: "Gross, refunded and net revenue over time.",
    family: "charts",
    kind: "revenueChart",
    requires: ORDERS,
    sizes: WIDE_SIZES,
    defaultSize: "4x2",
    supportsRange: true,
    allowedRanges: NO_TODAY_RANGES,
    defaultRange: "30d",
    supportsComparison: true,
    isPointInTime: false,
    deltaPolarity: "up-good",
    sparkline: false,
    format: "currency",
    href: "/admin/finances",
  },
  "trend-chart": {
    label: "Trend chart",
    description: "Any number over time, as a chart.",
    family: "charts",
    kind: "trendChart",
    requires: { anyWidget: TREND_METRIC_CANDIDATES },
    sizes: WIDE_SIZES,
    defaultSize: "4x2",
    supportsRange: true,
    allowedRanges: NO_TODAY_RANGES,
    defaultRange: "30d",
    supportsComparison: true,
    isPointInTime: false,
    deltaPolarity: "up-good",
    sparkline: false,
    format: "count",
    // Each card links to its metric's own page; see `getWidget(metric).href`.
    href: "/admin/dashboard",
  },
  "top-products": {
    label: "Top products",
    description: "Best sellers by revenue.",
    family: "sales",
    kind: "topProducts",
    requires: ORDERS,
    sizes: WIDE_SIZES,
    defaultSize: "4x2",
    supportsRange: true,
    allowedRanges: ALL_RANGES,
    defaultRange: "30d",
    supportsComparison: false,
    isPointInTime: false,
    deltaPolarity: "up-good",
    sparkline: false,
    format: "currency",
    href: "/admin/products",
    itemsBySize: LIST_ITEMS,
  },

  // ── Inventory ────────────────────────────────────────────────────────────
  "low-stock-count": pointInTimeStat({
    label: "Low stock",
    description: "Products and inventory items at or below their alert level.",
    family: "inventory",
    requires: STOCK,
    format: "count",
    href: "/admin/products",
    hrefFallback: STOCK_HREF_FALLBACK,
    deltaPolarity: "down-good",
  }),
  "low-stock-list": {
    label: "Low stock alerts",
    description: "What is running low right now.",
    family: "inventory",
    kind: "lowStock",
    requires: STOCK,
    sizes: WIDE_SIZES,
    defaultSize: "2x2",
    supportsRange: false,
    allowedRanges: [],
    defaultRange: null,
    supportsComparison: false,
    isPointInTime: true,
    deltaPolarity: "down-good",
    sparkline: false,
    format: "count",
    href: "/admin/products",
    hrefFallback: STOCK_HREF_FALLBACK,
    itemsBySize: LIST_ITEMS,
  },

  // ── Donations ────────────────────────────────────────────────────────────
  "donations-total": rangedStat({
    trend: "bar",
    label: "Donations",
    description: "Money given, before refunds.",
    family: "donations",
    requires: DONATIONS,
    format: "currency",
    href: "/admin/donations",
  }),
  "donations-count": rangedStat({
    trend: "bar",
    label: "Gifts",
    description: "Number of donations received.",
    family: "donations",
    requires: DONATIONS,
    format: "count",
    href: "/admin/donations",
  }),
  "donors-count": rangedStat({
    trend: "bar",
    label: "Donors",
    description:
      "People who gave, counted once each by email. Gifts without an email are left out.",
    family: "donations",
    requires: DONATIONS,
    format: "count",
    href: "/admin/donations",
  }),
  "donation-average": rangedStat({
    trend: "line",
    label: "Average gift",
    description: "Donation total divided by number of gifts.",
    family: "donations",
    requires: DONATIONS,
    format: "currency",
    href: "/admin/donations",
  }),

  // ── Invoices ─────────────────────────────────────────────────────────────
  "invoices-outstanding": pointInTimeStat({
    label: "Invoices outstanding",
    description: "Amount still owed on sent invoices.",
    family: "invoices",
    requires: INVOICES,
    format: "currency",
    href: "/admin/invoices",
    deltaPolarity: "down-good",
  }),
  "invoices-overdue": pointInTimeStat({
    label: "Invoices overdue",
    description: "Amount owed on invoices past their due date.",
    family: "invoices",
    requires: INVOICES,
    format: "currency",
    href: "/admin/invoices",
    deltaPolarity: "down-good",
  }),
  "invoices-collected": rangedStat({
    trend: "bar",
    label: "Invoices collected",
    description: "Payments received on invoices.",
    family: "invoices",
    requires: INVOICES,
    format: "currency",
    href: "/admin/invoices",
  }),

  // ── Subscriptions ────────────────────────────────────────────────────────
  "active-subscribers": pointInTimeStat({
    label: "Active subscribers",
    description:
      "Subscriptions that are currently active (paused and past-due excluded, matching the Subscriptions page).",
    family: "subscriptions",
    requires: SUBSCRIPTIONS,
    format: "count",
    href: "/admin/subscriptions",
  }),
  mrr: pointInTimeStat({
    label: "Monthly recurring revenue",
    description: "What active subscriptions bill per month.",
    family: "subscriptions",
    requires: SUBSCRIPTIONS,
    format: "currency",
    href: "/admin/subscriptions",
  }),

  // ── Customers ────────────────────────────────────────────────────────────
  "new-customers": rangedStat({
    trend: "bar",
    label: "New customers",
    description: "Customer accounts created.",
    family: "customers",
    requires: CUSTOMERS,
    format: "count",
    href: "/admin/customers",
  }),
  "total-customers": pointInTimeStat({
    label: "Total customers",
    description: "All customer accounts.",
    family: "customers",
    requires: CUSTOMERS,
    format: "count",
    href: "/admin/customers",
  }),
  "quote-requests": rangedStat({
    trend: "bar",
    label: "Quote requests",
    description: "Quotes submitted through your calculators.",
    family: "customers",
    requires: { flags: ["quoteCalculator"] },
    format: "count",
    href: "/admin/quotes",
  }),
  "form-submissions": rangedStat({
    trend: "bar",
    label: "Form submissions",
    description: "Responses submitted on your site (imports not counted).",
    family: "customers",
    requires: { flags: ["forms"] },
    format: "count",
    href: "/admin/forms",
  }),
  "upcoming-events": pointInTimeStat({
    label: "Upcoming events",
    description:
      "Published events that haven't ended yet, including ones happening now.",
    family: "customers",
    requires: { flags: ["events"] },
    format: "count",
    href: "/admin/events",
  }),
  "testimonials-pending": pointInTimeStat({
    label: "Testimonials to approve",
    description: "Testimonials waiting for your approval.",
    family: "customers",
    requires: { flags: ["testimonials"] },
    format: "count",
    href: "/admin/testimonials",
    deltaPolarity: "down-good",
  }),
  "email-subscribers": pointInTimeStat({
    label: "Email subscribers",
    description:
      "Customers who opted in to marketing email, matching the audience on the Email Marketing page.",
    family: "customers",
    requires: { flags: ["emailMarketing"] },
    format: "count",
    href: "/admin/marketing",
  }),

  // ── Traffic ──────────────────────────────────────────────────────────────
  visitors: rangedStat({
    trend: "bar",
    label: "Visitors",
    description: "Unique visitors to your site.",
    family: "traffic",
    requires: TRAFFIC,
    format: "count",
    href: "/admin/analytics",
  }),
  "conversion-rate": rangedStat({
    // No per-bucket series (orders per visitor needs both), so no sparkline or trend.
    sparkline: false,
    label: "Conversion rate",
    description: "Paid orders per visitor.",
    family: "traffic",
    requires: TRAFFIC,
    format: "percent",
    href: "/admin/analytics",
  }),
} as const;

export type WidgetId = keyof typeof DEFS;

/** Every widget id, in catalog order. */
export const WIDGET_IDS = Object.keys(DEFS) as [WidgetId, ...WidgetId[]];

function buildWidgets(): Readonly<Record<WidgetId, WidgetDef>> {
  const out = {} as Record<WidgetId, WidgetDef>;
  for (const id of WIDGET_IDS) {
    // The annotation is what type-checks every DEFS entry against WidgetDef.
    const def: WidgetDef = { id, ...DEFS[id] };
    out[id] = def;
  }
  return out;
}

export const WIDGETS = buildWidgets();

/** Families in display order (the add-card dialog's groups). */
export const WIDGET_FAMILIES: ReadonlyArray<{
  family: WidgetFamily;
  label: string;
}> = [
  { family: "charts", label: "Charts" },
  { family: "sales", label: "Orders and revenue" },
  { family: "inventory", label: "Inventory" },
  { family: "donations", label: "Donations" },
  { family: "invoices", label: "Invoices" },
  { family: "subscriptions", label: "Subscriptions" },
  { family: "customers", label: "Customers" },
  { family: "traffic", label: "Traffic" },
];

export function isWidgetId(value: unknown): value is WidgetId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(DEFS, value)
  );
}

export function getWidget(id: WidgetId): WidgetDef;
export function getWidget(id: string): WidgetDef | undefined;
export function getWidget(id: string): WidgetDef | undefined {
  return isWidgetId(id) ? WIDGETS[id] : undefined;
}

export type WidgetAvailabilityContext = {
  isEnabled: (key: DashboardFeatureKey) => boolean;
  umamiConfigured: boolean;
};

export function isWidgetAvailable(
  def: WidgetDef,
  ctx: WidgetAvailabilityContext,
): boolean {
  const { flags, anyFlags, umami, anyWidget } = def.requires;
  if (flags && !flags.every((key) => ctx.isEnabled(key))) return false;
  if (
    anyFlags &&
    anyFlags.length > 0 &&
    !anyFlags.some((key) => ctx.isEnabled(key))
  )
    return false;
  if (umami && !ctx.umamiConfigured) return false;
  if (anyWidget && anyWidget.length > 0) {
    const other = anyWidget.some((id) => {
      const target = getWidget(id);
      return target !== undefined && isWidgetAvailable(target, ctx);
    });
    if (!other) return false;
  }
  return true;
}

export function availableWidgetIds(
  ctx: WidgetAvailabilityContext,
): Set<WidgetId> {
  return new Set(
    WIDGET_IDS.filter((id) => isWidgetAvailable(WIDGETS[id], ctx)),
  );
}

/**
 * The range a card actually uses: its own if the widget allows it, else the
 * widget default; always null for widgets without a range.
 */
export function resolveCardRange(
  def: WidgetDef,
  range: DashboardRangeKey | null | undefined,
): DashboardRangeKey | null {
  if (!def.supportsRange) return null;
  if (range && def.allowedRanges.includes(range)) return range;
  return def.defaultRange;
}

/**
 * Whether a card shows its comparison chip. On by default (`compare`
 * undefined); forced off for point-in-time widgets, widgets without a
 * comparison, and All time (nothing to compare against).
 */
export function effectiveCompare(
  card: { range?: DashboardRangeKey | null; compare?: boolean },
  def: WidgetDef,
): boolean {
  if (!def.supportsComparison || def.isPointInTime) return false;
  const range = resolveCardRange(def, card.range);
  if (range === null || range === "all") return false;
  return card.compare ?? true;
}

/**
 * Where a card links for this store: `href`, or its fallback when the flag
 * `href` needs is off.
 */
export function resolveWidgetHref(
  def: WidgetDef,
  isEnabled: (key: DashboardFeatureKey) => boolean,
): string {
  const fallback = def.hrefFallback;
  return fallback && !isEnabled(fallback.unlessFlag) ? fallback.href : def.href;
}

// ── Trend chart metrics ─────────────────────────────────────────────────────

/** Every widget the Trend chart can plot (those with a `trend`), in catalog order. */
export const PLOTTABLE_METRIC_IDS: readonly WidgetId[] = WIDGET_IDS.filter(
  (id) => WIDGETS[id].trend !== undefined,
);

/** Whether `id` is a widget the Trend chart can plot. */
export function isPlottableMetric(id: unknown): id is WidgetId {
  return isWidgetId(id) && WIDGETS[id].trend !== undefined;
}

/** How the Trend chart draws a metric. */
export function trendStyle(id: WidgetId): TrendStyle {
  return WIDGETS[id].trend ?? "bar";
}

/** The store's headline number first; anything else falls to catalog order. */
const TREND_METRIC_PREFERENCE: readonly WidgetId[] = [
  "net-revenue",
  "donations-total",
  "form-submissions",
  "visitors",
  "new-customers",
];

function hasId(
  available: ReadonlySet<string> | readonly string[],
  id: string,
): boolean {
  return Array.isArray(available)
    ? (available as readonly string[]).includes(id)
    : (available as ReadonlySet<string>).has(id);
}

/**
 * The metric a new Trend chart plots: the first available of net revenue,
 * donations, form submissions, visitors, new customers, then the first
 * available plottable metric. Null when none is available.
 */
export function defaultTrendMetric(
  available: ReadonlySet<string> | readonly string[],
): WidgetId | null {
  const has = (id: string) => hasId(available, id);
  return (
    TREND_METRIC_PREFERENCE.find(has) ?? PLOTTABLE_METRIC_IDS.find(has) ?? null
  );
}

/** A metric's own name, e.g. "Donations" (the Shows picker's option label). */
export function trendMetricLabel(id: WidgetId): string {
  return WIDGETS[id].label;
}

/** Card title for a Trend chart on `metric`, e.g. "Donations over time". */
export function trendChartTitle(metric: WidgetId): string {
  return `${WIDGETS[metric].label} over time`;
}

/**
 * The available plottable metrics grouped by widget family, in display order,
 * for the Shows picker.
 */
export function trendMetricGroups(
  available: ReadonlySet<string> | readonly string[],
): Array<{
  family: WidgetFamily;
  label: string;
  metrics: Array<{ id: WidgetId; label: string; style: TrendStyle }>;
}> {
  return WIDGET_FAMILIES.map(({ family, label }) => ({
    family,
    label,
    metrics: PLOTTABLE_METRIC_IDS.filter(
      (id) => WIDGETS[id].family === family && hasId(available, id),
    ).map((id) => ({
      id,
      label: WIDGETS[id].label,
      style: trendStyle(id),
    })),
  })).filter((group) => group.metrics.length > 0);
}
