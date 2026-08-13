import type {
  QuoteCalculatorDefinition,
  QuoteQuestion,
  QuoteSubmissionAnswer,
  QuoteWireAnswer,
} from "~/lib/validators/quote-calculator";
import { haversineMiles } from "~/lib/geo/haversine";
import { evaluateFormula } from "~/lib/quote/formula";
import { resolveVisibility } from "~/lib/quote/visibility";
import {
  isQuoteVariableQuestion,
  QUOTE_DATE_RE,
  QUOTE_ZIP_RE,
} from "~/lib/validators/quote-calculator";

/**
 * Server-side quote computation.
 *
 * This is where the price actually comes from. The browser is handed a
 * `PublicQuoteCalculatorDefinition` with no formula, no option values and no
 * hidden defaults; it posts back IDs and raw values, and this function
 * recomputes the estimate from the STORED definition. Nothing the client sends
 * can introduce a number the owner did not configure — it can only select
 * among options that already exist.
 *
 * Pure and synchronous by construction: the zip → coordinates lookup is
 * injected as `lookupZip`, so the caller owns the I/O and this module stays
 * unit-testable and deterministic. Same inputs, same estimate, forever — which
 * matters because the estimate and its variable snapshot are stored and shown
 * back to the owner months later.
 */

export type ZipLocation = {
  lat: number;
  lng: number;
  city: string;
  state: string;
};

/**
 * Synchronous zip → centroid lookup, injected by the caller (in production, a
 * read against the bundled US zip table). Returns `null` for a zip it does not
 * know.
 */
export type ZipLookupFn = (zip: string) => ZipLocation | null;

export type QuoteComputationErrorCode =
  | "missing-required"
  | "unknown-option"
  | "bad-answer"
  | "formula-failed"
  | "unknown-zip";

export type QuoteComputationError = {
  code: QuoteComputationErrorCode;
  /** Set for every code except `formula-failed`, which is not about one question. */
  questionId?: string;
  message: string;
};

export type QuoteComputationResult =
  | {
      ok: true;
      estimateCents: number;
      variables: Record<string, number>;
      answerSnapshots: QuoteSubmissionAnswer[];
    }
  | { ok: false; error: QuoteComputationError };

/** What a snapshot row shows when there is nothing to show. */
const UNANSWERED_DISPLAY = "—";

function failure(
  code: QuoteComputationErrorCode,
  message: string,
  questionId?: string,
): QuoteComputationResult {
  return {
    ok: false,
    error:
      questionId === undefined
        ? { code, message }
        : { code, message, questionId },
  };
}

function baseSnapshot(
  question: QuoteQuestion,
  hidden: boolean,
): QuoteSubmissionAnswer {
  const row: QuoteSubmissionAnswer = {
    questionId: question.id,
    type: question.type,
    title: question.title,
    hidden,
    display: UNANSWERED_DISPLAY,
  };
  if (isQuoteVariableQuestion(question)) {
    row.variableName = question.variableName;
  }
  return row;
}

