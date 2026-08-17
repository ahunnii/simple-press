import type {
  PublicQuoteQuestion,
  QuoteWireAnswer,
} from "~/lib/validators/quote-calculator";
import {
  QUOTE_DATE_RE,
  QUOTE_ZIP_RE,
  US_STATE_CODES,
} from "~/lib/validators/quote-calculator";

/**
 * The runner's in-memory answer shape.
 *
 * Deliberately NOT `QuoteWireAnswer`. Several of the question types are
 * free-text inputs whose intermediate states are not valid wire values — a
 * half-typed ZIP ("486"), a number field cleared back to "" , a date the
 * browser reports as "" while the user is mid-pick, an address with a street
 * but no city yet. Storing the raw control value and projecting to the wire
 * shape once, at submit time (`toWireAnswers`), keeps those transient states
 * out of the payload instead of forcing every keystroke through a validator
 * that would reject them.
 *
 * `kind` mirrors how the ANSWER is shaped, not the question type: several
 * question types share a representation.
 */
export type QuoteAnswer =
  | { kind: "single"; optionId: string }
  | { kind: "multi"; optionIds: string[] }
  | { kind: "value"; raw: string }
  | {
      kind: "address";
      line1: string;
      line2: string;
      city: string;
      state: string;
      zip: string;
    };

export type QuoteAnswerMap = Record<string, QuoteAnswer>;

/**
 * Adapter between the answer map and `resolveVisibility`'s lookup contract.
 *
 * Returns a selected option id only for single-answer questions — multiselect
 * intentionally yields `undefined`, matching the shared visibility module and
 * the server, which both refuse to branch on "which of several checked boxes
 * counts?".
 */
export function selectedOptionId(
  answers: QuoteAnswerMap,
  questionId: string,
): string | undefined {
  const answer = answers[questionId];
  if (answer?.kind !== "single") return undefined;
  return answer.optionId === "" ? undefined : answer.optionId;
}

/** The trimmed raw string for a free-value question, or "" for anything else. */
function rawValue(answer: QuoteAnswer | undefined): string {
  return answer?.kind === "value" ? answer.raw.trim() : "";
}

/** Trimmed address subfields, or `null` when the answer is another kind. */
function addressParts(answer: QuoteAnswer | undefined) {
  if (answer?.kind !== "address") return null;
  return {
    line1: answer.line1.trim(),
    line2: answer.line2.trim(),
    city: answer.city.trim(),
    // The storefront `<select>` only ever emits an upper-case code, but an
    // answer restored from a hand-edited state (or a future autofill path)
    // should not fail the `US_STATE_CODES` check on case alone.
    state: answer.state.trim().toUpperCase(),
    zip: answer.zip.trim(),
  };
}

/**
 * Whether every part of an address a shipment would actually need is present.
 * `line2` is never required — an address with no apartment number is complete.
 */
function isCompleteAddress(
  parts: NonNullable<ReturnType<typeof addressParts>>,
) {
  return (
    parts.line1 !== "" &&
    parts.city !== "" &&
    parts.state !== "" &&
    parts.zip !== ""
  );
}

/** Whether the visitor has supplied anything at all for this question. */
export function isAnswered(
  question: PublicQuoteQuestion,
  answer: QuoteAnswer | undefined,
): boolean {
  switch (question.type) {
    case "choice":
    case "dropdown":
      return answer?.kind === "single" && answer.optionId !== "";
    case "multiselect":
      return answer?.kind === "multi" && answer.optionIds.length > 0;
    case "address": {
      const parts = addressParts(answer);
      if (!parts) return false;
      // ANY non-blank subfield counts as "started". A half-filled address must
      // read as answered so `validateAnswer` can tell the visitor to finish it
      // rather than silently dropping what they already typed.
      return (
        parts.line1 !== "" ||
        parts.line2 !== "" ||
        parts.city !== "" ||
        parts.state !== "" ||
        parts.zip !== ""
      );
    }
    default:
      return rawValue(answer) !== "";
  }
}

/**
 * Client-side guard for one question. Returns a user-facing message, or `null`
 * when the answer may pass.
 *
 * Advisory only — every rule here is re-checked server-side in `computeQuote`
 * against the stored definition. The point is to stop a visitor reaching the
 * contact step and only then discovering a problem five slides back.
 */
