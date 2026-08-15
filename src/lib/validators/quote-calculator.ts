import { z } from "zod";

import { parseFormula } from "~/lib/quote/formula";
import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";

/**
 * Schemas for the Quote Calculator feature.
 *
 * One calculator is a `QuoteCalculatorDefinition`: an ordered list of question
 * slides, a handful of owner-assigned variable names, optional zip-pair
 * distance variables, and a single pricing formula the SERVER evaluates.
 *
 * Two invariants run through this whole file:
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
 *    every distance pairs two real zip questions. Anything it lets through,
 *    `computeQuote` can evaluate without a "this owner misconfigured it" path.
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

// The field-level schema stays deliberately loose (non-empty trimmed string).
// The regex / length / reserved-word / uniqueness checks all live in the
// definition-level `superRefine` so each one can report against a precise
// path — `["questions", 3, "variableName"]` — and the builder can highlight
// the exact row rather than the whole form.
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
});

export const quoteQuestionSchema = z.discriminatedUnion("type", [
  quoteChoiceQuestionSchema,
  quoteMultiselectQuestionSchema,
  quoteDropdownQuestionSchema,
  quoteNumberQuestionSchema,
  quoteZipQuestionSchema,
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

// ─── Distance variable ──────────────────────────────────────────────────────

/**
 * Pairs two zip questions into a straight-line-miles variable.
 *
 * Kept out of `questions` because it is not a slide — the visitor never sees
 * it and never answers it. It is a derived variable, computed from two answers
 * they already gave.
 */
export const quoteDistanceVariableSchema = z.object({
  id: z.string().min(1),
  variableName: quoteVariableNameField,
  fromQuestionId: z.string().min(1),
  toQuestionId: z.string().min(1),
  /** Used when either endpoint is hidden or left blank. */
  hiddenDefault: z.number().finite().default(0),
});

export type QuoteDistanceVariable = z.infer<typeof quoteDistanceVariableSchema>;

// ─── Definition ─────────────────────────────────────────────────────────────

const quoteCalculatorDefinitionObjectSchema = z.object({
  /**
   * Definition format version, pinned to 1. Stored on every saved calculator
   * so a future shape change can migrate rather than guess.
   */
  version: z.literal(1),
  questions: z
    .array(quoteQuestionSchema)
    .min(1, "Add at least one question")
    .max(30, "A calculator can have at most 30 questions"),
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
  /** Show "$2,000 – $2,400" instead of a single figure. */
  displayAsRange: z.boolean().default(false),
  rangePaddingPercent: z.number().int().min(1).max(50).default(10),
  requirePhone: z.boolean().default(false),
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
 */
function checkQuoteDefinition(
  definition: QuoteCalculatorDefinitionShape,
  ctx: z.RefinementCtx,
): void {
  const { questions, distances } = definition;

  // ── Unique question ids ──────────────────────────────────────────────────
  const seenQuestionIds = new Set<string>();
  questions.forEach((question, index) => {
    if (seenQuestionIds.has(question.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate question id "${question.id}"`,
        path: ["questions", index, "id"],
      });
    }
    seenQuestionIds.add(question.id);
  });

  // ── Unique option ids within each question ───────────────────────────────
  questions.forEach((question, index) => {
    if (!isQuoteOptionQuestion(question)) return;
    const seenOptionIds = new Set<string>();
    question.options.forEach((option, optionIndex) => {
      if (seenOptionIds.has(option.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate option id "${option.id}"`,
          path: ["questions", index, "options", optionIndex, "id"],
        });
      }
      seenOptionIds.add(option.id);
    });
  });

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

  questions.forEach((question, index) => {
    if (!isQuoteVariableQuestion(question)) return;
    checkVariableName(question.variableName, [
      "questions",
      index,
      "variableName",
    ]);
  });

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
  const indexById = new Map<string, number>();
  questions.forEach((question, index) => {
    if (!indexById.has(question.id)) indexById.set(question.id, index);
  });

  questions.forEach((question, index) => {
    const condition = question.showIf;
    if (!condition) return;

    const targetIndex = indexById.get(condition.questionId);
    if (targetIndex === undefined || targetIndex >= index) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "A conditional question must depend on a question that comes before it",
        path: ["questions", index, "showIf", "questionId"],
      });
      return;
    }

    const target = questions[targetIndex];
    if (!target) return;

    if (target.type !== "choice" && target.type !== "dropdown") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "A conditional question can only depend on a single-choice or dropdown question",
        path: ["questions", index, "showIf", "questionId"],
      });
      return;
    }

    if (!target.options.some((option) => option.id === condition.optionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${target.title}" has no option matching this condition`,
        path: ["questions", index, "showIf", "optionId"],
      });
    }
  });

  // ── Distance endpoints ───────────────────────────────────────────────────
  const questionById = new Map<string, QuoteQuestion>();
  for (const question of questions) {
    if (!questionById.has(question.id)) questionById.set(question.id, question);
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
          message: "Pick a ZIP code question",
          path: ["distances", index, endpoint.key],
        });
        continue;
      }
      if (target.type !== "zip") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${target.title}" is not a ZIP code question`,
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

export const quoteCalculatorDefinitionSchema =
  quoteCalculatorDefinitionObjectSchema.superRefine(checkQuoteDefinition);

export type QuoteCalculatorDefinition = z.infer<
  typeof quoteCalculatorDefinitionSchema
>;

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
};

export type PublicQuoteCalculatorDefinition = {
  questions: PublicQuoteQuestion[];
  showEstimateToCustomer: boolean;
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
 * - `distances` — reveals which zip pair drives price and by how much.
 * - every option `value` — with the formula, this is the price list.
 * - every `hiddenDefault` — the "doesn't apply" price for each variable.
 * - `displayAsRange` / `rangePaddingPercent` — presentation of an estimate the
 *   server renders; the client is not trusted to widen or narrow a range.
 *
 * The client submits option IDs, never labels and never values; the server
 * recomputes the estimate from the stored definition on every submission.
 */
export function toPublicCalculatorDefinition(
  definition: QuoteCalculatorDefinition,
): PublicQuoteCalculatorDefinition {
  return {
    questions: definition.questions.map(toPublicQuestion),
    showEstimateToCustomer: definition.showEstimateToCustomer,
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
 * One answer as the browser sends it: IDs and raw values only, never labels
 * and never prices. Everything here is re-validated against the stored
 * definition in `computeQuote`, so a hand-crafted payload can at worst produce
 * an error, never a price the owner did not configure.
 *
 * Every field is optional because a single shape covers all eight question
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
  /** date */
  date: z.string().regex(QUOTE_DATE_RE, "Enter a valid date").optional(),
  /** zip */
  zip: z.string().regex(QUOTE_ZIP_RE, "Enter a 5-digit ZIP code").optional(),
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
  /** Human-readable rendering, e.g. "3-4 bedrooms" or "48601 (Saginaw, MI)". */
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
  finalQuoteCents: z
    .number()
    .int()
    .min(0, "The final quote can't be negative")
    .max(QUOTE_MAX_FINAL_CENTS, "That amount looks too large"),
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