export function computeQuote(
  definition: QuoteCalculatorDefinition,
  wireAnswers: QuoteWireAnswer[],
  lookupZip: ZipLookupFn,
): QuoteComputationResult {
  // Last write wins on a duplicated questionId. Arbitrary but total — the
  // alternative (reject) turns a harmless double-submit race in the runner
  // into a dead end for the visitor.
  const answers = new Map<string, QuoteWireAnswer>();
  for (const answer of wireAnswers) answers.set(answer.questionId, answer);

  const questionById = new Map<string, QuoteQuestion>();
  for (const question of definition.questions) {
    if (!questionById.has(question.id)) questionById.set(question.id, question);
  }

  // Visibility is resolved from the SUBMITTED choice/dropdown selections, using
  // the exact helper the storefront runner used to decide what to show. See
  // `src/lib/quote/visibility.ts` for why that sharing is load-bearing.
  const visibility = resolveVisibility(definition.questions, (questionId) => {
    const question = questionById.get(questionId);
    if (!question) return undefined;
    if (question.type !== "choice" && question.type !== "dropdown") {
      return undefined;
    }
    return answers.get(questionId)?.optionId;
  });

  // Which zip questions feed a distance variable. Only those have to resolve
  // to real coordinates — a standalone "what's your ZIP?" question is just
  // contact context and must not fail a submission when the table misses it.
  const zipQuestionIdsUsedByDistance = new Set<string>();
  for (const distance of definition.distances) {
    zipQuestionIdsUsedByDistance.add(distance.fromQuestionId);
    zipQuestionIdsUsedByDistance.add(distance.toQuestionId);
  }

  // Built as a Map, converted with Object.fromEntries at the end. Not a plain
  // object literal: variable names are lowercase identifiers, so `__proto__`
  // is a legal name, and `obj["__proto__"] = n` on a normal object silently
  // does nothing. `fromEntries` defines a real own property instead — which is
  // also what `evaluateFormula`'s hasOwnProperty lookup requires.
  const variables = new Map<string, number>();
  const snapshots: QuoteSubmissionAnswer[] = [];
  /** Resolved coordinates for visible, answered zip questions, by question id. */
  const zipCoordinates = new Map<string, ZipLocation>();

  for (const question of definition.questions) {
    const isVisible = visibility.get(question.id) ?? false;

    // ── Hidden ────────────────────────────────────────────────────────────
    if (!isVisible) {
      // Anti-tamper: a submitted answer for a hidden question is DISCARDED,
      // not read. Otherwise a crafted payload could smuggle the cheapest
      // option into a branch the visitor never qualified for, and the price
      // would come out as if they had.
      if (isQuoteVariableQuestion(question)) {
        variables.set(question.variableName, question.hiddenDefault);
      }
      snapshots.push(baseSnapshot(question, true));
      continue;
    }

    const answer = answers.get(question.id);
    const snapshot = baseSnapshot(question, false);

    switch (question.type) {
      // ── Single-answer option questions ──────────────────────────────────
      case "choice":
      case "dropdown": {
        const optionId = answer?.optionId;
        if (optionId === undefined || optionId === "") {
          if (question.required) {
            return failure(
              "missing-required",
              `"${question.title}" is required.`,
              question.id,
            );
          }
          // An optional question left blank is treated exactly like a hidden
          // one: it did not apply, so its variable takes the value the owner
          // configured for "does not apply".
          variables.set(question.variableName, question.hiddenDefault);
          break;
        }

        const option = question.options.find((o) => o.id === optionId);
        if (!option) {
          return failure(
            "unknown-option",
            `"${question.title}" received an option that no longer exists.`,
            question.id,
          );
        }

        variables.set(question.variableName, option.value);
        snapshot.optionId = option.id;
        snapshot.display = option.label;
        break;
      }

      // ── Multi-answer option question ────────────────────────────────────
      case "multiselect": {
        // Deduped before summing: the wire allows up to 12 ids, and sending
        // the same add-on twice must not charge for it twice (or, with a
        // negative-value discount option, discount twice).
        const submitted = answer?.optionIds ?? [];
        const checkedIds = [...new Set(submitted)];

        if (checkedIds.length === 0) {
          if (question.required) {
            return failure(
              "missing-required",
              `"${question.title}" is required.`,
              question.id,
            );
          }
          // 0, NOT `hiddenDefault` — unlike the single-answer types above.
          // A multiselect's value is the sum of what is checked, and the sum
          // of nothing is zero. `hiddenDefault` on a multiselect means "what
          // this variable is worth when the question is BRANCHED AWAY", which
          // is a different situation from "shown, and they checked nothing".
          variables.set(question.variableName, 0);
          snapshot.optionIds = [];
          break;
        }

        let total = 0;
        const labels: string[] = [];
        for (const optionId of checkedIds) {
          const option = question.options.find((o) => o.id === optionId);
          if (!option) {
            return failure(
              "unknown-option",
              `"${question.title}" received an option that no longer exists.`,
              question.id,
            );
          }
          total += option.value;
          labels.push(option.label);
        }

        variables.set(question.variableName, total);
        snapshot.optionIds = checkedIds;
        snapshot.display = labels.join(", ");
        break;
      }

      // ── Number ──────────────────────────────────────────────────────────
      case "number": {
        const value = answer?.number;
        if (value === undefined) {
          if (question.required) {
            return failure(
              "missing-required",
              `"${question.title}" is required.`,
              question.id,
            );
          }
          variables.set(question.variableName, question.hiddenDefault);
          break;
        }

        if (!Number.isFinite(value)) {
          return failure(
            "bad-answer",
            `"${question.title}" must be a number.`,
            question.id,
          );
        }
        if (typeof question.min === "number" && value < question.min) {
          return failure(
            "bad-answer",
            `"${question.title}" must be at least ${question.min}.`,
            question.id,
          );
        }
        if (typeof question.max === "number" && value > question.max) {
          return failure(
            "bad-answer",
            `"${question.title}" must be at most ${question.max}.`,
            question.id,
          );
        }

        variables.set(question.variableName, value);
        snapshot.number = value;
        snapshot.display = question.unitLabel
          ? `${value} ${question.unitLabel}`
          : String(value);
        break;
      }

      // ── ZIP ─────────────────────────────────────────────────────────────
      case "zip": {
        const zip = answer?.zip;
        if (zip === undefined || zip === "") {
          if (question.required) {
            return failure(
              "missing-required",
              `"${question.title}" is required.`,
              question.id,
            );
          }
          break;
        }

        // Re-checked here even though the wire schema enforces it: this
        // function is also the path for replaying a stored submission, which
        // never went through the current wire schema.
        if (!QUOTE_ZIP_RE.test(zip)) {
          return failure(
            "bad-answer",
            `"${question.title}" must be a 5-digit ZIP code.`,
            question.id,
          );
        }

        const location = lookupZip(zip);
        snapshot.zip = zip;
        snapshot.display = zip;

        if (!location) {
          // Only fatal when a distance variable depends on it — without
          // coordinates there is no distance and therefore no price.
          if (zipQuestionIdsUsedByDistance.has(question.id)) {
            return failure(
              "unknown-zip",
              `We don't recognize the ZIP code ${zip}.`,
              question.id,
            );
          }
          break;
        }

        zipCoordinates.set(question.id, location);
        snapshot.zipCity = location.city;
        snapshot.zipState = location.state;
        snapshot.display = `${zip} (${location.city}, ${location.state})`;
        break;
      }

      // ── Informational free text ─────────────────────────────────────────
      case "text":
      case "longtext": {
        const raw = answer?.text;
        const text = raw === undefined ? "" : raw.trim();
        if (text.length === 0) {
          if (question.required) {
            return failure(
              "missing-required",
              `"${question.title}" is required.`,
              question.id,
            );
          }
          break;
        }
        snapshot.text = text;
        snapshot.display = text;
        break;
      }

      // ── Informational date ──────────────────────────────────────────────
      case "date": {
        const date = answer?.date;
        if (date === undefined || date === "") {
          if (question.required) {
            return failure(
              "missing-required",
              `"${question.title}" is required.`,
              question.id,
            );
          }
          break;
        }
        if (!QUOTE_DATE_RE.test(date)) {
          return failure(
            "bad-answer",
            `"${question.title}" must be a date.`,
            question.id,
          );
        }
        snapshot.date = date;
        snapshot.display = date;
        break;
      }
    }

    snapshots.push(snapshot);
  }

  // ── Distance variables ────────────────────────────────────────────────────
  for (const distance of definition.distances) {
    const from = zipCoordinates.get(distance.fromQuestionId);
    const to = zipCoordinates.get(distance.toQuestionId);

    // Either endpoint hidden, unanswered, or (for a non-required zip) not in
    // the lookup table → the distance did not apply.
    if (!from || !to) {
      variables.set(distance.variableName, distance.hiddenDefault);
      continue;
    }

    // Rounded to one decimal so the stored variable snapshot is stable and
    // readable — an owner reading "69.1 miles" back off a quote should see the
    // same number that went into the formula, not 69.09324...
    const miles = Math.round(haversineMiles(from, to) * 10) / 10;
    variables.set(distance.variableName, miles);
  }

  // ── Price ─────────────────────────────────────────────────────────────────
  const resolvedVariables = Object.fromEntries(variables);
  const evaluated = evaluateFormula(definition.formula, resolvedVariables);
  if (!evaluated.ok) {
    // Owner misconfiguration, not visitor error — the definition passed
    // validation when it was saved, so reaching here means something drifted.
    // Callers surface a generic apology to the visitor and log this to Sentry.
    return failure("formula-failed", evaluated.error.message);
  }

  // Clamped at zero: a formula with enough negative-value discount options can
  // land below zero, and a negative estimate is meaningless to a customer,
  // would render as "-$120.00", and would corrupt the admin list's revenue
  // sort and totals. Zero reads as "we need to talk about this one".
  const estimateCents = Math.max(0, Math.round(evaluated.value * 100));

  return {
    ok: true,
    estimateCents,
    variables: resolvedVariables,
    answerSnapshots: snapshots,
  };
}
