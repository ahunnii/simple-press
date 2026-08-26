import { z } from "zod";

import { isRealCalendarDate } from "~/lib/calendar-date";
import { US_STATES_AND_TERRITORIES } from "~/lib/geo/regions";
import { parseFormula } from "~/lib/quote/formula";
import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";

/**
 * Schemas for the Quote Calculator feature.
 *
 * One calculator is a `QuoteCalculatorDefinition`: an ordered list of SCREENS,
 * each holding one or more question fields, a handful of owner-assigned
 * variable names, optional location-pair distance variables, and a single
 * pricing formula the SERVER evaluates.
 *
 * Three invariants run through this whole file:
 *
 * 1. **The client never sees pricing internals.** Option `value`s, every
 *    `hiddenDefault`, the `distances` list and the `formula` itself are
 *    owner-only. `toPublicCalculatorDefinition` below is the one function
 *    allowed to cross that line, and it builds its output field-by-field
 *    rather than by omission — see the note on it.
 * 2. **A definition that parses is a definition that computes.** The
 *    `superRefine` at the bottom is what makes that true: it proves the
 *    formula parses, that every variable it names actually exists, that no
 *    show-if points at a question the visitor has not reached yet, and that
 *    every distance pairs two real location questions. Anything it lets
 *    through, `computeQuote` can evaluate without a "this owner
 *    misconfigured it" path.
 * 3. **Reads migrate, writes are strict.** `quoteCalculatorDefinitionSchema`
 *    accepts v2 and nothing else — it is what `create`/`update` and the
 *    builder form are typed against. Every path that READS a stored blob must
 *    go through `parseStoredQuoteDefinition`, which migrates v1 first. See the
 *    drift-wall note above `migrateQuoteDefinition`. Writes are strict in one
 *    further sense: they also run `checkQuoteOwnerConfiguration`, a second set
 *    of rules a stored definition is allowed to violate. Adding a rule to the
 *    wrong one of those two functions locks owners out of their own
 *    calculators — the note on that function explains exactly how.
 */

// ─── Variable names ─────────────────────────────────────────────────────────

/**
 * Legal shape of an owner-assigned variable name.
 *
 * Lowercase only, and identical to the identifier rule in
 * `src/lib/quote/formula.ts`'s tokenizer. The two must stay in lockstep: a
 * name this accepts but the tokenizer cannot read is a variable that can be
 * defined and never referenced, and the mismatch would only surface as a
 * confusing "unknown variable" on the formula field.
 */
export const QUOTE_VARIABLE_NAME_RE = /^[a-z_][a-z0-9_]*$/;

/**
 * Function names in the formula language. A variable may not shadow one —
 * `round` as a variable name would be unreferenceable, since `round(` always
 * parses as a call.
 */
export const QUOTE_RESERVED_WORDS = [
  "min",
  "max",
  "round",
  "ceil",
  "floor",
] as const;

export const QUOTE_VARIABLE_NAME_MAX_LENGTH = 30;

export const QUOTE_FORMULA_MAX_LENGTH = 500;

/** Exactly the shapes `<input type="date">` and a 5-digit US ZIP produce. */
export const QUOTE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const QUOTE_ZIP_RE = /^\d{5}$/;

/**
 * The two-letter codes an `address` question's state field accepts, derived
 * from `US_STATES_AND_TERRITORIES` — the 50 states + DC plus the US
 * territories (PR/VI/GU/AS/MP) — the same list the storefront `<select>`
 * renders. Derived, not hand-copied: a state present in one and absent from
 * the other is a field the visitor can select and the server then rejects.
 * Quote addresses deliberately include the territories even though
 * checkout/shipping's `US_STATES` does not — see the comment on
 * `US_STATES_AND_TERRITORIES` in `~/lib/geo/regions`.
 */
export const US_STATE_CODES: ReadonlySet<string> = new Set(
  US_STATES_AND_TERRITORIES.map((state) => state.code),
);

// The field-level schema stays deliberately loose (non-empty trimmed string).
// The regex / length / reserved-word / uniqueness checks all live in the
// definition-level `superRefine` so each one can report against a precise
// path — `["screens", 1, "questions", 0, "variableName"]` — and the builder
// can highlight the exact row rather than the whole form.
const quoteVariableNameField = z
  .string()
  .trim()
  .min(1, "Variable name is required");

// ─── Question types ─────────────────────────────────────────────────────────

export const QUOTE_QUESTION_TYPE_VALUES = [
  "choice",
  "multiselect",
  "dropdown",
  "number",
  "zip",
  "address",
  "text",
  "longtext",
  "date",
] as const;

/**
 * The question types that produce a formula variable. Everything else is
 * informational — it is captured on the submission for the owner to read, but
 * contributes nothing to the price.
 */
export const QUOTE_VARIABLE_QUESTION_TYPES = [
  "choice",
  "multiselect",
  "dropdown",
  "number",
] as const;

// ─── Option ─────────────────────────────────────────────────────────────────

export const quoteOptionSchema = z.object({
  id: z.string().min(1),
  label: z
    .string()
    .trim()
    .min(1, "Option label is required")
    .max(80, "Option label must be 80 characters or fewer"),
  /** Owner-only. Never leaves the server — see `toPublicCalculatorDefinition`. */
  value: z.number().finite(),
  /**
   * A Lucide icon name from the curated storefront set. Validated as a plain
   * string on purpose: the curated list is owned by the rendering side, and an
   * icon that no longer exists should render nothing, not make a saved
   * calculator unloadable.
   */
  icon: z.string().max(50).optional().nullable(),
});

export type QuoteOption = z.infer<typeof quoteOptionSchema>;

// ─── Show-if ────────────────────────────────────────────────────────────────

export const quoteShowIfSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1),
});

export type QuoteShowIf = z.infer<typeof quoteShowIfSchema>;

/**
 * "No condition" can reach the schema as more than just `null`/`undefined`:
 * react-hook-form materializes registered nested paths, so a question whose
 * owner never touched "Only show when…" can arrive as
 * `{ questionId: undefined, optionId: undefined }` or `{ questionId: "" }`.
 * Treat every degenerate shape as "always shown" instead of failing the save —
 * a truthy-but-empty object would otherwise also read as "hidden behind a
 * nonexistent question" everywhere `resolveVisibility` runs.
 */
const quoteShowIfField = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    const questionId = (value as { questionId?: unknown }).questionId;
    if (typeof questionId !== "string" || questionId === "") return null;
  }
  return value;
}, quoteShowIfSchema.nullable()) as unknown as z.ZodType<
  // `z.preprocess` types its input as `unknown`, which would bleed `{}` into
  // the builder form's field types. The runtime behavior is unchanged by this
  // cast: output and (post-normalization) input are both ShowIf-or-null.
  QuoteShowIf | null,
  z.ZodTypeDef,
  QuoteShowIf | null
>;

// ─── Question ───────────────────────────────────────────────────────────────

const quoteQuestionBaseShape = {
  id: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(1, "Question title is required")
    .max(200, "Question title must be 200 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer")
    .optional()
    .nullable(),
  required: z.boolean().default(true),
  showIf: quoteShowIfField.optional(),
};

