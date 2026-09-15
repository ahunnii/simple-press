import { describe, expect, it } from "vitest";

import { firstNonBlank, preferNonBlank } from "./blank";

describe("firstNonBlank", () => {
  it("returns the first non-blank candidate, trimmed", () => {
    expect(firstNonBlank(null, undefined, "  ", " Bloom ", "x")).toBe("Bloom");
  });

  it("treats a cleared empty string as absent (the ?? trap)", () => {
    expect(firstNonBlank("", "fallback")).toBe("fallback");
  });

  it("returns undefined when every candidate is blank", () => {
    expect(firstNonBlank(undefined, null, "", "   ")).toBeUndefined();
  });
});

describe("preferNonBlank", () => {
  it("prefers a trimmed non-blank value", () => {
    expect(preferNonBlank(" Shop ", "Store")).toBe("Shop");
  });

  it("falls back on null, undefined, empty and whitespace", () => {
    expect(preferNonBlank(null, "Store")).toBe("Store");
    expect(preferNonBlank(undefined, "Store")).toBe("Store");
    expect(preferNonBlank("", "Store")).toBe("Store");
    expect(preferNonBlank("  ", "Store")).toBe("Store");
  });
});
