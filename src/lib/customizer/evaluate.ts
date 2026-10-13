import type {
  CustomizationComponent,
  CustomizationSnapshot,
  CustomizationSnapshotGroup,
  CustomizerDefinition,
  CustomizerError,
  CustomizerGroupDef,
  CustomizerGroupKind,
  CustomizerSelection,
  CustomizerValueDef,
  PublicCustomizerDefinition,
  PublicCustomizerGroup,
  PublicCustomizerValue,
} from "~/lib/customizer/types";
import {
  effectiveValuePrice,
  textLimit,
} from "~/lib/customizer/effective-price";
import { sortByOrder } from "~/lib/customizer/public";
import {
  cleanCustomizerText,
  customizerTextLength,
  truncateCodePoints,
} from "~/lib/customizer/text";
import {
  CUSTOMIZER_PUBLIC_MAX_QTY_CAP,
  CUSTOMIZER_SUMMARY_MAX_LENGTH,
} from "~/lib/customizer/types";

/**
 * Customizer pricing + validation.
 *
 * One core, two entry points — the quote calculator's split (see
 * `src/lib/quote/evaluate.ts`) applied to product options:
 *
 * - `evaluateSelection(publicDef, …)` runs in the BROWSER for the live total
 *   and inline errors. It sees only the public projection, so it returns a
 *   price and errors, never a snapshot.
 * - `priceConfiguration(fullDef, …)` is the AUTHORITY, run on the server
 *   at add-to-cart status checks, checkout and the webhook. It returns the
 *   same price plus the order snapshot and the stocked components to
 *   reserve and deduct.
 *
 * Both price the same way because both reduce to the same core over the
 * same per-value `price` (`effectiveValuePrice`), so a shopper's live total
 * matches the charge unless stock or prices changed in between.
 *
 * ── Rules ──────────────────────────────────────────────────────────────────
 *
 * - Every group/value id must belong to this product's definition. A group
 *   the selection does not mention is an EMPTY selection, so its "required"
 *   check still fires.
 * - Choice count: a required group needs at least `max(1, minSelections)`;
 *   an optional group may be left empty, but once anything is picked the
 *   count must reach `minSelections`. Never above `maxSelections`.
 * - "First N included": the N CHEAPEST picks in a group are free (ties
 *   broken by owner order, then id). The server only receives ids, never
 *   click order, so "cheapest" is the only rule that is both deterministic
 *   and never overcharges.
 * - Stock: each linked pick consumes 1 per configured unit, so it needs
 *   `lineQty` available. On the server, picks linked to the SAME
 *   product/variant are summed across groups. Cross-LINE totals (two cart
 *   lines using one charm) are the checkout's job, not this module's.
 * - Text: cleaned by `cleanCustomizerText`, capped by `textLimit`, priced
 *   only when non-empty.
 * - `unitPrice = max(0, basePrice + addOnTotal)`.
 *
 * Pure and synchronous; no I/O, no server-only imports.
 */

export type CustomizerPriceOptions = {
  /** Unit price of the product/variant before options (cents). */
  basePrice: number;
  /** Line quantity, for stock checks. Defaults to 1. */
  lineQty?: number;
};

export type CustomizerPriceResult =
  | { ok: true; unitPrice: number; addOnTotal: number }
  | { ok: false; errors: CustomizerError[] };

export type CustomizerConfigurationResult =
  | {
      ok: true;
      unitPrice: number;
      addOnTotal: number;
      snapshot: CustomizationSnapshot;
      components: CustomizationComponent[];
    }
  | { ok: false; errors: CustomizerError[] };

type SelectionInput = Partial<CustomizerSelection> | null | undefined;

/** Client: live total + errors against the public projection. */
export function evaluateSelection(
  def: PublicCustomizerDefinition,
  selection: SelectionInput,
  options: CustomizerPriceOptions,
): CustomizerPriceResult {
  const groups = def.groups.map((group) =>
    toCoreGroup(group, group.values.map(publicCoreValue)),
  );
  const result = runCore(groups, selection, options);
  if (result.errors.length > 0) return { ok: false, errors: result.errors };
  return {
    ok: true,
    unitPrice: unitPriceOf(options.basePrice, result.addOnTotal),
    addOnTotal: result.addOnTotal,
  };
}

