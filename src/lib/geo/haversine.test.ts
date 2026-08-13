import { describe, expect, it } from "vitest";

import { haversineMiles } from "./haversine";

/**
 * `haversineMiles` is the straight-line distance behind every quote
 * calculator distance variable. Its output is snapshotted onto stored quotes,
 * so it has to be stable and symmetric, not merely "about right".
 */
describe("haversineMiles", () => {
  const NYC = { lat: 40.7128, lng: -74.006 };
  const LA = { lat: 34.0522, lng: -118.2437 };

  it("matches the published NYC ↔ LA great-circle distance within 1%", () => {
    // ~2445 statute miles is the standard cited figure for this pair.
    const miles = haversineMiles(NYC, LA);
    expect(miles).toBeGreaterThan(2445 * 0.99);
    expect(miles).toBeLessThan(2445 * 1.01);
  });

  it("returns exactly 0 for identical points", () => {
    expect(haversineMiles(NYC, { ...NYC })).toBe(0);
    expect(haversineMiles({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
  });

  it("is symmetric", () => {
    expect(haversineMiles(NYC, LA)).toBeCloseTo(haversineMiles(LA, NYC), 10);
  });

  it("gives ~69.094 miles for one degree of latitude (R = 3958.8)", () => {
    // 3958.8 * π/180 = 69.09409… — this pins the radius constant, which is
    // the one number in the module a well-meaning edit could silently change.
    // The quote evaluator rounds this to 69.1 for its distance variable.
    expect(haversineMiles({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(
      (3958.8 * Math.PI) / 180,
      6,
    );
    expect(haversineMiles({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(
      69.094,
      3,
    );
  });

  it("does not produce NaN for antipodal points", () => {
    // The `Math.min(1, …)` clamp exists for exactly this case: floating-point
    // error can push the haversine term a hair over 1, and asin(>1) is NaN.
    const miles = haversineMiles({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(Number.isFinite(miles)).toBe(true);
    expect(miles).toBeCloseTo(Math.PI * 3958.8, 3);
  });
});
