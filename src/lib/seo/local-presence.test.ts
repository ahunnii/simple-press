import { describe, expect, it } from "vitest";

import {
  LOCAL_PRESENCE_MODES,
  normalizeAreaServed,
  parseLocalPresence,
} from "./local-presence";

describe("parseLocalPresence", () => {
  it("returns each known mode unchanged", () => {
    for (const mode of LOCAL_PRESENCE_MODES) {
      expect(parseLocalPresence(mode)).toBe(mode);
    }
  });

  it("falls back to 'none' for unknown values", () => {
    expect(parseLocalPresence("physical")).toBe("none");
    expect(parseLocalPresence("Storefront")).toBe("none"); // case-sensitive
    expect(parseLocalPresence("")).toBe("none");
  });

  it("falls back to 'none' for null/undefined", () => {
    expect(parseLocalPresence(null)).toBe("none");
    expect(parseLocalPresence(undefined)).toBe("none");
  });
});

describe("normalizeAreaServed", () => {
  it("trims whitespace", () => {
    expect(normalizeAreaServed(["  Detroit  ", " Ferndale"])).toEqual([
      "Detroit",
      "Ferndale",
    ]);
  });

  it("drops blank entries", () => {
    expect(normalizeAreaServed(["Detroit", "  ", "", "Ferndale"])).toEqual([
      "Detroit",
      "Ferndale",
    ]);
  });

  it("dedupes case-insensitively, keeping the first spelling", () => {
    expect(normalizeAreaServed(["Detroit", "detroit", "DETROIT"])).toEqual([
      "Detroit",
    ]);
  });

  it("caps the list at 20 entries", () => {
    const input = Array.from({ length: 25 }, (_, i) => `City ${i}`);
    const result = normalizeAreaServed(input);
    expect(result).toHaveLength(20);
    expect(result).toEqual(input.slice(0, 20));
  });

  it("caps each entry at 80 characters", () => {
    const long = "x".repeat(120);
    const result = normalizeAreaServed([long]);
    expect(result).toEqual([long.slice(0, 80)]);
    expect(result[0]).toHaveLength(80);
  });

  it("returns an empty array for empty input", () => {
    expect(normalizeAreaServed([])).toEqual([]);
  });
});