const quoteOptionListShape = {
  variableName: quoteVariableNameField,
  options: z
    .array(quoteOptionSchema)
    .min(2, "Add at least 2 options")
    .max(12, "A question can have at most 12 options"),
  /**
   * The value this question's variable takes when the question does not apply
   * — i.e. when a show-if hides it, or (for single-answer types) when it is
   * optional and left blank. Owner-only; never sent to the client, because
   * knowing it plus the option values reverse-engineers the price table.
   */
  hiddenDefault: z.number().finite().default(0),
};

export const quoteChoiceQuestionSchema = z.object({
  type: z.literal("choice"),
  ...quoteQuestionBaseShape,
  ...quoteOptionListShape,
});

export const quoteMultiselectQuestionSchema = z.object({
  type: z.literal("multiselect"),
  ...quoteQuestionBaseShape,
  ...quoteOptionListShape,
});

export const quoteDropdownQuestionSchema = z.object({
  type: z.literal("dropdown"),
  ...quoteQuestionBaseShape,
  ...quoteOptionListShape,
});

export const quoteNumberQuestionSchema = z.object({
  type: z.literal("number"),
  ...quoteQuestionBaseShape,
  variableName: quoteVariableNameField,
  // Nullable as well as optional: the builder's number inputs clear to null
  // rather than dropping the key, and an owner removing a bound must be able
  // to persist that removal.
  min: z.number().finite().optional().nullable(),
  max: z.number().finite().optional().nullable(),
  unitLabel: z
    .string()
    .trim()
    .max(20, "Unit label must be 20 characters or fewer")
    .optional()
    .nullable(),
  hiddenDefault: z.number().finite().default(0),
});

export const quoteZipQuestionSchema = z.object({
  type: z.literal("zip"),
  ...quoteQuestionBaseShape,
});

/**
 * A full US street address collected as one field group (line 1, optional line
 * 2, city, state, ZIP).
 *
 * Informational like `zip` — it declares no variable and contributes nothing to
 * the price directly — but its ZIP half may serve as a distance endpoint, which
 * is why it carries no extra config here and why `isQuoteLocationQuestion`
 * exists below. The sub-field shapes live on the WIRE schema
 * (`quoteWireAddressSchema`), not here: the definition only says "ask for an
 * address", the wire says what a valid answer looks like.
 */
export const quoteAddressQuestionSchema = z.object({
  type: z.literal("address"),
  ...quoteQuestionBaseShape,
});

export const quoteTextQuestionSchema = z.object({
  type: z.literal("text"),
  ...quoteQuestionBaseShape,
});

export const quoteLongtextQuestionSchema = z.object({
  type: z.literal("longtext"),
  ...quoteQuestionBaseShape,
});

export const quoteDateQuestionSchema = z.object({
  type: z.literal("date"),
  ...quoteQuestionBaseShape,
  /**
   * `"today"` refuses a date in the past. Informational questions do not price
   * anything, so this is not a security bound — it is the difference between a
   * lead the owner can act on and one asking for a move-out date last March.
   *
   * "Today" is resolved in the BUSINESS's time zone on the server (see
   * `options.today` in `computeQuote`), not the visitor's: a shopper in Tokyo
   * filling in a Detroit mover's form must be measured against the mover's
   * calendar, or a perfectly ordinary "tomorrow" gets rejected as the past.
   *
   * `"none"` (the default) keeps the field entirely unbounded, which is what
   * every calculator built before this option existed had.
   */
  minDate: z.enum(["none", "today"]).default("none"),
  /**
   * Upper bound as a number of days past today, inclusive — a scheduling
   * horizon ("we book up to 6 months out"). `null`/absent means no ceiling.
   * Capped at 730 so the bound stays a business rule rather than a way to
   * express an arbitrary far-future date.
   */
  maxDaysAhead: z.number().int().min(1).max(730).nullable().optional(),
});

export const quoteQuestionSchema = z.discriminatedUnion("type", [
  quoteChoiceQuestionSchema,
  quoteMultiselectQuestionSchema,
  quoteDropdownQuestionSchema,
  quoteNumberQuestionSchema,
  quoteZipQuestionSchema,
  quoteAddressQuestionSchema,
  quoteTextQuestionSchema,
  quoteLongtextQuestionSchema,
  quoteDateQuestionSchema,
]);

export type QuoteQuestion = z.infer<typeof quoteQuestionSchema>;
export type QuoteQuestionType = QuoteQuestion["type"];

/** Any question that contributes a variable to the formula. */
export type QuoteVariableQuestion = Extract<
  QuoteQuestion,
  { variableName: string }
>;

/** Any question carrying an option list. */
export type QuoteOptionQuestion = Extract<
  QuoteQuestion,
  { options: unknown[] }
>;

/**
 * Any question that yields a ZIP the server can resolve to coordinates — i.e.
 * anything usable as a distance endpoint.
 *
 * Both members are informational (no variable, no price), so this is NOT a
 * pricing predicate; it is "can this question anchor a distance?". Keep it in
 * lockstep with the `case "zip"` / `case "address"` arms of `computeQuote` that
 * populate `zipCoordinates`: a type accepted here but not resolved there is a
 * distance that silently falls to its `hiddenDefault` forever.
 */
export type QuoteLocationQuestion = Extract<
  QuoteQuestion,
  { type: "zip" | "address" }
>;

export function isQuoteVariableQuestion(
  question: QuoteQuestion,
): question is QuoteVariableQuestion {
  return (
    question.type === "choice" ||
    question.type === "multiselect" ||
    question.type === "dropdown" ||
    question.type === "number"
  );
}

export function isQuoteOptionQuestion(
  question: QuoteQuestion,
): question is QuoteOptionQuestion {
  return (
    question.type === "choice" ||
    question.type === "multiselect" ||
    question.type === "dropdown"
  );
}

export function isQuoteLocationQuestion(
  question: QuoteQuestion,
): question is QuoteLocationQuestion {
  return question.type === "zip" || question.type === "address";
}

// ─── Distance variable ──────────────────────────────────────────────────────

/**
 * Pairs two location questions (`zip` or `address`) into a straight-line-miles
 * variable.
 *
 * Kept out of `screens` because it is not a step — the visitor never sees it
 * and never answers it. It is a derived variable, computed from two answers
 * they already gave.
 */
export const quoteDistanceVariableSchema = z.object({
  id: z.string().min(1),
  variableName: quoteVariableNameField,
  fromQuestionId: z.string().min(1),
  toQuestionId: z.string().min(1),
  /** Used when either endpoint is hidden or left blank. */
  hiddenDefault: z.number().finite().default(0),
  /**
   * Straight-line miles × this = the number the formula sees.
   *
   * `haversineMiles` measures as the crow flies, and no truck drives that; the
   * usual planning figure for US road networks is 20–30% further. An owner who
   * priced per-mile against the raw haversine number has been quietly
   * undercharging every long job.
   *
   * The schema default is `1` — deliberately NOT the realistic 1.25 — because
   * this field is read into every stored calculator on load, and a default of
   * 1.25 would silently reprice every existing calculator the first time it
   * was read. Existing quotes must not move because a column appeared. The
   * builder writes `1.25` for NEWLY created distances instead (see
   * `makeDistance` in `builder-shared.ts`), so new calculators get the honest
   * number and old ones keep theirs until their owner changes it.
   *
   * Bounded 1–2: below 1 is a road shorter than the straight line, which does
   * not exist, and above 2 is a data-entry slip rather than a detour.
   */
  roadFactor: z.number().min(1).max(2).default(1),
});

