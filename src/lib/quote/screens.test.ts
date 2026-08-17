import { describe, expect, it } from "vitest";

import { flattenScreens, visibleScreensFor } from "./screens";

/**
 * These two helpers decide the ORDER questions are enumerated in, and that
 * order is load-bearing in three places that must agree: the validator's
 * "comes before" show-if rule, `resolveVisibility`'s single forward pass, and
 * `computeQuote`'s snapshot rows. A different flattening anywhere means a
 * question the owner saved happily resolves to permanently-hidden in front of
 * a customer.
 */

type Q = { id: string; label?: string };
type Screen = { id: string; title?: string | null; questions: Q[] };

function screens(): Screen[] {
  return [
    { id: "s1", title: "Basics", questions: [{ id: "a" }, { id: "b" }] },
    { id: "s2", questions: [{ id: "c" }] },
    { id: "s3", questions: [{ id: "d" }, { id: "e" }] },
  ];
}

describe("flattenScreens", () => {
  it("returns every question in screen order, then in-screen order", () => {
    expect(flattenScreens(screens()).map((q) => q.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("returns an empty list for no screens", () => {
    expect(flattenScreens([])).toEqual([]);
  });

  it("preserves question identity rather than copying", () => {
    // Callers put these straight into React keys and Map lookups.
    const source = screens();
    const flat = flattenScreens(source);
    expect(flat[0]).toBe(source[0]?.questions[0]);
    expect(flat[4]).toBe(source[2]?.questions[1]);
  });
});

describe("visibleScreensFor", () => {
  function visibility(entries: Record<string, boolean>): Map<string, boolean> {
    return new Map(Object.entries(entries));
  }

  it("keeps only the visible questions on each screen", () => {
    const result = visibleScreensFor(
      screens(),
      visibility({ a: true, b: false, c: true, d: true, e: true }),
    );
    expect(result.map((screen) => screen.id)).toEqual(["s1", "s2", "s3"]);
    expect(result[0]?.questions.map((q) => q.id)).toEqual(["a"]);
  });

  it("DROPS a screen whose questions are all hidden", () => {
    // A branch that hides every question on a step must skip the step, not
    // render a heading with nothing under it — and "Step X of N" has to count
    // only the steps the visitor will really see.
    const result = visibleScreensFor(
      screens(),
      visibility({ a: true, b: true, c: false, d: true, e: true }),
    );
    expect(result.map((screen) => screen.id)).toEqual(["s1", "s3"]);
  });

  it("treats a question missing from the map as hidden (fail closed)", () => {
    const result = visibleScreensFor(screens(), visibility({ a: true }));
    expect(result.map((screen) => screen.id)).toEqual(["s1"]);
    expect(result[0]?.questions.map((q) => q.id)).toEqual(["a"]);
  });

  it("returns an untouched screen by identity when nothing is filtered", () => {
    // Keeps React keys and memo comparisons stable for the common
    // no-branching case.
    const source = screens();
    const result = visibleScreensFor(
      source,
      visibility({ a: true, b: true, c: true, d: true, e: true }),
    );
    expect(result[0]).toBe(source[0]);
    expect(result[2]).toBe(source[2]);
  });

  it("carries the screen's own fields onto a filtered copy", () => {
    const result = visibleScreensFor(
      screens(),
      visibility({ a: true, b: false }),
    );
    expect(result[0]?.title).toBe("Basics");
    expect(result[0]?.id).toBe("s1");
  });

  it("never mutates the input", () => {
    const source = screens();
    visibleScreensFor(source, visibility({ a: true }));
    expect(source[0]?.questions).toHaveLength(2);
    expect(source).toHaveLength(3);
  });

  it("round-trips with flattenScreens to the visible question list", () => {
    const flat = flattenScreens(
      visibleScreensFor(
        screens(),
        visibility({ a: true, b: false, c: false, d: false, e: true }),
      ),
    );
    expect(flat.map((q) => q.id)).toEqual(["a", "e"]);
  });
});
