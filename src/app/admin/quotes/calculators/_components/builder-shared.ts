import type { z } from "zod";

import type {
  quoteCalculatorCreateSchema,
  QuoteQuestionType,
} from "~/lib/validators/quote-calculator";
import { parseFormula } from "~/lib/quote/formula";
import { flattenScreens } from "~/lib/quote/screens";
import {
  QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT,
  QUOTE_QUESTION_TYPE_VALUES,
  QUOTE_RESERVED_WORDS,
  QUOTE_VARIABLE_NAME_MAX_LENGTH,
  QUOTE_VARIABLE_NAME_RE,
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

/**
 * One tab — a top-level fork in the flow, not a step.
 *
 * `NonNullable` for the same reason `DistanceInput` needs it: `tabs` carries a
 * `.default([])`, so on the INPUT side the key is optional and a half-filled
 * form legitimately holds `undefined` there.
 */
export type TabInput = NonNullable<CalculatorDefinitionInput["tabs"]>[number];

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
    hint: "A calendar date for context — can be limited to today or later. Never affects the price.",
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

/**
 * The three predicates below answer the same questions as their
 * `…QuestionInput` twins, but about a BARE TYPE rather than a built question.
 *
 * Type switching needs that: "what will this question become if the owner
 * picks `number`?" has to be answerable before any question of that type
 * exists. The `…QuestionInput` versions delegate here so the membership lists
 * are written down exactly once — a type that counted as an option question in
 * one of the two and not the other would make `describeTypeChangeImpact`
 * promise a conversion `convertQuestionType` then does not perform.
 */
export function isOptionQuestionType(
  type: QuoteQuestionType,
): type is "choice" | "multiselect" | "dropdown" {
  return type === "choice" || type === "multiselect" || type === "dropdown";
}

export function isVariableQuestionType(
  type: QuoteQuestionType,
): type is "choice" | "multiselect" | "dropdown" | "number" {
  return isOptionQuestionType(type) || type === "number";
}

/**
 * Builder-side twin of `isQuoteLocationQuestion`. Both `zip` and `address`
 * yield a ZIP the server can resolve to coordinates, so both are offerable as
 * distance endpoints — keep the two in lockstep or the distances card will
 * offer a question the validator then rejects (or hide one it would accept).
 */
export function isLocationQuestionType(
  type: QuoteQuestionType,
): type is "zip" | "address" {
  return type === "zip" || type === "address";
}

export function isOptionQuestionInput(
  question: QuestionInput,
): question is OptionQuestionInput {
  return isOptionQuestionType(question.type);
}

export function isVariableQuestionInput(
  question: QuestionInput,
): question is VariableQuestionInput {
  return isVariableQuestionType(question.type);
}

export function isLocationQuestionInput(
  question: QuestionInput,
): question is LocationQuestionInput {
  return isLocationQuestionType(question.type);
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
    // `[]` is "every tab", not "no tabs" — a new question must be asked on
    // every fork the calculator has, including the overwhelmingly common case
    // of a calculator with no tabs at all.
    tabIds: [],
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
      return { ...base, type: "date", minDate: "none", maxDaysAhead: null };
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
    // 1.25, deliberately NOT the schema default (1): the schema default has to
    // be a no-op so every already-stored distance keeps repricing exactly as
    // it always has, but a NEW distance has no stored quotes to disturb, so it
    // starts from an honest road figure instead of a straight-line one nobody
    // would actually price a job against. See the schema's own note on
    // `roadFactor` for the full reasoning.
    roadFactor: 1.25,
  };
}

/**
 * A fresh tab.
 *
 * `formula: null` is the meaningful default, not a placeholder: it means "price
 * this tab with the calculator's shared root formula". Writing `""` instead
 * would read as an override with an empty formula, which the schema then
 * refuses on `min(1)` — see the note on `quoteTabFormulaField`.
 *
 * `label`/`description` start as `""` so the inputs bound to them are
 * controlled from the first render, matching `makeScreen`.
 */
