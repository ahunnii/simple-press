"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  CustomizationSnapshotGroup,
  CustomizerError,
  CustomizerPriceResult,
  CustomizerSelection,
  PublicCustomizerDefinition,
  PublicCustomizerGroup,
} from "~/lib/customizer";
import type { CartItemCustomization } from "~/providers/cart-context";
import {
  buildSummary,
  cleanCustomizerText,
  configKey,
  customizationLines,
  evaluateSelection,
  normalizeSelection,
  includedValueIds as waivedValueIds,
} from "~/lib/customizer";

/**
 * Storefront state for a product's customizer (product options): what the
 * shopper picked, the live configured price, per-group errors, and the
 * cart fields for a configured line. Headless — `ProductCustomizer` (or a
 * template's own markup) renders it.
 *
 * Prices here are a PREVIEW over the public projection; the server re-prices
 * the configuration from ids at the cart status check and at checkout.
 *
 * Typical template use:
 *
 *   const customizer = useProductCustomizer({
 *     customizer: product.customizer,
 *     basePrice: selectedVariantPrice,
 *     lineQty: quantity,
 *   });
 *   // price display:  customizer.enabled ? customizer.unitPrice : basePrice
 *   // add to cart:     if (!customizer.revealErrors()) return;
 *   //                  addItem({ ...line, ...customizer.toCartFields() })
 */

export type UseProductCustomizerInput = {
  customizer: PublicCustomizerDefinition | null | undefined;
  /** Unit price (cents) of the currently selected variant / product. */
  basePrice: number;
  /** The quantity the shopper is about to add (stock checks). Default 1. */
  lineQty?: number;
};

/** One chosen value, for a "your build" tray. */
export type CustomizerSelectedValue = {
  groupId: string;
  groupName: string;
  valueId: string;
  label: string;
  imageUrl: string | null;
  swatchColor: string | null;
  /** Charged cents per unit (0 when included). */
  price: number;
  included: boolean;
};

/** One filled text option (engraving), for the tray. */
export type CustomizerSelectedText = {
  groupId: string;
  groupName: string;
  text: string;
  price: number;
};

/** What a configured cart line carries (spread into `addItem`). */
export type CustomizerCartFields = {
  configuration: CustomizerSelection;
  configKey: string;
  customization: CartItemCustomization;
};

export type ProductCustomizerController = {
  /** The definition this state is for (`null` = product has no options). */
  definition: PublicCustomizerDefinition | null;
  /** True when there is something to render (a definition with groups). */
  enabled: boolean;
  /** Raw state (texts uncleaned, so inputs stay controlled). */
  selection: CustomizerSelection;
  isSelected: (groupId: string, valueId: string) => boolean;
  /**
   * Check/uncheck a value. A max-1 group REPLACES its pick (radio); a
   * multi-pick group refuses a pick past its max and sets
   * `limitMessages[groupId]` instead.
   */
  toggleValue: (groupId: string, valueId: string) => void;
  /** Select (never deselect) a value — radio semantics. */
  selectValue: (groupId: string, valueId: string) => void;
  clearGroup: (groupId: string) => void;
  setText: (groupId: string, text: string) => void;
  getText: (groupId: string) => string;
  /** Strict evaluation (required/min/max/stock) at `lineQty`. */
  evaluation: CustomizerPriceResult;
  /**
   * Live unit price: base + add-ons picked SO FAR (ignores missing required
   * picks, so the price moves as the shopper builds). `basePrice` when there
   * is no customizer.
   */
  unitPrice: number;
  addOnTotal: number;
  /** Strict evaluation passes — safe to add to cart. */
  isComplete: boolean;
  /** Every strict error (unfiltered). */
  errors: CustomizerError[];
  /**
   * Error messages to SHOW, per group id: only for groups the shopper has
   * touched, or for every group once `showErrors` (an add attempt).
   */
  groupErrors: Record<string, string[]>;
  /** "You can choose up to 3" after a refused pick, per group id. */
  limitMessages: Record<string, string>;
  /** An add-to-cart attempt happened; show every error. */
  showErrors: boolean;
  /** Increments on every `revealErrors()` (lets a renderer move focus). */
  attempt: number;
  /**
   * Call on add-to-cart: shows all errors and returns `isComplete`.
   * Returns true (and shows nothing) when there is no customizer.
   */
  revealErrors: () => boolean;
  /** Chosen values in group order, then owner order. */
  selectedValues: CustomizerSelectedValue[];
  selectedTexts: CustomizerSelectedText[];
  /** Value ids "first N included" currently waives (every group). */
  includedValueIds: Set<string>;
  /**
   * Fields for a configured cart line, or `null` when nothing is chosen (or
   * there is no customizer) — then add a plain line.
   */
  toCartFields: () => CustomizerCartFields | null;
  reset: () => void;
};

