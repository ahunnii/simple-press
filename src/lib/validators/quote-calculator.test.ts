import type { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  QUOTE_ID_MAX_LENGTH,
  QUOTE_MAX_ANSWER_NUMBER,
  QUOTE_STATUS_FILTER_VALUES,
  QUOTE_STATUS_VALUES_DB,
  quoteCalculatorDefinitionSchema,
  quoteSubmitSchema,
  toPublicCalculatorDefinition,
} from "./quote-calculator";

/**
 * `quoteCalculatorDefinitionSchema` is the gate that makes `computeQuote`'s
 * job simple: anything it accepts is guaranteed to evaluate. Every rule below
 * exists because breaking it produces a calculator that saves cleanly and then
 * fails — or silently misprices — at submission time, in front of a customer.
 *
 * Each cross-field issue carries a precise `path` so the builder can attach
 * the message to the offending row rather than the whole form; the paths are
 * asserted, not just the rejection.
 */

/**
 * A minimal definition that passes every rule; each test bends one thing.
 *
 * Deliberately typed as loose records rather than letting TypeScript infer a
 * discriminated union from the literal: these fixtures are INPUT to
 * `safeParse`, and most tests work by putting something invalid in one field.
 * A precise input type would reject the invalid fixture at compile time and
 * there would be nothing left to test.
 */
type RawQuestion = Record<string, unknown>;
type RawDistance = Record<string, unknown>;

function baseDefinition(): {
  version: 1;
  questions: RawQuestion[];
  distances: RawDistance[];
  formula: string;
} {
  return {
    version: 1,
    questions: [
      {
        id: "q_type",
        type: "choice",
        title: "Kind of move",
        variableName: "move_type",
        options: [
          { id: "local", label: "Local", value: 1 },
          { id: "cross", label: "Cross-country", value: 1.5 },
        ],
      },
      {
        id: "q_bedrooms",
        type: "number",
        title: "Bedrooms",
        variableName: "bedrooms",
        min: 0,
        max: 10,
        unitLabel: "beds",
      },
      { id: "q_from", type: "zip", title: "Origin ZIP" },
      { id: "q_to", type: "zip", title: "Destination ZIP" },
    ],
    distances: [
      {
        id: "d_move",
        variableName: "miles",
        fromQuestionId: "q_from",
        toQuestionId: "q_to",
      },
    ],
    formula: "(500 + bedrooms * 350 + miles * 4) * move_type",
  };
}

function issuesFor(raw: unknown): z.ZodIssue[] {
  const result = quoteCalculatorDefinitionSchema.safeParse(raw);
  if (result.success) {
    throw new Error("expected the definition to be rejected, but it parsed");
  }
  return result.error.issues;
}

function paths(issues: z.ZodIssue[]): string[] {
  return issues.map((issue) => issue.path.join("."));
}

// ─── Happy path ─────────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — happy path", () => {
  it("accepts a well-formed definition and applies defaults", () => {
    const parsed = quoteCalculatorDefinitionSchema.parse(baseDefinition());
    expect(parsed.questions).toHaveLength(4);
    expect(parsed.showEstimateToCustomer).toBe(false);
    expect(parsed.displayAsRange).toBe(false);
    expect(parsed.rangePaddingPercent).toBe(10);
    expect(parsed.requirePhone).toBe(false);
    expect(parsed.responseDays).toBe(1);
    expect(parsed.thankYouMessage).toBe("Thanks! We received your request.");
    // Per-question defaults.
    expect(parsed.questions[0]?.required).toBe(true);
    expect(parsed.distances[0]?.hiddenDefault).toBe(0);
  });

  it("defaults `distances` to an empty array when omitted", () => {
    const raw = baseDefinition();
    const parsed = quoteCalculatorDefinitionSchema.parse({
      ...raw,
      distances: undefined,
      formula: "bedrooms * move_type",
    });
    expect(parsed.distances).toEqual([]);
  });
});