export type QuoteDistanceVariable = z.infer<typeof quoteDistanceVariableSchema>;

// ─── Screen ─────────────────────────────────────────────────────────────────

/** Total questions across every screen. */
export const QUOTE_MAX_QUESTIONS = 30;

/**
 * Questions on one screen. Low on purpose: a step the visitor has to scroll
 * through is a step they abandon, and the whole shape of this feature is
 * "one small ask at a time".
 */
export const QUOTE_MAX_QUESTIONS_PER_SCREEN = 8;

/** Also the maximum number of steps, since the floor is one question each. */
export const QUOTE_MAX_SCREENS = QUOTE_MAX_QUESTIONS;

/**
 * One step in the visitor's flow.
 *
 * `title`/`description` are optional because the overwhelmingly common screen
 * holds exactly one question, and the runner renders THAT question's title as
 * the heading (today's one-question-per-slide look, preserved bit-for-bit).
 * A heading only earns its place once a screen groups several questions.
 *
 * Nullable as well as optional: the builder's text inputs clear to `""` and the
 * v1 migration writes explicit `null`s, and an owner deleting a heading must be
 * able to persist that deletion.
 */
export const quoteScreenSchema = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .trim()
    .max(120, "Screen heading must be 120 characters or fewer")
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(300, "Intro text must be 300 characters or fewer")
    .optional()
    .nullable(),
  questions: z
    .array(quoteQuestionSchema)
    .min(1, "Add at least one question to this screen")
    .max(
      QUOTE_MAX_QUESTIONS_PER_SCREEN,
      `A screen can hold at most ${QUOTE_MAX_QUESTIONS_PER_SCREEN} questions`,
    ),
});

export type QuoteScreen = z.infer<typeof quoteScreenSchema>;

// ─── Definition ─────────────────────────────────────────────────────────────

/**
 * Shown under the live running estimate. Owner-editable, but never absent —
 * a number that moves as the visitor answers reads as a firm price unless
 * something says otherwise, and that is a quote the owner did not make.
 */
export const QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT =
  "This running estimate is for guidance only — we'll confirm your final quote after reviewing your details.";

const quoteCalculatorDefinitionObjectSchema = z.object({
  /**
   * Definition format version, pinned to 2 — the current shape, and the only
   * one this schema accepts. v1 (`questions` at the top level) is still out
   * there in the database and is upgraded on read by
   * `parseStoredQuoteDefinition`; see the drift-wall note there.
   */
  version: z.literal(2),
  screens: z
    .array(quoteScreenSchema)
    .min(1, "Add at least one question")
    .max(
      QUOTE_MAX_SCREENS,
      `A calculator can have at most ${QUOTE_MAX_SCREENS} screens`,
    ),
  distances: z
    .array(quoteDistanceVariableSchema)
    .max(5, "A calculator can have at most 5 distance variables")
    .default([]),
  formula: z
    .string()
    .trim()
    .min(1, "A pricing formula is required")
    .max(
      QUOTE_FORMULA_MAX_LENGTH,
      `Formula must be ${QUOTE_FORMULA_MAX_LENGTH} characters or fewer`,
    ),
  /**
   * Whether the visitor is shown the computed number at all. Off by default:
   * for most trades the point of the calculator is to start a conversation,
   * and a bare number with no context loses more leads than it wins.
   */
  showEstimateToCustomer: z.boolean().default(false),
  /**
   * WHERE the figure appears, once `showEstimateToCustomer` has said it may
   * appear at all. Two settings rather than one because "show them a price"
   * and "show them a price *on the screen they are standing on*" are different
   * decisions: `false` here sends the number ONLY in the confirmation email,
   * leaving the thank-you screen and the running estimate silent.
   *
   * That combination is what a trade with a negotiable rate table actually
   * wants — the visitor gets their number, but they get it after the lead is
   * captured, in a message with the owner's framing around it, and they cannot
   * sit on the form flipping answers to reverse-engineer the price list.
   *
   * Defaults `true` so an owner who only ever touches `showEstimateToCustomer`
   * keeps today's behavior exactly.
   */
  showEstimateOnScreen: z.boolean().default(true),
  /** Show "$2,000 – $2,400" instead of a single figure. */
  displayAsRange: z.boolean().default(false),
  rangePaddingPercent: z.number().int().min(1).max(50).default(10),
  /**
   * A final "Review & send" step listing every visible answer with an Edit
   * link, after the contact details.
   *
   * Defaults ON for calculators built from here on — correcting an answer
   * without Back-stepping through the whole flow is plainly better. The v1
   * migration deliberately writes `false` instead, so an existing calculator
   * does not silently grow a step its owner never chose.
   */
  showReviewStep: z.boolean().default(true),
  /**
   * A running estimate that updates as the visitor answers.
   *
   * Off by default, and meaningless without `showEstimateToCustomer` — the
   * public projection ANDs the two so a stale `true` here can never leak a
   * price the owner turned off. The tradeoff is real and is the owner's to
   * make: a visitor can flip one answer back and forth and watch the number
   * move, which reveals what that answer is worth. Fine for menu-style
   * pricing, not for a sensitive rate table.
   */
  showLiveEstimate: z.boolean().default(false),
  liveEstimateDisclaimer: z
    .string()
    .trim()
    .max(300, "Disclaimer must be 300 characters or fewer")
    .default(QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT),
  requirePhone: z.boolean().default(false),
  /**
   * The receipt emailed to the VISITOR ("thanks, we got your request"). The
   * owner's own new-lead notification is a separate email and is unaffected by
   * this — a lead never goes unannounced because an owner switched off the
   * customer-facing copy.
   *
   * Load-bearing when `showEstimateOnScreen` is off: that combination puts the
   * figure in this email and nowhere else, which is why `checkQuoteDefinition`
   * refuses the three-way contradiction (estimate on, screen off, email off).
   */
  sendConfirmationEmail: z.boolean().default(true),
  /** "We'll get back to you within N business days." */
  responseDays: z.number().int().min(1).max(14).default(1),
  thankYouMessage: z
    .string()
    .trim()
    .max(500, "Thank-you message must be 500 characters or fewer")
    .default("Thanks! We received your request."),
});

type QuoteCalculatorDefinitionShape = z.output<
  typeof quoteCalculatorDefinitionObjectSchema
>;

function isReservedWord(name: string): boolean {
  for (const reserved of QUOTE_RESERVED_WORDS) {
    if (reserved === name) return true;
  }
  return false;
}

/**
 * Every cross-field rule for a definition, each with a precise `path` so the
 * builder can attach the message to the exact row/field that caused it.
 *
 * Everything below reasons over ONE flattened list built up front, because
 * every rule here is about the order the visitor meets questions in, not about
 * which screen they happen to sit on. `path` carries the screen coordinates
 * (`["screens", 1, "questions", 0, …]`) so the message still lands on the right
 * card; `flatIndex` carries the ordering. Conflating the two is how a show-if
 * that is legal within a screen ends up rejected — or, worse, one that points
 * forward ends up accepted and resolves to permanently-hidden at runtime.
 */
