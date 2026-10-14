import type { CartLineItem } from "./types";
import type { UnavailableReason } from "./validate-cart";
import type {
  CustomizationComponent,
  CustomizationSnapshot,
  CustomizerDefinition,
  CustomizerError,
  CustomizerSelection,
} from "~/lib/customizer/types";
import type { ReservationEntry } from "~/lib/inventory/reservation";
import {
  configKey,
  isEmptySelection,
  normalizeSelection,
} from "~/lib/customizer/canonical";
import { readCustomizationSnapshot } from "~/lib/customizer/display";
import { priceConfiguration } from "~/lib/customizer/evaluate";

/**
 * Product customizer × one-time checkout. Pure helpers shared by
 * `create-session` (pricing, stock, reservation) and the webhook (reading the
 * stored builds back). No I/O.
 *
 * ── Where a build lives between checkout and order ──────────────────────────
 *
 * Stripe metadata values are capped at 500 characters, so the build cannot
 * ride on the session. create-session stores it on the checkout's
 * `InventoryReservation.lineConfigs` as `{ [serverLineKey]: { selection,
 * snapshot } }` — the FULL priced snapshot, not just the ids — and tags each
 * Stripe line with `metadata.lineConfig = serverLineKey`. The webhook copies
 * that snapshot onto the `OrderItem` verbatim. It never re-prices: the
 * snapshot is what the shopper saw and paid for, and the order item's price is
 * Stripe's `unit_amount` (what was actually charged). An owner editing or
 * deleting an option during a days-long bank payment therefore cannot change
 * or lose the order's build.
 */

export const LINE_CONFIG_METADATA_KEY = "lineConfig";
export const OPTIONS_SUMMARY_METADATA_KEY = "optionsSummary";

/** Stripe metadata values are capped at 500; keep headroom. */
export const STRIPE_OPTIONS_SUMMARY_MAX = 480;
/** Stripe product descriptions: kept well inside Stripe's limits. */
export const STRIPE_DESCRIPTION_MAX = 500;

export type StoredLineConfig = {
  selection: CustomizerSelection;
  snapshot: CustomizationSnapshot;
};

/** `InventoryReservation.lineConfigs`. */
export type StoredLineConfigs = Record<string, StoredLineConfig>;

/**
 * The server's key for a configured line: `L<index>-<configKey>`. Unique per
 * line by index (two lines with the same build stay distinct), never derived
 * from client input, so it is always a safe JSON object key.
 */
export function serverLineKey(index: number, key: string): string {
  return `L${index}-${key}`;
}

/**
 * Read `InventoryReservation.lineConfigs` back into snapshots per line key.
 * Malformed entries are dropped (the webhook then falls back to the degraded
 * summary-only snapshot for that line).
 */
export function readLineConfigSnapshots(
  json: unknown,
): Map<string, CustomizationSnapshot> {
  const out = new Map<string, CustomizationSnapshot>();
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return out;
  }
  for (const [key, entry] of Object.entries(json as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null) continue;
    const snapshot = readCustomizationSnapshot(
      (entry as { snapshot?: unknown }).snapshot,
    );
    if (snapshot) out.set(key, snapshot);
  }
  return out;
}

/**
 * The rejection reason for a failed configuration — the same split as
 * `product.getCartItemsStatus`: only a build whose every error is a sold-out
 * linked value is scarcity; anything else is a build the store can't honour.
 */
export function customizerFailureReason(
  errors: readonly CustomizerError[],
): "option-out-of-stock" | "configuration-invalid" {
  return errors.length > 0 &&
    errors.every((e) => e.code === "value-out-of-stock")
    ? "option-out-of-stock"
    : "configuration-invalid";
}

/**
 * Cut to at most `max` UTF-16 code units (what Stripe's length limits count)
 * without splitting a surrogate pair, ending with "…" when cut.
 */
export function truncateUtf16(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = "";
  for (const char of text) {
    if (out.length + char.length > max - 1) break;
    out += char;
  }
  return out.trimEnd() + "…";
}

// ---------------------------------------------------------------------------
// Pricing every line of the cart
// ---------------------------------------------------------------------------

export type CheckoutLine = CartLineItem & {
  configuration?: Partial<CustomizerSelection> | null;
};

export type ConfiguredLine = {
  lineIndex: number;
  /** `serverLineKey(index, configKey)`. */
  serverKey: string;
  selection: CustomizerSelection;
  unitPrice: number;
  snapshot: CustomizationSnapshot;
  components: CustomizationComponent[];
};

export type LineFailure = { lineIndex: number; reason: UnavailableReason };

export function isConfiguredLine(item: CheckoutLine): boolean {
  return !!item.configuration && !isEmptySelection(item.configuration);
}

/**
 * Re-price every configured line from ids against the stored definitions.
 *
 * - A posted build with the flag off, or on a product with no options →
 *   `configuration-invalid`.
 * - A build `priceConfiguration` rejects → `configuration-invalid` /
 *   `option-out-of-stock` (`customizerFailureReason`). Stock here is per line;
 *   cross-line totals are `findOverdrawnLines`'s job.
 * - A product WITH options posted with no build is priced as an empty build:
 *   a required group fails it (`configuration-invalid`), an all-optional
 *   product sells as a plain line.
 *
 * `basePriceOf(index)` is the server-resolved product/variant price, or
 * `null` for a line the catalog check already rejected (skipped here).
 */
