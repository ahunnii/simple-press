import { describe, expect, it } from "vitest";

import type { VisibilityQuestion } from "./visibility";

import { resolveVisibility, tabApplies } from "./visibility";

/**
 * `visibility.ts` is the ONE rule shared by the storefront runner (what the
 * visitor is asked), `computeQuote` (which answers count and which variables
 * fall back to `hiddenDefault`) and the builder's test panel. These tests are
 * written from that angle: every case below is a place where those three
 * drifting apart would mean a visitor is priced for a form they did not fill
 * in, or asked a question the server then throws away.
 *
 * Nothing here imports zod, the validator module or anything else the client
 * bundle would have to pay for — same constraint the module itself is under.
 */

/** No choice/dropdown has been answered. */
const nothingSelected = () => undefined;

/** Answers as a plain record, so each test reads as a table. */
function selectionsFrom(
  selected: Record<string, string>,
): (questionId: string) => string | undefined {
  return (questionId) => selected[questionId];
}

// ─── tabApplies ─────────────────────────────────────────────────────────────

describe("tabApplies", () => {
  /**
   * The truth table in full. The load-bearing row is the LAST group: a
   * question restricted to a tab, with no tab active, does NOT apply. "No tab
   * chosen" must not read as a wildcard, or the preview path (which tolerates
   * a missing tab) would ask every question on every fork at once.
   */
  it("treats undefined tabIds as 'every tab'", () => {
    expect(tabApplies(undefined, null)).toBe(true);
    expect(tabApplies(undefined, "commercial")).toBe(true);
  });

  it("treats an empty tabIds array as 'every tab'", () => {
    // This is the no-op that keeps every calculator built before tabs existed
    // working untouched: the schema default is `[]` on every question.
    expect(tabApplies([], null)).toBe(true);
    expect(tabApplies([], "commercial")).toBe(true);
    expect(tabApplies([], "residential")).toBe(true);
  });

  it("applies only on the listed tab", () => {
    expect(tabApplies(["commercial"], "commercial")).toBe(true);
    expect(tabApplies(["commercial"], "residential")).toBe(false);
  });

  it("applies on any of several listed tabs", () => {
    const both = ["commercial", "residential"];
    expect(tabApplies(both, "commercial")).toBe(true);
    expect(tabApplies(both, "residential")).toBe(true);
    expect(tabApplies(both, "storage")).toBe(false);
  });

  it("does not apply when no tab is active", () => {
    expect(tabApplies(["commercial"], null)).toBe(false);
    expect(tabApplies(["commercial", "residential"], null)).toBe(false);
  });

  it("fails closed on a stale tab id pointing at a deleted tab", () => {
    // The owner deleted the "storage" tab; a question still lists it. The
    // question is hidden on EVERY tab rather than leaking onto one it was
    // never on — the same stance a dangling `showIf` takes, and for the same
    // reason: a drifted definition should quietly drop a question instead of
    // taking the storefront page down or asking the wrong half of the flow.
    expect(tabApplies(["storage"], "commercial")).toBe(false);
    expect(tabApplies(["storage"], "residential")).toBe(false);
    expect(tabApplies(["storage"], null)).toBe(false);
  });
});

// ─── resolveVisibility: tabs ────────────────────────────────────────────────