function checkQuoteDefinition(
  definition: QuoteCalculatorDefinitionShape,
  ctx: z.RefinementCtx,
): void {
  const { screens, distances } = definition;

  type FlatQuestion = {
    question: QuoteQuestion;
    /** Position in visitor order — the axis every ordering rule uses. */
    flatIndex: number;
    /** `["screens", screenIndex, "questions", questionIndex]`. */
    path: (string | number)[];
  };

  const flat: FlatQuestion[] = [];
  screens.forEach((screen, screenIndex) => {
    screen.questions.forEach((question, questionIndex) => {
      flat.push({
        question,
        flatIndex: flat.length,
        path: ["screens", screenIndex, "questions", questionIndex],
      });
    });
  });

  // ── Total question ceiling ───────────────────────────────────────────────
  // Per-screen and per-array caps are enforced by the schema; only the total
  // across screens has nowhere else to live. Reported against ["screens"] —
  // no single row is at fault.
  if (flat.length > QUOTE_MAX_QUESTIONS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `A calculator can have at most ${QUOTE_MAX_QUESTIONS} questions`,
      path: ["screens"],
    });
  }

  // ── Unique screen ids ────────────────────────────────────────────────────
  const seenScreenIds = new Set<string>();
  screens.forEach((screen, screenIndex) => {
    if (seenScreenIds.has(screen.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate screen id "${screen.id}"`,
        path: ["screens", screenIndex, "id"],
      });
    }
    seenScreenIds.add(screen.id);
  });

  // ── Unique question ids, across ALL screens ──────────────────────────────
  // One namespace, not one per screen: show-if and distances reference a
  // question by bare id, so two screens holding the same id makes both of
  // those ambiguous.
  const seenQuestionIds = new Set<string>();
  for (const entry of flat) {
    if (seenQuestionIds.has(entry.question.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate question id "${entry.question.id}"`,
        path: [...entry.path, "id"],
      });
    }
    seenQuestionIds.add(entry.question.id);
  }

  // ── Unique option ids within each question ───────────────────────────────
  for (const entry of flat) {
    if (!isQuoteOptionQuestion(entry.question)) continue;
    const seenOptionIds = new Set<string>();
    entry.question.options.forEach((option, optionIndex) => {
      if (seenOptionIds.has(option.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate option id "${option.id}"`,
          path: [...entry.path, "options", optionIndex, "id"],
        });
      }
      seenOptionIds.add(option.id);
    });
  }

  // ── Variable names ───────────────────────────────────────────────────────
  // One namespace shared by variable-producing questions AND distances: they
  // all land in the same `variables` record the formula reads, so a collision
  // between a question and a distance is exactly as broken as one between two
  // questions.
  const declaredVariables = new Set<string>();

  function checkVariableName(name: string, path: (string | number)[]): void {
    if (name.length > QUOTE_VARIABLE_NAME_MAX_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Variable name must be ${QUOTE_VARIABLE_NAME_MAX_LENGTH} characters or fewer`,
        path,
      });
    }
    if (!QUOTE_VARIABLE_NAME_RE.test(name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${name}" is not a valid variable name — use lowercase letters, numbers and underscores, starting with a letter or underscore`,
        path,
      });
    }
    if (isReservedWord(name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${name}" is a built-in formula function and cannot be used as a variable name`,
        path,
      });
    }
    if (declaredVariables.has(name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate variable name "${name}" — each variable name must be used once`,
        path,
      });
    }
    declaredVariables.add(name);
  }

  for (const entry of flat) {
    if (!isQuoteVariableQuestion(entry.question)) continue;
    checkVariableName(entry.question.variableName, [
      ...entry.path,
      "variableName",
    ]);
  }

  distances.forEach((distance, index) => {
    checkVariableName(distance.variableName, [
      "distances",
      index,
      "variableName",
    ]);
  });

  // ── Show-if references ───────────────────────────────────────────────────
  // Must point BACKWARD at a single-answer question. Backward because the
  // storefront runner resolves visibility in one forward pass (see
  // `resolveVisibility`), and single-answer because "which of several checked
  // boxes counts?" has no good answer.
  //
  // "Backward" is measured on the FLATTENED index, so a question may depend on
  // an earlier question ON THE SAME SCREEN — that is a live reveal within one
  // step, which is exactly what multi-question screens are for. What it may not
  // do is depend on a question the visitor has not reached, whether that sits
  // later on this screen or on a later screen.
  const flatByQuestionId = new Map<string, FlatQuestion>();
  for (const entry of flat) {
    if (!flatByQuestionId.has(entry.question.id)) {
      flatByQuestionId.set(entry.question.id, entry);
    }
  }

  for (const entry of flat) {
    const condition = entry.question.showIf;
    if (!condition) continue;

    const targetEntry = flatByQuestionId.get(condition.questionId);
    if (!targetEntry || targetEntry.flatIndex >= entry.flatIndex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "A conditional question must depend on a question that comes before it",
        path: [...entry.path, "showIf", "questionId"],
      });
      continue;
    }

    const target = targetEntry.question;

    if (target.type !== "choice" && target.type !== "dropdown") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "A conditional question can only depend on a single-choice or dropdown question",
        path: [...entry.path, "showIf", "questionId"],
      });
      continue;
    }

    if (!target.options.some((option) => option.id === condition.optionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${target.title}" has no option matching this condition`,
        path: [...entry.path, "showIf", "optionId"],
      });
    }
  }

  // ── Distance endpoints ───────────────────────────────────────────────────
  const questionById = new Map<string, QuoteQuestion>();
  for (const entry of flat) {
    if (!questionById.has(entry.question.id)) {
      questionById.set(entry.question.id, entry.question);
    }
  }

  distances.forEach((distance, index) => {
    const endpoints: {
      key: "fromQuestionId" | "toQuestionId";
      id: string;
    }[] = [
      { key: "fromQuestionId", id: distance.fromQuestionId },
      { key: "toQuestionId", id: distance.toQuestionId },
    ];

    for (const endpoint of endpoints) {
      const target = questionById.get(endpoint.id);
      if (!target) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick a ZIP code or address question",
          path: ["distances", index, endpoint.key],
        });
        continue;
      }
      if (!isQuoteLocationQuestion(target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${target.title}" is not a ZIP code or address question`,
          path: ["distances", index, endpoint.key],
        });
      }
    }

    if (distance.fromQuestionId === distance.toQuestionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick two different ZIP code questions",
        path: ["distances", index, "toQuestionId"],
      });
    }
  });

  // ── Formula ──────────────────────────────────────────────────────────────
  // Both halves report against ["formula"] so the builder shows them on the
  // one field the owner types into. `FormulaFailure.message` already carries
  // the character position, so it reads usefully on its own.
  const parsed = parseFormula(definition.formula);
  if (!parsed.ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: parsed.error.message,
      path: ["formula"],
    });
    return;
  }

  for (const referenced of parsed.variables) {
    if (declaredVariables.has(referenced)) continue;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unknown variable "${referenced}" — no question or distance defines it`,
      path: ["formula"],
    });
  }
}

/**
 * Rules a definition must satisfy to be SAVED — but that an ALREADY-SAVED
 * definition is allowed to violate.
 *
 * This split is not stylistic. `checkQuoteDefinition` above answers "can this
 * be computed?", and every path that reads a stored blob runs it, so a rule
 * added there retroactively invalidates definitions that were legal when they
 * were saved. That is not a warning to their owner — it is a lockout:
 * `getByIdPublic` stops finding the calculator, so the widget vanishes from
 * the live page, AND the builder's own edit page
 * (`admin/quotes/calculators/[id]/page.tsx`) reads through the same
 * `parseStoredQuoteDefinition`, so the owner cannot open it to fix the very
 * thing that broke it.
 *
 * The rules below are all of that second kind: each one is a configuration
 * the owner almost certainly did not mean, and each one still COMPUTES —
 * `computeQuote` has a defined, sane behavior for every one of them. So they
 * are enforced where the owner is standing in front of the form and can act on
 * the message, and nowhere else.
 *
 * The test for "does this belong here or up there?" is simple: if
 * `computeQuote` would be wrong or would crash, it is a computation-integrity
 * rule and belongs in `checkQuoteDefinition`. If it merely produces a quote
 * nobody wanted, it belongs here.
 */
function checkQuoteOwnerConfiguration(
  definition: QuoteCalculatorDefinitionShape,
  ctx: z.RefinementCtx,
): void {
  const { screens, distances } = definition;

  // ── Estimate visibility ────────────────────────────────────────────────
  // "Show the customer their estimate" + "not on screen" + "no confirmation
  // email" produces nothing at all: the owner believes they are sharing a
  // price, and the visitor never sees one anywhere. Every other combination
  // has a coherent meaning, so this is the single contradiction worth
  // refusing rather than quietly honoring.
  if (
    definition.showEstimateToCustomer &&
    !definition.showEstimateOnScreen &&
    !definition.sendConfirmationEmail
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Email-only estimates need the confirmation email — turn it back on, or show the estimate on screen.",
      path: ["sendConfirmationEmail"],
    });
  }

  // ── Number bounds ──────────────────────────────────────────────────────
  // An inverted range accepts nothing: the storefront input refuses every
  // value, and the visitor is stuck on a step with no legal answer and no
  // explanation. Reported against `max`, the field the owner most likely
  // typed last.
  const questionById = new Map<string, QuoteQuestion>();
  screens.forEach((screen, screenIndex) => {
    screen.questions.forEach((question, questionIndex) => {
      if (!questionById.has(question.id)) {
        questionById.set(question.id, question);
      }
      if (question.type !== "number") return;
      if (question.min == null || question.max == null) return;
      if (question.min > question.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Maximum must be at least the minimum.",
          path: ["screens", screenIndex, "questions", questionIndex, "max"],
        });
      }
    });
  });

  // ── Distance endpoints must be required ────────────────────────────────
  // An OPTIONAL endpoint is a distance that collapses to its `hiddenDefault`
  // the moment a visitor skips the field — and since a distance is usually
  // the mileage half of the price, the owner gets a lead quoted as if the job
  // were next door. `computeQuote` is right to fall back rather than fail (a
  // blank optional question genuinely did not apply), which is exactly why
  // this cannot be caught at runtime: nothing is broken then, the number is
  // just wrong. Save time is the only moment the owner can see the choice.
  distances.forEach((distance, index) => {
    const endpoints: {
      key: "fromQuestionId" | "toQuestionId";
      id: string;
    }[] = [
      { key: "fromQuestionId", id: distance.fromQuestionId },
      { key: "toQuestionId", id: distance.toQuestionId },
    ];

    for (const endpoint of endpoints) {
      const target = questionById.get(endpoint.id);
      // A missing or non-location endpoint is `checkQuoteDefinition`'s to
      // report; saying it twice would put two messages on one field.
      if (!target || !isQuoteLocationQuestion(target)) continue;
      if (target.required === true) continue;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${target.title}" must be a required question to anchor a distance — make it required, or remove this distance.`,
        path: ["distances", index, endpoint.key],
      });
    }
  });
}

