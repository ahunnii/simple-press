/**
 * Screen ↔ question plumbing for quote calculators.
 *
 * Definition v2 nests questions inside `screens[]` — one screen is one step the
 * visitor sees. Almost every consumer still wants the questions as ONE ordered
 * list (the validator's cross-field rules, `computeQuote`, `resolveVisibility`,
 * the builder's "question 4 of 9" numbering, the test panel), and every one of
 * them has to agree on what that order is. `flattenScreens` is that agreement:
 * screen order, then in-screen order, and nothing else may enumerate questions
 * from a definition.
 *
 * Why it matters that there is exactly one flattener: the show-if rule is
 * "points BACKWARD in the flattened list", and `resolveVisibility` resolves in
 * a single forward pass over that same list. A second, subtly different
 * ordering somewhere would make a question the validator accepted resolve to
 * permanently-hidden at runtime.
 *
 * Deliberately dependency-free — no zod, no React, no types from the validator
 * module — for the same reason `visibility.ts` is: it ships to the browser with
 * the storefront runner, and both the public (`PublicQuoteScreen`) and the
 * owner-side (`QuoteScreen`) shapes have to flow through it. Hence the
 * structural generics rather than concrete imports.
 */

/**
 * Every question across every screen, in the order a visitor meets them.
 *
 * Generic over the question type so it serves both sides of the security
 * boundary: the server passes `QuoteQuestion[]`-bearing screens, the storefront
 * runner passes `PublicQuoteQuestion[]`-bearing ones, and neither has to cast.
 */
export function flattenScreens<Q>(
  screens: ReadonlyArray<{ questions: readonly Q[] }>,
): Q[] {
  const flat: Q[] = [];
  for (const screen of screens) {
    for (const question of screen.questions) flat.push(question);
  }
  return flat;
}

/**
 * The screens a visitor should actually be walked through, given a resolved
 * visibility map (from `resolveVisibility`).
 *
 * Each screen keeps only its visible questions, and a screen left with none is
 * DROPPED rather than rendered empty — a branch that hides every question on a
 * step must skip the step, not show a heading with nothing under it. That is
 * also what makes the runner's "Step X of N" honest: N counts the steps the
 * visitor will really see.
 *
 * Screens whose questions are all visible are returned by identity (the same
 * object reference), which keeps React keys and memo comparisons stable for
 * the common no-branching case.
 */
export function visibleScreensFor<
  S extends { questions: readonly { id: string }[] },
>(screens: readonly S[], visibility: ReadonlyMap<string, boolean>): S[] {
  const result: S[] = [];

  for (const screen of screens) {
    const visible = screen.questions.filter(
      (question) => visibility.get(question.id) ?? false,
    );
    if (visible.length === 0) continue;
    if (visible.length === screen.questions.length) {
      result.push(screen);
      continue;
    }
    // The cast is structural-only: `visible` is an array of exactly
    // `S["questions"][number]`, but TypeScript cannot prove a spread-with-
    // override still satisfies the caller's concrete `S`.
    result.push({ ...screen, questions: visible } as S);
  }

  return result;
}
