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
 * list. A third synthetic step — tabs — can now sit before all of them: a
 * calculator with tabs (e.g. Commercial vs. Residential) asks the visitor to
 * pick one before showing any screen, because a screen's own `showIf` cannot
 * see the tab choice (tabs gate whole SCREENS via `tabIds`, upstream of
 * per-question branching). Every rule about WHICH step comes next now has to
 * be stated somewhere that can be tested without mounting a component, so it
 * lives here rather than inside `useCallback`s.
 *
 * Nothing in this file knows anything about pricing: it reads question ids,
 * `required` flags and the visitor's own answers, and nothing else.
 */
export type QuoteStep =
  | { kind: "tabs" }
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
 * The tabs step, when the definition has any tabs, is always FIRST — the
 * visitor's tab choice determines which screens even apply (a screen whose
 * `tabIds` excludes the chosen tab is filtered out of `visibleScreens` before
 * this function ever sees it), so there is nothing else it could come after.
 * The contact step is unconditional; the review step is the owner's call and
 * always comes LAST, after contact, because it summarises the contact details
 * too.
 */
export function buildSteps(
  definition: Pick<PublicQuoteCalculatorDefinition, "showReviewStep" | "tabs">,
  visibleScreens: PublicQuoteScreen[],
): QuoteStep[] {
  const steps: QuoteStep[] = [];
  if (definition.tabs.length > 0) steps.push({ kind: "tabs" });
  for (const screen of visibleScreens) {
    steps.push({ kind: "screen", screen });
  }
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
 *
 * `activeTabId` is the visitor's current tab choice (`null` = none made yet).
 * When the steps hold a tabs step and no choice has been made, that step wins
 * outright — every other check is skipped, because the screens themselves
 * cannot even be evaluated correctly (a screen gated to a tab that has not
 * been chosen is meaningless to ask about). Once a tab is set, the tabs step
 * is treated as already complete and the usual screen/contact scan runs. The
 * default (`null`) keeps every existing call site — none of which know about
 * tabs yet — behaved exactly as before for a tabs-less definition, where
 * `buildSteps` never produced a tabs step in the first place.
 */
export function firstIncompleteStepIndex(
  steps: QuoteStep[],
  answers: QuoteAnswerMap,
  contact: QuoteContact,
  requirePhone: boolean,
  activeTabId: string | null = null,
): number {
  const tabsIndex = steps.findIndex((step) => step.kind === "tabs");
  if (tabsIndex !== -1 && activeTabId === null) {
    return tabsIndex;
  }

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
 *
 * Filters on `step.kind === "screen"`, so a leading tabs step (see
 * `buildSteps`) is invisible to this search without any special-casing — it
 * simply never matches. Callers indexing off the result should not assume
 * screen 0 sits at step 0: when the calculator has tabs, every step index is
 * shifted right by one.
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