/**
 * The STRICT schema: v2 only, and the one `create`/`update` accept.
 *
 * Runs BOTH refine passes — computation integrity and owner configuration.
 * The read path (`storedQuoteDefinitionSchema`) deliberately runs only the
 * first; see the note on `checkQuoteOwnerConfiguration`.
 *
 * Kept as a plain object + `superRefine` (no `preprocess`, no cast) on purpose.
 * It is what the builder's react-hook-form resolver and `CalculatorFormValues =
 * z.input<typeof quoteCalculatorCreateSchema>` are typed against, and a
 * preprocess here would type the form's input as `unknown` and take every
 * field-level type with it.
 */
export const quoteCalculatorDefinitionSchema =
  quoteCalculatorDefinitionObjectSchema.superRefine((definition, ctx) => {
    checkQuoteDefinition(definition, ctx);
    checkQuoteOwnerConfiguration(definition, ctx);
  });

/**
 * The same schema minus the owner-configuration pass — what
 * `storedQuoteDefinitionSchema` validates against after migration.
 *
 * Not exported: "which schema do I read with?" must have exactly one answer,
 * and it is `parseStoredQuoteDefinition`.
 */
const storedQuoteCalculatorDefinitionSchema =
  quoteCalculatorDefinitionObjectSchema.superRefine(checkQuoteDefinition);

export type QuoteCalculatorDefinition = z.infer<
  typeof quoteCalculatorDefinitionSchema
>;

// ─── Stored-definition migration (v1 → v2) ──────────────────────────────────

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Upgrades a stored v1 definition (`{ version: 1, questions: [...] }`) to the
 * v2 shape in memory. Pure, deterministic and idempotent — anything that is not
 * recognizably v1 is returned untouched, so running it on a v2 blob, on
 * garbage, or twice, all no-op.
 *
 * **Never delete this.** v1 blobs are not rewritten in place; a calculator is
 * only written back as v2 the next time its owner saves. Some of them will
 * never be saved again. Removing this function does not "finish" the
 * migration — it 404s those calculators.
 *
 * Shape rules, and why each is what it is:
 *
 * - one screen per question, so an existing calculator keeps its exact
 *   one-question-per-step flow;
 * - screen ids are derived (`screen_<questionId>`), never random: the same blob
 *   must migrate to the same ids on every read, or React keys and the builder's
 *   open-card state would churn on every render;
 * - `showReviewStep: false`, unlike the v2 default of `true` — an existing
 *   calculator must not silently grow a step its owner never chose. New
 *   calculators get the better default; old ones keep their behavior.
 *
 * Settings added to v2 AFTER this migration was written are deliberately not
 * listed here: they take their schema defaults, and every one of those
 * defaults is chosen to be the no-op (`showEstimateOnScreen: true`,
 * `sendConfirmationEmail: true`, `roadFactor: 1`, `minDate: "none"`). Adding a
 * field must never change what a stored calculator quotes, so a new setting
 * whose default WOULD change behavior belongs in this function with an
 * explicit v1 value — not in the schema default.
 */
