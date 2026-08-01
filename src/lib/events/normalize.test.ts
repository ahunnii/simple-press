import { describe, expect, it } from "vitest";

import { normalizeEventDates, parseZonedDateTime } from "./normalize";

const DETROIT = "America/Detroit";
const LOS_ANGELES = "America/Los_Angeles";
const LONDON = "Europe/London";
const TOKYO = "Asia/Tokyo";

const iso = (d: Date) => d.toISOString();

describe("parseZonedDateTime", () => {
  it("interprets a wall clock in the given zone during standard time", () => {
    // 9am EST is UTC−5.
    expect(iso(parseZonedDateTime("2026-01-15T09:00", DETROIT))).toBe(
      "2026-01-15T14:00:00.000Z",
    );
  });

  it("interprets the same wall clock differently during daylight time", () => {
    // Same shop, same 9am, but EDT is UTC−4 — proof the offset is not fixed.
    expect(iso(parseZonedDateTime("2026-07-15T09:00", DETROIT))).toBe(
      "2026-07-15T13:00:00.000Z",
    );
  });

  it("handles zones east of UTC", () => {
    expect(iso(parseZonedDateTime("2026-08-15T19:00", TOKYO))).toBe(
      "2026-08-15T10:00:00.000Z",
    );
  });

  it("handles zones that never observe DST", () => {
    expect(iso(parseZonedDateTime("2026-01-15T09:00", "America/Phoenix"))).toBe(
      "2026-01-15T16:00:00.000Z",
    );
    expect(iso(parseZonedDateTime("2026-07-15T09:00", "America/Phoenix"))).toBe(
      "2026-07-15T16:00:00.000Z",
    );
  });

  it("treats a bare date as local midnight", () => {
    expect(iso(parseZonedDateTime("2026-08-15", DETROIT))).toBe(
      "2026-08-15T04:00:00.000Z",
    );
  });

  it("keeps sub-second precision", () => {
    expect(iso(parseZonedDateTime("2026-08-15T23:59:59.999", DETROIT))).toBe(
      "2026-08-16T03:59:59.999Z",
    );
  });

  it("throws on a malformed value rather than yielding an Invalid Date", () => {
    expect(() => parseZonedDateTime("", DETROIT)).toThrow(RangeError);
    expect(() => parseZonedDateTime("15/08/2026", DETROIT)).toThrow(RangeError);
    expect(() => parseZonedDateTime("2026-08-15T19", DETROIT)).toThrow(
      RangeError,
    );
  });
});

describe("parseZonedDateTime — DST spring-forward gap", () => {
  // 2026-03-08 02:00 EST → 03:00 EDT in Detroit, so 02:30 never happens.
  it("resolves a skipped wall clock forward past the gap", () => {
    const result = parseZonedDateTime("2026-03-08T02:30", DETROIT);
    // 07:30Z is 03:30 EDT — the request shifted forward by the one-hour gap.
    expect(iso(result)).toBe("2026-03-08T07:30:00.000Z");
  });

  it("resolves forward in a zone east of UTC too", () => {
    // 2026-03-29 01:00 GMT → 02:00 BST in London; 01:30 never happens.
    // 01:30Z is 02:30 BST.
    expect(iso(parseZonedDateTime("2026-03-29T01:30", LONDON))).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });

  it("leaves times either side of the gap alone", () => {
    expect(iso(parseZonedDateTime("2026-03-08T01:30", DETROIT))).toBe(
      "2026-03-08T06:30:00.000Z", // 01:30 EST
    );
    expect(iso(parseZonedDateTime("2026-03-08T03:30", DETROIT))).toBe(
      "2026-03-08T07:30:00.000Z", // 03:30 EDT
    );
  });
});

describe("parseZonedDateTime — DST fall-back overlap", () => {
  // 2026-11-01 02:00 EDT → 01:00 EST in Detroit, so 01:30 happens twice.
  it("resolves a repeated wall clock to the first (daylight) occurrence", () => {
    // 05:30Z is 01:30 EDT; 06:30Z would be the second, 01:30 EST.
    expect(iso(parseZonedDateTime("2026-11-01T01:30", DETROIT))).toBe(
      "2026-11-01T05:30:00.000Z",
    );
  });

  it("resolves to the first occurrence in a zone east of UTC too", () => {
    // 2026-10-25 02:00 BST → 01:00 GMT in London. 00:30Z is 01:30 BST (first);
    // 01:30Z is 01:30 GMT (second). This is the case a naive two-pass
    // guess-and-correct cannot even detect.
    expect(iso(parseZonedDateTime("2026-10-25T01:30", LONDON))).toBe(
      "2026-10-25T00:30:00.000Z",
    );
  });

  it("leaves times either side of the overlap alone", () => {
    expect(iso(parseZonedDateTime("2026-11-01T00:30", DETROIT))).toBe(
      "2026-11-01T04:30:00.000Z", // 00:30 EDT
    );
    expect(iso(parseZonedDateTime("2026-11-01T02:30", DETROIT))).toBe(
      "2026-11-01T07:30:00.000Z", // 02:30 EST
    );
  });
});

