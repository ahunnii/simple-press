import { describe, expect, it } from "vitest";

import type { ZipLocation, ZipLookupFn } from "./evaluate";
import type {
  QuoteCalculatorDefinition,
  QuoteWireAnswer,
} from "~/lib/validators/quote-calculator";
import {
  addCalendarDays,
  isRealCalendarDate,
  localCalendarDate,
  zonedCalendarDate,
} from "~/lib/calendar-date";
import {
  parseStoredQuoteDefinition,
  QUOTE_MAX_FINAL_CENTS,
} from "~/lib/validators/quote-calculator";

import { computeQuote, finalizeEstimateCents } from "./evaluate";

/**
 * `computeQuote` is the server-side price. Everything here is written from the
 * attacker's side as much as the owner's: the browser is handed a definition
 * with no formula, no option values and no hidden defaults, so the only thing
 * it can do is send IDs — and these tests pin what happens when it sends the
 * wrong ones, or ones for questions it was never shown.
 *
 * Note the fixtures below: most are written in the v1 shape (`questions` at the
 * top level) and go through `parseStoredQuoteDefinition`, exactly as a stored
 * blob does. That is deliberate rather than laziness — it means every
 * assertion in this file also asserts that a v1 calculator still prices
 * identically after the v2 migration, which is the single most important
 * property of that migration.
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
  const parsed = parseStoredQuoteDefinition(raw);
  if (!parsed.success) {
    throw new Error(`fixture did not parse: ${parsed.error.message}`);
  }
  return parsed.data;
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
    // MOVERS prices with `distance * 4`, which is what makes this fatal — see
    // the pair of tests below for the same ZIP against a formula that does not.
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

  /**
   * One calculator, three formulas. The distance row is declared identically in
   * all of them — the only thing that changes is whether the price reads it.
   */
  function movesPricedBy(formula: string) {
    return defineCalculator({
      version: 1,
      questions: [
        {
          id: "q_size",
          type: "number",
          title: "Square feet",
          variableName: "sqft",
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
      formula,
    });
  }

  /** `q_from` is answered with a ZIP the table does not know. */
  const UNKNOWN_ENDPOINT: QuoteWireAnswer[] = [
    { questionId: "q_size", number: 100 },
    { questionId: "q_from", zip: "99999" },
    { questionId: "q_to", zip: "48602" },
  ];

  it("tolerates an unknown endpoint ZIP when the formula never reads the distance", () => {
    // An owner who built a distance row and later rewrote the formula without
    // it. The variable still resolves — the snapshot is a record of what the
    // calculator computed, and the admin detail page reads it back — but an
    // unrecognized ZIP now changes no number, so turning the visitor away over
    // it would cost a real lead for nothing.
    const result = computeQuote(
      movesPricedBy("sqft * 2"),
      UNKNOWN_ENDPOINT,
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.distance).toBe(25);
    expect(result.estimateCents).toBe(20000);
  });

  it("still fails on that same ZIP once the formula reads the distance", () => {
    const result = computeQuote(
      movesPricedBy("sqft * 2 + distance"),
      UNKNOWN_ENDPOINT,
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown-zip");
    expect(result.error.questionId).toBe("q_from");
  });

  it("keeps every distance fatal when the formula does not parse at all", () => {
    // A formula that cannot be read cannot say which distances it prices with,
    // so all of them stay fatal — the conservative reading, and the behavior
    // this file pinned before the narrowing existed.
    //
    // Which error surfaces is decided by ORDER, not by severity: answers are
    // validated in the question loop, long before the formula is evaluated, so
    // `unknown-zip` comes out even though this definition is also headed for
    // `formula-failed`.
    const drifted: QuoteCalculatorDefinition = {
      ...movesPricedBy("sqft * 2"),
      formula: "sqft *",
    };
    const result = computeQuote(drifted, UNKNOWN_ENDPOINT, lookupZip);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown-zip");
    expect(result.error.questionId).toBe("q_from");
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

// ─── Formula failure ────────────────────────────────────────────────────────

describe("computeQuote — formula failure", () => {
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

// ─── Value-level formula failures ───────────────────────────────────────────

/**
 * A perfectly valid calculator that divides by a number the VISITOR supplies.
 * It saves, it parses, every variable it names exists — and it breaks the
 * moment somebody types 0 into a question the owner gave no `min`.
 *
 * This is the whole point of the section: a failure like that is not owner
 * misconfiguration and not visitor error, so it must not be allowed to throw
 * away a real lead. `computeQuote` returns `ok: true` with a null estimate and
 * a full answer snapshot, and the caller persists the submission anyway.
 */
const PER_UNIT = defineCalculator({
  version: 1,
  questions: [
    {
      id: "q_units",
      type: "number",
      title: "How many units?",
      variableName: "units",
    },
  ],
  distances: [],
  formula: "5000 / units",
});

/**
 * The same story from the other direction: a valid calculator whose discount
 * options can, in combination, price below zero. The three interesting landing
 * points are all one option away from each other — comfortably negative,
 * exactly zero, and the float dust in between that rounds to `-0`.
 */
const DISCOUNTED = defineCalculator({
  version: 1,
  questions: [
    {
      id: "q_discount",
      type: "choice",
      title: "Promo",
      variableName: "promo",
      options: [
        { id: "none", label: "No promo", value: 0 },
        { id: "even", label: "Exactly free", value: -100 },
        { id: "dust", label: "A hair under free", value: -100.001 },
        { id: "huge", label: "Friends and family", value: -1000 },
      ],
    },
  ],
  distances: [],
  formula: "100 + promo",
});

describe("computeQuote — value-level formula failures", () => {
  it("returns a null estimate (not an error) when the visitor divides by zero", () => {
    const result = computeQuote(
      PER_UNIT,
      [{ questionId: "q_units", number: 0 }],
      lookupZip,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimateCents).toBeNull();
    expect(result.estimateFailure?.code).toBe("value-error");
  });

  it("keeps the full answer snapshot and variables so the lead is still persistable", () => {
    const result = computeQuote(
      PER_UNIT,
      [{ questionId: "q_units", number: 0 }],
      lookupZip,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Everything the submission row needs is present: without these, "persist
    // with a null estimate" would mean persisting an empty lead.
    expect(result.answerSnapshots).toHaveLength(1);
    expect(result.answerSnapshots[0]?.display).toBe("0");
    expect(result.variables).toEqual({ units: 0 });
  });

  it("does the same when a hiddenDefault of 0 reaches a divisor by branching", () => {
    // Nobody typed the zero here — the question was branched away, so `units`
    // took its `hiddenDefault` (0, the schema default). Same class of failure,
    // same treatment: capture the lead, skip the number.
    const gated = defineCalculator({
      version: 1,
      questions: [
        {
          id: "q_gate",
          type: "choice",
          title: "Do you need units?",
          variableName: "gate",
          options: [
            { id: "yes", label: "Yes", value: 1 },
            { id: "no", label: "No", value: 0 },
          ],
        },
        {
          id: "q_units",
          type: "number",
          title: "How many units?",
          variableName: "units",
          showIf: { questionId: "q_gate", optionId: "yes" },
        },
      ],
      distances: [],
      formula: "5000 / units",
    });

    const result = computeQuote(
      gated,
      [{ questionId: "q_gate", optionId: "no" }],
      lookupZip,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimateCents).toBeNull();
    expect(result.estimateFailure?.code).toBe("value-error");
    expect(result.variables.units).toBe(0);
  });

  it("returns a null estimate when the arithmetic overflows to Infinity", () => {
    // The wire schema caps a submitted number at ±1e9, so this magnitude can
    // only arrive by REPLAYING a stored submission (which never went through
    // the current wire schema) — a path `computeQuote` explicitly supports.
    const squared: QuoteCalculatorDefinition = {
      ...PER_UNIT,
      formula: "units * units",
    };

    const result = computeQuote(
      squared,
      [{ questionId: "q_units", number: 1e300 }],
      lookupZip,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimateCents).toBeNull();
    expect(result.estimateFailure?.code).toBe("value-error");
  });

  it("returns a null estimate when the discounts outrun the charges", () => {
    // This used to clamp to 0 and hand the customer a confident "$0.00" — a
    // free job nobody configured, on a form whose whole promise is "this is
    // roughly what it costs". Same treatment as `over-cap` at the other end of
    // the range: no number, but the lead is kept and priced by hand.
    const result = computeQuote(
      DISCOUNTED,
      [{ questionId: "q_discount", optionId: "huge" }],
      lookupZip,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimateCents).toBeNull();
    expect(result.estimateFailure?.code).toBe("value-error");
    // The lead is intact — the whole reason this is not an error result.
    expect(result.variables).toEqual({ promo: -1000 });
    expect(result.answerSnapshots).toHaveLength(1);
    expect(result.answerSnapshots[0]?.display).toBe("Friends and family");
  });

  it("passes an exact zero through — 0 is a price the owner configured", () => {
    const result = computeQuote(
      DISCOUNTED,
      [{ questionId: "q_discount", optionId: "even" }],
      lookupZip,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // `toBe` is `Object.is`, so this also pins that the value is `0` and not
    // `-0`, which is what the normalization after the negative check is for.
    expect(result.estimateCents).toBe(0);
    expect(result.estimateFailure).toBeUndefined();
  });

  it("treats float dust below zero as a genuine $0.00, not a discount overrun", () => {
    // 100 + -100.001 rounds to `-0` cents. `-0 < 0` is false, so it must land
    // on the zero path — the discount did not actually outrun anything.
    const result = computeQuote(
      DISCOUNTED,
      [{ questionId: "q_discount", optionId: "dust" }],
      lookupZip,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimateCents).toBe(0);
    expect(result.estimateFailure).toBeUndefined();
  });

  it("still fails HARD on definition drift, so genuine bugs stay loud", () => {
    // A stored formula that no longer parses. Nothing about this is the
    // visitor's doing and no lead is worth persisting a broken price model
    // over — the caller turns this into a 500 plus a Sentry issue.
    const drifted: QuoteCalculatorDefinition = {
      ...PER_UNIT,
      formula: "5000 /",
    };

    const result = computeQuote(
      drifted,
      [{ questionId: "q_units", number: 4 }],
      lookupZip,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("formula-failed");
  });
});

// ─── Estimate cap ───────────────────────────────────────────────────────────

describe("computeQuote — estimate cap", () => {
  it("nulls an estimate past the storable cap rather than clamping it", () => {
    // `QuoteSubmission.estimateCents` is an int4. A visitor-sized number times
    // an owner-sized rate sails past it, and the write would fail with a raw
    // Prisma error serialized to an anonymous visitor. Nulling keeps the lead
    // AND keeps the owner from being shown a confident number no configured
    // price actually produces.
    const runaway = defineCalculator({
      version: 1,
      questions: [
        {
          id: "q_units",
          type: "number",
          title: "How many units?",
          variableName: "units",
        },
      ],
      distances: [],
      formula: "units * 1000",
    });

    const result = computeQuote(
      runaway,
      [{ questionId: "q_units", number: 1_000_000_000 }],
      lookupZip,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimateCents).toBeNull();
    expect(result.estimateFailure?.code).toBe("over-cap");
    expect(result.variables).toEqual({ units: 1_000_000_000 });
  });

  it("leaves an estimate at the cap alone", () => {
    // $1,000,000.00 exactly — a real (if large) quote, not a runaway.
    const atCap = defineCalculator({
      version: 1,
      questions: [
        {
          id: "q_units",
          type: "number",
          title: "How many units?",
          variableName: "units",
        },
      ],
      distances: [],
      formula: "units",
    });

    const result = computeQuote(
      atCap,
      [{ questionId: "q_units", number: 1_000_000 }],
      lookupZip,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimateCents).toBe(100_000_000);
    expect(result.estimateFailure).toBeUndefined();
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

// ─── Screens (v2) ───────────────────────────────────────────────────────────

/**
 * Two screens, each holding two questions, with a show-if pointing backward
 * WITHIN a screen and another pointing backward ACROSS screens.
 *
 * `computeQuote` does not care which screen a question sits on — it walks the
 * flattened list. What it must get right is that "flattened" means screen
 * order then in-screen order, the same order the validator measured "comes
 * before" against and the same order `resolveVisibility` resolves in.
 */
const TWO_SCREENS = defineCalculator({
  version: 2,
  screens: [
    {
      id: "s_basics",
      title: "The basics",
      description: "Two quick ones.",
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
          // Same screen as its source: a live reveal within one step.
          id: "q_storage",
          type: "choice",
          title: "How long in storage?",
          variableName: "storage",
          showIf: { questionId: "q_type", optionId: "long" },
          hiddenDefault: 7,
          options: [
            { id: "none", label: "No storage", value: 0 },
            { id: "three", label: "3 months", value: 300 },
          ],
        },
      ],
    },
    {
      id: "s_details",
      questions: [
        { id: "q_notes", type: "longtext", title: "Notes", required: false },
        {
          // A later SCREEN depending on the first screen — the case that
          // existed before v2.
          id: "q_rush",
          type: "choice",
          title: "Need it rushed?",
          variableName: "rush",
          showIf: { questionId: "q_type", optionId: "long" },
          hiddenDefault: 5,
          options: [
            { id: "no", label: "No rush", value: 0 },
            { id: "yes", label: "Rush it", value: 1000 },
          ],
        },
      ],
    },
  ],
  distances: [],
  formula: "move_type + storage + rush",
});

describe("computeQuote — screens", () => {
  it("snapshots in flattened order: screen order, then in-screen order", () => {
    const result = computeQuote(
      TWO_SCREENS,
      [
        { questionId: "q_type", optionId: "long" },
        { questionId: "q_storage", optionId: "three" },
        { questionId: "q_notes", text: "Third floor" },
        { questionId: "q_rush", optionId: "yes" },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answerSnapshots.map((row) => row.questionId)).toEqual([
      "q_type",
      "q_storage",
      "q_notes",
      "q_rush",
    ]);
    expect(result.variables).toEqual({
      move_type: 10,
      storage: 300,
      rush: 1000,
    });
  });

  it("resolves a same-screen show-if just like a cross-screen one", () => {
    const result = computeQuote(
      TWO_SCREENS,
      [{ questionId: "q_type", optionId: "local" }],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Both branched away — one on the same screen as its source, one a screen
    // later — and both took their hiddenDefault.
    expect(result.variables).toEqual({
      move_type: 1,
      storage: 7,
      rush: 5,
    });
    const hidden = result.answerSnapshots
      .filter((row) => row.hidden)
      .map((row) => row.questionId);
    expect(hidden).toEqual(["q_storage", "q_rush"]);
  });

  it("still discards an answer smuggled in for a hidden same-screen question", () => {
    const result = computeQuote(
      TWO_SCREENS,
      [
        { questionId: "q_type", optionId: "local" },
        { questionId: "q_storage", optionId: "three" },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.storage).toBe(7);
  });
});

// ─── Address questions ──────────────────────────────────────────────────────

const ADDRESSED = defineCalculator({
  version: 2,
  screens: [
    {
      id: "s_where",
      title: "Where are we going?",
      questions: [
        { id: "q_from", type: "address", title: "Pick-up address" },
        {
          id: "q_to",
          type: "address",
          title: "Drop-off address",
          required: false,
        },
      ],
    },
    {
      id: "s_size",
      questions: [
        {
          id: "q_bedrooms",
          type: "number",
          title: "Bedrooms",
          variableName: "bedrooms",
        },
      ],
    },
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
  formula: "bedrooms * 100 + distance * 4",
});

const FROM_ADDRESS = {
  line1: "123 Main St",
  line2: "Apt 4",
  city: "Saginaw",
  state: "MI",
  zip: "48601",
};

const TO_ADDRESS = {
  line1: "9 Elm Ave",
  city: "Bridgeport",
  state: "MI",
  zip: "48602",
};

describe("computeQuote — address questions", () => {
  const complete = computeQuote(
    ADDRESSED,
    [
      { questionId: "q_from", address: FROM_ADDRESS },
      { questionId: "q_to", address: TO_ADDRESS },
      { questionId: "q_bedrooms", number: 2 },
    ],
    lookupZip,
  );

  it("anchors a distance variable off the address's ZIP", () => {
    expect(complete.ok).toBe(true);
    if (!complete.ok) return;
    expect(complete.variables).toEqual({ bedrooms: 2, distance: 69.1 });
    // 2*100 + 69.1*4 = 476.4
    expect(complete.estimateCents).toBe(47640);
  });

  it("renders a one-line display the owner's inbox and emails can print", () => {
    expect(complete.ok).toBe(true);
    if (!complete.ok) return;
    const displays = complete.answerSnapshots.map((row) => row.display);
    expect(displays[0]).toBe("123 Main St, Apt 4, Saginaw, MI 48601");
    // No second line means no empty segment in the middle.
    expect(displays[1]).toBe("9 Elm Ave, Bridgeport, MI 48602");
  });

  it("keeps the structured address alongside the resolved city/state", () => {
    expect(complete.ok).toBe(true);
    if (!complete.ok) return;
    const [from] = complete.answerSnapshots;
    expect(from).toMatchObject({
      type: "address",
      hidden: false,
      zip: "48601",
      // Resolved from the ZIP table, recorded separately from what the visitor
      // typed so a mismatch stays visible.
      zipCity: "Saginaw",
      zipState: "MI",
      address: FROM_ADDRESS,
    });
    // Informational: no variable name, no contribution to the formula.
    expect(from?.variableName).toBeUndefined();
    expect(complete.answerSnapshots[1]?.address).toEqual(TO_ADDRESS);
    expect(complete.answerSnapshots[1]?.address?.line2).toBeUndefined();
  });

  it("rejects a partial address rather than geocoding half of one", () => {
    for (const key of ["line1", "city", "state", "zip"] as const) {
      const partial: Partial<typeof FROM_ADDRESS> = { ...FROM_ADDRESS };
      delete partial[key];
      const result = computeQuote(
        ADDRESSED,
        [
          {
            questionId: "q_from",
            address: partial as unknown as typeof FROM_ADDRESS,
          },
          { questionId: "q_bedrooms", number: 2 },
        ],
        lookupZip,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("bad-answer");
      expect(result.error.questionId).toBe("q_from");
      expect(result.error.message).toContain("complete the address");
    }
  });

  it("accepts a missing apartment line — that is a complete address", () => {
    const result = computeQuote(
      ADDRESSED,
      [
        { questionId: "q_from", address: TO_ADDRESS },
        { questionId: "q_bedrooms", number: 1 },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(true);
  });

  it("requires a required address and lets an optional one go blank", () => {
    const missing = computeQuote(
      ADDRESSED,
      [{ questionId: "q_bedrooms", number: 2 }],
      lookupZip,
    );
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error.code).toBe("missing-required");
    expect(missing.error.questionId).toBe("q_from");

    const optionalBlank = computeQuote(
      ADDRESSED,
      [
        { questionId: "q_from", address: FROM_ADDRESS },
        { questionId: "q_bedrooms", number: 2 },
      ],
      lookupZip,
    );
    expect(optionalBlank.ok).toBe(true);
    if (!optionalBlank.ok) return;
    // One endpoint unanswered → the distance did not apply.
    expect(optionalBlank.variables.distance).toBe(25);
    expect(optionalBlank.answerSnapshots[1]).toMatchObject({
      hidden: false,
      display: "—",
    });
  });

  it("fails with unknown-zip when a distance endpoint's ZIP is not in the table", () => {
    const result = computeQuote(
      ADDRESSED,
      [
        { questionId: "q_from", address: { ...FROM_ADDRESS, zip: "99999" } },
        { questionId: "q_to", address: TO_ADDRESS },
        { questionId: "q_bedrooms", number: 2 },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown-zip");
    expect(result.error.questionId).toBe("q_from");
  });

  it("tolerates an unrecognized ZIP on an address no distance references", () => {
    const contactOnly = defineCalculator({
      version: 2,
      screens: [
        {
          id: "s_1",
          questions: [
            { id: "q_addr", type: "address", title: "Your address" },
            {
              id: "q_size",
              type: "number",
              title: "Square feet",
              variableName: "sqft",
            },
          ],
        },
      ],
      distances: [],
      formula: "sqft * 2",
    });

    const result = computeQuote(
      contactOnly,
      [
        { questionId: "q_addr", address: FROM_ADDRESS },
        { questionId: "q_size", number: 100 },
      ],
      lookupNothing,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimateCents).toBe(20000);
    const row = result.answerSnapshots[0];
    expect(row?.display).toBe("123 Main St, Apt 4, Saginaw, MI 48601");
    expect(row?.zipCity).toBeUndefined();
  });

  it("re-validates the state and ZIP a replayed submission carries", () => {
    // Both are enforced on the wire, but `computeQuote` is also the path for
    // replaying a stored submission, which never went through it.
    for (const bad of [{ state: "ZZ" }, { zip: "486" }]) {
      const result = computeQuote(
        ADDRESSED,
        [
          { questionId: "q_from", address: { ...FROM_ADDRESS, ...bad } },
          { questionId: "q_bedrooms", number: 2 },
        ],
        lookupZip,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("bad-answer");
      expect(result.error.questionId).toBe("q_from");
    }
  });

  it("normalizes a lower-case state code instead of turning it away", () => {
    const result = computeQuote(
      ADDRESSED,
      [
        { questionId: "q_from", address: { ...FROM_ADDRESS, state: "mi" } },
        { questionId: "q_bedrooms", number: 2 },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answerSnapshots[0]?.address?.state).toBe("MI");
    expect(result.answerSnapshots[0]?.display).toBe(
      "123 Main St, Apt 4, Saginaw, MI 48601",
    );
  });
});

// ─── Preview mode (the live running estimate) ───────────────────────────────

/**
 * `mode: "preview"` prices a half-finished form for the running estimate. Its
 * entire job is to soften "you have not answered that yet" — and nothing else.
 * The line between the two is what these tests pin: a payload that is
 * INCOMPLETE gets a number, a payload that is WRONG still fails, in both modes.
 */
const PREVIEWABLE = defineCalculator({
  version: 1,
  questions: [
    {
      id: "q_type",
      type: "choice",
      title: "What kind of move?",
      variableName: "move_type",
      hiddenDefault: 2,
      options: [
        { id: "local", label: "Local move", value: 1 },
        { id: "long", label: "Long distance", value: 3 },
      ],
    },
    {
      id: "q_bedrooms",
      type: "number",
      title: "How many bedrooms?",
      variableName: "bedrooms",
      hiddenDefault: 4,
    },
    {
      id: "q_extras",
      type: "multiselect",
      title: "Any extras?",
      variableName: "extras",
      hiddenDefault: 500,
      options: [
        { id: "pack", label: "Packing", value: 200 },
        { id: "store", label: "Storage", value: 150 },
      ],
    },
    { id: "q_from", type: "zip", title: "Moving from" },
    { id: "q_to", type: "zip", title: "Moving to" },
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
  formula: "move_type * (bedrooms * 100 + extras + distance)",
});

const PREVIEW = { mode: "preview" } as const;

describe("computeQuote — preview mode", () => {
  it("prices an entirely empty form instead of failing on the first required question", () => {
    const strict = computeQuote(PREVIEWABLE, [], lookupZip);
    expect(strict.ok).toBe(false);
    if (strict.ok) return;
    expect(strict.error.code).toBe("missing-required");

    const preview = computeQuote(PREVIEWABLE, [], lookupZip, PREVIEW);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.variables).toEqual({
      // Single-answer types take the owner's "does not apply" value…
      move_type: 2,
      bedrooms: 4,
      // …but a multiselect takes 0, exactly as an optional one shown with
      // nothing checked does. `hiddenDefault` on a multiselect means "branched
      // away", which is a different situation from "not yet answered".
      extras: 0,
      distance: 25,
    });
    // 2 * (400 + 0 + 25) = 850
    expect(preview.estimateCents).toBe(85000);
  });

  it("uses the answers that ARE present", () => {
    const preview = computeQuote(
      PREVIEWABLE,
      [
        { questionId: "q_type", optionId: "long" },
        { questionId: "q_extras", optionIds: ["pack"] },
      ],
      lookupZip,
      PREVIEW,
    );
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.variables).toEqual({
      move_type: 3,
      bedrooms: 4,
      extras: 200,
      distance: 25,
    });
  });

  it("lets an unrecognized endpoint ZIP fall to the distance default", () => {
    // Mid-typing, "486" has already become "48699" and is not a real ZIP. The
    // running estimate must keep updating rather than blanking out.
    const answers = [
      { questionId: "q_type", optionId: "local" },
      { questionId: "q_bedrooms", number: 1 },
      { questionId: "q_extras", optionIds: ["pack"] },
      { questionId: "q_from", zip: "99999" },
      { questionId: "q_to", zip: "48602" },
    ];

    const strict = computeQuote(PREVIEWABLE, answers, lookupZip);
    expect(strict.ok).toBe(false);
    if (strict.ok) return;
    expect(strict.error.code).toBe("unknown-zip");

    const preview = computeQuote(PREVIEWABLE, answers, lookupZip, PREVIEW);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.variables.distance).toBe(25);
  });

  it("treats a half-typed address as unanswered rather than an error", () => {
    const answers = [
      { questionId: "q_from", address: { line1: "123 Main St" } },
      { questionId: "q_bedrooms", number: 2 },
    ] as unknown as QuoteWireAnswer[];

    const strict = computeQuote(ADDRESSED, answers, lookupZip);
    expect(strict.ok).toBe(false);

    const preview = computeQuote(ADDRESSED, answers, lookupZip, PREVIEW);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.variables.distance).toBe(25);
  });

  it("prices a distance off the zip-only address the preview wire sends", () => {
    // `toPreviewWireAnswers` projects an address question to `{ questionId,
    // zip }` and nothing else: a tRPC query is a GET, and the street has no
    // business in the URL of an anonymous request that fires while the visitor
    // types. That shape still has to anchor the distance, or the running
    // estimate would sit on the hiddenDefault through the whole address step.
    const answers: QuoteWireAnswer[] = [
      { questionId: "q_from", zip: "48601" },
      { questionId: "q_to", zip: "48602" },
      { questionId: "q_bedrooms", number: 2 },
    ];

    const preview = computeQuote(ADDRESSED, answers, lookupZip, PREVIEW);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.variables).toEqual({ bedrooms: 2, distance: 69.1 });
    expect(preview.estimateCents).toBe(47640);
    // A bare ZIP is not an ANSWER to an address question, so it must not reach
    // the snapshot in a half-shape. Both rows still read as unanswered.
    expect(preview.answerSnapshots[0]).toMatchObject({
      hidden: false,
      display: "—",
    });
    expect(preview.answerSnapshots[0]?.zip).toBeUndefined();
    expect(preview.answerSnapshots[0]?.address).toBeUndefined();
  });

  it("does not let a zip-only address satisfy a required one at submit", () => {
    // The other half of the same contract: preview accepts the shape because
    // preview is what sends it. A hand-crafted submit payload carrying it is a
    // required address that was never filled in.
    const result = computeQuote(
      ADDRESSED,
      [
        { questionId: "q_from", zip: "48601" },
        { questionId: "q_bedrooms", number: 2 },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("missing-required");
    expect(result.error.questionId).toBe("q_from");
  });

  it("still fails on an option id that does not exist", () => {
    // Not "incomplete" — wrong. A payload naming an option the definition does
    // not have is a bug or a probe, and softening it would let a caller learn
    // which ids are real by watching which ones still return a number.
    const result = computeQuote(
      PREVIEWABLE,
      [{ questionId: "q_type", optionId: "free-move" }],
      lookupZip,
      PREVIEW,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown-option");
  });

  it("still fails on an out-of-bounds number", () => {
    const result = computeQuote(
      MOVERS,
      [{ questionId: "q_bedrooms", number: -1 }],
      lookupZip,
      PREVIEW,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("bad-answer");
  });

  it("still fails hard on definition drift", () => {
    const drifted: QuoteCalculatorDefinition = {
      ...PREVIEWABLE,
      formula: "bedrooms * gone_missing",
    };
    const result = computeQuote(drifted, [], lookupZip, PREVIEW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("formula-failed");
  });

  it("defaults to submit mode when no options are passed", () => {
    expect(computeQuote(PREVIEWABLE, [], lookupZip).ok).toBe(false);
    expect(computeQuote(PREVIEWABLE, [], lookupZip, {}).ok).toBe(false);
    expect(
      computeQuote(PREVIEWABLE, [], lookupZip, { mode: "submit" }).ok,
    ).toBe(false);
  });

  it("keeps hidden questions hidden — preview is not a way around branching", () => {
    const result = computeQuote(
      BRANCHED,
      [{ questionId: "q_storage", optionId: "three" }],
      lookupZip,
      PREVIEW,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // q_type is unanswered, so q_storage is not visible and its smuggled
    // answer is discarded exactly as it is on the submit path.
    expect(result.variables.storage_months).toBe(99);
  });
});

// ─── Calendar-date helpers ──────────────────────────────────────────────────

/**
 * `~/lib/calendar-date` is tiny, importless and shared by the quote engine,
 * the QuickBooks mapper and browser form code — so it has no test file of its
 * own and is pinned here, next to its most safety-critical consumer (the date
 * bounds below).
 *
 * Every case is a DST or rollover trap. A `YYYY-MM-DD` string is a day on a
 * wall calendar, not an instant, and the entire module exists because JS's
 * Date happily conflates the two.
 */
describe("calendar-date", () => {
  it("accepts real dates and rejects well-shaped impossible ones", () => {
    expect(isRealCalendarDate("2026-08-26")).toBe(true);
    expect(isRealCalendarDate("2024-02-29")).toBe(true); // leap year
    expect(isRealCalendarDate("2000-02-29")).toBe(true); // /400 leap year
    expect(isRealCalendarDate("2026-02-29")).toBe(false); // not a leap year
    expect(isRealCalendarDate("1900-02-29")).toBe(false); // /100 not a leap year
    expect(isRealCalendarDate("2026-02-30")).toBe(false);
    expect(isRealCalendarDate("2026-13-45")).toBe(false);
    expect(isRealCalendarDate("2026-00-10")).toBe(false);
    expect(isRealCalendarDate("2026-04-31")).toBe(false);
  });

  it("rejects anything that is not exactly YYYY-MM-DD", () => {
    for (const junk of [
      "",
      "2026-8-26",
      "26-08-26",
      "2026/08/26",
      "2026-08-26T00:00:00Z",
      " 2026-08-26",
    ]) {
      expect(isRealCalendarDate(junk)).toBe(false);
    }
  });

  it("reads the zoned calendar date, not the UTC one, near midnight", () => {
    // 03:30 UTC is still the previous evening in Detroit. A bound measured in
    // UTC would reject a shopper's perfectly valid "today" all evening.
    const nearMidnight = new Date("2026-06-01T03:30:00Z");
    expect(zonedCalendarDate(nearMidnight, "America/Detroit")).toBe(
      "2026-05-31",
    );
    expect(zonedCalendarDate(nearMidnight, "UTC")).toBe("2026-06-01");
    // And the other direction: Tokyo is already tomorrow.
    expect(zonedCalendarDate(nearMidnight, "Asia/Tokyo")).toBe("2026-06-01");
    expect(
      zonedCalendarDate(new Date("2026-05-31T20:00:00Z"), "Asia/Tokyo"),
    ).toBe("2026-06-01");
  });

  it("falls back to UTC for a time zone it cannot read", () => {
    // A typo in `Business.timeZone` must not 500 an anonymous submission.
    expect(
      zonedCalendarDate(new Date("2026-06-01T12:00:00Z"), "Mars/Olympus"),
    ).toBe("2026-06-01");
  });

  it("adds whole calendar days across a DST transition", () => {
    // US spring-forward 2026-03-08 (23-hour local day) and fall-back
    // 2026-11-01 (25-hour local day). Both must move exactly one day.
    expect(addCalendarDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addCalendarDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addCalendarDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(addCalendarDays("2026-03-01", 30)).toBe("2026-03-31");
  });

  it("rolls over months, years and leap days", () => {
    expect(addCalendarDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addCalendarDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addCalendarDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addCalendarDays("2026-08-26", 0)).toBe("2026-08-26");
  });

  it("returns a malformed input untouched rather than inventing a date", () => {
    expect(addCalendarDays("not-a-date", 5)).toBe("not-a-date");
  });

  it("formats the local calendar date with no UTC drift", () => {
    // Whatever zone the runner is in, the local Y-M-D must match the local
    // getters — the naive `toISOString().slice(0, 10)` is what this rules out.
    const now = new Date(2026, 0, 5, 23, 30);
    expect(localCalendarDate(now)).toBe("2026-01-05");
    expect(localCalendarDate(new Date(2026, 11, 31, 23, 59))).toBe(
      "2026-12-31",
    );
  });
});

// ─── Road factor ────────────────────────────────────────────────────────────

describe("computeQuote — distance road factor", () => {
  function moversWithFactor(roadFactor: number | undefined) {
    return defineCalculator({
      version: 1,
      questions: [
        { id: "q_from", type: "zip", title: "Moving from" },
        { id: "q_to", type: "zip", title: "Moving to" },
      ],
      distances: [
        {
          id: "d_move",
          variableName: "distance",
          fromQuestionId: "q_from",
          toQuestionId: "q_to",
          hiddenDefault: 25,
          ...(roadFactor === undefined ? {} : { roadFactor }),
        },
      ],
      formula: "distance * 100",
    });
  }

  const ENDPOINTS: QuoteWireAnswer[] = [
    { questionId: "q_from", zip: "48601" },
    { questionId: "q_to", zip: "48602" },
  ];

  it("leaves stored calculators on raw straight-line miles", () => {
    // The schema default is 1, NOT the realistic 1.25, precisely so that a
    // calculator saved before this field existed keeps quoting what it quoted.
    const result = computeQuote(
      moversWithFactor(undefined),
      ENDPOINTS,
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.distance).toBe(69.1);
  });

  it("scales before rounding, so the formula reads the number that is stored", () => {
    // 69.0932… × 1.3 = 89.821… → 89.8. Rounding first (69.1 × 1.3 = 89.83)
    // would leave the formula reading a figure the snapshot never shows.
    const result = computeQuote(moversWithFactor(1.3), ENDPOINTS, lookupZip);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.distance).toBe(89.8);
    expect(result.estimateCents).toBe(898000);
  });

  it("does not scale the hiddenDefault", () => {
    // The fallback is a mileage the owner typed in directly — it is already
    // the road figure they meant, not something to inflate again.
    const result = computeQuote(
      moversWithFactor(1.25),
      [{ questionId: "q_from", zip: "48601" }],
      lookupZip,
      { mode: "preview" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.distance).toBe(25);
  });
});

// ─── Date bounds ────────────────────────────────────────────────────────────

describe("computeQuote — date bounds", () => {
  const TODAY = "2026-08-26";

  function calculatorWithDate(bounds: Record<string, unknown>) {
    return defineCalculator({
      version: 1,
      questions: [
        {
          id: "q_size",
          type: "number",
          title: "Square feet",
          variableName: "sqft",
        },
        {
          id: "q_when",
          type: "date",
          title: "Preferred date",
          ...bounds,
        },
      ],
      distances: [],
      formula: "sqft * 2",
    });
  }

  function answersFor(date: string): QuoteWireAnswer[] {
    return [
      { questionId: "q_size", number: 100 },
      { questionId: "q_when", date },
    ];
  }

  const MIN_TODAY = calculatorWithDate({ minDate: "today" });
  const HORIZON = calculatorWithDate({ maxDaysAhead: 30 });
  const UNBOUNDED = calculatorWithDate({});

  it("rejects a date before today, in the business's own calendar", () => {
    const result = computeQuote(
      MIN_TODAY,
      answersFor("2026-08-25"),
      lookupZip,
      {
        today: TODAY,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("bad-answer");
    expect(result.error.questionId).toBe("q_when");
    expect(result.error.message).toBe(
      '"Preferred date" must be today or later.',
    );
  });

  it("accepts today itself, and anything after it", () => {
    for (const date of [TODAY, "2026-08-27", "2027-01-01"]) {
      expect(
        computeQuote(MIN_TODAY, answersFor(date), lookupZip, { today: TODAY })
          .ok,
      ).toBe(true);
    }
  });

  it("treats maxDaysAhead as inclusive", () => {
    // today + 30 = 2026-09-25 is the last bookable day; 09-26 is one too far.
    expect(
      computeQuote(HORIZON, answersFor("2026-09-25"), lookupZip, {
        today: TODAY,
      }).ok,
    ).toBe(true);

    const tooFar = computeQuote(HORIZON, answersFor("2026-09-26"), lookupZip, {
      today: TODAY,
    });
    expect(tooFar.ok).toBe(false);
    if (tooFar.ok) return;
    expect(tooFar.error.code).toBe("bad-answer");
    expect(tooFar.error.message).toBe(
      '"Preferred date" must be within 30 days.',
    );
  });

  it("does not enforce bounds when `today` is not supplied", () => {
    // The escape hatch for a caller with no tenant context: degrade to
    // "accept any real date" rather than compare against the wrong day.
    expect(
      computeQuote(MIN_TODAY, answersFor("1999-01-01"), lookupZip).ok,
    ).toBe(true);
    expect(computeQuote(HORIZON, answersFor("2099-01-01"), lookupZip).ok).toBe(
      true,
    );
  });

  it("enforces bounds in preview mode too", () => {
    // A date outside the window is a bad payload, not an incomplete one.
    // Showing a live estimate for a job that cannot be booked is worse than
    // showing none.
    const result = computeQuote(
      MIN_TODAY,
      answersFor("2026-08-25"),
      lookupZip,
      {
        mode: "preview",
        today: TODAY,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("bad-answer");
  });

  it("rejects an impossible date whatever the bounds say", () => {
    for (const date of ["2026-13-45", "2026-02-30"]) {
      for (const options of [{ today: TODAY }, undefined]) {
        const result = computeQuote(
          UNBOUNDED,
          answersFor(date),
          lookupZip,
          options,
        );
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe("bad-answer");
        expect(result.error.questionId).toBe("q_when");
      }
    }
  });

  it("leaves a blank optional date alone", () => {
    // A bound is not a way to make an optional question required.
    const optional = calculatorWithDate({
      minDate: "today",
      required: false,
    });
    const result = computeQuote(
      optional,
      [{ questionId: "q_size", number: 100 }],
      lookupZip,
      { today: TODAY },
    );
    expect(result.ok).toBe(true);
  });
});

// ─── Tabs ───────────────────────────────────────────────────────────────────

/**
 * A calculator that forks at the top: "Commercial" prices per crew, and
 * "Residential" per bedroom off the shared root formula.
 *
 * Three properties are wired in deliberately so the tests below can see them
 * separately:
 *
 * - the ROOT formula names `crew` as well as `bedrooms`, so an answer smuggled
 *   in for the other tab's question would visibly move the residential price
 *   if it were not discarded;
 * - the commercial tab OVERRIDES the formula, the residential one leaves it
 *   `null` and takes the root — the two halves of the `tab.formula ??
 *   definition.formula` rule; and
 * - `q_freight` is tab-restricted AND behind a show-if, so "which reason is
 *   recorded when both would hide it?" has an answer to assert.
 */
const TABBED = defineCalculator({
  version: 2,
  screens: [
    {
      id: "s_main",
      title: "Your move",
      questions: [
        {
          id: "q_size",
          type: "number",
          title: "How many square feet?",
          variableName: "sqft",
          min: 0,
          max: 100000,
        },
        {
          id: "q_crew",
          type: "choice",
          title: "How big a crew?",
          tabIds: ["commercial"],
          variableName: "crew",
          hiddenDefault: 2,
          options: [
            { id: "small", label: "Two movers", value: 2 },
            { id: "large", label: "Six movers", value: 6 },
          ],
        },
        {
          id: "q_freight",
          type: "choice",
          title: "Freight elevator?",
          tabIds: ["commercial"],
          showIf: { questionId: "q_crew", optionId: "large" },
          required: false,
          variableName: "freight",
          hiddenDefault: 0,
          options: [
            { id: "no", label: "No elevator", value: 0 },
            { id: "yes", label: "Freight elevator", value: 50 },
          ],
        },
        {
          id: "q_bedrooms",
          type: "number",
          title: "How many bedrooms?",
          tabIds: ["residential"],
          variableName: "bedrooms",
          hiddenDefault: 1,
          min: 0,
          max: 10,
        },
      ],
    },
  ],
  distances: [],
  tabs: [
    {
      id: "commercial",
      label: "Commercial",
      formula: "sqft * 2 + crew * 100 + freight",
    },
    { id: "residential", label: "Residential", formula: null },
  ],
  tabsPrompt: "What kind of move is this?",
  formula: "sqft + bedrooms * 350 + crew * 100",
});

const COMMERCIAL = { tabId: "commercial" } as const;
const RESIDENTIAL = { tabId: "residential" } as const;

describe("computeQuote — tabs", () => {
  it("refuses a submission that names no tab", () => {
    // There is no safe default. Guessing the first tab prices a commercial job
    // at residential rates and tells nobody; dropping to "no tab" quotes the
    // visitor for a form they did not fill in.
    const result = computeQuote(
      TABBED,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_crew", optionId: "large" },
      ],
      lookupZip,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown-tab");
    expect(result.error.message).toBe("Choose an option to continue");
    // The fork is not a question, so there is nothing to route the visitor
    // back to by id — the runner sends them to the switcher.
    expect(result.error.questionId).toBeUndefined();
  });

  it("refuses a tab id that matches no tab", () => {
    // A tab deleted between page load and submit reads exactly like a crafted
    // id, and both must be refused rather than silently priced by the root
    // formula with every tab-restricted question dropped.
    const result = computeQuote(
      TABBED,
      [{ questionId: "q_size", number: 100 }],
      lookupZip,
      { tabId: "storage" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown-tab");
    expect(result.error.message).toBe("Choose an option to continue");
  });

  it("prices with the active tab's formula override", () => {
    const result = computeQuote(
      TABBED,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_crew", optionId: "large" },
        { questionId: "q_freight", optionId: "yes" },
      ],
      lookupZip,
      COMMERCIAL,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 100*2 + 6*100 + 50 = 850, from the TAB's formula — the root formula
    // would have said 100 + 1*350 + 600 = 1050.
    expect(result.estimateCents).toBe(85000);
    expect(result.formula).toBe("sqft * 2 + crew * 100 + freight");
    expect(result.tab).toEqual({ id: "commercial", label: "Commercial" });
  });

  it("prices with the root formula when the tab overrides nothing", () => {
    const result = computeQuote(
      TABBED,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_bedrooms", number: 3 },
      ],
      lookupZip,
      RESIDENTIAL,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 100 + 3*350 + 2*100 = 1350 — `crew` is the commercial-only question's
    // hiddenDefault, which is exactly what `hiddenDefault` is for.
    expect(result.estimateCents).toBe(135000);
    expect(result.formula).toBe(TABBED.formula);
    expect(result.tab).toEqual({ id: "residential", label: "Residential" });
  });

  it("discards an answer smuggled in for the other tab's question", () => {
    // The anti-tamper property, extended to tabs. `crew` is priced by the ROOT
    // formula, so a crafted payload that got `q_crew` counted on the
    // residential tab would move the price by $400 — it must come out
    // identical to the submission that never sent it.
    const clean = computeQuote(
      TABBED,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_bedrooms", number: 3 },
      ],
      lookupZip,
      RESIDENTIAL,
    );
    const smuggled = computeQuote(
      TABBED,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_bedrooms", number: 3 },
        { questionId: "q_crew", optionId: "large" },
      ],
      lookupZip,
      RESIDENTIAL,
    );
    expect(clean.ok).toBe(true);
    expect(smuggled.ok).toBe(true);
    if (!clean.ok || !smuggled.ok) return;
    expect(smuggled.variables.crew).toBe(2);
    expect(smuggled.estimateCents).toBe(clean.estimateCents);
  });

  it("never fails a required question the active tab does not ask", () => {
    // `q_bedrooms` is required, and the commercial submission below says
    // nothing about it. A tab-hidden question is hidden, full stop — the same
    // as one behind an unmet show-if.
    const result = computeQuote(
      TABBED,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_crew", optionId: "small" },
      ],
      lookupZip,
      COMMERCIAL,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables.bedrooms).toBe(1);
  });

  it("records WHY each hidden row is hidden", () => {
    const result = computeQuote(
      TABBED,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_bedrooms", number: 3 },
      ],
      lookupZip,
      RESIDENTIAL,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const reasons = Object.fromEntries(
      result.answerSnapshots.map((row) => [row.questionId, row.hiddenReason]),
    );
    expect(reasons).toEqual({
      q_size: undefined,
      // Both are hidden by the TAB — `q_freight`'s show-if is unmet too, but
      // the tab is the reason the visitor was never near it, and that is the
      // one the owner needs six months later.
      q_crew: "tab",
      q_freight: "tab",
      q_bedrooms: undefined,
    });
  });

  it("says 'branch' for a show-if hidden on the tab that DOES ask it", () => {
    const result = computeQuote(
      TABBED,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_crew", optionId: "small" },
      ],
      lookupZip,
      COMMERCIAL,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const freight = result.answerSnapshots.find(
      (row) => row.questionId === "q_freight",
    );
    expect(freight).toMatchObject({ hidden: true, hiddenReason: "branch" });
    const bedrooms = result.answerSnapshots.find(
      (row) => row.questionId === "q_bedrooms",
    );
    expect(bedrooms).toMatchObject({ hidden: true, hiddenReason: "tab" });
  });

  it("leaves the hiddenReason KEY off a visible row entirely", () => {
    // Not cosmetic: snapshot rows are stored verbatim, and every row written
    // before tabs existed has no such key. A visible row must stay
    // byte-identical to what it was.
    const result = computeQuote(
      TABBED,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_bedrooms", number: 3 },
      ],
      lookupZip,
      RESIDENTIAL,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const row of result.answerSnapshots.filter((r) => !r.hidden)) {
      expect(Object.hasOwn(row, "hiddenReason")).toBe(false);
    }
    for (const row of result.answerSnapshots.filter((r) => r.hidden)) {
      expect(Object.hasOwn(row, "hiddenReason")).toBe(true);
    }
  });
});

describe("computeQuote — tabs in preview mode", () => {
  it("prices with the root formula and unrestricted questions only", () => {
    // Lenient for the same reason a missing required answer is: the running
    // estimate exists to update mid-flow, and blanking it out because the
    // visitor has not clicked a tab yet is worse than a conservative number.
    const preview = computeQuote(
      TABBED,
      [{ questionId: "q_size", number: 100 }],
      lookupZip,
      PREVIEW,
    );
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.tab).toBeNull();
    expect(preview.formula).toBe(TABBED.formula);
    // Every tab-restricted question took its hiddenDefault: 100 + 1*350 +
    // 2*100 = 650.
    expect(preview.variables).toEqual({
      sqft: 100,
      bedrooms: 1,
      crew: 2,
      freight: 0,
    });
    expect(preview.estimateCents).toBe(65000);
  });

  it("marks every tab-restricted row hidden with reason 'tab'", () => {
    const preview = computeQuote(
      TABBED,
      [{ questionId: "q_size", number: 100 }],
      lookupZip,
      PREVIEW,
    );
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    const hidden = preview.answerSnapshots.filter((row) => row.hidden);
    expect(hidden.map((row) => row.questionId)).toEqual([
      "q_crew",
      "q_freight",
      "q_bedrooms",
    ]);
    expect(hidden.every((row) => row.hiddenReason === "tab")).toBe(true);
  });

  it("uses the tab's override once the visitor has picked one", () => {
    const preview = computeQuote(
      TABBED,
      [
        { questionId: "q_size", number: 100 },
        { questionId: "q_crew", optionId: "large" },
      ],
      lookupZip,
      { ...PREVIEW, ...COMMERCIAL },
    );
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.tab).toEqual({ id: "commercial", label: "Commercial" });
    // 100*2 + 6*100 + 0 = 800; `freight` is revealed but unanswered, so it
    // takes its hiddenDefault exactly as an optional blank does.
    expect(preview.estimateCents).toBe(80000);
  });

  it("ignores an unknown tab id rather than refusing", () => {
    const preview = computeQuote(
      TABBED,
      [{ questionId: "q_size", number: 100 }],
      lookupZip,
      { ...PREVIEW, tabId: "storage" },
    );
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.tab).toBeNull();
    expect(preview.formula).toBe(TABBED.formula);
  });
});

describe("computeQuote — tabs and ZIP narrowing", () => {
  /**
   * The distance row is declared once and priced by ONE of the two tabs. Which
   * makes the point: "does an unrecognized ZIP fail this submission?" is a
   * question about the ACTIVE formula, not the root one — a calculator whose
   * flat-rate tab never reads the mileage must not turn a visitor away over a
   * ZIP that changes no number on the tab they are standing on.
   */
  const TABBED_DISTANCE = defineCalculator({
    version: 2,
    screens: [
      {
        id: "s_main",
        questions: [
          {
            id: "q_size",
            type: "number",
            title: "Square feet",
            variableName: "sqft",
          },
          { id: "q_from", type: "zip", title: "Moving from", required: false },
          { id: "q_to", type: "zip", title: "Moving to", required: false },
        ],
      },
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
    tabs: [
      { id: "mileage", label: "By the mile", formula: null },
      { id: "flat", label: "Flat rate", formula: "sqft * 2" },
    ],
    tabsPrompt: "",
    formula: "sqft * 2 + distance * 4",
  });

  /** `q_from` is answered with a ZIP the table does not know. */
  const UNKNOWN_ENDPOINT: QuoteWireAnswer[] = [
    { questionId: "q_size", number: 100 },
    { questionId: "q_from", zip: "99999" },
    { questionId: "q_to", zip: "48602" },
  ];

  it("fails on an unknown endpoint ZIP when the ACTIVE formula reads the distance", () => {
    const result = computeQuote(TABBED_DISTANCE, UNKNOWN_ENDPOINT, lookupZip, {
      tabId: "mileage",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown-zip");
    expect(result.error.questionId).toBe("q_from");
  });

  it("tolerates that same ZIP on a tab whose override never reads it", () => {
    // Same definition, same answers, same distance row — only the tab differs.
    const result = computeQuote(TABBED_DISTANCE, UNKNOWN_ENDPOINT, lookupZip, {
      tabId: "flat",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.formula).toBe("sqft * 2");
    // The variable still resolves — the snapshot is a record of what the
    // calculator computed — it just changes no number here.
    expect(result.variables.distance).toBe(25);
    expect(result.estimateCents).toBe(20000);
  });
});

describe("computeQuote — a calculator with no tabs", () => {
  it("reports tab: null and the root formula", () => {
    const result = computeQuote(MOVERS, MOVERS_ANSWERS, lookupZip);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tab).toBeNull();
    expect(result.formula).toBe(MOVERS.formula);
  });

  it("ignores a stray tabId outright rather than failing on it", () => {
    // An older embed, or a hand-built payload. A tab-less calculator has no
    // fork to resolve, so there is nothing for a stray id to be wrong about —
    // and letting it reach the lookup would be a way to break a calculator
    // that has no tabs at all.
    const withStray = computeQuote(MOVERS, MOVERS_ANSWERS, lookupZip, {
      tabId: "commercial",
    });
    const without = computeQuote(MOVERS, MOVERS_ANSWERS, lookupZip);
    expect(withStray.ok).toBe(true);
    expect(without.ok).toBe(true);
    if (!withStray.ok || !without.ok) return;
    expect(withStray.estimateCents).toBe(without.estimateCents);
    expect(withStray.tab).toBeNull();
    expect(withStray.formula).toBe(MOVERS.formula);
  });

  it("still records 'branch' as the reason for a show-if hidden row", () => {
    // The pre-tabs hidden row, now carrying a reason. `"branch"` is the only
    // one reachable without tabs, and it must not become `"tab"` just because
    // the field exists.
    const result = computeQuote(
      TWO_SCREENS,
      [{ questionId: "q_type", optionId: "local" }],
      lookupZip,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const hidden = result.answerSnapshots.filter((row) => row.hidden);
    expect(hidden.map((row) => row.questionId)).toEqual([
      "q_storage",
      "q_rush",
    ]);
    expect(hidden.every((row) => row.hiddenReason === "branch")).toBe(true);
  });
});

// ─── finalizeEstimateCents ──────────────────────────────────────────────────

describe("finalizeEstimateCents", () => {
  /**
   * The money endgame, extracted so `computeQuote` and any future re-pricing
   * caller cannot drift apart. A `failure` here is never an error — the lead
   * is still captured; it only explains a blank estimate.
   */
  it("converts dollars to whole cents", () => {
    expect(finalizeEstimateCents(3264.6)).toEqual({ estimateCents: 326460 });
    expect(finalizeEstimateCents(0.005)).toEqual({ estimateCents: 1 });
  });

  it("nulls a below-zero total rather than quoting a free job", () => {
    const result = finalizeEstimateCents(-1.2);
    expect(result.estimateCents).toBeNull();
    expect(result.failure?.code).toBe("value-error");
    expect(result.failure?.message).toContain("negative");
  });

  it("normalises float dust just below zero to a real $0.00", () => {
    // `Math.round(-0.4)` is `-0`, and `-0 < 0` is false — so this is a genuine
    // zero price, not a discount overrun. It must come out as a plain `0`,
    // since `Object.is(-0, 0)` is false and `customerEstimateFrom` treats
    // exact zero as a price to show.
    const result = finalizeEstimateCents(-0.004);
    expect(result.estimateCents).toBe(0);
    expect(Object.is(result.estimateCents, -0)).toBe(false);
    expect(result.failure).toBeUndefined();
  });

  it("keeps an exact zero as a price", () => {
    expect(finalizeEstimateCents(0)).toEqual({ estimateCents: 0 });
  });

  it("nulls anything past the cap rather than clamping to it", () => {
    // Clamping would print a confident "$1,000,000.00" that no configured
    // price produces. `QUOTE_MAX_FINAL_CENTS` is also the int4 guard on
    // `QuoteSubmission.estimateCents`.
    const atCap = finalizeEstimateCents(QUOTE_MAX_FINAL_CENTS / 100);
    expect(atCap.estimateCents).toBe(QUOTE_MAX_FINAL_CENTS);

    const overCap = finalizeEstimateCents(QUOTE_MAX_FINAL_CENTS / 100 + 1);
    expect(overCap.estimateCents).toBeNull();
    expect(overCap.failure?.code).toBe("over-cap");
  });
});