export function migrateQuoteDefinition(raw: unknown): unknown {
  if (!isPlainRecord(raw)) return raw;
  if (raw.version !== 1 || !Array.isArray(raw.questions)) return raw;

  const { questions, ...rest } = raw;

  return {
    ...rest,
    version: 2,
    screens: questions.map((question, index) => ({
      // The index fallback only fires for a question whose id is missing or
      // non-string — which the strict schema rejects a moment later anyway.
      // It exists so the migration itself stays total and never produces two
      // screens with the same id.
      id:
        isPlainRecord(question) && typeof question.id === "string"
          ? `screen_${question.id}`
          : `screen_${index}`,
      title: null,
      description: null,
      questions: [question],
    })),
    showReviewStep: false,
    showLiveEstimate: false,
    liveEstimateDisclaimer: QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT,
  };
}

/**
 * The READ schema: migrate, then validate for computability.
 *
 * "Strictly" would be the wrong word: this deliberately skips
 * `checkQuoteOwnerConfiguration`, so a calculator saved before a new
 * configuration rule existed still loads, still prices, and can still be
 * opened in the builder — where that rule then blocks the next save until the
 * owner fixes it. See the note on that function.
 *
 * **Drift wall.** Every path that loads a definition out of the database has to
 * use this (via `parseStoredQuoteDefinition`) rather than
 * `quoteCalculatorDefinitionSchema.safeParse` — `getByIdPublic`, `submit`,
 * `previewEstimate`, the builder's `[id]/page.tsx`. A read path left on the
 * strict schema does not degrade gracefully: it NOT_FOUNDs (or blanks) every
 * calculator that has not been re-saved since v2 shipped.
 *
 * The cast is the same trade `quoteShowIfField` makes: `z.preprocess` types its
 * input as `unknown`, which is correct here (a stored JSON blob IS unknown) but
 * would erase the output type. Runtime behavior is untouched.
 */
export const storedQuoteDefinitionSchema = z.preprocess(
  migrateQuoteDefinition,
  storedQuoteCalculatorDefinitionSchema,
) as unknown as z.ZodType<QuoteCalculatorDefinition, z.ZodTypeDef, unknown>;

/** `safeParse` a stored `QuoteCalculator.definition` blob of any version. */
export function parseStoredQuoteDefinition(raw: unknown) {
  return storedQuoteDefinitionSchema.safeParse(raw);
}

// ─── Public projection (THE SECURITY CONTRACT) ──────────────────────────────

export type PublicQuoteOption = {
  id: string;
  label: string;
  icon: string | null;
};

export type PublicQuoteQuestion = {
  id: string;
  type: QuoteQuestionType;
  title: string;
  description: string | null;
  required: boolean;
  showIf: QuoteShowIf | null;
  options?: PublicQuoteOption[];
  min?: number | null;
  max?: number | null;
  unitLabel?: string | null;
  /** `date` questions only. See `quoteDateQuestionSchema`. */
  minDate?: "none" | "today";
  /** `date` questions only. `null` = no ceiling. */
  maxDaysAhead?: number | null;
};

export type PublicQuoteScreen = {
  id: string;
  title: string | null;
  description: string | null;
  questions: PublicQuoteQuestion[];
};

export type PublicQuoteCalculatorDefinition = {
  /**
   * The single source of truth for what the runner renders. There is
   * deliberately no flat `questions` copy alongside it — two orderings of the
   * same list is exactly how a runner and a server disagree about which
   * question came "before" another. Callers that need the flat list build it
   * with `flattenScreens` (`~/lib/quote/screens`).
   */
  screens: PublicQuoteScreen[];
  showEstimateToCustomer: boolean;
  showReviewStep: boolean;
  /**
   * The EFFECTIVE value: `showEstimateToCustomer && showEstimateOnScreen &&
   * showLiveEstimate`. The runner never has to re-AND them, and a definition
   * left with a stale `showLiveEstimate: true` after the owner hid the
   * estimate — or moved it to email only — cannot leak a price through the
   * preview endpoint.
   */
  showLiveEstimate: boolean;
  /**
   * "Your estimate is on its way to your inbox." Price-free by construction:
   * a boolean saying WHERE the number will arrive, never the number.
   *
   * `showEstimateToCustomer && !showEstimateOnScreen && sendConfirmationEmail`
   * — i.e. exactly the email-only configuration. The runner needs it so the
   * thank-you screen can promise the estimate instead of going silent, which
   * is the difference between a considered choice and a form that looks
   * broken.
   */
  estimateByEmail: boolean;
  liveEstimateDisclaimer: string;
  requirePhone: boolean;
  responseDays: number;
  thankYouMessage: string;
};

function toPublicQuestion(question: QuoteQuestion): PublicQuoteQuestion {
  const base: PublicQuoteQuestion = {
    id: question.id,
    type: question.type,
    title: question.title,
    description: question.description ?? null,
    required: question.required,
    showIf: question.showIf
      ? {
          questionId: question.showIf.questionId,
          optionId: question.showIf.optionId,
        }
      : null,
  };

  switch (question.type) {
    case "choice":
    case "multiselect":
    case "dropdown":
      return {
        ...base,
        options: question.options.map((option) => ({
          id: option.id,
          label: option.label,
          icon: option.icon ?? null,
        })),
      };
    case "number":
      return {
        ...base,
        min: question.min ?? null,
        max: question.max ?? null,
        unitLabel: question.unitLabel ?? null,
      };
    case "date":
      // Bounds are public on purpose — unlike option values, they reveal
      // nothing about price, and the storefront input needs them to set
      // `min`/`max` so the visitor is stopped before submitting rather than
      // bounced afterwards. The server re-checks both regardless.
      return {
        ...base,
        minDate: question.minDate,
        maxDaysAhead: question.maxDaysAhead ?? null,
      };
    default:
      return base;
  }
}

/**
 * The only sanctioned way to send a calculator to the browser.
 *
 * Built by ALLOWLIST — every field is named explicitly and copied one at a
 * time. Never rewrite this as a spread-then-delete or an `omit()`: those are
 * subtractive, so any field added to the definition later is public by default
 * and leaks silently the day it lands. Additive means a new field is private
 * by default and has to be opted in here.
 *
 * What it strips, and why each one matters:
 *
 * - `formula` — the entire pricing model in one string.
 * - `distances` — reveals which location pair drives price and by how much.
 * - every option `value` — with the formula, this is the price list.
 * - every `hiddenDefault` — the "doesn't apply" price for each variable.
 * - `displayAsRange` / `rangePaddingPercent` — presentation of an estimate the
 *   server renders; the client is not trusted to widen or narrow a range.
 *
 * Note what is NOT projected even though the runner might seem to want it:
 * there is no per-question "affects the price" flag. The live-estimate hook
 * decides which answers are worth a preview call from the question TYPE alone
 * (`toPreviewWireAnswers`), so nothing about which questions carry money
 * crosses the boundary.
 *
 * The client submits option IDs, never labels and never values; the server
 * recomputes the estimate from the stored definition on every submission.
 */