describe("resolveVisibility — tabs", () => {
  const QUESTIONS: VisibilityQuestion[] = [
    { id: "q_always" },
    { id: "q_commercial", tabIds: ["commercial"] },
    { id: "q_residential", tabIds: ["residential"] },
  ];

  it("shows only the active tab's questions, plus the unrestricted ones", () => {
    const commercial = resolveVisibility(
      QUESTIONS,
      nothingSelected,
      "commercial",
    );
    expect(commercial.get("q_always")).toBe(true);
    expect(commercial.get("q_commercial")).toBe(true);
    expect(commercial.get("q_residential")).toBe(false);

    const residential = resolveVisibility(
      QUESTIONS,
      nothingSelected,
      "residential",
    );
    expect(residential.get("q_always")).toBe(true);
    expect(residential.get("q_commercial")).toBe(false);
    expect(residential.get("q_residential")).toBe(true);
  });

  it("shows only unrestricted questions when no tab is active", () => {
    // The conservative reading `computeQuote`'s preview mode leans on: with no
    // tab picked, the running estimate can only UNDER-ask.
    const none = resolveVisibility(QUESTIONS, nothingSelected, null);
    expect(none.get("q_always")).toBe(true);
    expect(none.get("q_commercial")).toBe(false);
    expect(none.get("q_residential")).toBe(false);
  });

  it("hides a question whose tabIds all point at deleted tabs", () => {
    const withStale: VisibilityQuestion[] = [
      { id: "q_always" },
      { id: "q_stale", tabIds: ["deleted_tab"] },
    ];
    for (const activeTabId of ["commercial", "residential", null]) {
      const visibility = resolveVisibility(
        withStale,
        nothingSelected,
        activeTabId,
      );
      expect(visibility.get("q_stale")).toBe(false);
      expect(visibility.get("q_always")).toBe(true);
    }
  });
});

// ─── resolveVisibility: tabs × show-if ──────────────────────────────────────

describe("resolveVisibility — tabs combined with show-if", () => {
  /**
   * `q_crew` needs BOTH gates: the commercial tab, and "long distance" picked
   * on `q_type`. Either one alone is not enough — which is the whole point of
   * keeping the two rules in one function rather than letting the runner check
   * the tab and the server check the show-if.
   */
  const QUESTIONS: VisibilityQuestion[] = [
    { id: "q_type" },
    {
      id: "q_crew",
      tabIds: ["commercial"],
      showIf: { questionId: "q_type", optionId: "long" },
    },
  ];

  it("requires the tab AND the selection", () => {
    const bothMet = resolveVisibility(
      QUESTIONS,
      selectionsFrom({ q_type: "long" }),
      "commercial",
    );
    expect(bothMet.get("q_crew")).toBe(true);
  });

  it("hides it on the right tab with the wrong selection", () => {
    const wrongOption = resolveVisibility(
      QUESTIONS,
      selectionsFrom({ q_type: "local" }),
      "commercial",
    );
    expect(wrongOption.get("q_crew")).toBe(false);
  });

  it("hides it with the right selection on the wrong tab", () => {
    const wrongTab = resolveVisibility(
      QUESTIONS,
      selectionsFrom({ q_type: "long" }),
      "residential",
    );
    expect(wrongTab.get("q_crew")).toBe(false);
  });

  it("hides it with the right selection and no tab at all", () => {
    const noTab = resolveVisibility(
      QUESTIONS,
      selectionsFrom({ q_type: "long" }),
      null,
    );
    expect(noTab.get("q_crew")).toBe(false);
  });
});

// ─── resolveVisibility: transitivity through a tab-hidden source ────────────

describe("resolveVisibility — a tab-hidden show-if source", () => {
  /**
   * The anti-tamper case. `q_dock` is commercial-only; `q_lift` reveals off
   * `q_dock`. On the residential tab a crafted payload can still carry a stale
   * `q_dock: "yes"` — and `q_lift` must STILL be hidden, because its source is
   * not visible. Reading the raw selection here instead of the resolved
   * visibility is exactly how a forked calculator would end up pricing one
   * half of the business with the other half's questions.
   */
  const QUESTIONS: VisibilityQuestion[] = [
    { id: "q_dock", tabIds: ["commercial"] },
    { id: "q_lift", showIf: { questionId: "q_dock", optionId: "yes" } },
  ];

  const STALE_SELECTION = selectionsFrom({ q_dock: "yes" });

  it("hides the dependent on another tab even with the source answered", () => {
    const residential = resolveVisibility(
      QUESTIONS,
      STALE_SELECTION,
      "residential",
    );
    expect(residential.get("q_dock")).toBe(false);
    expect(residential.get("q_lift")).toBe(false);
  });

  it("hides the dependent with no tab active even with the source answered", () => {
    const none = resolveVisibility(QUESTIONS, STALE_SELECTION, null);
    expect(none.get("q_dock")).toBe(false);
    expect(none.get("q_lift")).toBe(false);
  });

  it("shows both once the source's own tab is active", () => {
    const commercial = resolveVisibility(
      QUESTIONS,
      STALE_SELECTION,
      "commercial",
    );
    expect(commercial.get("q_dock")).toBe(true);
    expect(commercial.get("q_lift")).toBe(true);
  });

  it("propagates down a longer chain", () => {
    const chain: VisibilityQuestion[] = [
      { id: "q_a", tabIds: ["commercial"] },
      { id: "q_b", showIf: { questionId: "q_a", optionId: "yes" } },
      { id: "q_c", showIf: { questionId: "q_b", optionId: "yes" } },
    ];
    const residential = resolveVisibility(
      chain,
      selectionsFrom({ q_a: "yes", q_b: "yes" }),
      "residential",
    );
    expect([...residential.values()]).toEqual([false, false, false]);
  });
});

