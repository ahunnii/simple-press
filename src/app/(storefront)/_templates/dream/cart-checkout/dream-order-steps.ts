import { parseTemplateListRows } from "~/lib/template-fields";

import {
  DREAM_ORDER_PICKUP_STEPS_DEFAULT_ROWS,
  DREAM_ORDER_SHIP_STEPS_DEFAULT_ROWS,
  DREAM_ORDER_STEPS_DEFAULT_ROWS,
} from "./index";

/**
 * One rendered "what happens next" step. `index` is the row's position in
 * the SAVED list (for `listItemAttr`); built-in rows use their own position.
 */
export type DreamOrderStep = { heading: string; body: string; index: number };

/** One step list plus the `list` field it came from (for `listItemAttr`). */
export type DreamOrderStepList = { fieldKey: string; steps: DreamOrderStep[] };

/** The three step lists the confirmation picks between by delivery method. */
export type DreamOrderStepSets = {
  ship: DreamOrderStepList;
  pickup: DreamOrderStepList;
  unknown: DreamOrderStepList;
};

export const DREAM_ORDER_STEP_KEYS = {
  ship: "dream.checkout.confirmation-ship-steps",
  pickup: "dream.checkout.confirmation-pickup-steps",
  unknown: "dream.checkout.confirmation-steps",
} as const;

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

function fromRows(rows: readonly Record<string, unknown>[]): DreamOrderStep[] {
  return rows
    .map((row, index) => ({
      heading: text(row, "heading"),
      body: text(row, "body"),
      index,
    }))
    .filter((step) => step.heading !== "" || step.body !== "");
}

/**
 * Split out of `./index.ts` on purpose: `parseTemplateListRows` is a RUNTIME
 * import from `~/lib/template-fields`, which aggregates every template's
 * field registry (including the dream root, which will import `./index.ts`)
 * — keeping it in the field module would risk a circular-evaluation crash
 * (same reasoning as `homepage/dream-homepage-quote-chips.ts`).
 *
 * `defaultsWhenEmpty` semantics: nothing saved, or a saved list with no
 * usable rows, falls back to the field's own `defaultRows`.
 */
function resolveList(
  customFields: unknown,
  key: string,
  defaults: readonly Record<string, string>[],
): DreamOrderStepList {
  const raw =
    customFields != null && typeof customFields === "object"
      ? (customFields as Record<string, unknown>)[key]
      : undefined;
  const saved = fromRows(parseTemplateListRows(raw));
  return {
    fieldKey: key,
    steps: saved.length > 0 ? saved : fromRows(defaults),
  };
}

export function resolveDreamOrderSteps(
  customFields: unknown,
): DreamOrderStepSets {
  return {
    ship: resolveList(
      customFields,
      DREAM_ORDER_STEP_KEYS.ship,
      DREAM_ORDER_SHIP_STEPS_DEFAULT_ROWS,
    ),
    pickup: resolveList(
      customFields,
      DREAM_ORDER_STEP_KEYS.pickup,
      DREAM_ORDER_PICKUP_STEPS_DEFAULT_ROWS,
    ),
    unknown: resolveList(
      customFields,
      DREAM_ORDER_STEP_KEYS.unknown,
      DREAM_ORDER_STEPS_DEFAULT_ROWS,
    ),
  };
}
