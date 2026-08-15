/**
 * Show-if visibility for quote calculator questions.
 *
 * This is the ONE place the rule lives, because it has two consumers that must
 * never disagree:
 *
 * - the storefront runner (client) — decides which slides a visitor sees, and
 * - `computeQuote` (server, `src/lib/quote/evaluate.ts`) — decides which
 *   answers count and which variables fall back to their `hiddenDefault`.
 *
 * If those two drifted, a visitor could be shown and asked a question whose
 * answer the server then discards (or vice versa), and the estimate would not
 * match the form they filled in.
 *
 * Deliberately dependency-free (no zod, no React, no types from the validator
 * module) so the client bundle pays nothing to import it.
 */

export type ShowIfCondition = {
  questionId: string;
  optionId: string;
};

export type VisibilityQuestion = {
  id: string;
  showIf?: ShowIfCondition | null;
};

/**
 * Returns the currently-selected option id for a question, or `undefined` when
 * the question has no single selected option — i.e. for every type other than
 * `choice`/`dropdown`, and for an unanswered choice/dropdown.
 *
 * `multiselect` deliberately returns `undefined`: a show-if may only target a
 * single-answer question (enforced by `quoteCalculatorDefinitionSchema`), so
 * "which one of several checkboxes counts?" never has to be answered here.
 */
export type VisibilityAnswerLookup = (questionId: string) => string | undefined;

/**
 * Resolves visibility for every question, keyed by question id.
 *
 * A question is visible iff:
 *   - it has no `showIf`, OR
 *   - the question its `showIf` points at is ITSELF visible, and the option
 *     selected there matches `showIf.optionId`.
 *
 * The transitive part matters: chaining B(showIf A) → C(showIf B) must hide C
 * when A is unanswered, even though B's stale selection might still be sitting
 * in the answer map.
 *
 * Resolved in array order, in a single pass. That is only correct because a
 * `showIf` may only point BACKWARD — `quoteCalculatorDefinitionSchema` rejects
 * a forward reference at save time. Here, a forward or dangling reference is
 * simply not yet in the map and resolves to NOT visible (fail closed), rather
 * than throwing: a definition that predates the validator, or one hand-edited
 * in the database, should hide the affected question instead of taking the
 * whole storefront page down.
 */
export function resolveVisibility(
  questions: VisibilityQuestion[],
  getSelectedOptionId: VisibilityAnswerLookup,
): Map<string, boolean> {
  const visibility = new Map<string, boolean>();

  for (const question of questions) {
    const condition = question.showIf;

    if (!condition) {
      visibility.set(question.id, true);
      continue;
    }

    // `?? false` is the fail-closed branch described above: an id that is not
    // in the map yet is either a forward reference or a dangling one.
    const targetVisible = visibility.get(condition.questionId) ?? false;
    const selected = getSelectedOptionId(condition.questionId);

    visibility.set(
      question.id,
      targetVisible && selected === condition.optionId,
    );
  }

  return visibility;
}
