import { describe, expect, it } from "vitest";

import {
  getInterval,
  isSubscriptionIntervalKey,
  parseProductIntervals,
  SUBSCRIPTION_INTERVAL_KEYS,
  SUBSCRIPTION_INTERVALS,
} from "./intervals";

describe("SUBSCRIPTION_INTERVALS", () => {
  it("has exactly the five catalog entries, in order, with the exact shape", () => {
    expect(SUBSCRIPTION_INTERVALS).toEqual([
      {
        key: "week:1",
        interval: "week",
        intervalCount: 1,
        label: "Every week",
        shortLabel: "Weekly",
      },
      {
        key: "week:2",
        interval: "week",
        intervalCount: 2,
        label: "Every 2 weeks",
        shortLabel: "Every 2 weeks",
      },
      {
        key: "month:1",
        interval: "month",
        intervalCount: 1,
        label: "Every month",
        shortLabel: "Monthly",
      },
      {
        key: "month:2",
        interval: "month",
        intervalCount: 2,
        label: "Every 2 months",
        shortLabel: "Every 2 months",
      },
      {
        key: "month:3",
        interval: "month",
        intervalCount: 3,
        label: "Every 3 months",
        shortLabel: "Every 3 months",
      },
    ]);
  });
});

describe("SUBSCRIPTION_INTERVAL_KEYS", () => {
  it("is the five keys, in catalog order", () => {
    expect(SUBSCRIPTION_INTERVAL_KEYS).toEqual([
      "week:1",
      "week:2",
      "month:1",
      "month:2",
      "month:3",
    ]);
  });

  it("matches the key of every SUBSCRIPTION_INTERVALS entry, positionally", () => {
    expect(SUBSCRIPTION_INTERVAL_KEYS).toEqual(
      SUBSCRIPTION_INTERVALS.map((entry) => entry.key),
    );
  });
});

describe("getInterval", () => {
  it("returns the matching catalog entry for a known key", () => {
    expect(getInterval("week:2")).toEqual({
      key: "week:2",
      interval: "week",
      intervalCount: 2,
      label: "Every 2 weeks",
      shortLabel: "Every 2 weeks",
    });
  });

  it("returns undefined (does not throw) for an unknown key", () => {
    expect(() => getInterval("day:1" as never)).not.toThrow();
    expect(getInterval("day:1" as never)).toBeUndefined();
  });
});

describe("parseProductIntervals", () => {
  it("accepts an array of valid interval keys and preserves catalog order", () => {
    expect(parseProductIntervals(["month:1", "week:1"])).toEqual([
      "week:1",
      "month:1",
    ]);
  });

  it("drops unknown keys and de-duplicates, preserving catalog order over input order", () => {
    expect(
      parseProductIntervals(["month:3", "bogus", "week:1", "week:1"]),
    ).toEqual(["week:1", "month:3"]);
  });

  it("returns [] for null", () => {
    expect(parseProductIntervals(null)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(parseProductIntervals(undefined)).toEqual([]);
  });

  it("returns [] for a non-array (object)", () => {
    expect(parseProductIntervals({ "week:1": true })).toEqual([]);
  });

  it("returns [] for a non-array (string)", () => {
    expect(parseProductIntervals("week:1")).toEqual([]);
  });

  it("returns [] for a non-array (number)", () => {
    expect(parseProductIntervals(42)).toEqual([]);
  });

  it("returns [] for an empty array", () => {
    expect(parseProductIntervals([])).toEqual([]);
  });

  it("ignores non-string entries mixed into the array", () => {
    expect(parseProductIntervals(["week:1", 42, null, "month:2"])).toEqual([
      "week:1",
      "month:2",
    ]);
  });
});

describe("isSubscriptionIntervalKey", () => {
  it.each(SUBSCRIPTION_INTERVAL_KEYS)("returns true for %s", (key) => {
    expect(isSubscriptionIntervalKey(key)).toBe(true);
  });

  it("returns false for an unknown string", () => {
    expect(isSubscriptionIntervalKey("day:1")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isSubscriptionIntervalKey(42)).toBe(false);
    expect(isSubscriptionIntervalKey(null)).toBe(false);
    expect(isSubscriptionIntervalKey(undefined)).toBe(false);
    expect(isSubscriptionIntervalKey({})).toBe(false);
  });
});
