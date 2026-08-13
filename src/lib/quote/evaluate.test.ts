import { describe, expect, it } from "vitest";

import type { ZipLocation, ZipLookupFn } from "./evaluate";
import type {
  QuoteCalculatorDefinition,
  QuoteWireAnswer,
} from "~/lib/validators/quote-calculator";
import { quoteCalculatorDefinitionSchema } from "~/lib/validators/quote-calculator";

import { computeQuote } from "./evaluate";

/**
 * `computeQuote` is the server-side price. Everything here is written from the
 * attacker's side as much as the owner's: the browser is handed a definition
 * with no formula, no option values and no hidden defaults, so the only thing
 * it can do is send IDs — and these tests pin what happens when it sends the
 * wrong ones, or ones for questions it was never shown.
 */

// Fixture zips are placed at whole-degree coordinates so the expected distance
// is a round, hand-checkable number (1° of latitude = 69.0932… mi → 69.1).
const ZIP_TABLE: Record<string, ZipLocation> = {
  "48601": { lat: 0, lng: 0, city: "Saginaw", state: "MI" },
  "48602": { lat: 1, lng: 0, city: "Bridgeport", state: "MI" },
};

const lookupZip: ZipLookupFn = (zip) => ZIP_TABLE[zip] ?? null;

/** A lookup that knows nothing, for the unknown-zip cases. */
const lookupNothing: ZipLookupFn = () => null;

function defineCalculator(raw: unknown): QuoteCalculatorDefinition {
  return quoteCalculatorDefinitionSchema.parse(raw);
}

// ─── The reference "movers" calculator ──────────────────────────────────────

const MOVERS = defineCalculator({
  version: 1,
  questions: [
    {
      id: "q_type",
      type: "choice",
      title: "What kind of move?",
      variableName: "move_type",
      options: [
        { id: "local", label: "Local move", value: 1 },
        { id: "long", label: "Long distance", value: 1.5 },
      ],
    },
    {
      id: "q_bedrooms",
      type: "number",
      title: "How many bedrooms?",
      variableName: "bedrooms",
      min: 0,
      max: 10,
      unitLabel: "bedrooms",
    },
    {
      id: "q_packing",
      type: "multiselect",
      title: "Any extras?",
      required: false,
      variableName: "packing",
      options: [
        { id: "pack", label: "Packing", value: 200 },
        { id: "store", label: "Storage", value: 150 },
      ],
    },
    { id: "q_from", type: "zip", title: "Moving from", required: false },
    { id: "q_to", type: "zip", title: "Moving to", required: false },
  ],
  distances: [
    {
      id: "d_move",
      variableName: "distance",
      fromQuestionId: "q_from",
      toQuestionId: "q_to",
      hiddenDefault: 25,
    },
  ],
  formula: "(500 + bedrooms * 350 + packing + distance * 4) * move_type",
});

const MOVERS_ANSWERS: QuoteWireAnswer[] = [
  { questionId: "q_type", optionId: "long" },
  { questionId: "q_bedrooms", number: 3 },
  { questionId: "q_packing", optionIds: ["pack", "store"] },
  { questionId: "q_from", zip: "48601" },
  { questionId: "q_to", zip: "48602" },
];