export function evaluateCheckoutCustomizations(params: {
  items: readonly CheckoutLine[];
  optionsEnabled: boolean;
  definitions: ReadonlyMap<string, CustomizerDefinition>;
  basePriceOf: (index: number) => number | null;
}): {
  configured: Map<number, ConfiguredLine>;
  failures: LineFailure[];
  /**
   * Unit price per configured line, for the subtotal — including lines that
   * failed ONLY on stock (priced as if in stock). Prices never depend on
   * stock, so a discount's minimum-purchase check reads the same subtotal
   * before and after the shopper's own hold is released.
   */
  unitPrices: Map<number, number>;
} {
  const configured = new Map<number, ConfiguredLine>();
  const failures: LineFailure[] = [];
  const unitPrices = new Map<number, number>();

  for (const [index, item] of params.items.entries()) {
    const basePrice = params.basePriceOf(index);
    if (basePrice === null) continue;
    const definition = params.optionsEnabled
      ? params.definitions.get(item.productId)
      : undefined;

    if (!isConfiguredLine(item)) {
      if (!definition) continue;
      const empty = priceConfiguration(
        definition,
        { choices: [], texts: [] },
        { basePrice, lineQty: item.quantity },
      );
      if (!empty.ok) {
        failures.push({ lineIndex: index, reason: "configuration-invalid" });
      }
      continue;
    }

    if (!definition) {
      failures.push({ lineIndex: index, reason: "configuration-invalid" });
      continue;
    }

    const selection = normalizeSelection(item.configuration);
    const priced = priceConfiguration(definition, selection, {
      basePrice,
      lineQty: item.quantity,
    });
    if (!priced.ok) {
      const reason = customizerFailureReason(priced.errors);
      failures.push({ lineIndex: index, reason });
      if (reason === "option-out-of-stock") {
        const unstocked = priceConfiguration(
          withoutStockLimits(definition),
          selection,
          { basePrice, lineQty: item.quantity },
        );
        if (unstocked.ok) unitPrices.set(index, unstocked.unitPrice);
      }
      continue;
    }
    unitPrices.set(index, priced.unitPrice);
    configured.set(index, {
      lineIndex: index,
      serverKey: serverLineKey(index, configKey(selection)),
      selection,
      unitPrice: priced.unitPrice,
      snapshot: priced.snapshot,
      components: priced.components,
    });
  }

  return { configured, failures, unitPrices };
}

/**
 * A copy of `def` whose linked values report unlimited stock — for pricing
 * that must not depend on stock (the checkout subtotal of a line that only
 * failed on stock; manual orders, which record real-world sales and, like
 * plain manual lines, are never stock-blocked).
 */
export function withoutStockLimits(
  def: CustomizerDefinition,
): CustomizerDefinition {
  return {
    ...def,
    groups: def.groups.map((group) => ({
      ...group,
      values: group.values.map((value) =>
        value.linked
          ? { ...value, linked: { ...value.linked, stock: null } }
          : value,
      ),
    })),
  };
}

// ---------------------------------------------------------------------------
// Stock: holds and cross-line totals
// ---------------------------------------------------------------------------

export type StockVariantRow = {
  inventoryQty: number;
  reservedQty: number;
  product: { trackInventory: boolean; allowBackorders: boolean };
};
export type StockProductRow = {
  trackInventory: boolean;
  allowBackorders: boolean;
  inventoryQty: number;
  reservedQty: number;
  baseInventoryUnitId: string | null;
  baseUnitsConsumed: number | null;
};
export type StockPoolRow = {
  inventoryQty: number;
  reservedQty: number;
  allowBackorders: boolean;
};

/** The stock rows a hold is computed from (subsets of the Prisma rows). */
export type StockRows = {
  variants: ReadonlyMap<string, StockVariantRow>;
  products: ReadonlyMap<string, StockProductRow>;
  pools: ReadonlyMap<string, StockPoolRow>;
};

/**
 * The reservation entry `qty` units of a product/variant need — the same
 * three branches create-session has always used for cart lines: a variant of
 * a tracked, non-backorder product holds the variant; a pool product holds
 * `baseUnitsConsumed × qty` pool units (unless the pool allows backorders); a
 * tracked, non-backorder simple product holds itself. `null` = nothing to
 * hold (untracked, backorders, or the row is unknown).
 */
export function holdForTarget(
  target: { productId: string; variantId: string | null },
  qty: number,
  rows: StockRows,
): ReservationEntry | null {
  if (qty <= 0) return null;
  if (target.variantId) {
    const variant = rows.variants.get(target.variantId);
    if (!variant) return null;
    return variant.product.trackInventory && !variant.product.allowBackorders
      ? { variantId: target.variantId, qty }
      : null;
  }
  const product = rows.products.get(target.productId);
  if (!product) return null;
  if (product.baseInventoryUnitId) {
    const pool = rows.pools.get(product.baseInventoryUnitId);
    if (!pool || pool.allowBackorders) return null;
    return {
      baseInventoryUnitId: product.baseInventoryUnitId,
      qty: (product.baseUnitsConsumed ?? 1) * qty,
    };
  }
  return product.trackInventory && !product.allowBackorders
    ? { productId: target.productId, qty }
    : null;
}

