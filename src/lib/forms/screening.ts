import type { FormScreening, FormScreeningLink } from "~/lib/validators/form";

/**
 * Pure stepping logic for the storefront screening gate (yes/no questions in
 * front of a form). No React, no storage: the gate component owns both and
 * just feeds answers through these helpers.
 */

export type ScreeningAnswer = "yes" | "no";

export type ScreeningState =
  | { kind: "question"; index: number }
  | { kind: "failed"; index: number }
  | { kind: "passed" };

/** First state of a gate: question 0, or `passed` when there is nothing to ask. */
export function initialScreeningState(
  screening: FormScreening | null,
): ScreeningState {
  if (!screening?.enabled || screening.questions.length === 0) {
    return { kind: "passed" };
  }
  return { kind: "question", index: 0 };
}

/** Apply an answer: pass → next question (or `passed`), fail → `failed` at the same index. */
export function answerScreening(
  screening: FormScreening | null,
  state: ScreeningState,
  answer: ScreeningAnswer,
): ScreeningState {
  if (state.kind !== "question" || !screening) return state;
  const question = screening.questions[state.index];
  if (!question) return { kind: "passed" };
  if (answer !== question.passAnswer) {
    return { kind: "failed", index: state.index };
  }
  const next = state.index + 1;
  return next >= screening.questions.length
    ? { kind: "passed" }
    : { kind: "question", index: next };
}

/** "Change my answer": a failed question goes back to being asked; other states are unchanged. */
export function retryScreening(state: ScreeningState): ScreeningState {
  return state.kind === "failed"
    ? { kind: "question", index: state.index }
    : state;
}

/** "Back": one question earlier; the first question, failed and passed states are unchanged. */
export function backScreening(state: ScreeningState): ScreeningState {
  return state.kind === "question" && state.index > 0
    ? { kind: "question", index: state.index - 1 }
    : state;
}

/** What to show for a failed question: its own message (else the default) plus its links. */
export function failContent(
  screening: FormScreening,
  index: number,
): { message: string; links: FormScreeningLink[] } {
  const question = screening.questions[index];
  return {
    // `||`: a blank per-question message falls back to the default.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    message: question?.failMessage || screening.defaultFailMessage,
    links: question?.failLinks ?? [],
  };
}

/** sessionStorage key under which the gate remembers a form was unlocked. */
export function screeningStorageKey(formId: string): string {
  return `sp-form-screen:${formId}`;
}