// ─── resolveVisibility: the pre-tabs behavior, unchanged ────────────────────

describe("resolveVisibility — without tabs", () => {
  /**
   * Everything below predates tabs and must behave identically with the third
   * argument omitted. A calculator stored before tabs existed has `tabIds`
   * absent on every question and no tab to pass, so this IS the production
   * path for almost every calculator in the database.
   */
  const QUESTIONS: VisibilityQuestion[] = [
    { id: "q_type" },
    { id: "q_storage", showIf: { questionId: "q_type", optionId: "long" } },
    { id: "q_months", showIf: { questionId: "q_storage", optionId: "yes" } },
  ];

  it("shows a question with no showIf", () => {
    const visibility = resolveVisibility(QUESTIONS, nothingSelected);
    expect(visibility.get("q_type")).toBe(true);
  });

  it("hides a showIf question until its condition is met", () => {
    expect(
      resolveVisibility(QUESTIONS, selectionsFrom({ q_type: "local" })).get(
        "q_storage",
      ),
    ).toBe(false);
    expect(
      resolveVisibility(QUESTIONS, selectionsFrom({ q_type: "long" })).get(
        "q_storage",
      ),
    ).toBe(true);
  });

  it("hides a dependent whose source is itself hidden, stale answer and all", () => {
    const visibility = resolveVisibility(
      QUESTIONS,
      selectionsFrom({ q_type: "local", q_storage: "yes" }),
    );
    expect(visibility.get("q_storage")).toBe(false);
    expect(visibility.get("q_months")).toBe(false);
  });

  it("fails closed on a dangling showIf target", () => {
    const dangling: VisibilityQuestion[] = [
      { id: "q_orphan", showIf: { questionId: "q_gone", optionId: "yes" } },
    ];
    expect(
      resolveVisibility(dangling, selectionsFrom({ q_gone: "yes" })).get(
        "q_orphan",
      ),
    ).toBe(false);
  });

  it("fails closed on a FORWARD showIf reference", () => {
    // The validator rejects this at save time; a hand-edited or pre-validator
    // definition still has to resolve to something, and "hidden" is the safe
    // something.
    const forward: VisibilityQuestion[] = [
      { id: "q_first", showIf: { questionId: "q_second", optionId: "yes" } },
      { id: "q_second" },
    ];
    expect(
      resolveVisibility(forward, selectionsFrom({ q_second: "yes" })).get(
        "q_first",
      ),
    ).toBe(false);
  });

  it("resolves identically whether the tab argument is omitted or null", () => {
    const selections = selectionsFrom({ q_type: "long", q_storage: "yes" });
    expect([...resolveVisibility(QUESTIONS, selections)]).toEqual([
      ...resolveVisibility(QUESTIONS, selections, null),
    ]);
  });

  it("ignores the active tab entirely when no question is restricted", () => {
    // A question list with no `tabIds` anywhere must not change behavior just
    // because some OTHER question on the calculator has a tab.
    const selections = selectionsFrom({ q_type: "long", q_storage: "yes" });
    expect([...resolveVisibility(QUESTIONS, selections, "commercial")]).toEqual(
      [...resolveVisibility(QUESTIONS, selections)],
    );
  });
});