// ─── Variable names ─────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — variable names", () => {
  it("rejects the same variable name on two questions", () => {
    const raw = baseDefinition();
    raw.questions[1] = { ...raw.questions[1]!, variableName: "move_type" };
    raw.formula = "move_type * 2";

    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("questions.1.variableName");
    expect(issues[0]?.message).toContain("Duplicate variable name");
  });

  it("rejects a distance that reuses a question's variable name", () => {
    // Questions and distances share one namespace — they land in the same
    // `variables` record the formula reads.
    const raw = baseDefinition();
    raw.distances[0] = { ...raw.distances[0]!, variableName: "bedrooms" };
    raw.formula = "bedrooms * 2";

    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("distances.0.variableName");
  });

  it("rejects a reserved formula function name", () => {
    const raw = baseDefinition();
    raw.questions[1] = { ...raw.questions[1]!, variableName: "round" };
    raw.formula = "move_type * 2";

    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("questions.1.variableName");
    expect(issues.some((i) => i.message.includes("built-in"))).toBe(true);
  });

  it("rejects a name the formula tokenizer could not read", () => {
    for (const bad of ["Bedrooms", "2rooms", "bed-rooms", "bed rooms"]) {
      const raw = baseDefinition();
      raw.questions[1] = { ...raw.questions[1]!, variableName: bad };
      raw.formula = "move_type * 2";
      expect(paths(issuesFor(raw))).toContain("questions.1.variableName");
    }
  });

  it("rejects a name longer than 30 characters", () => {
    const raw = baseDefinition();
    raw.questions[1] = { ...raw.questions[1]!, variableName: "b".repeat(31) };
    raw.formula = "move_type * 2";

    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("questions.1.variableName");
    expect(issues.some((i) => i.message.includes("30 characters"))).toBe(true);
  });
});

// ─── Ids ────────────────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — ids", () => {
  it("rejects duplicate question ids", () => {
    const raw = baseDefinition();
    raw.questions[3] = { ...raw.questions[3]!, id: "q_from" };
    expect(paths(issuesFor(raw))).toContain("questions.3.id");
  });

  it("rejects duplicate option ids inside one question", () => {
    const raw = baseDefinition();
    raw.questions[0] = {
      ...raw.questions[0]!,
      options: [
        { id: "local", label: "Local", value: 1 },
        { id: "local", label: "Cross-country", value: 1.5 },
      ],
    };
    expect(paths(issuesFor(raw))).toContain("questions.0.options.1.id");
  });
});

// ─── Show-if ────────────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — show-if", () => {
  it("accepts a backward reference to a choice question", () => {
    const raw = baseDefinition();
    raw.questions[1] = {
      ...raw.questions[1]!,
      showIf: { questionId: "q_type", optionId: "cross" },
    };
    expect(quoteCalculatorDefinitionSchema.safeParse(raw).success).toBe(true);
  });

  it("rejects a FORWARD reference", () => {
    // `resolveVisibility` runs one forward pass, so a forward reference would
    // silently resolve to "hidden" forever.
    const raw = baseDefinition();
    raw.questions[0] = {
      ...raw.questions[0]!,
      showIf: { questionId: "q_bedrooms", optionId: "local" },
    };
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("questions.0.showIf.questionId");
    expect(issues.some((i) => i.message.includes("comes before"))).toBe(true);
  });

  it("rejects a self-reference", () => {
    const raw = baseDefinition();
    raw.questions[1] = {
      ...raw.questions[1]!,
      showIf: { questionId: "q_bedrooms", optionId: "local" },
    };
    expect(paths(issuesFor(raw))).toContain("questions.1.showIf.questionId");
  });

  it("rejects a reference to a multiselect question", () => {
    const raw = baseDefinition();
    raw.questions[0] = { ...raw.questions[0]!, type: "multiselect" };
    raw.questions[1] = {
      ...raw.questions[1]!,
      showIf: { questionId: "q_type", optionId: "local" },
    };
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("questions.1.showIf.questionId");
    expect(
      issues.some((i) => i.message.includes("single-choice or dropdown")),
    ).toBe(true);
  });

  it("rejects a reference to an option that does not exist on the target", () => {
    const raw = baseDefinition();
    raw.questions[1] = {
      ...raw.questions[1]!,
      showIf: { questionId: "q_type", optionId: "teleport" },
    };
    expect(paths(issuesFor(raw))).toContain("questions.1.showIf.optionId");
  });

  it("normalizes degenerate showIf shapes to null instead of failing", () => {
    // react-hook-form materializes registered nested paths, so an untouched
    // "Only show when…" can reach the schema as an empty object rather than
    // null. That must parse as "always shown", not error — and definitely not
    // read as "hidden behind a nonexistent question" downstream.
    const degenerates: unknown[] = [
      { questionId: undefined, optionId: undefined },
      { questionId: "", optionId: "" },
      {},
    ];
    for (const degenerate of degenerates) {
      const raw = baseDefinition();
      raw.questions[1] = {
        ...raw.questions[1]!,
        showIf: degenerate as never,
      };
      const parsed = quoteCalculatorDefinitionSchema.safeParse(raw);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.questions[1]?.showIf ?? null).toBeNull();
      }
    }
  });
});