export function toPublicCalculatorDefinition(
  definition: QuoteCalculatorDefinition,
): PublicQuoteCalculatorDefinition {
  return {
    screens: definition.screens.map((screen) => ({
      id: screen.id,
      title: screen.title ?? null,
      description: screen.description ?? null,
      questions: screen.questions.map(toPublicQuestion),
    })),
    // NOT projected: `showEstimateOnScreen` and `sendConfirmationEmail`. Both
    // are folded into the two effective booleans below, so the browser learns
    // where the number goes without learning the owner's delivery settings.
    showEstimateToCustomer: definition.showEstimateToCustomer,
    showReviewStep: definition.showReviewStep,
    showLiveEstimate:
      definition.showEstimateToCustomer &&
      definition.showEstimateOnScreen &&
      definition.showLiveEstimate,
    estimateByEmail:
      definition.showEstimateToCustomer &&
      !definition.showEstimateOnScreen &&
      definition.sendConfirmationEmail,
    liveEstimateDisclaimer: definition.liveEstimateDisclaimer,
    requirePhone: definition.requirePhone,
    responseDays: definition.responseDays,
    thankYouMessage: definition.thankYouMessage,
  };
}

// ─── Storefront submission (wire) ───────────────────────────────────────────

/**
 * Ceiling on every id the storefront may post — question ids, option ids and
 * the calculator id.
 *
 * These are cuids (25 chars) and owner-authored slugs, so 64 is generous. The
 * bound exists because this schema is the FIRST thing an anonymous request
 * touches: without it a single POST can carry 30 answers × 12 option ids of
 * unbounded length, and every one of those strings gets parsed, deduped and
 * compared against the definition before anything rejects it. Cheap ceiling,
 * whole class of amplification gone.
 */
export const QUOTE_ID_MAX_LENGTH = 64;

/**
 * Ceiling (in absolute value) on a visitor-entered number answer. See the
 * `number` field below for why this is not just `.finite()`.
 */
export const QUOTE_MAX_ANSWER_NUMBER = 1_000_000_000;

/**
 * A US address as the browser sends it, for an `address` question.
 *
 * All-or-nothing at this level: a visitor either supplies a complete address or
 * omits the key entirely. "Half an address" is a client-side state, not a wire
 * state — `computeQuote` still re-checks completeness, because a stored
 * submission being replayed never went through this schema.
 */
export const quoteWireAddressSchema = z.object({
  line1: z
    .string()
    .trim()
    .min(1, "Enter a street address")
    .max(120, "Street address must be 120 characters or fewer"),
  line2: z
    .string()
    .trim()
    .max(120, "Apartment/suite must be 120 characters or fewer")
    .optional(),
  city: z
    .string()
    .trim()
    .min(1, "Enter a city")
    .max(80, "City must be 80 characters or fewer"),
  state: z
    .string()
    .trim()
    .length(2, "Pick a state")
    .refine((code) => US_STATE_CODES.has(code), "Pick a state"),
  zip: z.string().regex(QUOTE_ZIP_RE, "Enter a 5-digit ZIP code"),
});

export type QuoteWireAddress = z.infer<typeof quoteWireAddressSchema>;

/**
 * One answer as the browser sends it: IDs and raw values only, never labels
 * and never prices. Everything here is re-validated against the stored
 * definition in `computeQuote`, so a hand-crafted payload can at worst produce
 * an error, never a price the owner did not configure.
 *
 * Every field is optional because a single shape covers all nine question
 * types; `computeQuote` reads only the field its question type calls for and
 * ignores the rest.
 */
export const quoteWireAnswerSchema = z.object({
  questionId: z.string().min(1).max(QUOTE_ID_MAX_LENGTH),
  /** choice / dropdown */
  optionId: z.string().min(1).max(QUOTE_ID_MAX_LENGTH).optional(),
  /** multiselect */
  optionIds: z
    .array(z.string().min(1).max(QUOTE_ID_MAX_LENGTH))
    .max(12)
    .optional(),
  /**
   * number
   *
   * Absolutely bounded, not merely `.finite()`. Two things sit downstream: the
   * value multiplies through the owner's formula into `estimateCents`, a
   * Postgres `Int?` (int4, max ~2.1e9) whose overflow surfaces as a raw Prisma
   * error serialized to an anonymous visitor; and even well short of overflow,
   * a `9e12`-bedroom "quote" persists and emails the owner a $20M lead. The
   * ceiling here is deliberately far above any real answer (square footage,
   * mileage, guest counts) and far below anything that can hurt — a per-question
   * `min`/`max` is still the owner's tool for a realistic range. Negative
   * allowed at the same magnitude: some owners model credits as negative input.
   */
  number: z
    .number()
    .finite()
    .min(-QUOTE_MAX_ANSWER_NUMBER, "That number is too small")
    .max(QUOTE_MAX_ANSWER_NUMBER, "That number is too large")
    .optional(),
  /** text / longtext */
  text: z.string().max(2000).optional(),
  /**
   * date
   *
   * The regex only proves the SHAPE; `2026-02-30` and `2026-13-45` both match
   * it. The refine is what proves the day exists, so a bad date is rejected at
   * the wire rather than stored, displayed back to the owner and compared
   * against a scheduling bound as if it were real.
   */
  date: z
    .string()
    .regex(QUOTE_DATE_RE, "Enter a valid date")
    .refine(isRealCalendarDate, "Enter a valid date")
    .optional(),
  /** zip */
  zip: z.string().regex(QUOTE_ZIP_RE, "Enter a 5-digit ZIP code").optional(),
  /** address */
  address: quoteWireAddressSchema.optional(),
});

export type QuoteWireAnswer = z.infer<typeof quoteWireAnswerSchema>;

export const quoteSubmitSchema = z.object({
  calculatorId: z.string().min(1).max(QUOTE_ID_MAX_LENGTH),
  answers: z.array(quoteWireAnswerSchema).max(30, "Too many answers submitted"),
  contactName: z
    .string()
    .trim()
    .min(1, "Your name is required")
    .max(120, "Name must be 120 characters or fewer"),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(254, "Email must be 254 characters or fewer"),
  contactPhone: z
    .string()
    .trim()
    .max(30, "Phone must be 30 characters or fewer")
    .optional()
    .nullable(),
  captchaToken: z.string(),
});

export type QuoteSubmitData = z.infer<typeof quoteSubmitSchema>;

/**
 * The live running estimate's input — the answers, and nothing else.
 *
 * Derived from `quoteSubmitSchema` with `.pick()` rather than restated, so the
 * bounds that make the submit path safe against an anonymous caller (the 30-
 * answer cap, `QUOTE_ID_MAX_LENGTH`, the ±1e9 number ceiling) apply verbatim to
 * an endpoint that gets hit on every keystroke-adjacent answer change. No
 * contact details and no captcha token: this query persists nothing, emails
 * nobody, and is throttled by its own rate limiter instead.
 */
export const quotePreviewEstimateSchema = quoteSubmitSchema.pick({
  calculatorId: true,
  answers: true,
});

export type QuotePreviewEstimateData = z.infer<
  typeof quotePreviewEstimateSchema
>;

// ─── Submission snapshot (stored) ───────────────────────────────────────────

