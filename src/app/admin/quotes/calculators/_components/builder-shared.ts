import type { z } from "zod";

import type {
  quoteCalculatorCreateSchema,
  QuoteQuestionType,
} from "~/lib/validators/quote-calculator";
import {
  QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT,
  QUOTE_QUESTION_TYPE_VALUES,
} from "~/lib/validators/quote-calculator";

/**
 * Shared vocabulary for the quote calculator builder.
 *
 * The form is typed on `z.input` of the create schema, NOT `z.output`. Every
 * `.default()` in the definition schema (required, hiddenDefault, distances,
 * and all of the settings) is optional on the input side, which is exactly what
 * a half-filled form holds. The factories below always write those keys
 * explicitly so nothing is ever actually `undefined` at runtime — the optional
 * types just stop TypeScript from insisting the owner has finished typing.
 *
 * Definition v2 nests questions inside SCREENS, so the derived types come in
 * two steps (`ScreenInput` → `QuestionInput`) and every "all the questions"
 * consumer flattens with `flattenScreens` (`~/lib/quote/screens`) rather than
 * enumerating screens itself. One flattener, one order — see the note atop that
 * module for why a second one would be a bug factory.
 */

export type CalculatorFormValues = z.input<typeof quoteCalculatorCreateSchema>;

export type CalculatorDefinitionInput = CalculatorFormValues["definition"];

export type ScreenInput = CalculatorDefinitionInput["screens"][number];

export type QuestionInput = ScreenInput["questions"][number];

/** A question carrying an option list. */
export type OptionQuestionInput = Extract<
  QuestionInput,
  { options: unknown[] }
>;

/** A question contributing a variable to the formula. */
export type VariableQuestionInput = Extract<
  QuestionInput,
  { variableName: string }
>;

/** A question whose answer can anchor a distance — `zip` or `address`. */
export type LocationQuestionInput = Extract<
  QuestionInput,
  { type: "zip" | "address" }
>;

export type OptionInput = OptionQuestionInput["options"][number];

export type DistanceInput = NonNullable<
  CalculatorDefinitionInput["distances"]
>[number];

// ─── Question type metadata ─────────────────────────────────────────────────

/** Menu order for "Add question" — priced types first, context types after. */
export const QUESTION_TYPE_ORDER = QUOTE_QUESTION_TYPE_VALUES;

export const QUESTION_TYPE_META: Record<
  QuoteQuestionType,
  { label: string; hint: string }
> = {
  choice: {
    label: "Choice cards",
    hint: "One answer, shown as tappable cards. Each option carries a value.",
  },
  multiselect: {
    label: "Multi-select",
    hint: "Any number of answers. The checked values are added together.",
  },
  dropdown: {
    label: "Dropdown",
    hint: "One answer from a menu. Each option carries a value.",
  },
  number: {
    label: "Number",
    hint: "A quantity the visitor types. The number itself is the value.",
  },
  zip: {
    label: "ZIP code",
    hint: "A 5-digit US ZIP. Pair two of them to measure distance.",
  },
  address: {
    label: "Address",
    hint: "Street, city, state and ZIP in one step. Its ZIP can pair with another for distance.",
  },
  text: {
    label: "Short text",
    hint: "One line of context. Never affects the price.",
  },
  longtext: {
    label: "Long text",
    hint: "A paragraph of context. Never affects the price.",
  },
  date: {
    label: "Date",
    hint: "A calendar date for context. Never affects the price.",
  },
};

/**
 * Question types a show-if condition may depend on.
 *
 * Single-answer only, mirroring the validator: "which of several checked boxes
 * counts?" has no good answer, so multiselect is excluded there and here.
 */
export function isConditionSourceType(
  type: QuoteQuestionType,
): type is "choice" | "dropdown" {
  return type === "choice" || type === "dropdown";
}

export function isOptionQuestionInput(
  question: QuestionInput,
): question is OptionQuestionInput {
  return (
    question.type === "choice" ||
    question.type === "multiselect" ||
    question.type === "dropdown"
  );
}

export function isVariableQuestionInput(
  question: QuestionInput,
): question is VariableQuestionInput {
  return isOptionQuestionInput(question) || question.type === "number";
}

/**
 * Builder-side twin of `isQuoteLocationQuestion`. Both `zip` and `address`
 * yield a ZIP the server can resolve to coordinates, so both are offerable as
 * distance endpoints — keep the two in lockstep or the distances card will
 * offer a question the validator then rejects (or hide one it would accept).
 */
export function isLocationQuestionInput(
  question: QuestionInput,
): question is LocationQuestionInput {
  return question.type === "zip" || question.type === "address";
}

// ─── Factories ──────────────────────────────────────────────────────────────

