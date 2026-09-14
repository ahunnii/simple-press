import { describe, expect, it } from "vitest";

import { padTwo, remainingParts } from "./maintenance-countdown";

describe("remainingParts", () => {
  it("returns null when target equals now", () => {
    expect(remainingParts(1000, 1000)).toBeNull();
  });

  it("returns null when target is in the past", () => {
    expect(remainingParts(2000, 1000)).toBeNull();
  });

  it("returns {0,0,0,1} for exactly 1000ms remaining", () => {
    expect(remainingParts(0, 1000)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 1,
      totalMs: 1000,
    });
  });

  it("breaks down 1 day 2 hours 3 minutes 4 seconds exactly", () => {
    const totalMs =
      1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 3 * 60 * 1000 + 4 * 1000;
    expect(remainingParts(0, totalMs)).toEqual({
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
      totalMs,
    });
  });

  it("handles 45 days with no hours/minutes/seconds remainder", () => {
    const totalMs = 45 * 24 * 60 * 60 * 1000;
    expect(remainingParts(0, totalMs)).toEqual({
      days: 45,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs,
    });
  });

  it("floors each unit rather than rounding", () => {
    // 1 day, 0 hours, 0 minutes, 1 second, plus 999ms of slop that must not
    // round the seconds up to 2.
    const totalMs = 24 * 60 * 60 * 1000 + 1000 + 999;
    const result = remainingParts(0, totalMs);
    expect(result).toEqual({
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 1,
      totalMs,
    });
  });

  it("returns null for NaN nowMs", () => {
    expect(remainingParts(NaN, 1000)).toBeNull();
  });

  it("returns null for NaN targetMs", () => {
    expect(remainingParts(0, NaN)).toBeNull();
  });

  it("returns null when both inputs are NaN", () => {
    expect(remainingParts(NaN, NaN)).toBeNull();
  });
});

describe("padTwo", () => {
  it("pads single digits with a leading zero", () => {
    expect(padTwo(7)).toBe("07");
  });

  it("pads zero itself", () => {
    expect(padTwo(0)).toBe("00");
  });

  it("leaves two-digit numbers unchanged", () => {
    expect(padTwo(45)).toBe("45");
  });

  it("does not truncate numbers wider than two digits", () => {
    expect(padTwo(123)).toBe("123");
  });
});
