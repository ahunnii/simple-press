import { describe, expect, it } from "vitest";

import { birthdayTargets, isLeapYear, isValidBirthday } from "./birthday-date";

describe("isLeapYear", () => {
  it("2028 is a leap year", () => {
    expect(isLeapYear(2028)).toBe(true);
  });

  it("2026 is not a leap year", () => {
    expect(isLeapYear(2026)).toBe(false);
  });

  it("2100 is not a leap year (divisible by 100, not 400)", () => {
    expect(isLeapYear(2100)).toBe(false);
  });

  it("2000 is a leap year (divisible by 400)", () => {
    expect(isLeapYear(2000)).toBe(true);
  });
});

describe("birthdayTargets", () => {
  it("resolves to the local calendar day in America/Detroit, which lags UTC", () => {
    const now = new Date("2026-03-15T03:30:00Z");
    const detroit = birthdayTargets(now, "America/Detroit");
    expect(detroit.today).toEqual({ month: 3, day: 14 });
    expect(detroit.targets).toEqual([{ month: 3, day: 14 }]);

    const utc = birthdayTargets(now, "UTC");
    expect(utc.today).toEqual({ month: 3, day: 15 });
    expect(utc.targets).toEqual([{ month: 3, day: 15 }]);
  });

  it("Feb 28 in a non-leap year also targets Feb 29", () => {
    const result = birthdayTargets(new Date("2026-02-28T12:00:00Z"), "UTC");
    expect(result.year).toBe(2026);
    expect(result.today).toEqual({ month: 2, day: 28 });
    expect(result.targets).toEqual([
      { month: 2, day: 28 },
      { month: 2, day: 29 },
    ]);
  });

  it("Feb 28 in a leap year does NOT also target Feb 29", () => {
    const result = birthdayTargets(new Date("2028-02-28T12:00:00Z"), "UTC");
    expect(result.targets).toEqual([{ month: 2, day: 28 }]);
  });

  it("Feb 29 (leap year) returns only Feb 29", () => {
    const result = birthdayTargets(new Date("2028-02-29T12:00:00Z"), "UTC");
    expect(result.today).toEqual({ month: 2, day: 29 });
    expect(result.targets).toEqual([{ month: 2, day: 29 }]);
  });

  it("falls back to UTC on a bad time zone without throwing", () => {
    expect(() =>
      birthdayTargets(new Date("2026-03-15T12:00:00Z"), "Not/AZone"),
    ).not.toThrow();
    const result = birthdayTargets(
      new Date("2026-03-15T12:00:00Z"),
      "Not/AZone",
    );
    expect(result.today).toEqual({ month: 3, day: 15 });
  });
});

describe("isValidBirthday", () => {
  it("Feb 29 is valid (year-agnostic)", () => {
    expect(isValidBirthday(2, 29)).toBe(true);
  });

  it("Feb 30 is invalid", () => {
    expect(isValidBirthday(2, 30)).toBe(false);
  });

  it("Apr 31 is invalid (April has 30 days)", () => {
    expect(isValidBirthday(4, 31)).toBe(false);
  });

  it("month 13 is invalid", () => {
    expect(isValidBirthday(13, 1)).toBe(false);
  });

  it("month 0 is invalid", () => {
    expect(isValidBirthday(0, 5)).toBe(false);
  });

  it("non-integer inputs are invalid", () => {
    expect(isValidBirthday(1.5, 1)).toBe(false);
    expect(isValidBirthday(1, 1.5)).toBe(false);
  });

  it("a normal date is valid", () => {
    expect(isValidBirthday(7, 4)).toBe(true);
  });
});
