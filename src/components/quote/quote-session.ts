import type {
  QuoteAnswer,
  QuoteAnswerMap,
  QuoteContact,
} from "./quote-answers";
import type {
  PublicQuoteCalculatorDefinition,
  PublicQuoteQuestion,
} from "~/lib/validators/quote-calculator";
import { flattenScreens } from "~/lib/quote/screens";

/**
 * Draft persistence for the storefront quote runner.
 *
 * A quote flow can be fourteen steps long. Before this existed, a visitor who
 * tapped a link, hit the browser's back button, or let their phone lock the tab
 * lost every answer and started at step one — the single most expensive way to
 * lose a lead that was already most of the way to being one.
 *
 * ── sessionStorage, deliberately, and never localStorage ────────────────────
 *
 * What gets written here is PII: a name, an email address, a phone number, and
 * a street address. `sessionStorage` is scoped to the one tab and is discarded
 * when that tab closes, so the data has a natural, automatic expiry that needs
 * no cleanup job and no cookie banner. `localStorage` would persist it
 * indefinitely, on a shared or borrowed device, for a form the visitor may
 * never have submitted — and would surface a stranger's half-typed address to
 * whoever opens the site next. The tradeoff is that a draft does not survive
 * closing the tab, which is the correct default for someone else's address.
 *
 * ── Total, never throwing ───────────────────────────────────────────────────
 *
 * Every function here swallows its own failures. Safari's private mode throws
 * on `setItem`, an embedded/partitioned context can throw on merely *touching*
 * `window.sessionStorage`, a full quota throws, and a hand-edited or truncated
 * value fails to parse. None of those are worth taking a working quote form
 * down for: a draft that cannot be saved is a draft that cannot be saved, and
 * the runner carries on with in-memory state exactly as it did before.
 *
 * Pure and React-free so it can be unit-tested without a DOM (the tests install
 * a fake `window`), and dependency-light for the same reason `screens.ts` is —
 * it ships to the browser with the runner.
 */

/** One key per calculator: two embeds on one page keep separate drafts. */
const STORAGE_KEY_PREFIX = "sp-quote-session:";

/**
 * Bumped only for a shape change that older payloads cannot be read as. There
 * is deliberately no migration path: a draft is a convenience measured in
 * minutes, so an unrecognized version is dropped rather than upgraded.
 */
const SESSION_VERSION = 1;

// Defensive caps. Nothing in the runner can produce a value past these — they
// exist because sessionStorage is visitor-writable, and a restored draft flows
// straight into the answer map that `toWireAnswers` projects onto the wire.
// Mirrors of the submit schema's own limits (`quoteSubmitSchema`,
// `quoteWireAnswerSchema`, `quoteWireAddressSchema`): anything longer would be
// rejected at submit anyway, so it is trimmed here where it can still be edited.
const MAX_RESTORED_ANSWERS = 30;
const MAX_RESTORED_OPTION_IDS = 12;
const RAW_MAX = 2000;
const ADDRESS_LINE_MAX = 120;
const ADDRESS_CITY_MAX = 80;
const ADDRESS_STATE_MAX = 2;
/** Longer than a 5-digit ZIP on purpose: a half-typed "48601-" must survive. */
const ADDRESS_ZIP_MAX = 10;
const CONTACT_NAME_MAX = 120;
const CONTACT_EMAIL_MAX = 254;
const CONTACT_PHONE_MAX = 30;

/**
 * The stored blob. `answers` and `contact` are the runner's own state shapes,
 * not the wire shapes — a draft has to be able to hold a half-typed ZIP, which
 * is precisely what `QuoteWireAnswer` refuses to represent.
 */
export type StoredQuoteSessionV1 = {
  v: typeof SESSION_VERSION;
  answers: QuoteAnswerMap;
  contact: QuoteContact;
};

/** What a restore hands back — never partial, never `undefined` fields. */
export type RestoredQuoteSession = {
  answers: QuoteAnswerMap;
  contact: QuoteContact;
};

/**
 * `window.sessionStorage` or `null`.
 *
 * The `typeof window` guard covers SSR (this module is imported by a client
 * component, which still renders on the server). The `try` covers the browsers
 * that throw on the property access itself rather than on the first write.
 */
function sessionStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function storageKey(calculatorId: string): string {
  return `${STORAGE_KEY_PREFIX}${calculatorId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A bounded string, or "" for anything that is not one. */
function cappedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/**
 * Whether an answer holds anything the visitor would recognize as their own.
 *
 * Question-free on purpose — it switches on the answer's own discriminant, so
 * it stays correct for an answer whose question has since been deleted, and
 * exhaustively so a new `QuoteAnswer` kind cannot be forgotten here.
 */
function answerHasContent(answer: QuoteAnswer): boolean {
  switch (answer.kind) {
    case "single":
      return answer.optionId !== "";
    case "multi":
      return answer.optionIds.length > 0;
    case "value":
      return answer.raw.trim() !== "";
    case "address":
      return [
        answer.line1,
        answer.line2,
        answer.city,
        answer.state,
        answer.zip,
      ].some((part) => part.trim() !== "");
  }
}

/**
 * Whether there is a draft worth keeping — i.e. anything the visitor would be
 * annoyed to lose.
 *
 * Two callers: the runner's persist effect (which clears the key rather than
 * writing an empty draft) and the "Start over" control (hidden when there is
 * nothing to discard).
 */
export function hasQuoteSessionContent(
  answers: QuoteAnswerMap,
  contact: QuoteContact,
): boolean {
  for (const answer of Object.values(answers)) {
    if (answerHasContent(answer)) return true;
  }
  return (
    contact.name.trim() !== "" ||
    contact.email.trim() !== "" ||
    contact.phone.trim() !== ""
  );
}

/** Write the current draft. Silently does nothing when storage is unavailable. */
export function saveQuoteSession(
  calculatorId: string,
  answers: QuoteAnswerMap,
  contact: QuoteContact,
): void {
  const store = sessionStore();
  if (!store) return;

  const payload: StoredQuoteSessionV1 = {
    v: SESSION_VERSION,
    answers,
    contact,
  };

  try {
    store.setItem(storageKey(calculatorId), JSON.stringify(payload));
  } catch {
    // Quota exceeded, private mode, or a serialization failure. The draft is a
    // convenience; the in-memory flow is unaffected.
  }
}

/** Drop the draft. Called on a successful submit and on "Start over". */
export function clearQuoteSession(calculatorId: string): void {
  const store = sessionStore();
  if (!store) return;
  try {
    store.removeItem(storageKey(calculatorId));
  } catch {
    // See `saveQuoteSession`.
  }
}

/**
 * Read a draft back, validated against the CURRENT definition.
 *
 * The calculator can have been edited between the draft being written and the
 * tab being reopened — a question deleted, an option renamed away, a question's
 * type changed. Anything that no longer lines up is dropped silently rather
 * than restored: a stale option id would submit as `unknown-option`, and a
 * mismatched answer kind would render the wrong control.
 *
 * Validated against ALL screens, not the visible ones. The runner keeps answers
 * to currently-hidden questions in state on purpose (flipping a branch back
 * restores what the visitor already said), so filtering by visibility here
 * would quietly discard exactly the answers that make branching feel lossless.
 *
 * Returns `null` for "there is nothing to restore" — no key, unreadable JSON,
 * an unknown version, a shape that is not a session, or a draft in which
 * nothing at all survived validation. Callers treat all of those identically.
 */
export function loadQuoteSession(
  calculatorId: string,
  definition: Pick<PublicQuoteCalculatorDefinition, "screens">,
): RestoredQuoteSession | null {
  const store = sessionStore();
  if (!store) return null;

  let parsed: unknown;
  try {
    const raw = store.getItem(storageKey(calculatorId));
    if (raw === null) return null;
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed.v !== SESSION_VERSION) return null;
  if (!isRecord(parsed.answers) || !isRecord(parsed.contact)) return null;

  // `flattenScreens` rather than a hand-rolled walk, for the same reason every
  // other consumer uses it: it is the one agreed enumeration of a definition's
  // questions (see `src/lib/quote/screens.ts`).
  const questionsById = new Map<string, PublicQuoteQuestion>();
  for (const question of flattenScreens(definition.screens)) {
    if (!questionsById.has(question.id)) {
      questionsById.set(question.id, question);
    }
  }

  const answers: QuoteAnswerMap = {};
  let restoredCount = 0;
  for (const [questionId, stored] of Object.entries(parsed.answers)) {
    if (restoredCount >= MAX_RESTORED_ANSWERS) break;
    const question = questionsById.get(questionId);
    if (!question) continue;
    const answer = sanitizeAnswer(question, stored);
    if (!answer) continue;
    answers[questionId] = answer;
    restoredCount += 1;
  }

  const contact = sanitizeContact(parsed.contact);

  if (!hasQuoteSessionContent(answers, contact)) return null;

  return { answers, contact };
}

/**
 * One stored answer, checked against the question it claims to belong to.
 *
 * The `kind` must match what the question's TYPE would produce today — the
 * runner renders a control from the question type and reads the answer with
 * that kind, so a `value` answer sitting under a question the owner has since
 * turned into a multiselect is not a downgrade, it is a crash waiting for the
 * first render. Returns `null` for anything that does not line up.
 */
function sanitizeAnswer(
  question: PublicQuoteQuestion,
  stored: unknown,
): QuoteAnswer | null {
  if (!isRecord(stored)) return null;

  switch (question.type) {
    case "choice":
    case "dropdown": {
      if (stored.kind !== "single" || typeof stored.optionId !== "string") {
        return null;
      }
      const optionId = stored.optionId;
      // An option the owner deleted cannot be restored: the runner would render
      // nothing selected while the answer map insisted otherwise, and the
      // server would reject the submission as `unknown-option`.
      if (!question.options?.some((option) => option.id === optionId)) {
        return null;
      }
      return { kind: "single", optionId };
    }

    case "multiselect": {
      if (stored.kind !== "multi" || !Array.isArray(stored.optionIds)) {
        return null;
      }
      // Filtered rather than rejected wholesale: one deleted add-on must not
      // cost the visitor the other four they checked.
      const optionIds = [
        ...new Set(
          stored.optionIds.filter(
            (optionId): optionId is string =>
              typeof optionId === "string" &&
              (question.options?.some((option) => option.id === optionId) ??
                false),
          ),
        ),
      ].slice(0, MAX_RESTORED_OPTION_IDS);
      if (optionIds.length === 0) return null;
      return { kind: "multi", optionIds };
    }

    case "address": {
      if (stored.kind !== "address") return null;
      return {
        kind: "address",
        line1: cappedString(stored.line1, ADDRESS_LINE_MAX),
        line2: cappedString(stored.line2, ADDRESS_LINE_MAX),
        city: cappedString(stored.city, ADDRESS_CITY_MAX),
        state: cappedString(stored.state, ADDRESS_STATE_MAX),
        zip: cappedString(stored.zip, ADDRESS_ZIP_MAX),
      };
    }

    // number / zip / text / longtext / date — every type the runner stores as a
    // raw control string. Deliberately NOT re-validated here (a half-typed ZIP
    // is a legitimate draft); `validateAnswer` still runs on the way forward.
    default: {
      if (stored.kind !== "value" || typeof stored.raw !== "string") {
        return null;
      }
      return { kind: "value", raw: stored.raw.slice(0, RAW_MAX) };
    }
  }
}

/**
 * Contact details, bounded to the submit schema's own maxima so a restored
 * draft can never be the reason a submission is rejected.
 *
 * Trim BEFORE the cap, in that order, because that is the order
 * `quoteSubmitSchema` applies them (`.trim().max(120)`): capping first would
 * spend part of the allowance on whitespace that is about to be thrown away,
 * and reject a 120-character name that the server would have accepted.
 */
function sanitizeContact(stored: Record<string, unknown>): QuoteContact {
  return {
    name: trimmedCapped(stored.name, CONTACT_NAME_MAX),
    email: trimmedCapped(stored.email, CONTACT_EMAIL_MAX),
    phone: trimmedCapped(stored.phone, CONTACT_PHONE_MAX),
  };
}

function trimmedCapped(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
