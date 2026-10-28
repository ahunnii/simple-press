import { describe, expect, it } from "vitest";

import { deriveDescription } from "./derive-description";

describe("deriveDescription", () => {
  it("returns short text unchanged", () => {
    const text = "Returns accepted within 30 days of delivery.";
    expect(deriveDescription(text)).toBe(text);
  });

  it("returns text of exactly max length unchanged", () => {
    const text = "a".repeat(155);
    expect(deriveDescription(text)).toBe(text);
  });

  it("collapses whitespace and newlines", () => {
    expect(
      deriveDescription("  Returns\n\n  accepted\twithin   30 days  "),
    ).toBe("Returns accepted within 30 days");
  });

  it("returns empty string for empty, null, or whitespace-only input", () => {
    expect(deriveDescription("")).toBe("");
    expect(deriveDescription(null)).toBe("");
    expect(deriveDescription(undefined)).toBe("");
    expect(deriveDescription(" \n\t ")).toBe("");
  });

  it("cuts long text at a word boundary and appends an ellipsis", () => {
    const text =
      "We accept returns within thirty days of delivery for unused items in original packaging. Refunds are issued to the original payment method once the item has been inspected.";
    const result = deriveDescription(text);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(155);
    // Must not end mid-word: the character before the ellipsis is the end of a
    // word from the source, and the next source character was a space.
    const body = result.slice(0, -1);
    expect(text.startsWith(body)).toBe(true);
    expect(text.charAt(body.length)).toBe(" ");
  });

  it("keeps total length within max, including the ellipsis", () => {
    const text = "word ".repeat(100).trim();
    const result = deriveDescription(text, 40);
    expect(result).toBe("word word word word word word word word…");
    expect(result.length).toBe(40);
  });

  it("cuts at the last full word when the boundary falls exactly at max", () => {
    // Character at index max-1 is a space, so the first max-1 chars are whole words.
    const text = "alpha beta gamma delta";
    expect(deriveDescription(text, 11)).toBe("alpha beta…");
  });

  it("hard-cuts a single word longer than max", () => {
    const text = "x".repeat(200);
    const result = deriveDescription(text);
    expect(result).toBe(`${"x".repeat(154)}…`);
    expect(result.length).toBe(155);
  });

  it("drops a leading last-updated / effective date line", () => {
    expect(
      deriveDescription(
        "Last updated: 4/12/2026 Returns accepted within 30 days.",
      ),
    ).toBe("Returns accepted within 30 days.");
    expect(
      deriveDescription(
        "Effective date: October 1, 2026. We respect your privacy.",
      ),
    ).toBe("We respect your privacy.");
    expect(deriveDescription("Updated policy terms apply.")).toBe(
      "Updated policy terms apply.",
    );
  });
});
