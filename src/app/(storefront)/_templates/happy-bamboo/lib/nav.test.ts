import { describe, expect, it } from "vitest";

import { HB_DEFAULT_NAV, resolveHappyBambooNav } from "./nav";

// Sanitizing, active-state, and group-entry behavior is covered by the shared
// `_components/nav/resolve-nav.test.ts`; this only pins the default binding.
describe("resolveHappyBambooNav", () => {
  it("falls back to HB_DEFAULT_NAV only for a missing / non-array value", () => {
    expect(resolveHappyBambooNav(null)).toBe(HB_DEFAULT_NAV);
    expect(resolveHappyBambooNav(undefined)).toBe(HB_DEFAULT_NAV);
    expect(resolveHappyBambooNav("junk")).toBe(HB_DEFAULT_NAV);
  });

  it("treats a saved empty list as 'no links'", () => {
    expect(resolveHappyBambooNav([])).toEqual([]);
  });
});