describe("computeQuote — happy path", () => {
  const result = computeQuote(MOVERS, MOVERS_ANSWERS, lookupZip);

  it("computes the estimate in cents from the stored formula", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // (500 + 3*350 + 350 + 69.1*4) * 1.5 = 2176.4 * 1.5 = 3264.60
    expect(result.estimateCents).toBe(326460);
  });

  it("resolves every variable the formula names", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables).toEqual({
      move_type: 1.5,
      bedrooms: 3,
      packing: 350,
      distance: 69.1,
    });
  });

  it("snapshots one row per question, in definition order", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answerSnapshots.map((row) => row.questionId)).toEqual([
      "q_type",
      "q_bedrooms",
      "q_packing",
      "q_from",
      "q_to",
    ]);
    expect(result.answerSnapshots.every((row) => row.hidden === false)).toBe(
      true,
    );
  });

  it("renders a human-readable display for each answer type", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const displays = Object.fromEntries(
      result.answerSnapshots.map((row) => [row.questionId, row.display]),
    );
    expect(displays).toEqual({
      q_type: "Long distance",
      q_bedrooms: "3 bedrooms",
      q_packing: "Packing, Storage",
      q_from: "48601 (Saginaw, MI)",
      q_to: "48602 (Bridgeport, MI)",
    });
  });

  it("carries variableName and resolved zip city/state onto the snapshot", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [type, bedrooms, packing, from] = result.answerSnapshots;
    expect(type).toMatchObject({
      type: "choice",
      title: "What kind of move?",
      variableName: "move_type",
      optionId: "long",
    });
    expect(bedrooms).toMatchObject({ variableName: "bedrooms", number: 3 });
    expect(packing).toMatchObject({ optionIds: ["pack", "store"] });
    expect(from).toMatchObject({
      zip: "48601",
      zipCity: "Saginaw",
      zipState: "MI",
    });
    // Informational-only fields must not acquire a variable name.
    expect(from?.variableName).toBeUndefined();
  });
});

// ─── Branching / anti-tamper ────────────────────────────────────────────────

const BRANCHED = defineCalculator({
  version: 1,
  questions: [
    {
      id: "q_type",
      type: "choice",
      title: "What kind of move?",
      variableName: "move_type",
      options: [
        { id: "local", label: "Local move", value: 1 },
        { id: "long", label: "Long distance", value: 10 },
      ],
    },
    {
      id: "q_storage",
      type: "choice",
      title: "How long in storage?",
      variableName: "storage_months",
      showIf: { questionId: "q_type", optionId: "long" },
      hiddenDefault: 99,
      options: [
        { id: "none", label: "No storage", value: 0 },
        { id: "three", label: "3 months", value: 300 },
      ],
    },
  ],
  formula: "move_type + storage_months",
});