export function makeTab(): TabInput {
  return {
    id: crypto.randomUUID(),
    label: "",
    description: "",
    formula: null,
  };
}

/** The definition a brand-new calculator starts from. */
export function makeEmptyDefinition(): CalculatorDefinitionInput {
  return {
    version: 2,
    screens: [],
    distances: [],
    formula: "",
    // No switcher until the owner draws one: an empty `tabs` list means every
    // question is asked and the root formula prices everything, which is the
    // shape every calculator built before tabs existed already has.
    tabs: [],
    tabsPrompt: "",
    showEstimateToCustomer: false,
    // Both booleans below are written explicitly to their schema defaults
    // (`true`) rather than left `undefined` — the form must hold a real value
    // from first render, and matching the schema default means a brand-new
    // calculator behaves identically whether or not the owner ever touches
    // these switches.
    showEstimateOnScreen: true,
    displayAsRange: false,
    rangePaddingPercent: 10,
    // ON for new calculators, unlike the v1 migration which writes `false` —
    // see the note on `showReviewStep` in the definition schema.
    showReviewStep: true,
    showLiveEstimate: false,
    liveEstimateDisclaimer: QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT,
    requirePhone: false,
    sendConfirmationEmail: true,
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

// ─── Tabs ───────────────────────────────────────────────────────────────────

/**
 * `tabIds` as a comparable value: deduped and sorted.
 *
 * Membership is a SET — "this question belongs to the Commercial tab" carries
 * no ordering — so two questions listing the same tabs in different orders are
 * on the same tabs, and anything that compares the lists has to say so.
 */
function normalizeTabIds(question: QuestionInput): string[] {
  return Array.from(new Set(question.tabIds ?? [])).sort();
}

/**
 * The tab membership every question on a screen shares, or `"mixed"` when they
 * differ.
 *
 * Backs the screen card's tab picker, which edits a whole screen at once: an
 * owner thinks in steps ("this screen is commercial-only"), not in per-question
 * membership. `"mixed"` is the honest answer when the questions disagree — the
 * picker must show that rather than silently adopting the first question's
 * list and overwriting the rest on the next click.
 *
 * `[]` means "every tab" (see the note on `tabIds` in the definition schema),
 * which is also what an empty question list returns: a screen with nothing on
 * it excludes nobody.
 *
 * The returned list is deduped and sorted, so equivalent memberships always
 * compare equal — never assume it preserves the order the owner's array had.
 */
export function commonTabIds(
  questions: readonly QuestionInput[],
): string[] | "mixed" {
  const first = questions[0];
  if (!first) return [];

  const shared = normalizeTabIds(first);
  for (let index = 1; index < questions.length; index += 1) {
    const question = questions[index];
    if (!question) continue;
    const tabIds = normalizeTabIds(question);
    if (tabIds.length !== shared.length) return "mixed";
    if (tabIds.some((id, position) => id !== shared[position])) return "mixed";
  }
  return shared;
}

/**
 * Rebuilds `screens` with each question passed through `transform`.
 *
 * Questions the transform returns unchanged keep their object identity, and a
 * screen whose questions all came back unchanged is returned as-is — the same
 * bargain `visibleScreensFor` makes, and for the same reason: these arrays feed
 * react-hook-form field arrays and React keys, so needlessly fresh objects
 * remount inputs the owner may be typing in. The input is never mutated.
 */
function mapQuestions(
  screens: readonly ScreenInput[],
  transform: (question: QuestionInput) => QuestionInput,
): ScreenInput[] {
  return screens.map((screen) => {
    let changed = false;
    const questions = screen.questions.map((question) => {
      const next = transform(question);
      if (next !== question) changed = true;
      return next;
    });
    return changed ? { ...screen, questions } : screen;
  });
}

/**
 * Drops one tab id from every question that lists it.
 *
 * Called when a tab is deleted. A question left listing a tab that no longer
 * exists is not merely untidy: `tabIds` is a membership FILTER, so a question
 * whose only listed tab is gone would be asked on no tab at all — invisible in
 * the builder's preview and in front of every visitor, with nothing on the card
 * to explain why.
 */
export function stripTabId(
  screens: readonly ScreenInput[],
  tabId: string,
): ScreenInput[] {
  return mapQuestions(screens, (question) => {
    const tabIds = question.tabIds ?? [];
    if (!tabIds.includes(tabId)) return question;
    return { ...question, tabIds: tabIds.filter((id) => id !== tabId) };
  });
}

/**
 * Puts every question back on every tab.
 *
 * Called when the LAST tab is deleted — the calculator no longer forks, so
 * every question must be asked again. Leaving stale ids behind would hide
 * questions behind a switcher that is no longer rendered.
 */
export function clearAllTabIds(screens: readonly ScreenInput[]): ScreenInput[] {
  return mapQuestions(screens, (question) =>
    // An ABSENT list is normalized to an explicit `[]` rather than left alone:
    // downstream code reads `tabIds` as a membership filter, and a real empty
    // array is the one shape every reader agrees means "every tab".
    question.tabIds?.length === 0 ? question : { ...question, tabIds: [] },
  );
}

// ─── Changing a question's type ─────────────────────────────────────────────

/**
 * A variable name suggested from a question title, or `""` when the title does
 * not yield a legal one.
 *
 * Used only when a question GAINS a variable it never had (an informational
 * type converted to a priced one). An owner who has to invent an identifier
 * before they can see their new question is an owner who abandons the change,
 * but a suggestion that fails the schema is worse than none — it saves fine
 * and then fails at the formula field with a message pointing somewhere else.
 * So every suggestion is run through the same three gates the validator
 * applies, and anything that trips one comes back empty for the owner to fill
 * in deliberately.
 *
 * Rules, in order: lowercase; every run of non-`[a-z0-9]` becomes one `_`;
 * leading/trailing `_` trimmed; a leading digit gets a `q_` prefix (the
 * identifier grammar forbids one). The result must then match
 * `QUOTE_VARIABLE_NAME_RE`, be at most `QUOTE_VARIABLE_NAME_MAX_LENGTH`
 * characters, and not shadow a formula function.
 */
export function seedVariableName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const candidate = /^[0-9]/.test(slug) ? `q_${slug}` : slug;

  if (!QUOTE_VARIABLE_NAME_RE.test(candidate)) return "";
  if (candidate.length > QUOTE_VARIABLE_NAME_MAX_LENGTH) return "";
  if ((QUOTE_RESERVED_WORDS as readonly string[]).includes(candidate)) {
    return "";
  }
  return candidate;
}

/**
 * The same question, as another type.
 *
 * Carries over everything the destination type can hold and seeds the rest
 * exactly as `makeQuestion` would, so a converted question is indistinguishable
 * from a freshly added one plus the owner's work:
 *
 * - always: `id`, `title`, `description`, `required`, `showIf`, `tabIds`. The
 *   id in particular MUST survive — it is what the owner's other show-ifs,
 *   the distances, and react-hook-form's field arrays all point at.
 * - `variableName`/`hiddenDefault`: carried between priced types. A name is
 *   only ever SEEDED into a question that had none (or a blank one); a name the
 *   owner typed is never overwritten, because it is the name their formula
 *   already references.
 * - `options`: carried across the three option types, icons and values intact
 *   — the option IDS survive with them, which is what lets a `choice` become a
 *   `dropdown` without breaking the show-ifs pointing at its options. A type
 *   that had no options starts from two blank ones, same as a new question.
 * - number and date extras: seeded, since carrying them is only meaningful
 *   number→number / date→date, and that is a no-op handled by the guard below.
 *
 * Pure: the question passed in is never mutated, and an unchanged type returns
 * the very same object so callers can compare by identity.
 */
export function convertQuestionType(
  question: QuestionInput,
  nextType: QuoteQuestionType,
): QuestionInput {
  if (question.type === nextType) return question;

  const base = {
    id: question.id,
    title: question.title,
    description: question.description,
    required: question.required,
    showIf: question.showIf,
    tabIds: question.tabIds,
  };

  const carriedName = isVariableQuestionInput(question)
    ? question.variableName
    : "";
  const variableName = carriedName.trim()
    ? carriedName
    : seedVariableName(question.title);
  const hiddenDefault = isVariableQuestionInput(question)
    ? question.hiddenDefault
    : 0;
  const options = isOptionQuestionInput(question)
    ? [...question.options]
    : [makeOption(), makeOption()];

  // One explicit literal per arm, for the reason spelled out on `makeQuestion`:
  // each return has to satisfy exactly one member of the discriminated union,
  // and a union-typed `type` would satisfy none of them.
  switch (nextType) {
    case "choice":
      return { ...base, type: "choice", variableName, hiddenDefault, options };
    case "multiselect":
      return {
        ...base,
        type: "multiselect",
        variableName,
        hiddenDefault,
        options,
      };
    case "dropdown":
      return {
        ...base,
        type: "dropdown",
        variableName,
        hiddenDefault,
        options,
      };
    case "number":
      return {
        ...base,
        type: "number",
        variableName,
        hiddenDefault,
        min: null,
        max: null,
        unitLabel: "",
      };
    case "zip":
      return { ...base, type: "zip" };
    case "address":
      return { ...base, type: "address" };
    case "text":
      return { ...base, type: "text" };
    case "longtext":
      return { ...base, type: "longtext" };
    case "date":
      return { ...base, type: "date", minDate: "none", maxDaysAhead: null };
  }
}

/**
 * Everything an owner loses by changing one question's type.
 *
 * Computed BEFORE the change so the confirmation dialog can name each
 * consequence in the owner's own vocabulary ("Square footage will stop being
 * used by your formula"). Every field here is also the exact instruction
 * `applyTypeChange` follows, so the dialog and the edit can never disagree.
 */
export type TypeChangeImpact = {
  /** The old type carried options and the new one cannot hold them. */
  optionsDiscarded: boolean;
  /** The variable name that stops existing, or `null` if none does. */
  variableDropped: string | null;
  /** OTHER questions whose "only show when…" points here and must be cleared. */
  dependentShowIfs: Array<{ questionId: string; title: string }>;
  /** Distance variables that lose an endpoint and must be deleted. */
  distancesRemoved: Array<{ id: string; variableName: string }>;
  /** The dropped variable is actually referenced by a formula — the loudest warning. */
  formulaReferencesVariable: boolean;
};

function emptyTypeChangeImpact(): TypeChangeImpact {
  return {
    optionsDiscarded: false,
    variableDropped: null,
    dependentShowIfs: [],
    distancesRemoved: [],
    formulaReferencesVariable: false,
  };
}

/**
 * Whether one formula string reads `name` as a variable.
 *
 * Parses first, because `parseFormula`'s variable list is exact — no false
 * positive from a name that only appears inside a longer identifier. The
 * fallback matters just as much though: the owner may be mid-edit with a
 * formula that does not parse, and answering "no, nothing references it" for a
 * broken formula is how a variable gets silently deleted out from under the
 * arithmetic that was about to use it. So an unparseable formula falls back to
 * whole-identifier tokenization, which over-warns rather than under-warns.
 */
function formulaReferences(
  formula: string | null | undefined,
  name: string,
): boolean {
  if (!formula) return false;
  const parsed = parseFormula(formula);
  if (parsed.ok) return parsed.variables.includes(name);
  return formula.split(/[^A-Za-z0-9_]+/).includes(name);
}

/**
 * What changing `questionId` to `nextType` would cost. Reports only — nothing
 * here edits the definition.
 *
 * Dependent show-ifs are KEPT (and so go unreported) only when both halves of
 * the condition survive: the new type can still be a condition source, AND the
 * option ids it points at carry over — which happens exactly when the old type
 * was an option type too. So `choice → dropdown` keeps every dependent,
 * `choice → multiselect` loses them all (multiselect cannot be a show-if
 * source: "which of several checked boxes counts?" has no answer), and
 * anything → `text` loses them all. The question's OWN show-if is never
 * touched: it points at some EARLIER question and does not care what type this
 * one is.
 *
 * An unknown `questionId`, or a no-op change, reports no impact at all.
 */
export function describeTypeChangeImpact(
  definition: CalculatorDefinitionInput,
  questionId: string,
  nextType: QuoteQuestionType,
): TypeChangeImpact {
  const impact = emptyTypeChangeImpact();

  const flat = flattenScreens(definition.screens);
  const question = flat.find((candidate) => candidate.id === questionId);
  if (!question || question.type === nextType) return impact;

  impact.optionsDiscarded =
    isOptionQuestionInput(question) && !isOptionQuestionType(nextType);

  if (isVariableQuestionInput(question) && !isVariableQuestionType(nextType)) {
    // A blank name never made it into a formula, so losing it costs nothing
    // and warning about it would only teach owners to click through warnings.
    const name = question.variableName.trim();
    impact.variableDropped = name === "" ? null : name;
  }

  const keepsDependents =
    isConditionSourceType(nextType) && isOptionQuestionInput(question);
  if (!keepsDependents) {
    for (const other of flat) {
      if (other.id === questionId) continue;
      if (other.showIf?.questionId !== questionId) continue;
      impact.dependentShowIfs.push({
        questionId: other.id,
        title: other.title,
      });
    }
  }

  if (!isLocationQuestionType(nextType)) {
    for (const distance of definition.distances ?? []) {
      if (
        distance.fromQuestionId !== questionId &&
        distance.toQuestionId !== questionId
      ) {
        continue;
      }
      impact.distancesRemoved.push({
        id: distance.id,
        variableName: distance.variableName,
      });
    }
  }

  if (impact.variableDropped !== null) {
    const name = impact.variableDropped;
    impact.formulaReferencesVariable =
      formulaReferences(definition.formula, name) ||
      (definition.tabs ?? []).some((tab) =>
        formulaReferences(tab.formula, name),
      );
  }

  return impact;
}

/**
 * Performs the change `describeTypeChangeImpact` described.
 *
 * The question is replaced where it stands — same screen, same position — and
 * exactly the show-ifs and distances the impact listed are cleared and removed.
 * Nothing else moves: the formula, the tabs and every setting are returned to
 * the caller untouched (they are not in the return value at all), because a
 * formula the owner wrote is theirs to fix. Deleting the term that references a
 * now-dead variable would be this function guessing at pricing.
 *
 * Pure — new arrays, no mutation, and unchanged questions and screens keep
 * their identity (see `mapQuestions`).
 */
export function applyTypeChange(
  definition: CalculatorDefinitionInput,
  questionId: string,
  nextType: QuoteQuestionType,
): { screens: ScreenInput[]; distances: DistanceInput[] } {
  const impact = describeTypeChangeImpact(definition, questionId, nextType);
  const clearedIds = new Set(
    impact.dependentShowIfs.map((dependent) => dependent.questionId),
  );
  const removedDistanceIds = new Set(
    impact.distancesRemoved.map((distance) => distance.id),
  );

  const screens = mapQuestions(definition.screens, (question) => {
    if (question.id === questionId) {
      return convertQuestionType(question, nextType);
    }
    if (!clearedIds.has(question.id)) return question;
    return { ...question, showIf: null };
  });

  const distances = (definition.distances ?? []).filter(
    (distance) => !removedDistanceIds.has(distance.id),
  );

  return { screens, distances };
}

// ─── Money ──────────────────────────────────────────────────────────────────

/**
 * The raw formula result, shown next to the estimate so an owner can see what
 * the arithmetic produced before `finalizeEstimateCents` rounds it (and, at
 * the extremes, nulls it out). NOT currency-formatted, and never fed to
 * `formatPrice` — that helper takes cents, and this is dollars.
 */
export function formatFormulaValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}
