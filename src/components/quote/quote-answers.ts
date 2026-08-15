import type {
  PublicQuoteQuestion,
  QuoteWireAnswer,
} from "~/lib/validators/quote-calculator";
import { QUOTE_DATE_RE, QUOTE_ZIP_RE } from "~/lib/validators/quote-calculator";

/**
 * The runner's in-memory answer shape.
 *
 * Deliberately NOT `QuoteWireAnswer`. Three of the eight question types are
 * free-text inputs whose intermediate states are not valid wire values — a
 * half-typed ZIP ("486"), a number field cleared back to "" , a date the
 * browser reports as "" while the user is mid-pick. Storing the raw control
 * value and projecting to the wire shape once, at submit time
 * (`toWireAnswers`), keeps those transient states out of the payload instead
 * of forcing every keystroke through a validator that would reject them.
 *
 * `kind` mirrors how the ANSWER is shaped, not the question type: several
 * question types share a representation.
 */
export type QuoteAnswer =
  | { kind: "single"; optionId: string }
  | { kind: "multi"; optionIds: string[] }
  | { kind: "value"; raw: string };

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
    default:
      return rawValue(answer) !== "";
  }
}

/**
 * Client-side guard for one step. Returns a user-facing message, or `null`
 * when the step may advance.
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
