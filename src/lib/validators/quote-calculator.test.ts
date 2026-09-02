import type { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  migrateQuoteDefinition,
  parseStoredQuoteDefinition,
  QUOTE_ID_MAX_LENGTH,
  QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT,
  QUOTE_MAX_ANSWER_NUMBER,
  QUOTE_MAX_QUESTIONS,
  QUOTE_MAX_QUESTIONS_PER_SCREEN,
  QUOTE_MAX_TABS,
  QUOTE_STATUS_FILTER_VALUES,
  QUOTE_STATUS_VALUES_DB,
  quoteCalculatorDefinitionSchema,
  quoteFormulaSnapshotSchema,
  quotePreviewEstimateSchema,
  quoteSendFinalQuoteSchema,
  quoteSubmissionAnswerSchema,
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
 * asserted, not just the rejection. Since v2 those paths run through the screen
 * that holds the question (`screens.0.questions.1.variableName`), while the
 * ORDERING rules still measure against the flattened list — the two axes are
 * separate on purpose, and several tests below pin exactly that.
 */

/**
 * A minimal definition that passes every rule; each test bends one thing.
 *
 * Deliberately typed as loose records rather than letting TypeScript infer a
 * discriminated union from the literal: these fixtures are INPUT to
 * `safeParse`, and most tests work by putting something invalid in one field.
 * A precise input type would reject the invalid fixture at compile time and
 * there would be nothing left to test.
 *
 * Screen 0 holds TWO questions on purpose — a same-screen show-if is legal and
 * a same-screen forward reference is not, and neither case exists in a fixture
 * of one-question screens.
 */
type RawQuestion = Record<string, unknown>;
type RawScreen = { id: string; questions: RawQuestion[] };
type RawDistance = Record<string, unknown>;

function baseDefinition(): {
  version: 2;
  screens: RawScreen[];
  distances: RawDistance[];
  formula: string;
} {
  return {
    version: 2,
    screens: [
      {
        id: "s_basics",
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
        ],
      },
      {
        id: "s_from",
        questions: [{ id: "q_from", type: "zip", title: "Origin ZIP" }],
      },
      {
        id: "s_to",
        questions: [{ id: "q_to", type: "zip", title: "Destination ZIP" }],
      },
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

/** Replace one question in place, keeping the fixture readable at call sites. */
function patchQuestion(
  raw: { screens: RawScreen[] },
  screenIndex: number,
  questionIndex: number,
  patch: RawQuestion,
): void {
  const screen = raw.screens[screenIndex]!;
  screen.questions[questionIndex] = {
    ...screen.questions[questionIndex]!,
    ...patch,
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

/** A copy of `source` with one key dropped — for "what if this is missing?". */
function omitKey<T extends object>(source: T, key: keyof T): Partial<T> {
  const copy: Partial<T> = { ...source };
  delete copy[key];
  return copy;
}

// ─── Happy path ─────────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — happy path", () => {
  it("accepts a well-formed definition and applies defaults", () => {
    const parsed = quoteCalculatorDefinitionSchema.parse(baseDefinition());
    expect(parsed.screens).toHaveLength(3);
    expect(parsed.screens[0]?.questions).toHaveLength(2);
    expect(parsed.showEstimateToCustomer).toBe(false);
    expect(parsed.displayAsRange).toBe(false);
    expect(parsed.rangePaddingPercent).toBe(10);
    expect(parsed.requirePhone).toBe(false);
    expect(parsed.responseDays).toBe(1);
    expect(parsed.thankYouMessage).toBe("Thanks! We received your request.");
    // v2 additions. `showReviewStep` defaults ON for anything built from here
    // on; only the v1 migration opts out (see the migration describe below).
    expect(parsed.showReviewStep).toBe(true);
    expect(parsed.showLiveEstimate).toBe(false);
    expect(parsed.liveEstimateDisclaimer).toBe(
      QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT,
    );
    // Per-question defaults.
    expect(parsed.screens[0]?.questions[0]?.required).toBe(true);
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

  it("rejects a v1 definition outright — writes are v2 only", () => {
    // The strict schema is what `create`/`update` and the builder form use. A
    // v1 blob reaching it is a read path that forgot `parseStoredQuoteDefinition`.
    const result = quoteCalculatorDefinitionSchema.safeParse({
      version: 1,
      questions: [{ id: "q", type: "text", title: "Anything" }],
      distances: [],
      formula: "100",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Screens ────────────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — screens", () => {
  it("rejects a screen with no questions, at that screen's path", () => {
    const raw = baseDefinition();
    raw.screens[1]!.questions = [];
    expect(paths(issuesFor(raw))).toContain("screens.1.questions");
  });

  it("rejects a calculator with no screens at all", () => {
    const raw = baseDefinition();
    raw.screens = [];
    expect(paths(issuesFor(raw))).toContain("screens");
  });

  it("rejects more than the per-screen question cap", () => {
    const raw = baseDefinition();
    raw.screens[0]!.questions = Array.from(
      { length: QUOTE_MAX_QUESTIONS_PER_SCREEN + 1 },
      (_, index) => ({ id: `q_${index}`, type: "text", title: `Q${index}` }),
    );
    raw.formula = "miles";
    expect(paths(issuesFor(raw))).toContain("screens.0.questions");
  });

  it("rejects more than 30 questions in total, at ['screens']", () => {
    // Under the per-screen cap on every screen, over the total across them —
    // the one bound no single array can express.
    const raw = baseDefinition();
    raw.screens = Array.from({ length: 4 }, (_, screenIndex) => ({
      id: `s_${screenIndex}`,
      questions: Array.from({ length: 8 }, (_, questionIndex) => ({
        id: `q_${screenIndex}_${questionIndex}`,
        type: "text",
        title: `Question ${screenIndex}.${questionIndex}`,
      })),
    }));
    raw.distances = [];
    raw.formula = "100";

    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("screens");
    expect(
      issues.some((issue) =>
        issue.message.includes(`at most ${QUOTE_MAX_QUESTIONS} questions`),
      ),
    ).toBe(true);
  });

  it("rejects duplicate screen ids", () => {
    const raw = baseDefinition();
    raw.screens[2]!.id = "s_from";
    expect(paths(issuesFor(raw))).toContain("screens.2.id");
  });

  it("accepts an owner-written screen heading and intro", () => {
    const raw = {
      ...baseDefinition(),
      screens: baseDefinition().screens.map((screen, index) =>
        index === 0
          ? { ...screen, title: "The basics", description: "Two quick ones." }
          : screen,
      ),
    };
    const parsed = quoteCalculatorDefinitionSchema.parse(raw);
    expect(parsed.screens[0]?.title).toBe("The basics");
    expect(parsed.screens[0]?.description).toBe("Two quick ones.");
  });
});

// ─── Variable names ─────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — variable names", () => {
  it("rejects the same variable name on two questions", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 0, 1, { variableName: "move_type" });
    raw.formula = "move_type * 2";

    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("screens.0.questions.1.variableName");
    expect(issues[0]?.message).toContain("Duplicate variable name");
  });

  it("rejects a duplicate variable name across two different screens", () => {
    // The namespace is the whole calculator, not the screen — both names land
    // in the same `variables` record the formula reads.
    const raw = baseDefinition();
    raw.screens[1]!.questions[0] = {
      id: "q_sqft",
      type: "number",
      title: "Square feet",
      variableName: "bedrooms",
    };
    raw.distances = [];
    raw.formula = "bedrooms * 2";

    expect(paths(issuesFor(raw))).toContain(
      "screens.1.questions.0.variableName",
    );
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
    patchQuestion(raw, 0, 1, { variableName: "round" });
    raw.formula = "move_type * 2";

    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("screens.0.questions.1.variableName");
    expect(issues.some((i) => i.message.includes("built-in"))).toBe(true);
  });

  it("rejects a name the formula tokenizer could not read", () => {
    for (const bad of ["Bedrooms", "2rooms", "bed-rooms", "bed rooms"]) {
      const raw = baseDefinition();
      patchQuestion(raw, 0, 1, { variableName: bad });
      raw.formula = "move_type * 2";
      expect(paths(issuesFor(raw))).toContain(
        "screens.0.questions.1.variableName",
      );
    }
  });

  it("rejects a name longer than 30 characters", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 0, 1, { variableName: "b".repeat(31) });
    raw.formula = "move_type * 2";

    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("screens.0.questions.1.variableName");
    expect(issues.some((i) => i.message.includes("30 characters"))).toBe(true);
  });
});

// ─── Ids ────────────────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — ids", () => {
  it("rejects duplicate question ids across screens", () => {
    const raw = baseDefinition();
    raw.screens[2]!.questions[0] = {
      ...raw.screens[2]!.questions[0]!,
      id: "q_from",
    };
    expect(paths(issuesFor(raw))).toContain("screens.2.questions.0.id");
  });

  it("rejects duplicate question ids inside one screen", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 0, 1, { id: "q_type" });
    expect(paths(issuesFor(raw))).toContain("screens.0.questions.1.id");
  });

  it("rejects duplicate option ids inside one question", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 0, 0, {
      options: [
        { id: "local", label: "Local", value: 1 },
        { id: "local", label: "Cross-country", value: 1.5 },
      ],
    });
    expect(paths(issuesFor(raw))).toContain(
      "screens.0.questions.0.options.1.id",
    );
  });
});