describe("normalizeEventDates — timed events", () => {
  it("converts both ends through the business zone", () => {
    const { startAt, endAt } = normalizeEventDates(
      { startAt: "2026-08-15T19:00", endAt: "2026-08-15T21:30", allDay: false },
      DETROIT,
    );
    expect(iso(startAt)).toBe("2026-08-15T23:00:00.000Z");
    expect(iso(endAt!)).toBe("2026-08-16T01:30:00.000Z");
  });

  it("keeps a missing end time null", () => {
    const { endAt } = normalizeEventDates(
      { startAt: "2026-08-15T19:00", allDay: false },
      DETROIT,
    );
    expect(endAt).toBeNull();
  });

  it("treats an empty-string end time as absent", () => {
    const { endAt } = normalizeEventDates(
      { startAt: "2026-08-15T19:00", endAt: "", allDay: false },
      DETROIT,
    );
    expect(endAt).toBeNull();
  });

  it("treats a null end time as absent", () => {
    const { endAt } = normalizeEventDates(
      { startAt: "2026-08-15T19:00", endAt: null, allDay: false },
      DETROIT,
    );
    expect(endAt).toBeNull();
  });
});

describe("normalizeEventDates — all-day pinning", () => {
  it("pins to local midnight..23:59:59.999 in America/Los_Angeles", () => {
    // PDT is UTC−7 on 2026-08-15.
    const { startAt, endAt } = normalizeEventDates(
      { startAt: "2026-08-15", allDay: true },
      LOS_ANGELES,
    );
    expect(iso(startAt)).toBe("2026-08-15T07:00:00.000Z");
    expect(iso(endAt!)).toBe("2026-08-16T06:59:59.999Z");
  });

  it("pins the same calendar date differently in America/Detroit", () => {
    // EDT is UTC−4 on 2026-08-15 — three hours ahead of Los Angeles.
    const { startAt, endAt } = normalizeEventDates(
      { startAt: "2026-08-15", allDay: true },
      DETROIT,
    );
    expect(iso(startAt)).toBe("2026-08-15T04:00:00.000Z");
    expect(iso(endAt!)).toBe("2026-08-16T03:59:59.999Z");
  });

  it("pins correctly in a zone east of UTC (start lands on the previous UTC day)", () => {
    const { startAt, endAt } = normalizeEventDates(
      { startAt: "2026-08-15", allDay: true },
      TOKYO,
    );
    expect(iso(startAt)).toBe("2026-08-14T15:00:00.000Z");
    expect(iso(endAt!)).toBe("2026-08-15T14:59:59.999Z");
  });

  it("uses standard-time offsets for a winter date in the same zone", () => {
    // EST is UTC−5 — one hour later than the August pinning above.
    const { startAt, endAt } = normalizeEventDates(
      { startAt: "2026-01-15", allDay: true },
      DETROIT,
    );
    expect(iso(startAt)).toBe("2026-01-15T05:00:00.000Z");
    expect(iso(endAt!)).toBe("2026-01-16T04:59:59.999Z");
  });

  it("always produces a non-null endAt, even with no end date supplied", () => {
    const { endAt } = normalizeEventDates(
      { startAt: "2026-08-15", allDay: true },
      DETROIT,
    );
    expect(endAt).not.toBeNull();
  });

  it("spans to the end of the supplied end date", () => {
    const { startAt, endAt } = normalizeEventDates(
      { startAt: "2026-08-15", endAt: "2026-08-17", allDay: true },
      DETROIT,
    );
    expect(iso(startAt)).toBe("2026-08-15T04:00:00.000Z");
    expect(iso(endAt!)).toBe("2026-08-18T03:59:59.999Z");
  });

  it("ignores any time component left over from a timed draft", () => {
    const { startAt, endAt } = normalizeEventDates(
      { startAt: "2026-08-15T19:00", endAt: "2026-08-17T21:30", allDay: true },
      DETROIT,
    );
    expect(iso(startAt)).toBe("2026-08-15T04:00:00.000Z");
    expect(iso(endAt!)).toBe("2026-08-18T03:59:59.999Z");
  });

  it("spans a day that loses an hour to DST", () => {
    // 2026-03-08 starts at 00:00 EST (UTC−5) and ends at 23:59 EDT (UTC−4),
    // so the pinned day is only 23 hours long.
    const { startAt, endAt } = normalizeEventDates(
      { startAt: "2026-03-08", allDay: true },
      DETROIT,
    );
    expect(iso(startAt)).toBe("2026-03-08T05:00:00.000Z");
    expect(iso(endAt!)).toBe("2026-03-09T03:59:59.999Z");
    expect(endAt!.getTime() - startAt.getTime()).toBe(23 * 3_600_000 - 1);
  });

  it("spans a day that gains an hour to DST", () => {
    // 2026-11-01 runs 00:00 EDT → 23:59 EST: 25 hours.
    const { startAt, endAt } = normalizeEventDates(
      { startAt: "2026-11-01", allDay: true },
      DETROIT,
    );
    expect(iso(startAt)).toBe("2026-11-01T04:00:00.000Z");
    expect(iso(endAt!)).toBe("2026-11-02T04:59:59.999Z");
    expect(endAt!.getTime() - startAt.getTime()).toBe(25 * 3_600_000 - 1);
  });
});