const EMPTY_SELECTION: CustomizerSelection = { choices: [], texts: [] };

type State = {
  identity: string;
  selection: CustomizerSelection;
  touched: string[];
  attempt: number;
  limitMessages: Record<string, string>;
};

function identityOf(def: PublicCustomizerDefinition | null | undefined) {
  if (!def || def.groups.length === 0) return "";
  return `${def.productId}|${def.groups.map((g) => g.id).join(",")}`;
}

function initialState(identity: string): State {
  return {
    identity,
    selection: EMPTY_SELECTION,
    touched: [],
    attempt: 0,
    limitMessages: {},
  };
}

function valueIdsOf(selection: CustomizerSelection, groupId: string) {
  return selection.choices.find((c) => c.groupId === groupId)?.valueIds ?? [];
}

function withValueIds(
  selection: CustomizerSelection,
  groupId: string,
  valueIds: string[],
): CustomizerSelection {
  const others = selection.choices.filter((c) => c.groupId !== groupId);
  return {
    ...selection,
    choices: valueIds.length > 0 ? [...others, { groupId, valueIds }] : others,
  };
}

function plural(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function clearLimit(s: State, groupId: string) {
  if (!(groupId in s.limitMessages)) return s.limitMessages;
  const rest = { ...s.limitMessages };
  delete rest[groupId];
  return rest;
}

/**
 * One pick. Max-1 groups replace (radio; re-picking is a no-op — use
 * `clearGroup`). Multi groups toggle, refusing a pick past the max with a
 * message. Unavailable values can be removed but never added.
 */
function applyPick(
  s: State,
  group: PublicCustomizerGroup,
  valueId: string,
  mode: "toggle" | "select",
): Partial<State> {
  const ids = valueIdsOf(s.selection, group.id);
  if (ids.includes(valueId)) {
    if (mode === "select" || group.maxSelections <= 1) return {};
    return {
      selection: withValueIds(
        s.selection,
        group.id,
        ids.filter((id) => id !== valueId),
      ),
      limitMessages: clearLimit(s, group.id),
    };
  }
  const value = group.values.find((v) => v.id === valueId);
  if (!value?.available) return {};
  if (group.maxSelections <= 1) {
    return {
      selection: withValueIds(s.selection, group.id, [valueId]),
      limitMessages: clearLimit(s, group.id),
    };
  }
  if (ids.length >= group.maxSelections) {
    return {
      limitMessages: {
        ...s.limitMessages,
        [group.id]: `You can choose up to ${plural(group.maxSelections, "option")}. Remove one to pick another.`,
      },
    };
  }
  return {
    selection: withValueIds(s.selection, group.id, [...ids, valueId]),
    limitMessages: clearLimit(s, group.id),
  };
}

export function useProductCustomizer({
  customizer,
  basePrice,
  lineQty = 1,
}: UseProductCustomizerInput): ProductCustomizerController {
  const definition =
    customizer && customizer.groups.length > 0 ? customizer : null;
  const identity = identityOf(definition);

  const [state, setState] = useState<State>(() => initialState(identity));
  // A different product (or a different set of groups): start over. Done
  // during render — React's pattern for resetting state on a prop change.
  let current = state;
  if (state.identity !== identity) {
    current = initialState(identity);
    setState(current);
  }
  const { selection } = current;

  const groupsById = useMemo(
    () =>
      new Map<string, PublicCustomizerGroup>(
        (definition?.groups ?? []).map((g) => [g.id, g]),
      ),
    [definition],
  );

  // Price preview: same definition with every count floor removed, so a
  // half-built configuration still prices.
  const relaxed = useMemo<PublicCustomizerDefinition | null>(
    () =>
      definition
        ? {
            ...definition,
            groups: definition.groups.map((g) => ({
              ...g,
              required: false,
              minSelections: 0,
            })),
          }
        : null,
    [definition],
  );

  const evaluation = useMemo<CustomizerPriceResult>(
    () =>
      definition
        ? evaluateSelection(definition, selection, { basePrice, lineQty })
        : { ok: true, unitPrice: basePrice, addOnTotal: 0 },
    [definition, selection, basePrice, lineQty],
  );

  const preview = useMemo(() => {
    if (!relaxed) return { unitPrice: basePrice, addOnTotal: 0 };
    const result = evaluateSelection(relaxed, selection, {
      basePrice,
      lineQty: 1,
    });
    return result.ok
      ? { unitPrice: result.unitPrice, addOnTotal: result.addOnTotal }
      : { unitPrice: basePrice, addOnTotal: 0 };
  }, [relaxed, selection, basePrice]);

  const errors = useMemo(
    () => (evaluation.ok ? [] : evaluation.errors),
    [evaluation],
  );

  const showErrors = current.attempt > 0;
  const groupErrors = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const error of errors) {
      const groupId = error.groupId;
      if (!groupId) continue;
      if (!showErrors && !current.touched.includes(groupId)) continue;
      const list = (out[groupId] ??= []);
      if (!list.includes(error.message)) list.push(error.message);
    }
    return out;
  }, [errors, showErrors, current.touched]);

  const includedValueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of definition?.groups ?? []) {
      if (group.kind !== "choice" || group.includedCount <= 0) continue;
      for (const id of waivedValueIds(group, valueIdsOf(selection, group.id)))
        ids.add(id);
    }
    return ids;
  }, [definition, selection]);

  const { selectedValues, selectedTexts } = useMemo(() => {
    const values: CustomizerSelectedValue[] = [];
    const texts: CustomizerSelectedText[] = [];
    for (const group of definition?.groups ?? []) {
      if (group.kind === "text") {
        const raw = selection.texts.find((t) => t.groupId === group.id)?.text;
        const text = raw ? cleanCustomizerText(raw) : "";
        if (text) {
          texts.push({
            groupId: group.id,
            groupName: group.name,
            text,
            price: group.textPriceCents,
          });
        }
        continue;
      }
      const picked = new Set(valueIdsOf(selection, group.id));
      for (const value of group.values) {
        if (!picked.has(value.id)) continue;
        const included = includedValueIds.has(value.id);
        values.push({
          groupId: group.id,
          groupName: group.name,
          valueId: value.id,
          label: value.label,
          imageUrl: value.imageUrl,
          swatchColor: value.swatchColor,
          price: included ? 0 : Math.max(0, value.price),
          included,
        });
      }
    }
    return { selectedValues: values, selectedTexts: texts };
  }, [definition, selection, includedValueIds]);

  const update = useCallback(
    (groupId: string, recipe: (s: State) => Partial<State>) => {
      setState((prev) => {
        const patch = recipe(prev);
        return {
          ...prev,
          ...patch,
          touched: prev.touched.includes(groupId)
            ? prev.touched
            : [...prev.touched, groupId],
        };
      });
    },
    [],
  );

  const pick = useCallback(
    (groupId: string, valueId: string, mode: "toggle" | "select") => {
      const group = groupsById.get(groupId);
      if (!group) return;
      update(groupId, (s) => applyPick(s, group, valueId, mode));
    },
    [groupsById, update],
  );

  const selectValue = useCallback(
    (groupId: string, valueId: string) => pick(groupId, valueId, "select"),
    [pick],
  );

  const toggleValue = useCallback(
    (groupId: string, valueId: string) => pick(groupId, valueId, "toggle"),
    [pick],
  );

  const clearGroup = useCallback(
    (groupId: string) => {
      update(groupId, (s) => ({
        selection: withValueIds(s.selection, groupId, []),
        limitMessages: clearLimit(s, groupId),
      }));
    },
    [update],
  );

  const setText = useCallback(
    (groupId: string, text: string) => {
      update(groupId, (s) => ({
        selection: {
          ...s.selection,
          texts: [
            ...s.selection.texts.filter((t) => t.groupId !== groupId),
            ...(text === "" ? [] : [{ groupId, text }]),
          ],
        },
      }));
    },
    [update],
  );

  const getText = useCallback(
    (groupId: string) =>
      selection.texts.find((t) => t.groupId === groupId)?.text ?? "",
    [selection],
  );

  const isSelected = useCallback(
    (groupId: string, valueId: string) =>
      valueIdsOf(selection, groupId).includes(valueId),
    [selection],
  );

  const isComplete = evaluation.ok;

  const revealErrors = useCallback(() => {
    if (!definition) return true;
    setState((prev) => ({ ...prev, attempt: prev.attempt + 1 }));
    return isComplete;
  }, [definition, isComplete]);

  const toCartFields = useCallback((): CustomizerCartFields | null => {
    if (!definition) return null;
    const configuration = normalizeSelection(selection);
    const key = configKey(configuration);
    if (key === "") return null;

    const groups: CustomizationSnapshotGroup[] = [];
    for (const group of definition.groups) {
      if (group.kind === "text") {
        const text = selectedTexts.find((t) => t.groupId === group.id);
        if (text) {
          groups.push({
            groupId: group.id,
            name: group.name,
            kind: "text",
            text: text.text,
            price: text.price,
          });
        }
        continue;
      }
      const picks = selectedValues.filter((v) => v.groupId === group.id);
      if (picks.length === 0) continue;
      groups.push({
        groupId: group.id,
        name: group.name,
        kind: "choice",
        selections: picks.map((pick) => ({
          valueId: pick.valueId,
          label: pick.label,
          imageUrl: pick.imageUrl,
          swatchColor: pick.swatchColor,
          price: pick.price,
          included: pick.included,
          linkedProductId: null,
          linkedVariantId: null,
          sku: null,
        })),
      });
    }
    return {
      configuration,
      configKey: key,
      customization: {
        summary: buildSummary(groups),
        lines: customizationLines({
          v: 1,
          basePrice,
          addOnTotal: preview.addOnTotal,
          summary: "",
          groups,
          components: [],
        }),
      },
    };
  }, [
    definition,
    selection,
    selectedTexts,
    selectedValues,
    basePrice,
    preview.addOnTotal,
  ]);

  const reset = useCallback(() => {
    setState((prev) => initialState(prev.identity));
  }, []);

  return {
    definition,
    enabled: definition !== null,
    selection,
    isSelected,
    toggleValue,
    selectValue,
    clearGroup,
    setText,
    getText,
    evaluation,
    unitPrice: preview.unitPrice,
    addOnTotal: preview.addOnTotal,
    isComplete,
    errors,
    groupErrors,
    limitMessages: current.limitMessages,
    showErrors,
    attempt: current.attempt,
    revealErrors,
    selectedValues,
    selectedTexts,
    includedValueIds,
    toCartFields,
    reset,
  };
}