// ─── Distances ──────────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — distances", () => {
  it("rejects a distance endpoint that is not a zip question", () => {
    const raw = baseDefinition();
    raw.distances[0] = { ...raw.distances[0]!, fromQuestionId: "q_bedrooms" };
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("distances.0.fromQuestionId");
    expect(issues.some((i) => i.message.includes("not a ZIP"))).toBe(true);
  });

  it("rejects a distance endpoint that does not exist", () => {
    const raw = baseDefinition();
    raw.distances[0] = { ...raw.distances[0]!, toQuestionId: "q_nowhere" };
    expect(paths(issuesFor(raw))).toContain("distances.0.toQuestionId");
  });

  it("rejects a distance between a question and itself", () => {
    const raw = baseDefinition();
    raw.distances[0] = { ...raw.distances[0]!, toQuestionId: "q_from" };
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("distances.0.toQuestionId");
    expect(issues.some((i) => i.message.includes("two different"))).toBe(true);
  });
});

// ─── Formula ────────────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — formula", () => {
  it("rejects a formula that references an undefined variable, at path ['formula']", () => {
    const raw = baseDefinition();
    raw.formula = "bedrooms * bathroms";

    const issues = issuesFor(raw);
    const formulaIssue = issues.find((i) => i.path.join(".") === "formula");
    expect(formulaIssue).toBeDefined();
    expect(formulaIssue?.path).toEqual(["formula"]);
    expect(formulaIssue?.message).toContain('"bathroms"');
  });

  it("reports a syntax error against ['formula'] with the parser's message", () => {
    const raw = baseDefinition();
    raw.formula = "bedrooms * ";

    const issues = issuesFor(raw);
    const formulaIssue = issues.find((i) => i.path.join(".") === "formula");
    expect(formulaIssue).toBeDefined();
    expect(formulaIssue?.message).toContain("position");
  });

  it("rejects an unknown function", () => {
    const raw = baseDefinition();
    raw.formula = "sqrt(bedrooms)";
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("formula");
  });

  it("accepts a constant formula that references nothing", () => {
    const raw = baseDefinition();
    raw.formula = "round(1200 / 2)";
    expect(quoteCalculatorDefinitionSchema.safeParse(raw).success).toBe(true);
  });
});

// ─── Public projection (security contract) ──────────────────────────────────

describe("toPublicCalculatorDefinition", () => {
  const definition = quoteCalculatorDefinitionSchema.parse({
    ...baseDefinition(),
    showEstimateToCustomer: true,
    displayAsRange: true,
    rangePaddingPercent: 20,
    requirePhone: true,
    responseDays: 3,
    thankYouMessage: "We'll be in touch.",
  });
  const publicDefinition = toPublicCalculatorDefinition(definition);
  const json = JSON.stringify(publicDefinition);

  it("keeps only the four presentation settings the runner needs", () => {
    expect(Object.keys(publicDefinition).sort()).toEqual([
      "questions",
      "requirePhone",
      "responseDays",
      "showEstimateToCustomer",
      "thankYouMessage",
    ]);
    expect(publicDefinition.showEstimateToCustomer).toBe(true);
    expect(publicDefinition.requirePhone).toBe(true);
    expect(publicDefinition.responseDays).toBe(3);
    expect(publicDefinition.thankYouMessage).toBe("We'll be in touch.");
  });

  it("does not serialize the formula", () => {
    expect(json).not.toContain("formula");
    expect(json).not.toContain("350");
  });

  it("does not serialize the distances list", () => {
    expect(json).not.toContain("distances");
    expect(json).not.toContain("miles");
    expect(json).not.toContain("fromQuestionId");
  });

  it("does not serialize any option value", () => {
    expect(json).not.toContain('"value"');
    // The option values in the fixture are 1 and 1.5 — the decimal one is the
    // detectable canary.
    expect(json).not.toContain("1.5");
  });

  it("does not serialize any hiddenDefault", () => {
    expect(json).not.toContain("hiddenDefault");
  });

  it("does not serialize the range presentation settings", () => {
    expect(json).not.toContain("displayAsRange");
    expect(json).not.toContain("rangePaddingPercent");
  });

  it("exposes exactly the allowlisted keys per question type", () => {
    const [choice, numberQuestion, zip] = publicDefinition.questions;

    expect(Object.keys(choice ?? {}).sort()).toEqual([
      "description",
      "id",
      "options",
      "required",
      "showIf",
      "title",
      "type",
    ]);
    expect(Object.keys(choice?.options?.[0] ?? {}).sort()).toEqual([
      "icon",
      "id",
      "label",
    ]);

    expect(Object.keys(numberQuestion ?? {}).sort()).toEqual([
      "description",
      "id",
      "max",
      "min",
      "required",
      "showIf",
      "title",
      "type",
      "unitLabel",
    ]);

    expect(Object.keys(zip ?? {}).sort()).toEqual([
      "description",
      "id",
      "required",
      "showIf",
      "title",
      "type",
    ]);
  });

  it("still carries what the runner needs to render and branch", () => {
    const [choice] = publicDefinition.questions;
    expect(choice?.title).toBe("Kind of move");
    expect(choice?.options?.map((option) => option.id)).toEqual([
      "local",
      "cross",
    ]);
    expect(choice?.options?.map((option) => option.label)).toEqual([
      "Local",
      "Cross-country",
    ]);
  });
});