/** Server: authoritative price, order snapshot and stocked components. */
export function priceConfiguration(
  def: CustomizerDefinition,
  selection: SelectionInput,
  options: CustomizerPriceOptions,
): CustomizerConfigurationResult {
  const groups = def.groups.map((group) =>
    toCoreGroup(group, group.values.map(fullCoreValue)),
  );
  const result = runCore(groups, selection, options);
  if (result.errors.length > 0) return { ok: false, errors: result.errors };

  const snapshotGroups: CustomizationSnapshotGroup[] = [];
  const components: CustomizationComponent[] = [];
  for (const outcome of result.outcomes) {
    const { group } = outcome;
    if (group.kind === "text") {
      if (outcome.text) {
        snapshotGroups.push({
          groupId: group.id,
          name: group.name,
          kind: "text",
          text: outcome.text,
          price: outcome.textPrice,
        });
      }
      continue;
    }
    if (outcome.picks.length === 0) continue;
    snapshotGroups.push({
      groupId: group.id,
      name: group.name,
      kind: "choice",
      selections: outcome.picks.map(({ value, charged, included }) => {
        const source = value.source;
        return {
          valueId: source.id,
          label: source.label,
          imageUrl: source.imageUrl,
          swatchColor: source.swatchColor,
          price: charged,
          included,
          linkedProductId: source.linked?.productId ?? null,
          linkedVariantId: source.linked?.variantId ?? null,
          sku: source.linked?.sku ?? null,
        };
      }),
    });
    for (const { value } of outcome.picks) {
      const linked = value.source.linked;
      if (!linked) continue;
      components.push({
        productId: linked.productId,
        variantId: linked.variantId,
        qtyPerUnit: 1,
        name: linked.variantName
          ? `${linked.productName} — ${linked.variantName}`
          : linked.productName,
      });
    }
  }

  const snapshot: CustomizationSnapshot = {
    v: 1,
    basePrice: options.basePrice,
    addOnTotal: result.addOnTotal,
    summary: buildSummary(snapshotGroups),
    groups: snapshotGroups,
    components,
  };
  return {
    ok: true,
    unitPrice: unitPriceOf(options.basePrice, result.addOnTotal),
    addOnTotal: result.addOnTotal,
    snapshot,
    components,
  };
}

/**
 * "Chain: Gold · Charms: Heart, Star · Engraving: “Amy”", cut to
 * `CUSTOMIZER_SUMMARY_MAX_LENGTH` code points with a trailing ellipsis.
 */
export function buildSummary(groups: CustomizationSnapshotGroup[]): string {
  const parts = groups.map((group) => {
    const value =
      group.kind === "text"
        ? `“${group.text ?? ""}”`
        : (group.selections ?? []).map((s) => s.label).join(", ");
    return `${group.name}: ${value}`;
  });
  return truncateCodePoints(parts.join(" · "), CUSTOMIZER_SUMMARY_MAX_LENGTH);
}

/**
 * Which picks "first N included" waives in one group: the `includedCount`
 * cheapest of `valueIds` (ties by owner order, then id) — the exact rule
 * the evaluator charges by. For the storefront's "Included" marks; ids not
 * in the group are ignored.
 */
export function includedValueIds(
  group: Pick<PublicCustomizerGroup, "includedCount" | "values">,
  valueIds: readonly string[],
): Set<string> {
  const byId = new Map(group.values.map((value) => [value.id, value]));
  const picked = [...new Set(valueIds)].flatMap((id) => {
    const value = byId.get(id);
    return value ? [value] : [];
  });
  return waivedIds(picked, group.includedCount);
}

type WaiverCandidate = { id: string; price: number; sortOrder: number };

