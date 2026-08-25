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
  QUOTE_STATUS_FILTER_VALUES,
  QUOTE_STATUS_VALUES_DB,
  quoteCalculatorDefinitionSchema,
  quotePreviewEstimateSchema,
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
      "liveEstimateDisclaimer",
      "requirePhone",
      "responseDays",
      "screens",
      "showEstimateToCustomer",
      "showLiveEstimate",
      "showReviewStep",
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