// ─── Show-if ────────────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — show-if", () => {
  it("accepts a backward reference to a choice question on an EARLIER screen", () => {
    const raw = baseDefinition();
    raw.screens[1]!.questions[0] = {
      ...raw.screens[1]!.questions[0]!,
      showIf: { questionId: "q_type", optionId: "cross" },
    };
    expect(quoteCalculatorDefinitionSchema.safeParse(raw).success).toBe(true);
  });

  it("accepts a backward reference to an earlier question on the SAME screen", () => {
    // This is the whole point of multi-question screens: a live reveal within
    // one step. "Backward" is measured on the flattened list, not per screen.
    const raw = baseDefinition();
    patchQuestion(raw, 0, 1, {
      showIf: { questionId: "q_type", optionId: "cross" },
    });
    expect(quoteCalculatorDefinitionSchema.safeParse(raw).success).toBe(true);
  });

  it("rejects a FORWARD reference on the same screen", () => {
    // `resolveVisibility` runs one forward pass, so a forward reference would
    // silently resolve to "hidden" forever — same-screen or not.
    const raw = baseDefinition();
    patchQuestion(raw, 0, 0, {
      showIf: { questionId: "q_bedrooms", optionId: "local" },
    });
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("screens.0.questions.0.showIf.questionId");
    expect(issues.some((i) => i.message.includes("comes before"))).toBe(true);
  });

  it("rejects a FORWARD reference to a later screen", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 0, 0, {
      showIf: { questionId: "q_from", optionId: "local" },
    });
    expect(paths(issuesFor(raw))).toContain(
      "screens.0.questions.0.showIf.questionId",
    );
  });

  it("rejects a self-reference", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 0, 1, {
      showIf: { questionId: "q_bedrooms", optionId: "local" },
    });
    expect(paths(issuesFor(raw))).toContain(
      "screens.0.questions.1.showIf.questionId",
    );
  });

  it("rejects a reference to a multiselect question", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 0, 0, { type: "multiselect" });
    patchQuestion(raw, 0, 1, {
      showIf: { questionId: "q_type", optionId: "local" },
    });
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("screens.0.questions.1.showIf.questionId");
    expect(
      issues.some((i) => i.message.includes("single-choice or dropdown")),
    ).toBe(true);
  });

  it("rejects a reference to an option that does not exist on the target", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 0, 1, {
      showIf: { questionId: "q_type", optionId: "teleport" },
    });
    expect(paths(issuesFor(raw))).toContain(
      "screens.0.questions.1.showIf.optionId",
    );
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
      patchQuestion(raw, 0, 1, { showIf: degenerate });
      const parsed = quoteCalculatorDefinitionSchema.safeParse(raw);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.screens[0]?.questions[1]?.showIf ?? null).toBeNull();
      }
    }
  });
});

// ─── Distances ──────────────────────────────────────────────────────────────