export function validateAnswer(
  question: PublicQuoteQuestion,
  answer: QuoteAnswer | undefined,
): string | null {
  const answered = isAnswered(question, answer);

  if (!answered) {
    if (!question.required) return null;
    switch (question.type) {
      case "choice":
      case "dropdown":
        return "Please pick an option to continue.";
      case "multiselect":
        return "Please pick at least one option to continue.";
      case "address":
        return "Please enter your street address, city, state and ZIP.";
      default:
        return "This answer is required.";
    }
  }

  const raw = rawValue(answer);

  switch (question.type) {
    case "number": {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return "Enter a number.";
      if (question.min != null && parsed < question.min) {
        return `Enter ${question.min} or more.`;
      }
      if (question.max != null && parsed > question.max) {
        return `Enter ${question.max} or less.`;
      }
      return null;
    }
    case "zip":
      return QUOTE_ZIP_RE.test(raw) ? null : "Enter a 5-digit ZIP code.";
    case "address": {
      const parts = addressParts(answer);
      if (!parts) return null;
      if (!isCompleteAddress(parts)) {
        // Two different mistakes, two different asks. A required address that
        // was started but not finished is the same failure as one never begun;
        // an OPTIONAL address left half-typed is a visitor who can legitimately
        // back out, so it says so.
        return question.required
          ? "Please enter your street address, city, state and ZIP."
          : "Complete the address or leave it blank.";
      }
      if (!US_STATE_CODES.has(parts.state)) return "Pick a state.";
      if (!QUOTE_ZIP_RE.test(parts.zip)) return "Enter a 5-digit ZIP code.";
      return null;
    }
    case "date":
      return QUOTE_DATE_RE.test(raw) ? null : "Enter a valid date.";
    case "text":
    case "longtext":
      // Mirrors `quoteWireAnswerSchema.text`'s 2000-char cap so an over-long
      // answer fails here, where it can be edited, rather than at submit.
      return raw.length > 2000
        ? "Please keep this under 2000 characters."
        : null;
    default:
      return null;
  }
}

/**
 * How an answer reads on the review step.
 *
 * Labels, never ids or values: the review screen is the visitor re-reading
 * what they said, and an option id would be meaningless to them. Returns
 * `null` for an unanswered question so the caller can omit the row entirely
 * rather than print an empty definition term.
 */
export function answerDisplay(
  question: PublicQuoteQuestion,
  answer: QuoteAnswer | undefined,
): string | null {
  if (!isAnswered(question, answer)) return null;

  switch (question.type) {
    case "choice":
    case "dropdown": {
      if (answer?.kind !== "single") return null;
      const option = question.options?.find(
        (candidate) => candidate.id === answer.optionId,
      );
      return option?.label ?? null;
    }
    case "multiselect": {
      if (answer?.kind !== "multi") return null;
      const labels = answer.optionIds
        .map(
          (optionId) =>
            question.options?.find((candidate) => candidate.id === optionId)
              ?.label,
        )
        .filter((label): label is string => !!label);
      return labels.length > 0 ? labels.join(", ") : null;
    }
    case "address": {
      const parts = addressParts(answer);
      if (!parts) return null;
      // Matches the server's snapshot `display` string
      // ("123 Main St, Apt 4, Saginaw, MI 48601") so the review step, the
      // owner's inbox row and the confirmation email all read the same.
      const locality = [parts.city, parts.state].filter(Boolean).join(", ");
      const cityStateZip = [locality, parts.zip].filter(Boolean).join(" ");
      const display = [parts.line1, parts.line2, cityStateZip]
        .filter(Boolean)
        .join(", ");
      return display === "" ? null : display;
    }
    case "number": {
      const raw = rawValue(answer);
      if (raw === "") return null;
      return question.unitLabel ? `${raw} ${question.unitLabel}` : raw;
    }
    default: {
      const raw = rawValue(answer);
      return raw === "" ? null : raw;
    }
  }
}

/**
 * Projects the answer map onto the wire.
 *
 * `questions` must already be filtered to the VISIBLE set: a hidden question's
 * answer is retained in state (so re-answering the branching question restores
 * it) but must never be submitted — the server resolves visibility with the
 * same shared module and would either ignore it or treat the payload as
 * inconsistent.
 *
 * Blank/invalid values are dropped rather than sent as empty strings, because
 * `quoteWireAnswerSchema` applies `.min(1)` / regex constraints to every
 * populated field: an optional ZIP left blank must be an absent key, not "".
 */
