import { describe, expect, it } from "vitest";

import type { QuoteAnswerMap, QuoteContact } from "./quote-answers";
import type {
  PublicQuoteQuestion,
  PublicQuoteScreen,
} from "~/lib/validators/quote-calculator";

import {
  buildSteps,
  findScreenStepIndex,
  firstIncompleteStepIndex,
} from "./quote-steps";

/**
 * The step model decides where a visitor lands after every Next, every Edit
 * from the review step and every failed submit. It is the one part of the
 * runner that can be exercised without a DOM, and the one where an off-by-one
 * strands someone on a step they cannot leave.
 */

function question(
  id: string,
  overrides: Partial<PublicQuoteQuestion> = {},
): PublicQuoteQuestion {
  return {
    id,
    type: "text",
    title: `Question ${id}`,
    description: null,
    required: false,
    showIf: null,
    ...overrides,
  };
}

function screen(
  id: string,
  questions: PublicQuoteQuestion[],
): PublicQuoteScreen {
  return { id, title: null, description: null, questions };
}

const validContact: QuoteContact = {
  name: "Ada",
  email: "ada@example.com",
  phone: "313-555-0143",
};

describe("buildSteps", () => {
  it("puts contact after the screens and review last", () => {
    const steps = buildSteps({ showReviewStep: true }, [
      screen("s1", [question("a")]),
      screen("s2", [question("b")]),
    ]);

    expect(steps.map((step) => step.kind)).toEqual([
      "screen",
      "screen",
      "contact",
      "review",
    ]);
  });

  it("omits the review step when the owner turned it off", () => {
    const steps = buildSteps({ showReviewStep: false }, [
      screen("s1", [question("a")]),
    ]);

    expect(steps.map((step) => step.kind)).toEqual(["screen", "contact"]);
  });

  it("still produces a contact step when every screen is hidden", () => {
    // `visibleScreensFor` drops screens whose questions are all hidden, so an
    // all-branched-away calculator arrives here as an empty list. The flow must
    // still be walkable rather than collapsing to zero steps.
    const steps = buildSteps({ showReviewStep: true }, []);

    expect(steps.map((step) => step.kind)).toEqual(["contact", "review"]);
  });

  it("keeps screen identity so React keys stay stable", () => {
    const first = screen("s1", [question("a")]);
    const steps = buildSteps({ showReviewStep: false }, [first]);

    expect(steps[0]).toEqual({ kind: "screen", screen: first });
    expect(steps[0]?.kind === "screen" && steps[0].screen).toBe(first);
  });
});

describe("firstIncompleteStepIndex", () => {
  const steps = buildSteps({ showReviewStep: true }, [
    screen("s1", [question("a", { required: true, type: "zip" })]),
    screen("s2", [
      question("b", { required: false }),
      question("c", { required: true, type: "choice", options: [] }),
    ]),
  ]);

  const answered: QuoteAnswerMap = {
    a: { kind: "value", raw: "48601" },
    c: { kind: "single", optionId: "opt_1" },
  };

  it("returns -1 when every visible question and the contact step pass", () => {
    expect(firstIncompleteStepIndex(steps, answered, validContact, false)).toBe(
      -1,
    );
  });

  it("returns the earliest incomplete screen, not the nearest", () => {
    const answers: QuoteAnswerMap = { ...answered };
    delete answers.a;

    expect(firstIncompleteStepIndex(steps, answers, validContact, false)).toBe(
      0,
    );
  });

  it("finds a required question that is not first on its screen", () => {
    const answers: QuoteAnswerMap = { ...answered };
    delete answers.c;

    expect(firstIncompleteStepIndex(steps, answers, validContact, false)).toBe(
      1,
    );
  });

  it("flags an invalid — not merely missing — answer", () => {
    const answers: QuoteAnswerMap = {
      ...answered,
      a: { kind: "value", raw: "486" },
    };

    expect(firstIncompleteStepIndex(steps, answers, validContact, false)).toBe(
      0,
    );
  });

  it("falls through to the contact step only once the screens are clean", () => {
    expect(
      firstIncompleteStepIndex(
        steps,
        answered,
        { name: "", email: "", phone: "" },
        false,
      ),
    ).toBe(2);
  });

  it("prefers an incomplete screen over an incomplete contact step", () => {
    const answers: QuoteAnswerMap = { ...answered };
    delete answers.a;

    expect(
      firstIncompleteStepIndex(
        steps,
        answers,
        { name: "", email: "", phone: "" },
        false,
      ),
    ).toBe(0);
  });

  it("honours requirePhone", () => {
    const contact: QuoteContact = { ...validContact, phone: "" };

    expect(firstIncompleteStepIndex(steps, answered, contact, false)).toBe(-1);
    expect(firstIncompleteStepIndex(steps, answered, contact, true)).toBe(2);
  });

  it("ignores an unanswered optional question", () => {
    // `b` is optional and unanswered in every case above; if it counted, the
    // visitor could never leave screen 2.
    expect(firstIncompleteStepIndex(steps, answered, validContact, false)).toBe(
      -1,
    );
  });
});

describe("findScreenStepIndex", () => {
  const steps = buildSteps({ showReviewStep: true }, [
    screen("s1", [question("a")]),
    screen("s2", [question("b"), question("c")]),
  ]);

  it("finds the step holding the question, whatever its position on it", () => {
    expect(findScreenStepIndex(steps, "a")).toBe(0);
    expect(findScreenStepIndex(steps, "b")).toBe(1);
    expect(findScreenStepIndex(steps, "c")).toBe(1);
  });

  it("returns -1 for a question that is no longer visible", () => {
    expect(findScreenStepIndex(steps, "gone")).toBe(-1);
  });
});
