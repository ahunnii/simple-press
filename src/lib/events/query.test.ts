import { describe, expect, it } from "vitest";

import { pastEventWhere, upcomingEventWhere } from "./query";

const NOW = new Date("2026-08-15T12:00:00.000Z");
const BUSINESS_ID = "biz_123";

describe("upcomingEventWhere", () => {
  it("scopes to the business", () => {
    expect(upcomingEventWhere(BUSINESS_ID, NOW).businessId).toBe(BUSINESS_ID);
  });

  it("restricts to published, non-archived events", () => {
    const where = upcomingEventWhere(BUSINESS_ID, NOW);
    expect(where.published).toBe(true);
    expect(where.isArchived).toBe(false);
  });

  it("uses exactly two OR arms", () => {
    expect(upcomingEventWhere(BUSINESS_ID, NOW).OR).toHaveLength(2);
  });

  it("matches events whose end has not passed", () => {
    expect(upcomingEventWhere(BUSINESS_ID, NOW).OR[0]).toEqual({
      endAt: { gte: NOW },
    });
  });

  it("falls back to startAt only for open-ended events", () => {
    // The `endAt: null` guard is what keeps the two arms disjoint — SQL
    // `NULL >= now` is NULL, so arm 0 never matches an open-ended row and
    // arm 1 must never match a row that has an end.
    expect(upcomingEventWhere(BUSINESS_ID, NOW).OR[1]).toEqual({
      endAt: null,
      startAt: { gte: NOW },
    });
  });
});

describe("pastEventWhere", () => {
  it("scopes to the business", () => {
    expect(pastEventWhere(BUSINESS_ID, NOW).businessId).toBe(BUSINESS_ID);
  });

  it("is the exact date-complement of upcomingEventWhere", () => {
    const past = pastEventWhere(BUSINESS_ID, NOW);
    expect(past.OR).toHaveLength(2);
    expect(past.OR[0]).toEqual({ endAt: { lt: NOW } });
    expect(past.OR[1]).toEqual({ endAt: null, startAt: { lt: NOW } });
  });

  it("does not filter on publication state (the admin Past tab needs drafts)", () => {
    const past: Record<string, unknown> = pastEventWhere(BUSINESS_ID, NOW);
    expect(past.published).toBeUndefined();
    expect(past.isArchived).toBeUndefined();
  });
});