describe("computeQuote — hidden questions", () => {
  it("gives a hidden variable question its hiddenDefault", () => {
    const result = computeQuote(
      BRANCHED,
      [{ questionId: "q_type", optionId: "local" }],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables).toEqual({ move_type: 1, storage_months: 99 });
    expect(result.estimateCents).toBe(10000);
  });

  it("DISCARDS an answer smuggled in for a hidden question", () => {
    // The visitor picked "local", so the storage question was never shown.
    // A crafted payload answers it anyway with the 300-value option. If the
    // server read it, the price would reflect a branch the visitor never
    // qualified for.
    const result = computeQuote(
      BRANCHED,
      [
        { questionId: "q_type", optionId: "local" },
        { questionId: "q_storage", optionId: "three" },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.storage_months).toBe(99);

    const storage = result.answerSnapshots.find(
      (row) => row.questionId === "q_storage",
    );
    expect(storage).toMatchObject({ hidden: true, display: "—" });
    expect(storage?.optionId).toBeUndefined();
  });

  it("uses the real answer once the branch is taken", () => {
    const result = computeQuote(
      BRANCHED,
      [
        { questionId: "q_type", optionId: "long" },
        { questionId: "q_storage", optionId: "three" },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables).toEqual({ move_type: 10, storage_months: 300 });
    expect(result.estimateCents).toBe(31000);
  });

  it("does not require a hidden question, even when it is marked required", () => {
    const result = computeQuote(
      BRANCHED,
      [{ questionId: "q_type", optionId: "local" }],
      lookupZip,
    );
    // q_storage defaults to required: true but is branched away.
    expect(result.ok).toBe(true);
  });
});

// ─── Option questions ───────────────────────────────────────────────────────

describe("computeQuote — option questions", () => {
  it("sums the values of every checked multiselect option", () => {
    const result = computeQuote(
      MOVERS,
      MOVERS_ANSWERS.map((answer) =>
        answer.questionId === "q_packing"
          ? { questionId: "q_packing", optionIds: ["store"] }
          : answer,
      ),
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.packing).toBe(150);
  });

  it("dedupes repeated multiselect ids rather than charging twice", () => {
    const result = computeQuote(
      MOVERS,
      MOVERS_ANSWERS.map((answer) =>
        answer.questionId === "q_packing"
          ? { questionId: "q_packing", optionIds: ["pack", "pack", "pack"] }
          : answer,
      ),
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.packing).toBe(200);
  });

  it("treats an optional multiselect with nothing checked as 0", () => {
    const result = computeQuote(
      MOVERS,
      MOVERS_ANSWERS.filter((answer) => answer.questionId !== "q_packing"),
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.packing).toBe(0);
  });

  it("rejects an unknown multiselect option id", () => {
    const result = computeQuote(
      MOVERS,
      MOVERS_ANSWERS.map((answer) =>
        answer.questionId === "q_packing"
          ? { questionId: "q_packing", optionIds: ["pack", "not-a-real-id"] }
          : answer,
      ),
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown-option");
    expect(result.error.questionId).toBe("q_packing");
  });

  it("rejects an unknown single-choice option id", () => {
    const result = computeQuote(
      MOVERS,
      MOVERS_ANSWERS.map((answer) =>
        answer.questionId === "q_type"
          ? { questionId: "q_type", optionId: "free-move" }
          : answer,
      ),
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown-option");
    expect(result.error.questionId).toBe("q_type");
  });
});

// ─── Required / number bounds ───────────────────────────────────────────────

describe("computeQuote — required and bounded answers", () => {
  it("rejects a visible required question with no answer", () => {
    const result = computeQuote(
      MOVERS,
      MOVERS_ANSWERS.filter((answer) => answer.questionId !== "q_bedrooms"),
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("missing-required");
    expect(result.error.questionId).toBe("q_bedrooms");
  });

  it("rejects a number below the configured minimum", () => {
    const result = computeQuote(
      MOVERS,
      MOVERS_ANSWERS.map((answer) =>
        answer.questionId === "q_bedrooms"
          ? { questionId: "q_bedrooms", number: -1 }
          : answer,
      ),
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("bad-answer");
    expect(result.error.questionId).toBe("q_bedrooms");
  });

  it("rejects a number above the configured maximum", () => {
    const result = computeQuote(
      MOVERS,
      MOVERS_ANSWERS.map((answer) =>
        answer.questionId === "q_bedrooms"
          ? { questionId: "q_bedrooms", number: 9999 }
          : answer,
      ),
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("bad-answer");
  });

  it("accepts the boundary values", () => {
    for (const bedrooms of [0, 10]) {
      const result = computeQuote(
        MOVERS,
        MOVERS_ANSWERS.map((answer) =>
          answer.questionId === "q_bedrooms"
            ? { questionId: "q_bedrooms", number: bedrooms }
            : answer,
        ),
        lookupZip,
      );
      expect(result.ok).toBe(true);
    }
  });

  it("rejects a malformed zip", () => {
    const result = computeQuote(
      MOVERS,
      MOVERS_ANSWERS.map((answer) =>
        answer.questionId === "q_from"
          ? { questionId: "q_from", zip: "486" }
          : answer,
      ),
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("bad-answer");
    expect(result.error.questionId).toBe("q_from");
  });
});

// ─── Distance variables ─────────────────────────────────────────────────────

describe("computeQuote — distance variables", () => {
  it("computes straight-line miles between two zip centroids, to 1 decimal", () => {
    const result = computeQuote(MOVERS, MOVERS_ANSWERS, lookupZip);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 1° of latitude at R = 3958.8 mi is 69.0932…, rounded to 69.1.
    expect(result.variables.distance).toBe(69.1);
  });

  it("falls back to the distance hiddenDefault when an endpoint is unanswered", () => {
    const result = computeQuote(
      MOVERS,
      MOVERS_ANSWERS.filter((answer) => answer.questionId !== "q_to"),
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.distance).toBe(25);
  });

  it("fails with unknown-zip when a distance endpoint is not in the table", () => {
    const result = computeQuote(MOVERS, MOVERS_ANSWERS, lookupNothing);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown-zip");
    expect(result.error.questionId).toBe("q_from");
  });

  it("tolerates an unrecognized zip on a question no distance references", () => {
    const contactOnly = defineCalculator({
      version: 1,
      questions: [
        { id: "q_zip", type: "zip", title: "Your ZIP" },
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
    const result = computeQuote(
      contactOnly,
      [
        { questionId: "q_zip", zip: "00000" },
        { questionId: "q_size", number: 100 },
      ],
      lookupNothing,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimateCents).toBe(20000);
    const zipRow = result.answerSnapshots.find(
      (row) => row.questionId === "q_zip",
    );
    expect(zipRow).toMatchObject({ zip: "00000", display: "00000" });
    expect(zipRow?.zipCity).toBeUndefined();
  });
});

// ─── Informational questions ────────────────────────────────────────────────

describe("computeQuote — informational questions", () => {
  const INFO = defineCalculator({
    version: 1,
    questions: [
      {
        id: "q_size",
        type: "number",
        title: "Square feet",
        variableName: "sqft",
      },
      { id: "q_when", type: "date", title: "Preferred date", required: false },
      { id: "q_notes", type: "longtext", title: "Notes", required: false },
    ],
    distances: [],
    formula: "sqft * 2",
  });

  it("snapshots text and date answers without touching the price", () => {
    const result = computeQuote(
      INFO,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_when", date: "2026-09-01" },
        { questionId: "q_notes", text: "  Third floor walk-up  " },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables).toEqual({ sqft: 100 });
    expect(result.answerSnapshots[1]).toMatchObject({
      date: "2026-09-01",
      display: "2026-09-01",
    });
    expect(result.answerSnapshots[2]).toMatchObject({
      text: "Third floor walk-up",
      display: "Third floor walk-up",
    });
  });

  it("rejects a malformed date", () => {
    const result = computeQuote(
      INFO,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_when", date: "09/01/2026" },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("bad-answer");
    expect(result.error.questionId).toBe("q_when");
  });

  it("shows an em dash for an optional question left blank", () => {
    const result = computeQuote(
      INFO,
      [{ questionId: "q_size", number: 100 }],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answerSnapshots.map((row) => row.display)).toEqual([
      "100",
      "—",
      "—",
    ]);
  });
});

// ─── Estimate clamping and formula failure ──────────────────────────────────

describe("computeQuote — estimate clamping", () => {
  it("clamps a negative computed price to 0 cents", () => {
    const discounted = defineCalculator({
      version: 1,
      questions: [
        {
          id: "q_discount",
          type: "choice",
          title: "Promo",
          variableName: "promo",
          options: [
            { id: "none", label: "No promo", value: 0 },
            { id: "huge", label: "Friends and family", value: -1000 },
          ],
        },
      ],
      distances: [],
      formula: "100 + promo",
    });

    const result = computeQuote(
      discounted,
      [{ questionId: "q_discount", optionId: "huge" }],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimateCents).toBe(0);
  });

  it("reports formula-failed with no questionId when the formula cannot evaluate", () => {
    // Reached by hand-editing the stored definition past the validator — the
    // formula names a variable no question defines.
    const drifted: QuoteCalculatorDefinition = {
      ...MOVERS,
      formula: "bedrooms * gone_missing",
    };
    const result = computeQuote(drifted, MOVERS_ANSWERS, lookupZip);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("formula-failed");
    expect(result.error.questionId).toBeUndefined();
    expect(result.error.message).toContain("gone_missing");
  });
});

// ─── Duplicate wire answers ─────────────────────────────────────────────────

describe("computeQuote — duplicate answers", () => {
  it("takes the last submitted answer for a repeated questionId", () => {
    const result = computeQuote(
      BRANCHED,
      [
        { questionId: "q_type", optionId: "long" },
        { questionId: "q_type", optionId: "local" },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.move_type).toBe(1);
  });
});
