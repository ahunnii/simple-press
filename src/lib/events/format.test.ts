import { describe, expect, it } from "vitest";

import {
  eventCutoff,
  eventDateTimeAttr,
  formatEventDate,
  formatEventDateParts,
  isSameDayInZone,
} from "./format";

const DETROIT = "America/Detroit";
const LONDON = "Europe/London";
const TOKYO = "Asia/Tokyo";

// Every assertion pins referenceDate explicitly. Leaning on `new Date()` would
// make the year-suppression cases flip on 1 January.
const REF_2026 = new Date("2026-06-01T12:00:00.000Z");
const REF = { referenceDate: REF_2026 };

const d = (iso: string) => new Date(iso);

describe("formatEventDate — all-day events", () => {
  it("renders a single day with its weekday", () => {
    // 2026-08-15 00:00–23:59:59.999 EDT.
    expect(
      formatEventDate(
        {
          startAt: d("2026-08-15T04:00:00.000Z"),
          endAt: d("2026-08-16T03:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        REF,
      ),
    ).toBe("Sat, Aug 15");
  });

  it("adds the year when the event is not in the reference year", () => {
    // 2027-08-15 is a Sunday; the spec table's "Sat" was illustrative.
    expect(
      formatEventDate(
        {
          startAt: d("2027-08-15T04:00:00.000Z"),
          endAt: d("2027-08-16T03:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        REF,
      ),
    ).toBe("Sun, Aug 15, 2027");
  });

  it("elides the repeated month across a multi-day range", () => {
    expect(
      formatEventDate(
        {
          startAt: d("2026-08-15T04:00:00.000Z"),
          endAt: d("2026-08-18T03:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        REF,
      ),
    ).toBe("Aug 15 – 17");
  });

  it("repeats the month when the range crosses one", () => {
    expect(
      formatEventDate(
        {
          startAt: d("2026-08-30T04:00:00.000Z"),
          endAt: d("2026-09-03T03:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        REF,
      ),
    ).toBe("Aug 30 – Sep 2");
  });

  it("spells out both years when the range crosses one", () => {
    expect(
      formatEventDate(
        {
          startAt: d("2026-12-30T05:00:00.000Z"),
          endAt: d("2027-01-03T04:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        REF,
      ),
    ).toBe("Dec 30, 2026 – Jan 2, 2027");
  });

  it("puts the year on the right half of an off-year same-month range", () => {
    expect(
      formatEventDate(
        {
          startAt: d("2027-08-15T04:00:00.000Z"),
          endAt: d("2027-08-18T03:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        REF,
      ),
    ).toBe("Aug 15 – 17, 2027");
  });

  it("never appends a zone name (there is no time to qualify)", () => {
    expect(
      formatEventDate(
        {
          startAt: d("2026-08-15T04:00:00.000Z"),
          endAt: d("2026-08-16T03:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        { ...REF, showZone: true },
      ),
    ).toBe("Sat, Aug 15");
  });

  it("treats a pinned end on the same local date as a single day", () => {
    // The end is 03:59Z the *next* UTC day but still 15 Aug in Detroit.
    const text = formatEventDate(
      {
        startAt: d("2026-08-15T04:00:00.000Z"),
        endAt: d("2026-08-16T03:59:59.999Z"),
        allDay: true,
      },
      DETROIT,
      REF,
    );
    expect(text).not.toContain("–");
  });
});

describe("formatEventDate — timed events", () => {
  it("renders a start with no end", () => {
    expect(
      formatEventDate(
        { startAt: d("2026-08-15T23:00:00.000Z"), allDay: false },
        DETROIT,
        REF,
      ),
    ).toBe("Sat, Aug 15 · 7:00 PM");
  });

  it("elides the shared meridiem in a same-day range", () => {
    expect(
      formatEventDate(
        {
          startAt: d("2026-08-15T23:00:00.000Z"),
          endAt: d("2026-08-16T01:30:00.000Z"),
          allDay: false,
        },
        DETROIT,
        REF,
      ),
    ).toBe("Sat, Aug 15 · 7:00 – 9:30 PM");
  });

  it("keeps both meridiems when the range crosses noon", () => {
    expect(
      formatEventDate(
        {
          startAt: d("2026-08-15T15:00:00.000Z"),
          endAt: d("2026-08-15T18:00:00.000Z"),
          allDay: false,
        },
        DETROIT,
        REF,
      ),
    ).toBe("Sat, Aug 15 · 11:00 AM – 2:00 PM");
  });

  it("pairs each date with its own time across a multi-day range", () => {
    expect(
      formatEventDate(
        {
          startAt: d("2026-08-15T23:00:00.000Z"),
          endAt: d("2026-08-17T18:00:00.000Z"),
          allDay: false,
        },
        DETROIT,
        REF,
      ),
    ).toBe("Aug 15, 7:00 PM – Aug 17, 2:00 PM");
  });

  it("accepts ISO strings as well as Date instances", () => {
    expect(
      formatEventDate(
        { startAt: "2026-08-15T23:00:00.000Z", endAt: null, allDay: false },
        DETROIT,
        REF,
      ),
    ).toBe("Sat, Aug 15 · 7:00 PM");
  });
});

describe("formatEventDate — showZone", () => {
  it("appends the daylight abbreviation once, at the end", () => {
    expect(
      formatEventDate(
        { startAt: d("2026-08-15T23:00:00.000Z"), allDay: false },
        DETROIT,
        { ...REF, showZone: true },
      ),
    ).toBe("Sat, Aug 15 · 7:00 PM EDT");
  });

  it("appends the standard abbreviation for a winter event", () => {
    expect(
      formatEventDate(
        { startAt: d("2026-01-16T00:00:00.000Z"), allDay: false },
        DETROIT,
        { ...REF, showZone: true },
      ),
    ).toBe("Thu, Jan 15 · 7:00 PM EST");
  });

  it("appends nothing when showZone is off", () => {
    expect(
      formatEventDate(
        { startAt: d("2026-08-15T23:00:00.000Z"), allDay: false },
        DETROIT,
        REF,
      ),
    ).toBe("Sat, Aug 15 · 7:00 PM");
  });

  it("appends the zone once for a range, not once per end", () => {
    const text = formatEventDate(
      {
        startAt: d("2026-08-15T23:00:00.000Z"),
        endAt: d("2026-08-16T01:30:00.000Z"),
        allDay: false,
      },
      DETROIT,
      { ...REF, showZone: true },
    );
    expect(text).toBe("Sat, Aug 15 · 7:00 – 9:30 PM EDT");
    expect(text.match(/EDT/g)).toHaveLength(1);
  });

  it("uses whatever short name ICU has for a non-US zone", () => {
    // en-US renders Europe/London as "GMT+1" on most ICU builds and "BST" on
    // some — assert the shape, not the build's opinion.
    const text = formatEventDate(
      { startAt: d("2026-08-15T18:00:00.000Z"), allDay: false },
      LONDON,
      { ...REF, showZone: true },
    );
    expect(text).toMatch(/^Sat, Aug 15 · 7:00 PM \S+$/u);
  });
});

describe("formatEventDate — DST boundaries in America/Detroit", () => {
  it("renders a spring-forward instant at its post-transition wall clock", () => {
    // 07:30Z on the gap day is 03:30 EDT.
    expect(
      formatEventDate(
        { startAt: d("2026-03-08T07:30:00.000Z"), allDay: false },
        DETROIT,
        { ...REF, showZone: true },
      ),
    ).toBe("Sun, Mar 8 · 3:30 AM EDT");
  });

  it("renders the hour before the spring-forward gap in standard time", () => {
    expect(
      formatEventDate(
        { startAt: d("2026-03-08T06:30:00.000Z"), allDay: false },
        DETROIT,
        { ...REF, showZone: true },
      ),
    ).toBe("Sun, Mar 8 · 1:30 AM EST");
  });

  it("distinguishes the two halves of the fall-back overlap by zone name", () => {
    const first = formatEventDate(
      { startAt: d("2026-11-01T05:30:00.000Z"), allDay: false },
      DETROIT,
      { ...REF, showZone: true },
    );
    const second = formatEventDate(
      { startAt: d("2026-11-01T06:30:00.000Z"), allDay: false },
      DETROIT,
      { ...REF, showZone: true },
    );
    // Same wall clock, an hour apart in real time.
    expect(first).toBe("Sun, Nov 1 · 1:30 AM EDT");
    expect(second).toBe("Sun, Nov 1 · 1:30 AM EST");
  });
});

describe("formatEventDate — non-US zones", () => {
  it("renders one instant at each shop's own wall clock", () => {
    const instant = { startAt: d("2026-08-15T10:00:00.000Z"), allDay: false };
    expect(formatEventDate(instant, TOKYO, REF)).toBe("Sat, Aug 15 · 7:00 PM");
    expect(formatEventDate(instant, DETROIT, REF)).toBe(
      "Sat, Aug 15 · 6:00 AM",
    );
    expect(formatEventDate(instant, LONDON, REF)).toBe(
      "Sat, Aug 15 · 11:00 AM",
    );
  });

  it("rolls the local date backwards where the zone requires it", () => {
    // 2026-08-15T23:00Z is already 16 Aug 08:00 in Tokyo.
    expect(
      formatEventDate(
        { startAt: d("2026-08-15T23:00:00.000Z"), allDay: false },
        TOKYO,
        REF,
      ),
    ).toBe("Sun, Aug 16 · 8:00 AM");
  });

  it("renders an all-day event by its local date in Asia/Tokyo", () => {
    // Pinned 2026-08-15 in Tokyo starts on the previous UTC day.
    expect(
      formatEventDate(
        {
          startAt: d("2026-08-14T15:00:00.000Z"),
          endAt: d("2026-08-15T14:59:59.999Z"),
          allDay: true,
        },
        TOKYO,
        REF,
      ),
    ).toBe("Sat, Aug 15");
  });

  it("renders a range across the BST boundary in Europe/London", () => {
    // 2026-10-25 is the fall-back day; 30 Oct is already GMT.
    expect(
      formatEventDate(
        {
          startAt: d("2026-10-23T23:00:00.000Z"), // 25 Oct 00:00 BST is 23:00Z on 24th
          endAt: d("2026-10-30T18:00:00.000Z"),
          allDay: false,
        },
        LONDON,
        REF,
      ),
    ).toBe("Oct 24, 12:00 AM – Oct 30, 6:00 PM");
  });
});

describe("formatEventDate — year suppression is computed in the shop zone", () => {
  it("suppresses the year when the reference instant is still last year locally", () => {
    // 2027-01-01T02:00Z is 31 Dec 2026 21:00 in Detroit, so a December 2026
    // event is "this year" for that shop even though UTC has rolled over.
    expect(
      formatEventDate(
        {
          startAt: d("2026-12-15T05:00:00.000Z"),
          endAt: d("2026-12-16T04:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        { referenceDate: d("2027-01-01T02:00:00.000Z") },
      ),
    ).toBe("Tue, Dec 15");
  });

  it("shows the year for the same event once the shop has rolled over", () => {
    expect(
      formatEventDate(
        {
          startAt: d("2026-12-15T05:00:00.000Z"),
          endAt: d("2026-12-16T04:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        { referenceDate: d("2027-01-01T12:00:00.000Z") },
      ),
    ).toBe("Tue, Dec 15, 2026");
  });
});

describe("formatEventDateParts", () => {
  it("returns a null time for all-day events", () => {
    expect(
      formatEventDateParts(
        {
          startAt: d("2026-08-15T04:00:00.000Z"),
          endAt: d("2026-08-16T03:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        REF,
      ),
    ).toEqual({ date: "Sat, Aug 15", time: null });
  });

  it("splits a single timed event", () => {
    expect(
      formatEventDateParts(
        { startAt: d("2026-08-15T23:00:00.000Z"), allDay: false },
        DETROIT,
        REF,
      ),
    ).toEqual({ date: "Sat, Aug 15", time: "7:00 PM" });
  });

  it("splits a same-day timed range", () => {
    expect(
      formatEventDateParts(
        {
          startAt: d("2026-08-15T23:00:00.000Z"),
          endAt: d("2026-08-16T01:30:00.000Z"),
          allDay: false,
        },
        DETROIT,
        REF,
      ),
    ).toEqual({ date: "Sat, Aug 15", time: "7:00 – 9:30 PM" });
  });

  it("ranges both halves independently for a multi-day timed event", () => {
    expect(
      formatEventDateParts(
        {
          startAt: d("2026-08-15T23:00:00.000Z"),
          endAt: d("2026-08-17T18:00:00.000Z"),
          allDay: false,
        },
        DETROIT,
        REF,
      ),
    ).toEqual({ date: "Aug 15 – 17", time: "7:00 PM – 2:00 PM" });
  });

  it("puts the zone name on the time half only", () => {
    expect(
      formatEventDateParts(
        { startAt: d("2026-08-15T23:00:00.000Z"), allDay: false },
        DETROIT,
        { ...REF, showZone: true },
      ),
    ).toEqual({ date: "Sat, Aug 15", time: "7:00 PM EDT" });
  });

  it("never puts a zone name on an all-day event", () => {
    expect(
      formatEventDateParts(
        {
          startAt: d("2026-08-15T04:00:00.000Z"),
          endAt: d("2026-08-16T03:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
        { ...REF, showZone: true },
      ),
    ).toEqual({ date: "Sat, Aug 15", time: null });
  });
});

describe("eventDateTimeAttr", () => {
  it("returns the local calendar date for an all-day event", () => {
    expect(
      eventDateTimeAttr(
        {
          startAt: d("2026-08-15T04:00:00.000Z"),
          endAt: d("2026-08-16T03:59:59.999Z"),
          allDay: true,
        },
        DETROIT,
      ),
    ).toBe("2026-08-15");
  });

  it("uses the shop zone, not UTC, to pick that date", () => {
    // The instant is 14 Aug in UTC but 15 Aug in Tokyo.
    expect(
      eventDateTimeAttr(
        {
          startAt: d("2026-08-14T15:00:00.000Z"),
          endAt: d("2026-08-15T14:59:59.999Z"),
          allDay: true,
        },
        TOKYO,
      ),
    ).toBe("2026-08-15");
  });

  it("returns the full instant for a timed event", () => {
    expect(
      eventDateTimeAttr(
        { startAt: d("2026-08-15T23:00:00.000Z"), allDay: false },
        DETROIT,
      ),
    ).toBe("2026-08-15T23:00:00.000Z");
  });

  it("accepts an ISO string", () => {
    expect(
      eventDateTimeAttr(
        { startAt: "2026-08-15T23:00:00.000Z", allDay: false },
        DETROIT,
      ),
    ).toBe("2026-08-15T23:00:00.000Z");
  });
});

describe("eventCutoff", () => {
  it("returns the end when there is one", () => {
    expect(
      eventCutoff({
        startAt: d("2026-08-15T23:00:00.000Z"),
        endAt: d("2026-08-16T01:30:00.000Z"),
        allDay: false,
      }).toISOString(),
    ).toBe("2026-08-16T01:30:00.000Z");
  });

  it("falls back to the start when endAt is null", () => {
    expect(
      eventCutoff({
        startAt: d("2026-08-15T23:00:00.000Z"),
        endAt: null,
        allDay: false,
      }).toISOString(),
    ).toBe("2026-08-15T23:00:00.000Z");
  });

  it("falls back to the start when endAt is absent", () => {
    expect(
      eventCutoff({
        startAt: d("2026-08-15T23:00:00.000Z"),
        allDay: false,
      }).toISOString(),
    ).toBe("2026-08-15T23:00:00.000Z");
  });

  it("coerces ISO strings to Dates", () => {
    expect(
      eventCutoff({
        startAt: "2026-08-15T23:00:00.000Z",
        allDay: false,
      }),
    ).toBeInstanceOf(Date);
  });
});

describe("isSameDayInZone", () => {
  it("is true across a UTC day boundary inside one local day", () => {
    expect(
      isSameDayInZone(
        d("2026-08-15T23:00:00.000Z"),
        d("2026-08-16T01:30:00.000Z"),
        DETROIT,
      ),
    ).toBe(true);
  });

  it("is false for the same instants read in a different zone", () => {
    expect(
      isSameDayInZone(
        d("2026-08-15T23:00:00.000Z"),
        d("2026-08-16T01:30:00.000Z"),
        "UTC",
      ),
    ).toBe(false);
  });

  it("is false across a genuine local day boundary", () => {
    expect(
      isSameDayInZone(
        d("2026-08-15T23:00:00.000Z"),
        d("2026-08-17T18:00:00.000Z"),
        DETROIT,
      ),
    ).toBe(false);
  });
});
