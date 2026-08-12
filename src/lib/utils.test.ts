import { describe, expect, it } from "vitest";

import { roundToCents } from "./utils";

describe("roundToCents", () => {
  it("correctly rounds 12.555 to 12.56 (float precision case)", () => {
    expect(roundToCents(12.555)).toBe(12.56);
  });

  it("correctly rounds 12.5 to 12.5", () => {
    expect(roundToCents(12.5)).toBe(12.5);
  });

  it("correctly rounds 0.1 + 0.2 to 0.3", () => {
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
  });

  it("correctly rounds 19.99 to 19.99", () => {
    expect(roundToCents(19.99)).toBe(19.99);
  });

  it("correctly rounds 0 to 0", () => {
    expect(roundToCents(0)).toBe(0);
  });

  it("correctly rounds 99999.999 to 100000", () => {
    expect(roundToCents(99999.999)).toBe(100000);
  });
});
