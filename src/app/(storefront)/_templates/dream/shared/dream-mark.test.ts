import { describe, expect, it } from "vitest";

import { dreamMarkUrlVar } from "./dream-mark";

describe("dreamMarkUrlVar", () => {
  it("returns null when no logo is uploaded", () => {
    expect(dreamMarkUrlVar(undefined)).toBeNull();
    expect(dreamMarkUrlVar(null)).toBeNull();
    expect(dreamMarkUrlVar("   ")).toBeNull();
  });

  it("wraps a plain URL in a quoted css url()", () => {
    expect(dreamMarkUrlVar("https://cdn.example.com/logo.png")).toBe(
      'url("https://cdn.example.com/logo.png")',
    );
  });

  it("escapes quotes and backslashes so the string can't be broken out of", () => {
    expect(dreamMarkUrlVar('https://x.test/a"b\\c.png')).toBe(
      'url("https://x.test/a\\22 b\\5c c.png")',
    );
  });

  it("drops control characters", () => {
    expect(dreamMarkUrlVar("https://x.test/a\nb.png")).toBe(
      'url("https://x.test/ab.png")',
    );
  });
});