describe("quoteCalculatorDefinitionSchema — distances", () => {
  it("rejects a distance endpoint that is not a location question", () => {
    const raw = baseDefinition();
    raw.distances[0] = { ...raw.distances[0]!, fromQuestionId: "q_bedrooms" };
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("distances.0.fromQuestionId");
    expect(
      issues.some((i) => i.message.includes("not a ZIP code or address")),
    ).toBe(true);
  });

  it("accepts an ADDRESS question as a distance endpoint", () => {
    // The address type is informational, but its ZIP half resolves to
    // coordinates exactly like a bare zip question does.
    const raw = baseDefinition();
    raw.screens[1]!.questions[0] = {
      id: "q_from",
      type: "address",
      title: "Where are you moving from?",
    };
    expect(quoteCalculatorDefinitionSchema.safeParse(raw).success).toBe(true);
  });

  it("rejects a distance endpoint that does not exist", () => {
    const raw = baseDefinition();
    raw.distances[0] = { ...raw.distances[0]!, toQuestionId: "q_nowhere" };
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("distances.0.toQuestionId");
    expect(
      issues.some((i) => i.message === "Pick a ZIP code or address question"),
    ).toBe(true);
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

// ─── v1 → v2 migration (the drift wall) ─────────────────────────────────────

/**
 * v1 blobs are NOT rewritten in place — a calculator only becomes v2 the next
 * time its owner saves it, and some never will be. `migrateQuoteDefinition` is
 * therefore permanent, and `parseStoredQuoteDefinition` is the only safe way to
 * read a stored definition.
 */
describe("migrateQuoteDefinition", () => {
  function v1Definition() {
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
        },
      ],
      distances: [],
      formula: "bedrooms * move_type",
      thankYouMessage: "Thanks!",
    };
  }

  it("wraps each v1 question in its own screen, 1:1, preserving order", () => {
    const migrated = migrateQuoteDefinition(v1Definition()) as {
      version: number;
      screens: { id: string; questions: { id: string }[] }[];
      questions?: unknown;
    };

    expect(migrated.version).toBe(2);
    expect(migrated.questions).toBeUndefined();
    expect(migrated.screens).toHaveLength(2);
    expect(migrated.screens.map((screen) => screen.id)).toEqual([
      "screen_q_type",
      "screen_q_bedrooms",
    ]);
    expect(
      migrated.screens.map((screen) => screen.questions.map((q) => q.id)),
    ).toEqual([["q_type"], ["q_bedrooms"]]);
  });

  it("keeps the review step OFF, unlike the v2 default", () => {
    // An existing calculator must not silently grow a step its owner never
    // chose. New calculators get `true`; migrated ones keep today's flow.
    const migrated = migrateQuoteDefinition(v1Definition()) as {
      showReviewStep: boolean;
      showLiveEstimate: boolean;
      liveEstimateDisclaimer: string;
    };
    expect(migrated.showReviewStep).toBe(false);
    expect(migrated.showLiveEstimate).toBe(false);
    expect(migrated.liveEstimateDisclaimer).toBe(
      QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT,
    );
  });

  it("carries every other top-level field through untouched", () => {
    const migrated = migrateQuoteDefinition(v1Definition()) as {
      formula: string;
      distances: unknown[];
      thankYouMessage: string;
    };
    expect(migrated.formula).toBe("bedrooms * move_type");
    expect(migrated.distances).toEqual([]);
    expect(migrated.thankYouMessage).toBe("Thanks!");
  });

  it("is deterministic — the same blob migrates to the same ids every time", () => {
    // Screen ids are derived, never random: React keys and the builder's
    // open-card state would churn on every read otherwise.
    expect(migrateQuoteDefinition(v1Definition())).toEqual(
      migrateQuoteDefinition(v1Definition()),
    );
  });

  it("is idempotent — running it on a v2 blob changes nothing", () => {
    const once = migrateQuoteDefinition(v1Definition());
    expect(migrateQuoteDefinition(once)).toEqual(once);

    const v2 = baseDefinition();
    expect(migrateQuoteDefinition(v2)).toEqual(v2);
  });

  it("returns anything unrecognizable untouched rather than throwing", () => {
    for (const junk of [null, undefined, 42, "nope", [], { version: 3 }]) {
      expect(migrateQuoteDefinition(junk)).toEqual(junk);
    }
    // v1 marker without the questions array is not v1 enough to migrate.
    expect(migrateQuoteDefinition({ version: 1 })).toEqual({ version: 1 });
  });
});

describe("parseStoredQuoteDefinition", () => {
  it("accepts a stored v1 definition and hands back a v2 one", () => {
    const parsed = parseStoredQuoteDefinition({
      version: 1,
      questions: [
        {
          id: "q_size",
          type: "number",
          title: "Square feet",
          variableName: "sqft",
        },
      ],
      distances: [],
      formula: "sqft * 2",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.version).toBe(2);
    expect(parsed.data.screens).toHaveLength(1);
    expect(parsed.data.screens[0]?.questions[0]?.id).toBe("q_size");
    expect(parsed.data.showReviewStep).toBe(false);
  });

  it("accepts a v2 definition unchanged", () => {
    const parsed = parseStoredQuoteDefinition(baseDefinition());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.showReviewStep).toBe(true);
  });

  it("still enforces every cross-field rule after migrating", () => {
    // Migration must not become an escape hatch: a v1 blob whose formula names
    // a variable nothing defines is as broken as the v2 equivalent.
    const parsed = parseStoredQuoteDefinition({
      version: 1,
      questions: [{ id: "q_note", type: "text", title: "Notes" }],
      distances: [],
      formula: "sqft * 2",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects garbage", () => {
    for (const junk of [null, undefined, "{}", 7, [], {}]) {
      expect(parseStoredQuoteDefinition(junk).success).toBe(false);
    }
  });
});

// ─── Public projection (security contract) ──────────────────────────────────

describe("toPublicCalculatorDefinition", () => {
  const definition = quoteCalculatorDefinitionSchema.parse({
    ...baseDefinition(),
    showEstimateToCustomer: true,
    showLiveEstimate: true,
    displayAsRange: true,
    rangePaddingPercent: 20,
    requirePhone: true,
    responseDays: 3,
    thankYouMessage: "We'll be in touch.",
  });
  const publicDefinition = toPublicCalculatorDefinition(definition);
  const json = JSON.stringify(publicDefinition);

  it("keeps only the presentation settings the runner needs", () => {
    expect(Object.keys(publicDefinition).sort()).toEqual([
      "estimateByEmail",
      "liveEstimateDisclaimer",
      "requirePhone",
      "responseDays",
      "screens",
      "showEstimateToCustomer",
      "showLiveEstimate",
      "showReviewStep",
      "tabs",
      "tabsPrompt",
      "thankYouMessage",
    ]);
    expect(publicDefinition.showEstimateToCustomer).toBe(true);
    expect(publicDefinition.showReviewStep).toBe(true);
    expect(publicDefinition.requirePhone).toBe(true);
    expect(publicDefinition.responseDays).toBe(3);
    expect(publicDefinition.thankYouMessage).toBe("We'll be in touch.");
  });

  it("projects screens, and no flat `questions` copy alongside them", () => {
    // Two orderings of the same list is how a runner and a server end up
    // disagreeing about which question came "before" another.
    expect(publicDefinition).not.toHaveProperty("questions");
    expect(publicDefinition.screens.map((screen) => screen.id)).toEqual([
      "s_basics",
      "s_from",
      "s_to",
    ]);
    expect(publicDefinition.screens[0]?.questions).toHaveLength(2);
    expect(Object.keys(publicDefinition.screens[0] ?? {}).sort()).toEqual([
      "description",
      "id",
      "questions",
      "title",
    ]);
    // Absent headings normalize to null rather than disappearing.
    expect(publicDefinition.screens[0]?.title).toBeNull();
    expect(publicDefinition.screens[0]?.description).toBeNull();
  });

  it("projects showLiveEstimate as the EFFECTIVE value", () => {
    // A stale `showLiveEstimate: true` left behind after the owner hid the
    // estimate must not re-expose the price through the preview endpoint.
    expect(publicDefinition.showLiveEstimate).toBe(true);

    const hidden = quoteCalculatorDefinitionSchema.parse({
      ...baseDefinition(),
      showEstimateToCustomer: false,
      showLiveEstimate: true,
    });
    expect(toPublicCalculatorDefinition(hidden).showLiveEstimate).toBe(false);
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
    const [choice, numberQuestion] =
      publicDefinition.screens[0]?.questions ?? [];
    const [zip] = publicDefinition.screens[1]?.questions ?? [];

    expect(Object.keys(choice ?? {}).sort()).toEqual([
      "description",
      "id",
      "options",
      "required",
      "showIf",
      "tabIds",
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
      "tabIds",
      "title",
      "type",
      "unitLabel",
    ]);

    expect(Object.keys(zip ?? {}).sort()).toEqual([
      "description",
      "id",
      "required",
      "showIf",
      "tabIds",
      "title",
      "type",
    ]);
  });

  it("projects an address question as the base shape only", () => {
    const raw = baseDefinition();
    raw.screens[1]!.questions[0] = {
      id: "q_from",
      type: "address",
      title: "Where from?",
    };
    const withAddress = toPublicCalculatorDefinition(
      quoteCalculatorDefinitionSchema.parse(raw),
    );
    const [address] = withAddress.screens[1]?.questions ?? [];
    expect(address?.type).toBe("address");
    expect(Object.keys(address ?? {}).sort()).toEqual([
      "description",
      "id",
      "required",
      "showIf",
      "tabIds",
      "title",
      "type",
    ]);
  });

  it("still carries what the runner needs to render and branch", () => {
    const [choice] = publicDefinition.screens[0]?.questions ?? [];
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

  it("accepts an optional tabId and bounds it like every other id", () => {
    // Absent for a calculator with no switcher; present, non-empty and
    // bounded for one that has tabs. The server still resolves it against the
    // stored definition — an unknown id never selects a formula.
    expect(quoteSubmitSchema.safeParse(submission()).success).toBe(true);
    expect(
      quoteSubmitSchema.safeParse(submission({ tabId: "t_com" })).success,
    ).toBe(true);
    expect(quoteSubmitSchema.safeParse(submission({ tabId: "" })).success).toBe(
      false,
    );
    expect(
      quoteSubmitSchema.safeParse(
        submission({ tabId: "x".repeat(QUOTE_ID_MAX_LENGTH + 1) }),
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

// ─── Address answers on the wire ────────────────────────────────────────────

describe("quoteWireAnswerSchema — address", () => {
  function withAddress(address: Record<string, unknown>) {
    return quoteSubmitSchema.safeParse({
      calculatorId: "calc_1",
      answers: [{ questionId: "q_addr", address }],
      contactName: "Ada",
      contactEmail: "ada@example.com",
      captchaToken: "token",
    });
  }

  const complete = {
    line1: "123 Main St",
    line2: "Apt 4",
    city: "Saginaw",
    state: "MI",
    zip: "48601",
  };

  it("accepts a complete address", () => {
    expect(withAddress(complete).success).toBe(true);
  });

  it("accepts one with no second line", () => {
    expect(withAddress(omitKey(complete, "line2")).success).toBe(true);
  });

  it("rejects a partial address — half an address is a client-side state", () => {
    for (const key of ["line1", "city", "state", "zip"] as const) {
      expect(withAddress(omitKey(complete, key)).success).toBe(false);
    }
  });

  it("rejects a state code that is not a real US state", () => {
    // Derived from `US_STATES_AND_TERRITORIES` (the same list the storefront
    // <select> renders), so anything the visitor can pick is accepted and
    // nothing else is.
    for (const state of ["XX", "ZZ", "mi", "M", "MIC", ""]) {
      expect(withAddress({ ...complete, state }).success).toBe(false);
    }
    expect(withAddress({ ...complete, state: "DC" }).success).toBe(true);
  });

  it("accepts a US territory state code — quote addresses cover PR/VI/GU/AS/MP", () => {
    expect(
      withAddress({ ...complete, city: "San Juan", state: "PR", zip: "00901" })
        .success,
    ).toBe(true);
  });

  it("rejects a malformed ZIP", () => {
    for (const zip of ["486", "486011", "4860a", ""]) {
      expect(withAddress({ ...complete, zip }).success).toBe(false);
    }
  });

  it("bounds the free-text lines", () => {
    expect(withAddress({ ...complete, line1: "x".repeat(121) }).success).toBe(
      false,
    );
    expect(withAddress({ ...complete, line2: "x".repeat(121) }).success).toBe(
      false,
    );
    expect(withAddress({ ...complete, city: "x".repeat(81) }).success).toBe(
      false,
    );
    expect(withAddress({ ...complete, line1: "" }).success).toBe(false);
  });
});

// ─── Live preview input ─────────────────────────────────────────────────────

describe("quotePreviewEstimateSchema", () => {
  it("takes the answers and nothing else — no contact details, no captcha", () => {
    const parsed = quotePreviewEstimateSchema.safeParse({
      calculatorId: "calc_1",
      answers: [{ questionId: "q_1", number: 3 }],
      contactName: "Ada",
      captchaToken: "token",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(Object.keys(parsed.data).sort()).toEqual([
      "answers",
      "calculatorId",
    ]);
  });

  it("carries the tab the visitor is standing on", () => {
    // Picked, not omitted: a running estimate priced against the root formula
    // while the visitor sits on a tab that overrides it shows a number from
    // the wrong half of the business, all the way to the last screen.
    const parsed = quotePreviewEstimateSchema.safeParse({
      calculatorId: "calc_1",
      tabId: "t_com",
      answers: [{ questionId: "q_1", number: 3 }],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.tabId).toBe("t_com");
    expect(
      quotePreviewEstimateSchema.safeParse({
        calculatorId: "calc_1",
        tabId: "",
        answers: [],
      }).success,
    ).toBe(false);
  });

  it("inherits the submit path's bounds verbatim", () => {
    // Derived with `.pick()` rather than restated, so an endpoint hit on every
    // answer change cannot be looser than the one hit once per lead.
    expect(
      quotePreviewEstimateSchema.safeParse({
        calculatorId: "calc_1",
        answers: [{ questionId: "q_1", number: 1e10 }],
      }).success,
    ).toBe(false);

    expect(
      quotePreviewEstimateSchema.safeParse({
        calculatorId: "calc_1",
        answers: Array.from({ length: 31 }, (_, i) => ({
          questionId: `q_${i}`,
        })),
      }).success,
    ).toBe(false);
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

// ─── Estimate delivery, road factor, date bounds ────────────────────────────

describe("definition defaults added after v2 shipped", () => {
  /**
   * Every one of these defaults has to be the NO-OP, because they are applied
   * on READ: a stored calculator is re-parsed on every load, so a default that
   * changed behavior would silently reprice or re-route calculators whose
   * owners never touched a setting. This test is the guard on that.
   */
  it("defaults to today's behavior for a definition that sets none of them", () => {
    const parsed = quoteCalculatorDefinitionSchema.parse(baseDefinition());
    expect(parsed.showEstimateOnScreen).toBe(true);
    expect(parsed.sendConfirmationEmail).toBe(true);
    expect(parsed.distances[0]?.roadFactor).toBe(1);
  });

  it("defaults a definition with no tabs to no switcher at all", () => {
    // Tabs are a fork in the flow. A stored calculator that predates them has
    // no `tabs`, no `tabsPrompt` and no `tabIds` anywhere, and must come out
    // asking every question exactly as it did before the field existed — an
    // empty `tabIds` means "every tab", which for a calculator with none means
    // "always shown".
    const parsed = quoteCalculatorDefinitionSchema.parse(baseDefinition());
    expect(parsed.tabs).toEqual([]);
    expect(parsed.tabsPrompt).toBe("");
    for (const screen of parsed.screens) {
      for (const question of screen.questions) {
        expect(question.tabIds).toEqual([]);
      }
    }
  });

  it("applies the tab defaults to a migrated v1 blob too", () => {
    const parsed = parseStoredQuoteDefinition({
      version: 1,
      questions: [
        { id: "q_size", type: "number", title: "Sq ft", variableName: "sqft" },
      ],
      distances: [],
      formula: "sqft * 2",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.tabs).toEqual([]);
    expect(parsed.data.tabsPrompt).toBe("");
    expect(parsed.data.screens[0]?.questions[0]?.tabIds).toEqual([]);
  });

  it("defaults date questions to unbounded", () => {
    const raw = baseDefinition();
    raw.screens[0]!.questions.push({
      id: "q_when",
      type: "date",
      title: "Preferred date",
    });
    const parsed = quoteCalculatorDefinitionSchema.parse(raw);
    const question = parsed.screens[0]?.questions[2];
    expect(question?.type).toBe("date");
    if (question?.type !== "date") return;
    expect(question.minDate).toBe("none");
    expect(question.maxDaysAhead ?? null).toBeNull();
  });

  it("applies the same no-op defaults when migrating a v1 blob", () => {
    // A v1 calculator has none of these keys and must come out quoting
    // exactly what it quoted yesterday.
    const parsed = parseStoredQuoteDefinition({
      version: 1,
      questions: [
        { id: "q_from", type: "zip", title: "From" },
        { id: "q_to", type: "zip", title: "To" },
      ],
      distances: [
        {
          id: "d",
          variableName: "miles",
          fromQuestionId: "q_from",
          toQuestionId: "q_to",
        },
      ],
      formula: "miles * 4",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.showEstimateOnScreen).toBe(true);
    expect(parsed.data.sendConfirmationEmail).toBe(true);
    expect(parsed.data.distances[0]?.roadFactor).toBe(1);
  });

  it("bounds roadFactor to a plausible detour", () => {
    for (const roadFactor of [0.9, 2.1]) {
      const raw = baseDefinition();
      raw.distances[0] = { ...raw.distances[0]!, roadFactor };
      expect(quoteCalculatorDefinitionSchema.safeParse(raw).success).toBe(
        false,
      );
    }
    const raw = baseDefinition();
    raw.distances[0] = { ...raw.distances[0]!, roadFactor: 1.25 };
    expect(
      quoteCalculatorDefinitionSchema.parse(raw).distances[0]?.roadFactor,
    ).toBe(1.25);
  });

  it("bounds maxDaysAhead to a scheduling horizon", () => {
    for (const maxDaysAhead of [0, 731, 1.5]) {
      const raw = baseDefinition();
      raw.screens[0]!.questions.push({
        id: "q_when",
        type: "date",
        title: "Preferred date",
        maxDaysAhead,
      });
      expect(quoteCalculatorDefinitionSchema.safeParse(raw).success).toBe(
        false,
      );
    }
  });
});

// ─── Tabs ───────────────────────────────────────────────────────────────────

type RawTab = Record<string, unknown>;

/**
 * The base fixture plus a Commercial/Residential switcher.
 *
 * Labels avoid every word the projection tests scan the serialized output for
 * ("formula", "miles", "distances", "1.5"), because the same fixture is
 * projected further down and a canary that matches a tab LABEL would pass for
 * the wrong reason.
 */
function tabbedDefinition(tabs?: RawTab[]) {
  return {
    ...baseDefinition(),
    tabsPrompt: "What kind of job is this?",
    tabs: tabs ?? [
      { id: "t_res", label: "Residential" },
      { id: "t_com", label: "Commercial" },
    ],
  };
}

describe("quoteCalculatorDefinitionSchema — tabs (read AND write)", () => {
  /**
   * Every rule in this block runs on both schemas, because breaking one leaves
   * a definition that cannot be PRICED: `computeQuote` would have to guess
   * which of two same-id tabs the visitor meant, or evaluate an override that
   * names a variable no question defines. That is the same class as the root
   * formula's own rules, so it is enforced on read as well as on save.
   */
  it("accepts a two-tab calculator and defaults each tab's formula to null", () => {
    const parsed = quoteCalculatorDefinitionSchema.parse(tabbedDefinition());
    expect(parsed.tabs.map((tab) => tab.id)).toEqual(["t_res", "t_com"]);
    expect(parsed.tabsPrompt).toBe("What kind of job is this?");
    // No override written = price this tab with the shared root formula.
    expect(parsed.tabs[0]?.formula).toBeNull();
    expect(parsed.tabs[1]?.formula).toBeNull();
  });

  it("accepts a per-tab formula override", () => {
    const parsed = quoteCalculatorDefinitionSchema.parse(
      tabbedDefinition([
        { id: "t_res", label: "Residential" },
        { id: "t_com", label: "Commercial", formula: "bedrooms * 900" },
      ]),
    );
    expect(parsed.tabs[1]?.formula).toBe("bedrooms * 900");
  });

  it("normalizes a blank override to null on both schemas", () => {
    // An owner who opened the override box and typed nothing has not written
    // an override — and a stored `""` would price that tab at nothing.
    for (const formula of ["", "   "]) {
      const raw = tabbedDefinition([
        { id: "t_res", label: "Residential", formula },
        { id: "t_com", label: "Commercial", formula: null },
      ]);

      const written = quoteCalculatorDefinitionSchema.safeParse(raw);
      expect(written.success).toBe(true);
      if (written.success) expect(written.data.tabs[0]?.formula).toBeNull();

      const read = parseStoredQuoteDefinition(raw);
      expect(read.success).toBe(true);
      if (read.success) expect(read.data.tabs[0]?.formula).toBeNull();
    }
  });

  it("rejects duplicate tab ids on both schemas, at the second tab", () => {
    // Both `question.tabIds` and the submitted `tabId` address a tab by bare
    // id, and a tab may override the formula — so an ambiguous id is an
    // ambiguous PRICE, not just an ambiguous label.
    const raw = tabbedDefinition([
      { id: "t_res", label: "Residential" },
      { id: "t_res", label: "Commercial" },
    ]);
    expect(paths(issuesFor(raw))).toContain("tabs.1.id");
    expect(parseStoredQuoteDefinition(raw).success).toBe(false);
  });

  it("rejects an override naming a variable nothing declares, on both schemas", () => {
    const raw = tabbedDefinition([
      { id: "t_res", label: "Residential" },
      { id: "t_com", label: "Commercial", formula: "crew_hours * 120" },
    ]);
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("tabs.1.formula");
    expect(issues[0]?.message).toContain('Unknown variable "crew_hours"');
    expect(parseStoredQuoteDefinition(raw).success).toBe(false);
  });

  it("rejects an override that does not parse, at the tab's own field", () => {
    const raw = tabbedDefinition([
      { id: "t_res", label: "Residential" },
      { id: "t_com", label: "Commercial", formula: "bedrooms * * 2" },
    ]);
    expect(paths(issuesFor(raw))).toContain("tabs.1.formula");
    expect(parseStoredQuoteDefinition(raw).success).toBe(false);
  });

  it("still reports a broken override when the shared formula is broken too", () => {
    // The root-formula check returns early on a syntax error; an owner
    // mid-edit there must still see what is wrong with their tabs.
    const issues = issuesFor({
      ...tabbedDefinition([
        { id: "t_res", label: "Residential" },
        { id: "t_com", label: "Commercial", formula: "nope * 2" },
      ]),
      formula: "500 * * 2",
    });
    expect(paths(issues)).toContain("tabs.1.formula");
    expect(paths(issues)).toContain("formula");
  });

  it("caps the tab list", () => {
    const tooMany = Array.from({ length: QUOTE_MAX_TABS + 1 }, (_, i) => ({
      id: `t_${i}`,
      label: `Tab ${i}`,
    }));
    expect(paths(issuesFor(tabbedDefinition(tooMany)))).toContain("tabs");
  });

  it("keeps questions on the tabs they name", () => {
    const raw = tabbedDefinition();
    patchQuestion(raw, 0, 0, { tabIds: ["t_com"] });
    const parsed = quoteCalculatorDefinitionSchema.parse(raw);
    expect(parsed.screens[0]?.questions[0]?.tabIds).toEqual(["t_com"]);
    // Untouched questions stay on every tab.
    expect(parsed.screens[0]?.questions[1]?.tabIds).toEqual([]);
  });
});

describe("owner-configuration rules (save time only)", () => {
  /**
   * The split these tests pin: each rule here rejects a SAVE, and each one is
   * deliberately absent from the read path, because applying it there would
   * make an already-stored calculator unloadable — including in the builder
   * page the owner would have to open to fix it.
   */
  it("refuses an estimate with nowhere to go", () => {
    const issues = issuesFor({
      ...baseDefinition(),
      showEstimateToCustomer: true,
      showEstimateOnScreen: false,
      sendConfirmationEmail: false,
    });
    expect(paths(issues)).toContain("sendConfirmationEmail");
    expect(issues[0]?.message).toContain("Email-only estimates");
  });

  it("accepts email-only delivery when the confirmation email is on", () => {
    const parsed = quoteCalculatorDefinitionSchema.safeParse({
      ...baseDefinition(),
      showEstimateToCustomer: true,
      showEstimateOnScreen: false,
      sendConfirmationEmail: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("leaves the contradiction alone when the estimate is internal", () => {
    // Nothing is being promised to the visitor, so nothing is being withheld.
    const parsed = quoteCalculatorDefinitionSchema.safeParse({
      ...baseDefinition(),
      showEstimateToCustomer: false,
      showEstimateOnScreen: false,
      sendConfirmationEmail: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("refuses an optional question as a distance endpoint", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 1, 0, { required: false });
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("distances.0.fromQuestionId");
    expect(issues[0]?.message).toContain("must be a required question");
  });

  it("reports each optional endpoint against its own field", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 1, 0, { required: false });
    patchQuestion(raw, 2, 0, { required: false });
    expect(paths(issuesFor(raw))).toEqual([
      "distances.0.fromQuestionId",
      "distances.0.toQuestionId",
    ]);
  });

  it("does not double up on an endpoint that is not a location question", () => {
    // "Not a ZIP question" and "not required" would otherwise both fire on the
    // same field, and the second message is noise once the first is true.
    const raw = baseDefinition();
    raw.distances[0] = {
      ...raw.distances[0]!,
      fromQuestionId: "q_bedrooms",
    };
    const endpointPaths = paths(issuesFor(raw)).filter(
      (path) => path === "distances.0.fromQuestionId",
    );
    expect(endpointPaths).toHaveLength(1);
  });

  it("refuses an inverted number range, against `max`", () => {
    const raw = baseDefinition();
    patchQuestion(raw, 0, 1, { min: 10, max: 2 });
    const issues = issuesFor(raw);
    expect(paths(issues)).toEqual(["screens.0.questions.1.max"]);
    expect(issues[0]?.message).toBe("Maximum must be at least the minimum.");
  });

  it("allows a single-value range and a one-sided bound", () => {
    for (const patch of [
      { min: 5, max: 5 },
      { min: 5, max: null },
      { min: null, max: 5 },
    ]) {
      const raw = baseDefinition();
      patchQuestion(raw, 0, 1, patch);
      expect(quoteCalculatorDefinitionSchema.safeParse(raw).success).toBe(true);
    }
  });

  it("refuses a lone tab — a switcher with no alternative", () => {
    const raw = tabbedDefinition([{ id: "t_res", label: "Residential" }]);
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("tabs");
    expect(issues[0]?.message).toContain("Add a second tab");
    // …and still loads: one tab prices perfectly well, it just reads oddly.
    expect(parseStoredQuoteDefinition(raw).success).toBe(true);
  });

  it("refuses a question limited to a tab that no longer exists", () => {
    const raw = tabbedDefinition();
    patchQuestion(raw, 0, 0, { tabIds: ["t_deleted"] });
    const issues = issuesFor(raw);
    expect(paths(issues)).toContain("screens.0.questions.0.tabIds");
    expect(issues[0]?.message).toContain("no longer exists");
    // A stale id computes: the question matches no selected tab, stays hidden,
    // and its variable falls to `hiddenDefault` — the same defined behavior an
    // unmet show-if already has. Wrong, but not broken, so the read path keeps
    // the calculator (and the builder page that can fix it) open.
    expect(parseStoredQuoteDefinition(raw).success).toBe(true);
  });

  it("refuses two tabs the visitor cannot tell apart", () => {
    const raw = tabbedDefinition([
      { id: "t_res", label: "Residential" },
      { id: "t_res2", label: "  residential  " },
    ]);
    const issues = issuesFor(raw);
    // Compared case-insensitively after the schema's trim: two buttons reading
    // the same word are a coin flip for the visitor.
    expect(paths(issues)).toContain("tabs.1.label");
    expect(parseStoredQuoteDefinition(raw).success).toBe(true);
  });

  it("still loads a stored calculator that breaks these rules", () => {
    // The whole point of the split. This blob would be refused on save; it
    // must still parse on read, or the owner is locked out of the calculator
    // AND out of the builder page that could fix it.
    const raw = baseDefinition();
    patchQuestion(raw, 1, 0, { required: false });
    patchQuestion(raw, 0, 1, { min: 10, max: 2 });
    expect(quoteCalculatorDefinitionSchema.safeParse(raw).success).toBe(false);
    expect(parseStoredQuoteDefinition(raw).success).toBe(true);
  });
});

// ─── Public projection: estimate delivery + date bounds ─────────────────────

describe("toPublicCalculatorDefinition — estimate delivery", () => {
  function project(settings: Record<string, unknown>) {
    const raw = baseDefinition();
    raw.screens[0]!.questions.push({
      id: "q_when",
      type: "date",
      title: "Preferred date",
      minDate: "today",
      maxDaysAhead: 90,
    });
    return toPublicCalculatorDefinition(
      quoteCalculatorDefinitionSchema.parse({ ...raw, ...settings }),
    );
  }

  it("never exposes where the owner sends the estimate", () => {
    const projected = project({
      showEstimateToCustomer: true,
      showEstimateOnScreen: false,
      sendConfirmationEmail: true,
    });
    expect(projected).not.toHaveProperty("showEstimateOnScreen");
    expect(projected).not.toHaveProperty("sendConfirmationEmail");
    expect(JSON.stringify(projected)).not.toContain("sendConfirmationEmail");
  });

  it("ANDs the live estimate through both visibility switches", () => {
    // A stale `showLiveEstimate: true` must not survive the owner moving the
    // estimate to email only — `previewEstimate` gates on this projection.
    expect(
      project({
        showEstimateToCustomer: true,
        showEstimateOnScreen: true,
        showLiveEstimate: true,
      }).showLiveEstimate,
    ).toBe(true);

    expect(
      project({
        showEstimateToCustomer: true,
        showEstimateOnScreen: false,
        showLiveEstimate: true,
      }).showLiveEstimate,
    ).toBe(false);

    expect(
      project({
        showEstimateToCustomer: false,
        showEstimateOnScreen: true,
        showLiveEstimate: true,
      }).showLiveEstimate,
    ).toBe(false);
  });

  it("sets estimateByEmail only for the email-only configuration", () => {
    expect(
      project({
        showEstimateToCustomer: true,
        showEstimateOnScreen: false,
        sendConfirmationEmail: true,
      }).estimateByEmail,
    ).toBe(true);

    // On screen — the thank-you page shows the figure itself.
    expect(
      project({
        showEstimateToCustomer: true,
        showEstimateOnScreen: true,
        sendConfirmationEmail: true,
      }).estimateByEmail,
    ).toBe(false);

    // Estimate internal — there is no number to promise anywhere.
    expect(
      project({
        showEstimateToCustomer: false,
        showEstimateOnScreen: false,
        sendConfirmationEmail: true,
      }).estimateByEmail,
    ).toBe(false);
  });

  it("carries date bounds onto the public question", () => {
    const projected = project({});
    const question = projected.screens[0]?.questions[2];
    expect(question?.minDate).toBe("today");
    expect(question?.maxDaysAhead).toBe(90);
  });

  it("carries a null ceiling for an unbounded date question", () => {
    const raw = baseDefinition();
    raw.screens[0]!.questions.push({
      id: "q_when",
      type: "date",
      title: "Preferred date",
    });
    const projected = toPublicCalculatorDefinition(
      quoteCalculatorDefinitionSchema.parse(raw),
    );
    const question = projected.screens[0]?.questions[2];
    expect(question?.minDate).toBe("none");
    expect(question?.maxDaysAhead).toBeNull();
  });
});

// ─── Public projection: tabs ────────────────────────────────────────────────

describe("toPublicCalculatorDefinition — tabs", () => {
  const raw = tabbedDefinition([
    { id: "t_res", label: "Residential", description: "Homes and apartments" },
    { id: "t_com", label: "Commercial", formula: "bedrooms * 900" },
  ]);
  patchQuestion(raw, 0, 0, { tabIds: ["t_com"] });
  const projected = toPublicCalculatorDefinition(
    quoteCalculatorDefinitionSchema.parse(raw),
  );
  const json = JSON.stringify(projected);

  it("never serializes a per-tab formula override", () => {
    // The whole point of `PublicQuoteTab` having no `formula` key at all: a
    // tab's override is the pricing model for half the business, and a `null`
    // placeholder would break this assertion while leaking nothing — leaving
    // the guard useless on the day a real string lands there.
    expect(json).not.toContain("formula");
    expect(json).not.toContain("900");
  });

  it("carries id, label and description — and nothing else", () => {
    expect(projected.tabsPrompt).toBe("What kind of job is this?");
    expect(projected.tabs).toHaveLength(2);
    expect(Object.keys(projected.tabs[0] ?? {}).sort()).toEqual([
      "description",
      "id",
      "label",
    ]);
    expect(projected.tabs[0]).toEqual({
      id: "t_res",
      label: "Residential",
      description: "Homes and apartments",
    });
    // An absent description normalizes to null rather than disappearing.
    expect(projected.tabs[1]?.description).toBeNull();
  });

  it("carries each question's tabIds so the runner can branch", () => {
    expect(projected.screens[0]?.questions[0]?.tabIds).toEqual(["t_com"]);
    // Empty = every tab, which is what an untouched question means.
    expect(projected.screens[0]?.questions[1]?.tabIds).toEqual([]);
  });
});

// ─── Wire answers: real dates ───────────────────────────────────────────────

describe("quoteWireAnswerSchema — date", () => {
  function submitWith(date: string) {
    return quoteSubmitSchema.safeParse({
      calculatorId: "calc_1",
      answers: [{ questionId: "q_when", date }],
      contactName: "Ada",
      contactEmail: "ada@example.com",
      captchaToken: "t",
    });
  }

  it("accepts a real calendar date, leap day included", () => {
    expect(submitWith("2026-08-26").success).toBe(true);
    expect(submitWith("2024-02-29").success).toBe(true);
  });

  it("rejects a well-shaped date that does not exist", () => {
    // The regex alone passes all of these — the refine is what stops them
    // being stored, displayed back to the owner and compared to a bound.
    for (const date of [
      "2026-02-30",
      "2026-13-45",
      "2026-00-10",
      "2025-02-29",
    ]) {
      expect(submitWith(date).success).toBe(false);
    }
  });
});

// ─── Stored submission snapshot ─────────────────────────────────────────────

/**
 * Both of these are read back out of JSON columns written months ago. Every
 * field tabs added has to be OPTIONAL for the same reason: the parse in
 * `admin/quotes/[id]/page.tsx` is all-or-nothing, so one required key turns
 * every pre-tabs lead into a blank answer list.
 */
describe("quoteFormulaSnapshotSchema", () => {
  const base = { formula: "bedrooms * 350", variables: { bedrooms: 3 } };

  it("accepts a snapshot with no tab — every row stored before tabs existed", () => {
    const parsed = quoteFormulaSnapshotSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.tab).toBeUndefined();
  });

  it("accepts the tab the quote was priced against", () => {
    // Label as well as id: the tab may be renamed or deleted before the owner
    // reads the lead, and a bare cuid answers nothing.
    const parsed = quoteFormulaSnapshotSchema.safeParse({
      ...base,
      tab: { id: "t_com", label: "Commercial" },
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.tab).toEqual({ id: "t_com", label: "Commercial" });
  });

  it("rejects a tab with no id", () => {
    expect(
      quoteFormulaSnapshotSchema.safeParse({
        ...base,
        tab: { id: "", label: "Commercial" },
      }).success,
    ).toBe(false);
  });
});

describe("quoteSubmissionAnswerSchema — hiddenReason", () => {
  const base = {
    questionId: "q_stairs",
    type: "choice" as const,
    title: "Stairs?",
    hidden: true,
    display: "—",
  };

  it("accepts a hidden row with no reason", () => {
    const parsed = quoteSubmissionAnswerSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.hiddenReason).toBeUndefined();
  });

  it("accepts either reason a row can be hidden", () => {
    // "They answered no to stairs" and "this is only asked of commercial
    // jobs" look identical on the row itself, and the owner needs to tell
    // them apart.
    for (const hiddenReason of ["branch", "tab"] as const) {
      const parsed = quoteSubmissionAnswerSchema.safeParse({
        ...base,
        hiddenReason,
      });
      expect(parsed.success).toBe(true);
      if (!parsed.success) continue;
      expect(parsed.data.hiddenReason).toBe(hiddenReason);
    }
  });

  it("rejects a reason outside the vocabulary", () => {
    expect(
      quoteSubmissionAnswerSchema.safeParse({ ...base, hiddenReason: "other" })
        .success,
    ).toBe(false);
  });
});

// ─── Final quote ────────────────────────────────────────────────────────────

describe("quoteSendFinalQuoteSchema", () => {
  it("accepts a null amount for a message-only follow-up", () => {
    const parsed = quoteSendFinalQuoteSchema.safeParse({
      id: "q_1",
      finalQuoteCents: null,
      message: "Could you send a photo of the driveway?",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.finalQuoteCents).toBeNull();
  });

  it("still bounds the amount when one is given", () => {
    for (const finalQuoteCents of [-1, 100_000_001, 1.5]) {
      expect(
        quoteSendFinalQuoteSchema.safeParse({
          id: "q_1",
          finalQuoteCents,
          message: "Here is your quote.",
        }).success,
      ).toBe(false);
    }
  });

  it("still requires a message", () => {
    expect(
      quoteSendFinalQuoteSchema.safeParse({
        id: "q_1",
        finalQuoteCents: null,
        message: "   ",
      }).success,
    ).toBe(false);
  });
});