export function toWireAnswers(
  questions: PublicQuoteQuestion[],
  answers: QuoteAnswerMap,
): QuoteWireAnswer[] {
  const wire: QuoteWireAnswer[] = [];

  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer) continue;
    const raw = rawValue(answer);

    switch (question.type) {
      case "choice":
      case "dropdown":
        if (answer.kind === "single" && answer.optionId !== "") {
          wire.push({ questionId: question.id, optionId: answer.optionId });
        }
        break;
      case "multiselect":
        if (answer.kind === "multi" && answer.optionIds.length > 0) {
          wire.push({ questionId: question.id, optionIds: answer.optionIds });
        }
        break;
      case "number": {
        if (raw === "") break;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) break;
        wire.push({ questionId: question.id, number: parsed });
        break;
      }
      case "zip":
        if (QUOTE_ZIP_RE.test(raw)) {
          wire.push({ questionId: question.id, zip: raw });
        }
        break;
      case "address": {
        const parts = addressParts(answer);
        // Only a COMPLETE, valid address ships. A partial one is dropped the
        // same way a half-typed ZIP is: `quoteWireAddressSchema` requires every
        // field except `line2`, so sending three of five would fail the whole
        // submission rather than the one question.
        if (!parts || !isCompleteAddress(parts)) break;
        if (!US_STATE_CODES.has(parts.state)) break;
        if (!QUOTE_ZIP_RE.test(parts.zip)) break;
        wire.push({
          questionId: question.id,
          address: {
            line1: parts.line1,
            // Omitted rather than sent as "" — `line2` is `.optional()` on the
            // wire schema, not `.optional()` with a min-length escape hatch.
            ...(parts.line2 === "" ? {} : { line2: parts.line2 }),
            city: parts.city,
            state: parts.state,
            zip: parts.zip,
          },
        });
        break;
      }
      case "date":
        if (QUOTE_DATE_RE.test(raw)) {
          wire.push({ questionId: question.id, date: raw });
        }
        break;
      case "text":
      case "longtext":
        if (raw !== "") {
          wire.push({ questionId: question.id, text: raw });
        }
        break;
    }
  }

  return wire;
}

/**
 * The question types the live-estimate preview is allowed to send.
 *
 * Two independent reasons, and both have to hold for a type to be in here:
 *
 * 1. **It can move the price.** Only these types produce a formula variable or
 *    a distance endpoint (`isQuoteVariableQuestion` / `isQuoteLocationQuestion`
 *    server-side). `text`, `longtext` and `date` are informational — the server
 *    captures them on the submission for the owner to read, and `computeQuote`
 *    never reads them — so including them would spend rate-limit budget and
 *    change nothing.
 * 2. **It is not free-form prose.** `text` and `longtext` are exactly where a
 *    visitor types "call me at 313-555-0143, gate code 4471" — PII, in a field
 *    the price does not use. The preview endpoint is anonymous, uncaptcha'd and
 *    fires while they are still typing; that content has no business riding
 *    along on it. It goes over the wire once, at submit, with a captcha.
 */
const PREVIEW_QUESTION_TYPES: ReadonlySet<PublicQuoteQuestion["type"]> =
  new Set(["choice", "multiselect", "dropdown", "number", "zip", "address"]);

/**
 * The answers worth asking the server to price right now.
 *
 * `toWireAnswers` restricted twice over: to price-bearing question types (see
 * `PREVIEW_QUESTION_TYPES`), and to answers that currently VALIDATE — a
 * half-typed ZIP or an out-of-range number would only earn a rejection, and
 * re-sending it on every keystroke would burn the 30/min budget getting it.
 *
 * `questions` must already be the visible set, for the same reason
 * `toWireAnswers` requires it.
 */
export function toPreviewWireAnswers(
  questions: PublicQuoteQuestion[],
  answers: QuoteAnswerMap,
): QuoteWireAnswer[] {
  const priceable = questions.filter(
    (question) =>
      PREVIEW_QUESTION_TYPES.has(question.type) &&
      validateAnswer(question, answers[question.id]) === null,
  );
  return toWireAnswers(priceable, answers);
}

/** Errors for the contact step, keyed by field. Empty object = valid. */
export type QuoteContactErrors = {
  name?: string;
  email?: string;
  phone?: string;
};

export type QuoteContact = {
  name: string;
  email: string;
  phone: string;
};

// Intentionally permissive — the server runs zod's `.email()` and is the
// authority. This only catches the obvious "forgot the @" case before a
// round trip.
const LOOSE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(
  contact: QuoteContact,
  requirePhone: boolean,
): QuoteContactErrors {
  const errors: QuoteContactErrors = {};

  if (contact.name.trim() === "") {
    errors.name = "Please enter your name.";
  } else if (contact.name.trim().length > 120) {
    errors.name = "Name must be 120 characters or fewer.";
  }

  const email = contact.email.trim();
  if (email === "") {
    errors.email = "Please enter your email address.";
  } else if (!LOOSE_EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const phone = contact.phone.trim();
  if (requirePhone && phone === "") {
    errors.phone = "Please enter a phone number.";
  } else if (phone.length > 30) {
    errors.phone = "Phone must be 30 characters or fewer.";
  }

  return errors;
}