/**
 * One row of `QuoteSubmission.answers` — what the owner reads back months
 * later, long after the calculator itself has been edited.
 *
 * It is a SNAPSHOT, not a reference: `title` and `display` are frozen copies,
 * so renaming a question or deleting an option never rewrites history. The
 * `hidden` flag is kept for the same reason — an owner looking at an old quote
 * needs to know a question was skipped by branching rather than left blank.
 */
export const quoteSubmissionAnswerSchema = z.object({
  questionId: z.string(),
  type: z.enum(QUOTE_QUESTION_TYPE_VALUES),
  title: z.string(),
  variableName: z.string().optional(),
  hidden: z.boolean(),
  optionId: z.string().optional(),
  optionIds: z.array(z.string()).optional(),
  number: z.number().optional(),
  text: z.string().optional(),
  date: z.string().optional(),
  zip: z.string().optional(),
  zipCity: z.string().optional(),
  zipState: z.string().optional(),
  /**
   * `address` questions only. Structured alongside `display` so a consumer that
   * wants two lines (the admin detail page) can have them, while everything
   * that just prints a string keeps working. Optional, so submissions stored
   * before the `address` type existed still parse.
   */
  address: z
    .object({
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
    })
    .optional(),
  /**
   * Human-readable rendering, e.g. "3-4 bedrooms", "48601 (Saginaw, MI)" or
   * "123 Main St, Apt 4, Saginaw, MI 48601".
   */
  display: z.string(),
});

export type QuoteSubmissionAnswer = z.infer<typeof quoteSubmissionAnswerSchema>;

/**
 * The formula and the resolved variable values that produced a stored
 * estimate. Snapshotted alongside it so "why is this quote $3,264?" is
 * answerable after the owner has since rewritten the formula.
 */
export const quoteFormulaSnapshotSchema = z.object({
  formula: z.string(),
  variables: z.record(z.string(), z.number()),
});

export type QuoteFormulaSnapshot = z.infer<typeof quoteFormulaSnapshotSchema>;

// ─── Admin table: filter/sort vocabulary ────────────────────────────────────

/**
 * The accepted values for the admin Quotes list's filter and sort params, and
 * for the `QuoteStatus` enum in the database.
 *
 * Same contract-in-two-halves hazard as the Events and Reviews lists (see
 * `src/lib/validators/events.ts`): a dropdown option that `pickParam` does not
 * recognize fails SILENTLY — the control looks selected while the rows behind
 * it are unfiltered. One `as const` tuple per param, consumed by both halves.
 * Tuple order is menu order.
 */
export const QUOTE_STATUS_VALUES_DB = [
  "NEW",
  "CONTACTED",
  "WON",
  "LOST",
] as const;
export type QuoteStatusDb = (typeof QUOTE_STATUS_VALUES_DB)[number];

export const QUOTE_STATUS_FILTER_VALUES = [
  "all",
  ...QUOTE_STATUS_VALUES_DB,
] as const;
export const QUOTE_STATUS_DEFAULT = "all";
export type QuoteStatusFilterValue =
  (typeof QUOTE_STATUS_FILTER_VALUES)[number];

export const QUOTE_SORT_VALUES = [
  "newest",
  "oldest",
  "estimate-desc",
  "estimate-asc",
  "name-asc",
] as const;
export const QUOTE_SORT_DEFAULT = "newest";
export type QuoteSortValue = (typeof QUOTE_SORT_VALUES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatusDb, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  WON: "Won",
  LOST: "Lost",
};

// ─── Admin CRUD ─────────────────────────────────────────────────────────────

export const quoteCalculatorCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  published: z.boolean().default(false),
  definition: quoteCalculatorDefinitionSchema,
});

export const quoteCalculatorUpdateSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  published: z.boolean().default(false),
  definition: quoteCalculatorDefinitionSchema,
});

export type QuoteCalculatorCreateData = z.infer<
  typeof quoteCalculatorCreateSchema
>;
export type QuoteCalculatorUpdateData = z.infer<
  typeof quoteCalculatorUpdateSchema
>;

export const quoteUpdateStatusSchema = z.object({
  id: z.string(),
  status: z.enum(QUOTE_STATUS_VALUES_DB),
});

export type QuoteUpdateStatusData = z.infer<typeof quoteUpdateStatusSchema>;

// ─── Final quote ────────────────────────────────────────────────────────────

/** Sanity cap on an owner-entered final quote: $1,000,000. */
export const QUOTE_MAX_FINAL_CENTS = 100_000_000;

export const quoteSetFinalQuoteSchema = z.object({
  id: z.string(),
  // Nullable so the owner can clear an adjustment and fall back to the
  // computed estimate.
  finalQuoteCents: z
    .number()
    .int()
    .min(0, "The final quote can't be negative")
    .max(QUOTE_MAX_FINAL_CENTS, "That amount looks too large")
    .nullable(),
});

export const quoteSendFinalQuoteSchema = z.object({
  id: z.string(),
  /**
   * `null` = a message-only follow-up: the owner writes back to the lead
   * ("can you send photos?", "we can't cover that area") without attaching a
   * figure. Previously every send had to carry a price, so the only way to ask
   * a question was to invent one — or to leave the thread entirely and email
   * by hand, off the record the admin page shows.
   *
   * When present the bounds are unchanged, and `message` stays required in
   * both cases: a quote email with no words in it was never wanted either.
   */
  finalQuoteCents: z
    .number()
    .int()
    .min(0, "The final quote can't be negative")
    .max(QUOTE_MAX_FINAL_CENTS, "That amount looks too large")
    .nullable(),
  message: z
    .string()
    .trim()
    .min(1, "Write a short message to send with the quote")
    .max(2000, "Message must be 2000 characters or fewer")
    // Same guard as emailOverrideSchema's plainText: emails render owner text
    // as plain paragraphs, never HTML.
    .refine((value) => !/<[a-z!/]/i.test(value), {
      message: "Plain text only — HTML is not allowed",
    }),
});

export type QuoteSetFinalQuoteData = z.infer<typeof quoteSetFinalQuoteSchema>;
export type QuoteSendFinalQuoteData = z.infer<typeof quoteSendFinalQuoteSchema>;

// Caps come from ~/lib/validators/admin-table, shared with the other admin
// list bulk actions — delete is far lower than a status change on purpose.
export const quoteBulkSetStatusSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one quote id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many quotes selected — update at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
  status: z.enum(QUOTE_STATUS_VALUES_DB),
});

// Exact inverse of a bulk status change: each row goes back to the status
// `bulkSetStatus` captured for it before writing, so Undo never has to guess
// a single group-wide predecessor.
export const quoteBulkRestoreStatusSchema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string(),
        status: z.enum(QUOTE_STATUS_VALUES_DB),
      }),
    )
    .min(1, "At least one quote id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many quotes selected — update at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
});

export const quoteBulkDeleteSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one quote id is required")
    .max(
      ADMIN_BULK_DELETE_LIMIT,
      `Too many quotes selected — delete at most ${ADMIN_BULK_DELETE_LIMIT} at a time`,
    ),
});

export type QuoteBulkSetStatusData = z.infer<typeof quoteBulkSetStatusSchema>;
export type QuoteBulkRestoreStatusData = z.infer<
  typeof quoteBulkRestoreStatusSchema
>;
export type QuoteBulkDeleteData = z.infer<typeof quoteBulkDeleteSchema>;
