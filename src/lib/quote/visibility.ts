/**
 * Which quote calculator questions apply — tabs and show-if, together.
 *
 * This is the ONE place the rule lives, because it has three consumers that
 * must never disagree:
 *
 * - the storefront runner (client) — decides which slides a visitor sees,
 * - `computeQuote` (server, `src/lib/quote/evaluate.ts`) — decides which
 *   answers count and which variables fall back to their `hiddenDefault`, and
 * - the builder's test panel — shows the owner what their own definition does.
 *
 * If those drifted, a visitor could be shown and asked a question whose answer
 * the server then discards (or vice versa), and the estimate would not match
 * the form they filled in.
 *
 * Two independent gates decide one boolean, in this order:
 *
 *   1. TAB — a question limited to `tabIds` only applies on those tabs. A tab
 *      is a fork the visitor picks BEFORE the flow starts ("Commercial" vs
 *      "Residential"), so it is not answer-driven and cannot be expressed as a
 *      show-if.
 *   2. SHOW-IF — the answer-driven reveal, resolved transitively.
 *
 * The tab gate runs first and is absolute: a question the active tab does not
 * include is hidden no matter what has been answered, and — because a hidden
 * question is not a legal show-if source (see `resolveVisibility`) — every
 * question that branches off it is hidden too.
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
  /**
   * Which tabs this question belongs to. **Empty or absent means every tab** —
   * which is also the whole no-tabs case, so a calculator built before tabs
   * existed keeps asking every one of its questions.
   */
  tabIds?: readonly string[];
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
 * Does a question restricted to `tabIds` apply under the active tab?
 *
 * - Empty or `undefined` `tabIds` → the question is unrestricted and applies on
 *   every tab, INCLUDING when there is no active tab at all. This is the no-op
 *   that keeps every pre-tabs calculator working untouched.
 * - `activeTabId === null` with a non-empty `tabIds` → false. "No tab chosen"
 *   is not a wildcard: the only questions that apply are the unrestricted ones.
 *   That is what makes the preview path (which tolerates a missing tab) merely
 *   CONSERVATIVE rather than wrong — it can only under-ask, never over-ask.
 * - Otherwise → membership.
 *
 * A STALE id (one pointing at a tab the owner has since deleted) therefore
 * fails closed: it matches no active tab, so the question is hidden on every
 * one of them. Same stance as a dangling `showIf` below, and for the same
 * reason — a definition that drifted should quietly drop a question, not take
 * the storefront page down or leak a question into a tab it was never on.
 */
export function tabApplies(
  tabIds: readonly string[] | undefined,
  activeTabId: string | null,
): boolean {
  if (tabIds === undefined || tabIds.length === 0) return true;
  if (activeTabId === null) return false;
  return tabIds.includes(activeTabId);
}

/**
 * Resolves visibility for every question, keyed by question id.
 *
 * A question is visible iff:
 *   - its `tabIds` apply under `activeTabId` (see `tabApplies`), AND
 *   - it has no `showIf`, OR
 *   - the question its `showIf` points at is ITSELF visible, and the option
 *     selected there matches `showIf.optionId`.
 *
 * The transitive part matters twice over. Chaining B(showIf A) → C(showIf B)
 * must hide C when A is unanswered, even though B's stale selection might still
 * be sitting in the answer map — and the same machinery is what makes the tab
 * gate transitive for free: a source question hidden by tab resolves to `false`
 * in the map, so everything downstream of it reads `false` and hides too, no
 * matter what selections were submitted for the hidden chain.
 *
 * `activeTabId` defaults to `null`, which for a calculator with no tabs (every
 * question unrestricted) is exactly the pre-tabs behavior.
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
  activeTabId: string | null = null,
): Map<string, boolean> {
  const visibility = new Map<string, boolean>();

  for (const question of questions) {
    // Gate 1: the tab. Checked before the show-if because it is unconditional
    // — no combination of answers can put a Commercial-only question onto the
    // Residential tab.
    if (!tabApplies(question.tabIds, activeTabId)) {
      visibility.set(question.id, false);
      continue;
    }

    const condition = question.showIf;

    if (!condition) {
      visibility.set(question.id, true);
      continue;
    }

    // `?? false` is the fail-closed branch described above: an id that is not
    // in the map yet is either a forward reference or a dangling one. An id
    // that IS in the map but resolved false — including one hidden by the tab
    // gate — hides this question too, which is how tab-hiding propagates down
    // a show-if chain.
    const targetVisible = visibility.get(condition.questionId) ?? false;
    const selected = getSelectedOptionId(condition.questionId);

    visibility.set(
      question.id,
      targetVisible && selected === condition.optionId,
    );
  }

  return visibility;
}