function waivedIds(
  values: readonly WaiverCandidate[],
  includedCount: number,
): Set<string> {
  const byPrice = [...values].sort(
    (a, b) =>
      a.price - b.price ||
      a.sortOrder - b.sortOrder ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return new Set(byPrice.slice(0, Math.max(0, includedCount)).map((v) => v.id));
}

function unitPriceOf(basePrice: number, addOnTotal: number): number {
  return Math.max(0, basePrice + addOnTotal);
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

type CoreValue<S> = {
  id: string;
  label: string;
  price: number;
  available: boolean;
  /** `null` = no limit known to this side. */
  stockLimit: number | null;
  /** Stock is pooled under this key (server: the linked target). */
  stockKey: string;
  sortOrder: number;
  source: S;
};

type CoreGroup<S> = {
  id: string;
  name: string;
  kind: CustomizerGroupKind;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  includedCount: number;
  maxLength: number | null;
  textPriceCents: number;
  values: Map<string, CoreValue<S>>;
};

type CorePick<S> = { value: CoreValue<S>; charged: number; included: boolean };

type CoreOutcome<S> = {
  group: CoreGroup<S>;
  /** In owner order (not price order). */
  picks: CorePick<S>[];
  text: string | null;
  textPrice: number;
};

function toCoreGroup<S>(
  group: CustomizerGroupDef | PublicCustomizerGroup,
  values: CoreValue<S>[],
): CoreGroup<S> & { sortOrder: number } {
  return {
    id: group.id,
    name: group.name,
    kind: group.kind,
    required: group.required,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    includedCount: group.includedCount,
    maxLength: group.maxLength,
    textPriceCents: group.textPriceCents,
    sortOrder: group.sortOrder,
    values: new Map(values.map((value) => [value.id, value])),
  };
}

function fullCoreValue(
  value: CustomizerValueDef,
): CoreValue<CustomizerValueDef> {
  const linked = value.linked;
  return {
    id: value.id,
    label: value.label,
    price: effectiveValuePrice(value),
    // Sold-out is reported as out-of-stock below, not as unavailable.
    available: value.available && (!linked || linked.available),
    stockLimit: linked?.stock ?? null,
    stockKey: linked
      ? `t:${linked.productId}:${linked.variantId ?? ""}`
      : `v:${value.id}`,
    sortOrder: value.sortOrder,
    source: value,
  };
}

function publicCoreValue(
  value: PublicCustomizerValue,
): CoreValue<PublicCustomizerValue> {
  // A capped maxQty only says "at least this many", so it cannot prove a
  // shortage; the server decides.
  const exact =
    value.maxQty !== null && value.maxQty < CUSTOMIZER_PUBLIC_MAX_QTY_CAP;
  return {
    id: value.id,
    label: value.label,
    price: value.price,
    available: value.available,
    stockLimit: exact ? value.maxQty : null,
    stockKey: `v:${value.id}`,
    sortOrder: value.sortOrder,
    source: value,
  };
}

function runCore<S>(
  groupList: (CoreGroup<S> & { sortOrder: number })[],
  selection: SelectionInput,
  options: CustomizerPriceOptions,
): {
  errors: CustomizerError[];
  outcomes: CoreOutcome<S>[];
  addOnTotal: number;
} {
  const errors: CustomizerError[] = [];
  const lineQty = Math.max(1, Math.floor(options.lineQty ?? 1));
  const groups = new Map(groupList.map((group) => [group.id, group]));

  // ── Shape: ids exist, right kind, no repeats ────────────────────────────
  const chosen = new Map<string, string[]>();
  for (const entry of selection?.choices ?? []) {
    const group = groups.get(entry.groupId);
    if (!group) {
      errors.push({
        code: "unknown-group",
        groupId: entry.groupId,
        message: "One of your choices is no longer offered",
      });
      continue;
    }
    if (group.kind !== "choice" || chosen.has(group.id)) {
      errors.push(invalid(group));
      continue;
    }
    const seen = new Set<string>();
    for (const valueId of entry.valueIds) {
      if (seen.has(valueId)) {
        errors.push({
          code: "duplicate-value",
          groupId: group.id,
          valueId,
          message: `${labelOf(group, valueId)} was picked more than once`,
        });
        continue;
      }
      seen.add(valueId);
      if (!group.values.has(valueId)) {
        errors.push({
          code: "unknown-value",
          groupId: group.id,
          valueId,
          message: `One of your ${lowerFirst(group.name)} choices is no longer offered`,
        });
      }
    }
    chosen.set(
      group.id,
      [...seen].filter((id) => group.values.has(id)),
    );
  }

  const texts = new Map<string, string>();
  for (const entry of selection?.texts ?? []) {
    const group = groups.get(entry.groupId);
    if (!group) {
      errors.push({
        code: "unknown-group",
        groupId: entry.groupId,
        message: "One of your choices is no longer offered",
      });
      continue;
    }
    if (group.kind !== "text" || texts.has(group.id)) {
      errors.push(invalid(group));
      continue;
    }
    texts.set(group.id, cleanCustomizerText(entry.text));
  }

  // ── Per group: counts, availability, pricing ────────────────────────────
  const outcomes: CoreOutcome<S>[] = [];
  const stockUse = new Map<string, { need: number; picks: CoreValue<S>[] }>();
  let addOnTotal = 0;

  for (const group of sortByOrder(groupList)) {
    if (group.kind === "text") {
      const text = texts.get(group.id) ?? "";
      const limit = textLimit(group);
      if (group.required && text === "") {
        errors.push({
          code: "required",
          groupId: group.id,
          message: `Enter your ${lowerFirst(group.name)}`,
        });
      } else if (customizerTextLength(text) > limit) {
        errors.push({
          code: "text-too-long",
          groupId: group.id,
          message: `${group.name} can be up to ${limit} characters`,
        });
      }
      const textPrice = text === "" ? 0 : group.textPriceCents;
      addOnTotal += textPrice;
      outcomes.push({ group, picks: [], text: text || null, textPrice });
      continue;
    }

    const values = (chosen.get(group.id) ?? []).map(
      (id) => group.values.get(id)!,
    );
    const count = values.length;
    const min = group.required
      ? Math.max(1, group.minSelections)
      : group.minSelections;
    const noun = lowerFirst(group.name);
    if (count === 0 && group.required) {
      errors.push({
        code: "required",
        groupId: group.id,
        message: `Choose your ${noun}`,
      });
    } else if (count > 0 && count < min) {
      errors.push({
        code: "too-few",
        groupId: group.id,
        message: `Choose at least ${min} ${noun}`,
      });
    } else if (count > group.maxSelections) {
      errors.push({
        code: "too-many",
        groupId: group.id,
        message:
          group.maxSelections === 1
            ? `Choose just one ${noun}`
            : `Choose up to ${group.maxSelections} ${noun}`,
      });
    }

    for (const value of values) {
      if (!value.available) {
        errors.push({
          code: "value-unavailable",
          groupId: group.id,
          valueId: value.id,
          message: `${value.label} isn't available right now`,
        });
        continue;
      }
      const use = stockUse.get(value.stockKey) ?? { need: 0, picks: [] };
      use.need += lineQty;
      use.picks.push(value);
      stockUse.set(value.stockKey, use);
    }

    // Waive the N cheapest; report picks back in owner order.
    const included = waivedIds(values, group.includedCount);
    const picks = sortByOrder(values).map((value) => {
      const isIncluded = included.has(value.id);
      const charged = isIncluded ? 0 : Math.max(0, value.price);
      addOnTotal += charged;
      return { value, charged, included: isIncluded };
    });
    outcomes.push({ group, picks, text: null, textPrice: 0 });
  }

  // ── Stock, pooled per key across groups ────────────────────────────────
  for (const { need, picks } of stockUse.values()) {
    const limit = picks[0]!.stockLimit;
    if (limit === null || need <= limit) continue;
    for (const value of picks) {
      const groupId = groupOfValue(outcomes, value);
      errors.push({
        code: "value-out-of-stock",
        groupId,
        valueId: value.id,
        message:
          limit <= 0
            ? `${value.label} is sold out`
            : `Only ${limit} left of ${value.label}`,
      });
    }
  }

  return { errors, outcomes, addOnTotal };
}

function invalid(group: { id: string; name: string }): CustomizerError {
  return {
    code: "invalid-selection",
    groupId: group.id,
    message: `Check your ${lowerFirst(group.name)} choice`,
  };
}

function labelOf<S>(group: CoreGroup<S>, valueId: string): string {
  return group.values.get(valueId)?.label ?? "An option";
}

function groupOfValue<S>(
  outcomes: CoreOutcome<S>[],
  value: CoreValue<S>,
): string | undefined {
  return outcomes.find((o) => o.picks.some((p) => p.value === value))?.group.id;
}

/**
 * "Charms" → "charms", but leave acronyms and brand casing alone
 * ("LED color", "iPhone case").
 */
function lowerFirst(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 2) return trimmed.toLowerCase();
  const [first, second] = [trimmed[0]!, trimmed[1]!];
  if (second !== second.toLowerCase()) return trimmed;
  return first.toLowerCase() + trimmed.slice(1);
}
