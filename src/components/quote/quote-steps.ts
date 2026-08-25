import type { QuoteAnswerMap, QuoteContact } from "./quote-answers";
import type {
  PublicQuoteCalculatorDefinition,
  PublicQuoteScreen,
} from "~/lib/validators/quote-calculator";

import { validateAnswer, validateContact } from "./quote-answers";

/**
 * The runner's step model — pure, React-free, and unit-tested.
 *
 * The runner used to derive its flow from a flat question list, where "step N"
 * and "question N" were the same number. With screens they are not: one step
 * may hold several questions, a branch may empty a screen out of existence,
 * and two synthetic steps (contact, review) sit past the end of the screen
 * list. Every rule about WHICH step comes next now has to be stated somewhere
 * that can be tested without mounting a component, so it lives here rather
 * than inside `useCallback`s.
 *
 * Nothing in this file knows anything about pricing: it reads question ids,
 * `required` flags and the visitor's own answers, and nothing else.
 */
export type QuoteStep =
  | { kind: "screen"; screen: PublicQuoteScreen }
  | { kind: "contact" }
  | { kind: "review" };

/**
 * The steps a visitor will actually walk, in order.
 *
 * `visibleScreens` must already be the output of `visibleScreensFor` — screens
 * whose every question is hidden are dropped there, not here, so that "Step X
 * of N" counts only steps the visitor will really see.
 *
 * The contact step is unconditional; the review step is the owner's call and
 * always comes LAST, after contact, because it summarises the contact details
 * too.
 */
export function buildSteps(
  definition: Pick<PublicQuoteCalculatorDefinition, "showReviewStep">,
  visibleScreens: PublicQuoteScreen[],
): QuoteStep[] {
  const steps: QuoteStep[] = visibleScreens.map((screen) => ({
    kind: "screen",
    screen,
  }));
  steps.push({ kind: "contact" });
  if (definition.showReviewStep) steps.push({ kind: "review" });
  return steps;
}

/**
 * The index of the first step that still needs something from the visitor, or
 * `-1` when the whole flow is answerable as it stands.
 *
 * Used by the "return to review" path: after the visitor edits one answer from
 * the review step, going forward must not blindly land back on review if the
 * edit revealed a NEW required question three screens earlier. Screens are
 * checked in step order first, then contact — so the visitor is always routed
 * to the earliest thing they still owe, not the nearest.
 */
export function firstIncompleteStepIndex(
  steps: QuoteStep[],
  answers: QuoteAnswerMap,
  contact: QuoteContact,
  requirePhone: boolean,
): number {
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    if (step?.kind !== "screen") continue;
    for (const question of step.screen.questions) {
      if (validateAnswer(question, answers[question.id]) !== null) {
        return index;
      }
    }
  }

  const contactIndex = steps.findIndex((step) => step.kind === "contact");
  if (
    contactIndex !== -1 &&
    Object.keys(validateContact(contact, requirePhone)).length > 0
  ) {
    return contactIndex;
  }

  return -1;
}

/**
 * Which step holds a given question, or `-1` when nothing does.
 *
 * `-1` is a normal outcome rather than an error: the review step renders Edit
 * buttons from the visible screens it was handed, and a branch flipped in
 * another tab-restored state could in principle hide the question between
 * render and click. The caller ignores the request instead of jumping to
 * step −1.
 */
export function findScreenStepIndex(
  steps: QuoteStep[],
  questionId: string,
): number {
  return steps.findIndex(
    (step) =>
      step.kind === "screen" &&
      step.screen.questions.some((question) => question.id === questionId),
  );
}