/** Append a hold; pool holds fold into an existing entry for the same pool. */
export function appendHold(
  entries: ReservationEntry[],
  hold: ReservationEntry | null,
): void {
  if (!hold) return;
  if (hold.baseInventoryUnitId) {
    const existing = entries.find(
      (e) => e.baseInventoryUnitId === hold.baseInventoryUnitId,
    );
    if (existing) {
      existing.qty += hold.qty;
      return;
    }
  }
  entries.push({ ...hold });
}

export type LineDemand = {
  lineIndex: number;
  hold: ReservationEntry;
  /** A linked option value rather than the line's own product. */
  component: boolean;
};

/** Every stock hold the cart needs, per line: own product + components. */
export function buildLineDemands(params: {
  items: readonly CartLineItem[];
  configured: ReadonlyMap<number, ConfiguredLine>;
  rows: StockRows;
}): LineDemand[] {
  const demands: LineDemand[] = [];
  for (const [index, item] of params.items.entries()) {
    const qty = Number(item.quantity) || 1;
    const own = holdForTarget(
      { productId: item.productId, variantId: item.variantId },
      qty,
      params.rows,
    );
    if (own) demands.push({ lineIndex: index, hold: own, component: false });
    for (const c of params.configured.get(index)?.components ?? []) {
      const hold = holdForTarget(c, c.qtyPerUnit * qty, params.rows);
      if (hold) demands.push({ lineIndex: index, hold, component: true });
    }
  }
  return demands;
}

function holdKey(hold: ReservationEntry): string | null {
  if (hold.variantId) return `v:${hold.variantId}`;
  if (hold.baseInventoryUnitId) return `pool:${hold.baseInventoryUnitId}`;
  if (hold.productId) return `p:${hold.productId}`;
  return null;
}

function available(hold: ReservationEntry, rows: StockRows): number | null {
  const row = hold.variantId
    ? rows.variants.get(hold.variantId)
    : hold.baseInventoryUnitId
      ? rows.pools.get(hold.baseInventoryUnitId)
      : hold.productId
        ? rows.products.get(hold.productId)
        : undefined;
  return row ? row.inventoryQty - row.reservedQty : null;
}

/**
 * Cross-line stock check: finds the lines whose demand (own product plus
 * option components) cannot all be met from what each stock row (variant,
 * product or pool) has available — e.g. two gloves each with the last Bee
 * charm, or a glove using a charm also bought on its own.
 *
 * Admission is per line and greedy, so the cart keeps as much as can be sold:
 * lines with no component demand go first, then lines with components, each
 * in cart order. A line is admitted only if ALL of its demands fit what is
 * left; an admitted line uses up its stock, a rejected one uses none (so a
 * build rejected on one charm never blocks a later line on another). A
 * rejected line is `out-of-stock` when its own product overdraws, else
 * `option-out-of-stock`. Rows with no known limit are unlimited.
 */
export function findOverdrawnLines(
  demands: readonly LineDemand[],
  rows: StockRows,
): LineFailure[] {
  type Need = { qty: number; limit: number | null; component: boolean };
  // Per line: summed demand per stock row (a component and the line's own
  // product can share a row; the row overdraws as non-component then).
  const byLine = new Map<number, Map<string, Need>>();
  for (const demand of demands) {
    const key = holdKey(demand.hold);
    if (!key) continue;
    const needs = byLine.get(demand.lineIndex) ?? new Map<string, Need>();
    const need = needs.get(key);
    if (need) {
      need.qty += demand.hold.qty;
      need.component &&= demand.component;
    } else {
      needs.set(key, {
        qty: demand.hold.qty,
        limit: available(demand.hold, rows),
        component: demand.component,
      });
    }
    byLine.set(demand.lineIndex, needs);
  }

  const hasComponent = (needs: Map<string, Need>) =>
    [...needs.values()].some((n) => n.component);
  const ordered = [...byLine].sort(
    ([a, aNeeds], [b, bNeeds]) =>
      Number(hasComponent(aNeeds)) - Number(hasComponent(bNeeds)) || a - b,
  );

  const used = new Map<string, number>();
  const failures: LineFailure[] = [];
  for (const [lineIndex, needs] of ordered) {
    const over = [...needs].filter(
      ([key, n]) => n.limit !== null && (used.get(key) ?? 0) + n.qty > n.limit,
    );
    if (over.length === 0) {
      for (const [key, n] of needs) used.set(key, (used.get(key) ?? 0) + n.qty);
      continue;
    }
    failures.push({
      lineIndex,
      reason: over.some(([, n]) => !n.component)
        ? "out-of-stock"
        : "option-out-of-stock",
    });
  }
  return failures.sort((a, b) => a.lineIndex - b.lineIndex);
}