// ─── Wire schema (what an anonymous visitor may post) ───────────────────────

/**
 * `quoteSubmitSchema` is the outermost gate on the one write path a stranger
 * can reach. Everything here is a bound, and every bound is load-bearing: the
 * values ride into a Postgres `Int` column and into the owner's inbox, and the
 * strings are parsed and compared against the stored definition before
 * anything downstream can reject them.
 */
describe("quoteSubmitSchema — visitor-supplied bounds", () => {
  function submission(overrides: Record<string, unknown> = {}) {
    return {
      calculatorId: "calc_1",
      answers: [{ questionId: "q_1", number: 3 }],
      contactName: "Ada",
      contactEmail: "ada@example.com",
      captchaToken: "token",
      ...overrides,
    };
  }

  it("accepts an ordinary submission", () => {
    expect(quoteSubmitSchema.safeParse(submission()).success).toBe(true);
  });

  it("rejects a number large enough to overflow the estimateCents column", () => {
    // 1e10 units × any per-unit rate is already past int4 in cents. The write
    // would fail inside `quoteSubmission.create` with a raw Prisma error
    // serialized straight to the visitor — after the captcha, after the
    // tenant lookup, and instead of the lead.
    const result = quoteSubmitSchema.safeParse(
      submission({ answers: [{ questionId: "q_1", number: 1e10 }] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects the same magnitude in the negative direction", () => {
    const result = quoteSubmitSchema.safeParse(
      submission({ answers: [{ questionId: "q_1", number: -1e10 }] }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts the boundary value in both directions", () => {
    for (const number of [QUOTE_MAX_ANSWER_NUMBER, -QUOTE_MAX_ANSWER_NUMBER]) {
      const result = quoteSubmitSchema.safeParse(
        submission({ answers: [{ questionId: "q_1", number }] }),
      );
      expect(result.success).toBe(true);
    }
  });

  it("still rejects a non-finite number", () => {
    for (const number of [Infinity, -Infinity, NaN]) {
      const result = quoteSubmitSchema.safeParse(
        submission({ answers: [{ questionId: "q_1", number }] }),
      );
      expect(result.success).toBe(false);
    }
  });

  it("bounds every id string a visitor can post", () => {
    const tooLong = "x".repeat(QUOTE_ID_MAX_LENGTH + 1);

    // calculatorId
    expect(
      quoteSubmitSchema.safeParse(submission({ calculatorId: tooLong }))
        .success,
    ).toBe(false);

    // questionId
    expect(
      quoteSubmitSchema.safeParse(
        submission({ answers: [{ questionId: tooLong }] }),
      ).success,
    ).toBe(false);

    // optionId
    expect(
      quoteSubmitSchema.safeParse(
        submission({ answers: [{ questionId: "q_1", optionId: tooLong }] }),
      ).success,
    ).toBe(false);

    // every string inside optionIds
    expect(
      quoteSubmitSchema.safeParse(
        submission({
          answers: [{ questionId: "q_1", optionIds: ["ok", tooLong] }],
        }),
      ).success,
    ).toBe(false);
  });

  it("accepts ids at exactly the cap, so real cuids are never turned away", () => {
    const atCap = "c".repeat(QUOTE_ID_MAX_LENGTH);
    const result = quoteSubmitSchema.safeParse(
      submission({
        calculatorId: atCap,
        answers: [{ questionId: atCap, optionIds: [atCap] }],
      }),
    );
    expect(result.success).toBe(true);
  });
});

// ─── Admin vocabulary ───────────────────────────────────────────────────────

describe("admin filter/sort tuples", () => {
  it("derives the status filter tuple from the DB tuple so they cannot drift", () => {
    expect(QUOTE_STATUS_FILTER_VALUES).toEqual([
      "all",
      ...QUOTE_STATUS_VALUES_DB,
    ]);
  });
});
