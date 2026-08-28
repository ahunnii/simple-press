import type { EvalResult, FormulaFailureCode } from "~/lib/quote/formula";
import type {
  QuoteCalculatorDefinition,
  QuoteQuestion,
  QuoteSubmissionAnswer,
  QuoteWireAnswer,
} from "~/lib/validators/quote-calculator";
import { addCalendarDays, isRealCalendarDate } from "~/lib/calendar-date";
import { haversineMiles } from "~/lib/geo/haversine";
import { evaluateAst, parseFormula } from "~/lib/quote/formula";
import { flattenScreens } from "~/lib/quote/screens";
import { resolveVisibility } from "~/lib/quote/visibility";
import {
  isQuoteVariableQuestion,
  QUOTE_DATE_RE,
  QUOTE_MAX_FINAL_CENTS,
  QUOTE_ZIP_RE,
  US_STATE_CODES,
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
 *
 * ── Two modes ──────────────────────────────────────────────────────────────
 *
 * `mode: "submit"` (the default) is the strict, authoritative path: it is what
 * produces the stored estimate, the answer snapshot and the owner's lead, so a
 * required question with no answer is a hard failure.
 *
 * `mode: "preview"` serves the LIVE RUNNING ESTIMATE only — a number shown mid-
 * flow, persisted nowhere and emailed to nobody. Half the form is legitimately
 * unanswered at that point, so every "required but missing" branch takes the
 * same path an OPTIONAL blank takes (its `hiddenDefault`, or `0` for a
 * multiselect), and an unrecognized ZIP lets its distance fall to that
 * distance's `hiddenDefault` instead of failing. Preview is also the only mode
 * that accepts a ZIP-ONLY answer for an `address` question, because it is the
 * only shape the preview wire is allowed to send one in — the street address
 * would otherwise ride the query string of an anonymous GET on every keystroke
 * (see `toPreviewWireAnswers` in `src/components/quote/quote-answers.ts`, the
 * other half of that contract). Nothing else softens:
 * `unknown-option`, `bad-answer` and `formula-failed` still fail in preview,
 * because each of those means the payload or the definition is wrong rather
 * than merely incomplete. Preview never widens what a visitor can learn — it
 * runs the same formula over the same stored values and returns one number.
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

/**
 * Why a submission that is otherwise completely valid carries no estimate.
 *
 * This is NOT an error result — the answers were accepted, the snapshot is
 * intact, and the lead must still be captured. It only says "we could not put
 * a number on this one".
 *
 * - `value-error` — the formula itself is fine; THIS visitor's numbers broke
 *   it. A `0` typed into a divisor with no configured `min`, a `hiddenDefault`
 *   of 0 feeding a divisor, inputs large enough to overflow to Infinity, or a
 *   stack of negative-value discount options that lands the total BELOW ZERO.
 *   The owner cannot "fix" a definition that is already valid, and the visitor
 *   did nothing wrong — so neither gets an error, and the owner gets a lead
 *   with a blank estimate to price by hand.
 * - `over-cap` — it evaluated to a finite number past `QUOTE_MAX_FINAL_CENTS`.
 */
export type QuoteEstimateFailureCode = "value-error" | "over-cap";

export type QuoteEstimateFailure = {
  code: QuoteEstimateFailureCode;
  message: string;
};

export type QuoteComputationResult =
  | {
      ok: true;
      /**
       * `null` when the formula could not produce a storable number for this
       * particular submission — see `estimateFailure`, which is set exactly
       * when this is null. Callers persist the row either way.
       */
      estimateCents: number | null;
      estimateFailure?: QuoteEstimateFailure;
      variables: Record<string, number>;
      answerSnapshots: QuoteSubmissionAnswer[];
    }
  | { ok: false; error: QuoteComputationError };

/**
 * What a snapshot row shows when there is nothing to show.
 *
 * Exported because callers have to be able to RECOGNIZE it: an optional
 * visible question the visitor skipped snapshots as `hidden: false` with this
 * display, and rendering "Do you need packing? —" back to the customer reads
 * as a bug (see the confirmation-email row filter in
 * `src/server/api/routers/quote-submission.ts`).
 */
export const UNANSWERED_DISPLAY = "—";

/**
 * Formula failures that are about the VISITOR'S NUMBERS, not the owner's
 * definition.
 *
 * Every other `FormulaFailureCode` (syntax / unknown-variable /
 * unknown-function / bad-arity / too-long) means the stored definition drifted
 * out from under the validator that accepted it — a developer problem worth a
 * hard failure and a Sentry issue. These two are reachable from a definition
 * that is still perfectly valid, purely because of what was typed into the
 * form, so they must never cost the owner the lead.
 */
const VALUE_LEVEL_FORMULA_CODES: ReadonlySet<FormulaFailureCode> =
  new Set<FormulaFailureCode>(["division-by-zero", "not-finite"]);

/**
 * Ceiling on a computed estimate, shared with the owner-entered final quote
 * (`quoteSetFinalQuoteSchema`) so both halves of the money story agree.
 *
 * Load-bearing beyond taste: `QuoteSubmission.estimateCents` is a Postgres
 * `Int?` (int4, max 2,147,483,647). A formula that multiplies a large visitor
 * number by a large option value sails past that, and the resulting write
 * fails with a raw Prisma error that would be serialized to an anonymous
 * visitor — losing the lead AND leaking internals. Capping here means the
 * write is always in range.
 */
const QUOTE_MAX_ESTIMATE_CENTS = QUOTE_MAX_FINAL_CENTS;

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

export type QuoteComputationMode = "submit" | "preview";

export type QuoteComputationOptions = {
  /** Defaults to `"submit"`. See the "Two modes" note at the top of the file. */
  mode?: QuoteComputationMode;
  /**
   * Today's calendar date (`YYYY-MM-DD`) in the BUSINESS's time zone, used to
   * enforce a date question's `minDate` / `maxDaysAhead`.
   *
   * Injected rather than read from the clock for the same reason `lookupZip`
   * is: this module stays pure and deterministic, so a stored submission
   * recomputes to the same answer forever and the tests are not time bombs.
   *
   * The business's zone, never the visitor's and never the server's: a
   * "must be today or later" rule measured in UTC rejects a perfectly valid
   * "today" for every owner west of Greenwich during their evening.
   *
   * Omitted ⇒ date bounds are NOT enforced. Every production caller passes it
   * (`submit`, `previewEstimate`, the admin test panel); the escape hatch
   * exists so a caller with no tenant context — a unit test, a future
   * replay/diagnostic tool — degrades to "accept any real date" rather than
   * silently comparing against the wrong day.
   */
  today?: string;
};

export function computeQuote(
  definition: QuoteCalculatorDefinition,
  wireAnswers: QuoteWireAnswer[],
  lookupZip: ZipLookupFn,
  options?: QuoteComputationOptions,
): QuoteComputationResult {
  /**
   * "Incomplete is expected." Guards every `missing-required` branch, the
   * distance-endpoint `unknown-zip` branch, and the zip-only address the
   * preview wire sends — and nothing else.
   */
  const lenient = options?.mode === "preview";

  /** See `QuoteComputationOptions.today` — `undefined` disables date bounds. */
  const today = options?.today;

  // Parsed ONCE, here, because two separate things need it: deciding which
  // distances can fail a submission over an unknown ZIP (just below), and
  // pricing at the end.
  const parsedFormula = parseFormula(definition.formula);

  // `null` means "we could not read the formula", NOT "the formula names
  // nothing" — the two must not collapse, because the first has to keep
  // today's conservative behavior (see the distance set below) while the
  // second legitimately narrows it to nothing.
  const formulaVariables = parsedFormula.ok
    ? new Set(parsedFormula.variables)
    : null;

  // Last write wins on a duplicated questionId. Arbitrary but total — the
  // alternative (reject) turns a harmless double-submit race in the runner
  // into a dead end for the visitor.
  const answers = new Map<string, QuoteWireAnswer>();
  for (const answer of wireAnswers) answers.set(answer.questionId, answer);

  // Screen order, then in-screen order — the same list the runner walks and the
  // same order the validator measured "comes before" against. See
  // `src/lib/quote/screens.ts`: nothing may enumerate questions any other way.
  const questions = flattenScreens(definition.screens);

  const questionById = new Map<string, QuoteQuestion>();
  for (const question of questions) {
    if (!questionById.has(question.id)) questionById.set(question.id, question);
  }

  // Visibility is resolved from the SUBMITTED choice/dropdown selections, using
  // the exact helper the storefront runner used to decide what to show. See
  // `src/lib/quote/visibility.ts` for why that sharing is load-bearing.
  const visibility = resolveVisibility(questions, (questionId) => {
    const question = questionById.get(questionId);
    if (!question) return undefined;
    if (question.type !== "choice" && question.type !== "dropdown") {
      return undefined;
    }
    return answers.get(questionId)?.optionId;
  });

  // Which location questions feed a distance the FORMULA ACTUALLY PRICES WITH.
  // Only those have to resolve to real coordinates: without them there is no
  // distance and therefore no price. A standalone "what's your ZIP?" question
  // is just contact context — and so is an endpoint of a distance row the owner
  // built once and then stopped referencing. Turning a visitor away over a ZIP
  // that changes no number is a lost lead for nothing.
  //
  // When the formula does not parse, every distance stays in the set. That
  // submission is about to fail as `formula-failed` regardless, and narrowing
  // off a parse that did not happen would be guessing.
  const zipQuestionIdsUsedByDistance = new Set<string>();
  for (const distance of definition.distances) {
    if (formulaVariables && !formulaVariables.has(distance.variableName)) {
      continue;
    }
    zipQuestionIdsUsedByDistance.add(distance.fromQuestionId);
    zipQuestionIdsUsedByDistance.add(distance.toQuestionId);
  }

  // Built as a Map, converted with Object.fromEntries at the end. Not a plain
  // object literal: variable names are lowercase identifiers, so `__proto__`
  // is a legal name, and `obj["__proto__"] = n` on a normal object silently
  // does nothing. `fromEntries` defines a real own property instead — which is
  // also what `evaluateAst`'s hasOwnProperty lookup requires.
  const variables = new Map<string, number>();
  const snapshots: QuoteSubmissionAnswer[] = [];
  /**
   * Resolved coordinates for visible, answered location questions (`zip` and
   * `address` alike), by question id.
   */
  const zipCoordinates = new Map<string, ZipLocation>();

  for (const question of questions) {
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
          if (question.required && !lenient) {
            return failure(
              "missing-required",
              `"${question.title}" is required.`,
              question.id,
            );
          }
          // An optional question left blank is treated exactly like a hidden
          // one: it did not apply, so its variable takes the value the owner
          // configured for "does not apply". In preview mode a REQUIRED blank
          // takes this same path — the visitor simply has not got there yet.
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
          if (question.required && !lenient) {
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
          if (question.required && !lenient) {
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
          if (question.required && !lenient) {
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
          // coordinates there is no distance and therefore no price. In
          // preview mode not even then: the distance falls to its
          // `hiddenDefault` and the running estimate keeps updating rather
          // than blanking out on a ZIP the visitor is still typing.
          if (zipQuestionIdsUsedByDistance.has(question.id) && !lenient) {
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

      // ── Address ─────────────────────────────────────────────────────────
      // Informational like `zip`, and priced the same way: nothing directly,
      // but its ZIP half can anchor a distance variable.
      case "address": {
        const address = answer?.address;
        const line1 = address?.line1?.trim() ?? "";
        const line2 = address?.line2?.trim() ?? "";
        const city = address?.city?.trim() ?? "";
        // Upper-cased before the membership test so a hand-built payload (or a
        // replayed old submission) carrying "mi" is not turned away for a
        // difference no visitor could see.
        const state = address?.state?.trim().toUpperCase() ?? "";
        const zip = address?.zip?.trim() ?? "";

        // `line2` is deliberately not in here — an address with no apartment
        // number is complete.
        const requiredParts = [line1, city, state, zip];
        const filledCount = requiredParts.filter((part) => part !== "").length;

        if (filledCount === 0) {
          if (question.required && !lenient) {
            return failure(
              "missing-required",
              `"${question.title}" is required.`,
              question.id,
            );
          }

          // Preview only: the live estimate sends an address question's ZIP and
          // NOTHING ELSE (see `toPreviewWireAnswers` — a tRPC query is a GET, so
          // the street would ride the URL of an anonymous, uncaptcha'd request
          // on every keystroke). The ZIP alone is enough to anchor a distance,
          // so it is geocoded here even though no other part of the address
          // exists yet — which is also why the running estimate starts moving
          // as soon as the ZIP is valid rather than when the address is done.
          //
          // Deliberately NOT reflected on the snapshot: a zip-only address is
          // not an answer, and submit mode must keep failing a required address
          // that arrives this way.
          if (lenient) {
            const previewZip = answer?.zip?.trim() ?? "";
            if (QUOTE_ZIP_RE.test(previewZip)) {
              const previewLocation = lookupZip(previewZip);
              if (previewLocation) {
                zipCoordinates.set(question.id, previewLocation);
              }
            }
          }
          break;
        }

        if (filledCount < requiredParts.length) {
          // A half-filled address is neither an answer nor a blank: geocoding
          // it would silently price a different place. In preview it is simply
          // "still typing", and treated as unanswered.
          if (lenient) break;
          return failure(
            "bad-answer",
            `"${question.title}" is incomplete. Please complete the address or leave it blank.`,
            question.id,
          );
        }

        // Re-checked here even though the wire schema enforces both: this
        // function is also the path for replaying a stored submission, which
        // never went through the current wire schema.
        if (!US_STATE_CODES.has(state)) {
          return failure(
            "bad-answer",
            `"${question.title}" needs a valid US state.`,
            question.id,
          );
        }
        if (!QUOTE_ZIP_RE.test(zip)) {
          return failure(
            "bad-answer",
            `"${question.title}" must include a 5-digit ZIP code.`,
            question.id,
          );
        }

        snapshot.address = line2
          ? { line1, line2, city, state, zip }
          : { line1, city, state, zip };
        snapshot.zip = zip;
        // "123 Main St, Apt 4, Saginaw, MI 48601" — one line, because every
        // consumer of a snapshot (owner inbox, both emails, the review step)
        // renders `display` as a single string.
        snapshot.display = [line1, line2, `${city}, ${state} ${zip}`]
          .filter((part) => part !== "")
          .join(", ");

        const location = lookupZip(zip);
        if (!location) {
          if (zipQuestionIdsUsedByDistance.has(question.id) && !lenient) {
            return failure(
              "unknown-zip",
              `We don't recognize the ZIP code ${zip}.`,
              question.id,
            );
          }
          break;
        }

        // The visitor's typed city/state stay on `display`; the resolved pair
        // is recorded separately, so a mismatch (wrong city for the ZIP) is
        // visible to the owner rather than quietly overwritten.
        zipCoordinates.set(question.id, location);
        snapshot.zipCity = location.city;
        snapshot.zipState = location.state;
        break;
      }

      // ── Informational free text ─────────────────────────────────────────
      case "text":
      case "longtext": {
        const raw = answer?.text;
        const text = raw === undefined ? "" : raw.trim();
        if (text.length === 0) {
          if (question.required && !lenient) {
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
          if (question.required && !lenient) {
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
        // The regex proves the shape; this proves the day exists. `2026-02-30`
        // passes the first and fails here.
        if (!isRealCalendarDate(date)) {
          return failure("bad-answer", "Enter a valid date", question.id);
        }
        // Bounds are checked in BOTH modes, unlike a missing required answer:
        // a date outside the owner's window is a bad payload, not an
        // incomplete one, and letting preview accept what submit will reject
        // shows the visitor a live estimate for a job that cannot be booked.
        //
        // Compared as strings: ISO `YYYY-MM-DD` sorts lexicographically in
        // calendar order, so no Date object (and no time zone) is involved.
        if (today !== undefined) {
          if (question.minDate === "today" && date < today) {
            return failure(
              "bad-answer",
              `"${question.title}" must be today or later.`,
              question.id,
            );
          }
          if (
            question.maxDaysAhead != null &&
            date > addCalendarDays(today, question.maxDaysAhead)
          ) {
            return failure(
              "bad-answer",
              `"${question.title}" must be within ${question.maxDaysAhead} days.`,
              question.id,
            );
          }
        }
        snapshot.date = date;
        snapshot.display = date;
        break;
      }
    }

    snapshots.push(snapshot);
  }

  // ── Distance variables ────────────────────────────────────────────────────
  // EVERY distance is computed, including one the formula never reads. The
  // narrowing above is only about which unknown ZIPs may fail a submission; the
  // stored variable snapshot is a record of what the calculator resolved, and
  // the admin detail page reads it back row by row.
  for (const distance of definition.distances) {
    const from = zipCoordinates.get(distance.fromQuestionId);
    const to = zipCoordinates.get(distance.toQuestionId);

    // Either endpoint hidden, unanswered, or (for a non-required zip) not in
    // the lookup table → the distance did not apply.
    if (!from || !to) {
      variables.set(distance.variableName, distance.hiddenDefault);
      continue;
    }

    // Straight-line miles scaled by the owner's road factor (1 = raw
    // haversine, the pre-existing behavior and the schema default), THEN
    // rounded to one decimal — rounding first and scaling after would leave
    // the formula reading a number nobody ever sees.
    //
    // One decimal so the stored variable snapshot is stable and readable — an
    // owner reading "86.4 miles" back off a quote should see the same number
    // that went into the formula, not 86.36648...
    const miles =
      Math.round(haversineMiles(from, to) * distance.roadFactor * 10) / 10;
    variables.set(distance.variableName, miles);
  }

  // ── Price ─────────────────────────────────────────────────────────────────
  const resolvedVariables = Object.fromEntries(variables);
  // `evaluateFormula` inlined against the AST parsed at the top of the function
  // — same two steps, same failure surface, one parse.
  const evaluated: EvalResult = parsedFormula.ok
    ? evaluateAst(parsedFormula.ast, resolvedVariables)
    : { ok: false, error: parsedFormula.error };

  if (!evaluated.ok) {
    // Two very different situations arrive through one `ok: false`, and
    // collapsing them destroys leads. `division-by-zero` / `not-finite` are
    // driven by what the VISITOR typed into a definition that is still valid;
    // they resolve to a captured lead with no estimate. Everything else means
    // the stored definition drifted out from under the schema — owner/developer
    // misconfiguration, which callers surface as a generic apology plus Sentry.
    if (VALUE_LEVEL_FORMULA_CODES.has(evaluated.error.code)) {
      return {
        ok: true,
        estimateCents: null,
        estimateFailure: {
          code: "value-error",
          message: evaluated.error.message,
        },
        variables: resolvedVariables,
        answerSnapshots: snapshots,
      };
    }
    return failure("formula-failed", evaluated.error.message);
  }

  const finalized = finalizeEstimateCents(evaluated.value);

  return {
    ok: true,
    estimateCents: finalized.estimateCents,
    ...(finalized.failure ? { estimateFailure: finalized.failure } : {}),
    variables: resolvedVariables,
    answerSnapshots: snapshots,
  };
}

/**
 * Turns a formula's dollar value into the integer cents that get stored — or
 * into `null` plus the reason there is no storable number.
 *
 * Extracted so there is exactly ONE implementation of the money endgame.
 * `computeQuote` calls it, and so does anything else that has to turn a raw
 * formula value into the same figure (a re-price, a what-if panel). Two copies
 * of this arithmetic is how a preview and a submission end up disagreeing
 * about the same answers, and the number the visitor was shown stops matching
 * the number in the owner's inbox.
 *
 * A `failure` is never an error: the caller still has a valid submission and
 * still captures the lead. It only explains a blank estimate.
 */
export function finalizeEstimateCents(value: number): {
  estimateCents: number | null;
  failure?: QuoteEstimateFailure;
} {
  const rounded = Math.round(value * 100);

  // Below zero we NULL the estimate. This used to clamp to 0, which is the one
  // outcome worse than showing "-$120.00": it quotes the customer a free job in
  // the owner's name, on a form whose whole promise is "this is roughly what it
  // costs". Nobody configured $0 — enough stacked discount options simply
  // outran the charges for this one combination of answers — so there is no
  // number to show, exactly as at the far end of the range (see `over-cap`
  // below). The lead survives either way, which is the point: the owner reads
  // the answers and prices it by hand.
  if (rounded < 0) {
    return {
      estimateCents: null,
      failure: {
        code: "value-error",
        message: `Computed estimate ${rounded} is negative — this combination of answers discounts below zero`,
      },
    };
  }

  // `Math.round(-0.4)` is `-0`, and `-0 < 0` is false, so a hair of float dust
  // below zero lands here rather than in the branch above — correctly: that is
  // a genuine $0.00, not a discount overrun. Normalized to a plain `0` so no
  // consumer ever has to think about a signed zero, and because exact zero must
  // stay a real price all the way through `customerEstimateFrom`.
  const rawEstimateCents = rounded === 0 ? 0 : rounded;

  // Over the cap we NULL the estimate rather than clamping it. Clamping would
  // hand the customer (and the owner's inbox) a confident "$1,000,000.00" that
  // no configured price actually produces — a number the owner would have to
  // un-believe. A blank estimate is honest, keeps the lead, and tells the owner
  // exactly which submission needs a hand-priced quote.
  if (rawEstimateCents > QUOTE_MAX_ESTIMATE_CENTS) {
    return {
      estimateCents: null,
      failure: {
        code: "over-cap",
        message: `Computed estimate ${rawEstimateCents} exceeds the ${QUOTE_MAX_ESTIMATE_CENTS} cent cap`,
      },
    };
  }

  return { estimateCents: rawEstimateCents };
}