export function makeOption(): OptionInput {
  return { id: crypto.randomUUID(), label: "", value: 0, icon: null };
}

/**
 * A fresh question of the given type.
 *
 * The switch is written out per type rather than folded into shared branches on
 * purpose: TypeScript checks each returned literal against one arm of the
 * discriminated union, and a union-typed `type` property would satisfy none of
 * them. Verbose here buys no casts at every call site.
 */
export function makeQuestion(type: QuoteQuestionType): QuestionInput {
  const base = {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    required: true,
    showIf: null,
  };

  switch (type) {
    case "choice":
      return {
        ...base,
        type: "choice",
        variableName: "",
        hiddenDefault: 0,
        options: [makeOption(), makeOption()],
      };
    case "multiselect":
      return {
        ...base,
        type: "multiselect",
        variableName: "",
        hiddenDefault: 0,
        options: [makeOption(), makeOption()],
      };
    case "dropdown":
      return {
        ...base,
        type: "dropdown",
        variableName: "",
        hiddenDefault: 0,
        options: [makeOption(), makeOption()],
      };
    case "number":
      return {
        ...base,
        type: "number",
        variableName: "",
        hiddenDefault: 0,
        min: null,
        max: null,
        unitLabel: "",
      };
    case "zip":
      return { ...base, type: "zip" };
    // No extra config: the definition only says "ask for an address". What a
    // valid answer looks like lives on the wire schema.
    case "address":
      return { ...base, type: "address" };
    case "text":
      return { ...base, type: "text" };
    case "longtext":
      return { ...base, type: "longtext" };
    case "date":
      return { ...base, type: "date" };
  }
}

/**
 * A fresh screen — one step in the visitor's flow.
 *
 * `title`/`description` start as `""` rather than `null` so the inputs bound to
 * them are controlled from the first render; the schema trims and treats an
 * empty heading as absent.
 *
 * The UI never creates an empty screen: every entry point (top-level "Add
 * question", "Move to → New screen") hands one in, and deleting a screen's last
 * question deletes the screen. That is what keeps the `min(1)` on
 * `screen.questions` unreachable through normal editing.
 */
export function makeScreen(questions: QuestionInput[] = []): ScreenInput {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    questions,
  };
}

export function makeDistance(
  fromQuestionId: string,
  toQuestionId: string,
): DistanceInput {
  return {
    id: crypto.randomUUID(),
    variableName: "",
    fromQuestionId,
    toQuestionId,
    hiddenDefault: 0,
  };
}

/** The definition a brand-new calculator starts from. */
export function makeEmptyDefinition(): CalculatorDefinitionInput {
  return {
    version: 2,
    screens: [],
    distances: [],
    formula: "",
    showEstimateToCustomer: false,
    displayAsRange: false,
    rangePaddingPercent: 10,
    // ON for new calculators, unlike the v1 migration which writes `false` —
    // see the note on `showReviewStep` in the definition schema.
    showReviewStep: true,
    showLiveEstimate: false,
    liveEstimateDisclaimer: QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT,
    requirePhone: false,
    responseDays: 1,
    thankYouMessage: "Thanks! We received your request.",
  };
}

// ─── Variables ──────────────────────────────────────────────────────────────

/**
 * Every variable name the formula may reference, in the order the owner sees
 * them: questions top to bottom, then distances. Blank names are dropped — a
 * half-typed row should not offer an empty chip.
 *
 * Takes the FLATTENED question list (`flattenScreens(screens)`), not the
 * screens: the order here is visitor order, which is the same order the
 * validator and `computeQuote` use.
 */
export function collectVariableNames(
  flatQuestions: QuestionInput[],
  distances: DistanceInput[],
): string[] {
  const names: string[] = [];
  for (const question of flatQuestions) {
    if (!isVariableQuestionInput(question)) continue;
    const name = question.variableName.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  for (const distance of distances) {
    const name = distance.variableName.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

// ─── Money ──────────────────────────────────────────────────────────────────

/**
 * Formula value (DOLLARS) → stored estimate (CENTS), byte-for-byte the same
 * expression `computeQuote` uses. Kept in sync deliberately: the test panel's
 * whole job is to show the owner the number a real submission would produce,
 * and a preview that rounds differently is worse than no preview.
 *
 * Note the clamp — a formula with enough negative-value discount options can
 * land below zero, and the server stores 0 rather than a negative estimate.
 */
export function estimateCentsFromFormulaValue(value: number): number {
  return Math.max(0, Math.round(value * 100));
}

/**
 * The raw formula result, shown next to the estimate so an owner can see what
 * the arithmetic produced before the clamp/round. NOT currency-formatted, and
 * never fed to `formatPrice` — that helper takes cents, and this is dollars.
 */
export function formatFormulaValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}
