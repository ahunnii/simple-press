import { describe, expect, it } from "vitest";

import { getEventStatus, getEventWhen, isEventPast } from "./events";

/**
 * `getEventStatus` returns the mechanical publish state of an event for the
 * admin Events list. Priority is **archived ▸ draft ▸ published**, checked in
 * that order — archived outranks draft/published even when `published` is
 * still `true` (Reviews precedent: hidden outranks approved). It does NOT
 * read the cutoff — a just-ended event keeps its Published badge until the
 * cron sweep archives it.
 */
describe("getEventStatus", () => {
  it("returns 'archived' for an archived, unpublished (draft) event", () => {
    expect(
      getEventStatus({ published: false, isArchived: true }),
    ).toBe("archived");
  });

  it("returns 'archived' for an archived, published event (archived wins)", () => {
    expect(
      getEventStatus({ published: true, isArchived: true }),
    ).toBe("archived");
  });

  it("returns 'draft' for an unarchived, unpublished event", () => {
    expect(
      getEventStatus({ published: false, isArchived: false }),
    ).toBe("draft");
  });

  it("returns 'published' for an unarchived, published event", () => {
    expect(
      getEventStatus({ published: true, isArchived: false }),
    ).toBe("published");
  });
});

/**
 * `isEventPast` / `getEventWhen` are the single cutoff-aware derivation for
 * the admin Events list's When filter/badge. Cron-lag aware: the cutoff
 * (`eventCutoff` — endAt if set, else startAt) is compared against `now` with
 * a strict `<`, matching `pastEventWhere`'s `lt` in src/lib/events/query.ts,
 * and `isArchived` alone can also force "past" regardless of the cutoff.
 *
 * All tests use a fixed `now` and derive past/future dates from it.
 */
describe("isEventPast / getEventWhen", () => {
  const now = new Date("2026-08-07T12:00:00Z");
  const oneHourBefore = new Date("2026-08-07T11:00:00Z");
  const twoHoursBefore = new Date("2026-08-07T10:00:00Z");
  const oneHourAfter = new Date("2026-08-07T13:00:00Z");

  it("treats an ended event as past even when isArchived is still false (cron-lag case)", () => {
    // The cron job that flips `isArchived` (archivePastEvents,
    // src/lib/events/archive.ts) only runs every ~15 minutes, so between
    // ticks a just-finished event is `isArchived: false` with a cutoff
    // already in the past. If the derivation read `isArchived` alone, this
    // event would incorrectly report "upcoming" until the next cron run.
    const justEnded = {
      startAt: twoHoursBefore,
      endAt: oneHourBefore,
      allDay: false,
      isArchived: false,
    };
    expect(isEventPast(justEnded, now)).toBe(true);
    expect(getEventWhen(justEnded, now)).toBe("past");
  });

  it("treats a manually-archived future event as past (mirror case)", () => {
    // Deliberate: "upcoming" ∩ "archived" is empty by construction. A
    // manually-archived future event must stay out of the Upcoming view,
    // matching the old Upcoming tab's exclusion of archived rows.
    const archivedButFuture = {
      startAt: oneHourAfter,
      endAt: null,
      allDay: false,
      isArchived: true,
    };
    expect(isEventPast(archivedButFuture, now)).toBe(true);
    expect(getEventWhen(archivedButFuture, now)).toBe("past");
  });

  it("treats an ordinary future event as upcoming", () => {
    const upcoming = {
      startAt: oneHourAfter,
      endAt: null,
      allDay: false,
      isArchived: false,
    };
    expect(isEventPast(upcoming, now)).toBe(false);
    expect(getEventWhen(upcoming, now)).toBe("upcoming");
  });

  it("partitions a mixed set of the above into the correct When buckets", () => {
    const justEnded = {
      startAt: twoHoursBefore,
      endAt: oneHourBefore,
      allDay: false,
      isArchived: false,
    };
    const archivedButFuture = {
      startAt: oneHourAfter,
      endAt: null,
      allDay: false,
      isArchived: true,
    };
    const upcoming = {
      startAt: oneHourAfter,
      endAt: null,
      allDay: false,
      isArchived: false,
    };

    const whens = [justEnded, archivedButFuture, upcoming].map((e) =>
      getEventWhen(e, now),
    );
    expect(whens).toEqual(["past", "past", "upcoming"]);
  });

  describe("endAt: null fallback (cutoff falls back to startAt)", () => {
    it("is past when startAt alone is in the past", () => {
      const noEndPast = {
        startAt: oneHourBefore,
        endAt: null,
        allDay: false,
        isArchived: false,
      };
      expect(isEventPast(noEndPast, now)).toBe(true);
      expect(getEventWhen(noEndPast, now)).toBe("past");
    });

    it("is upcoming when startAt alone is in the future", () => {
      const noEndFuture = {
        startAt: oneHourAfter,
        endAt: null,
        allDay: false,
        isArchived: false,
      };
      expect(isEventPast(noEndFuture, now)).toBe(false);
      expect(getEventWhen(noEndFuture, now)).toBe("upcoming");
    });
  });

  describe("boundary: cutoff exactly equal to now", () => {
    it("is NOT past when eventCutoff(e).getTime() === now.getTime() (strict <)", () => {
      // eventCutoff() = endAt when set, so pinning endAt to `now` exactly
      // pins the cutoff to `now` exactly.
      const atCutoff = {
        startAt: oneHourBefore,
        endAt: now,
        allDay: false,
        isArchived: false,
      };
      expect(isEventPast(atCutoff, now)).toBe(false);
      expect(getEventWhen(atCutoff, now)).toBe("upcoming");
    });
  });

  describe("all-day events", () => {
    // normalizeEventDates (src/lib/events/normalize.ts) always pins an
    // all-day event's endAt to 23:59:59.999 local before it reaches the DB,
    // so by the time isEventPast sees the row, `endAt` is already set and
    // eventCutoff's arithmetic (`endAt ?? startAt`) is identical to the timed
    // case — allDay itself doesn't change the comparison, only what endAt
    // was pinned to upstream. These cases lock that in.
    it("is past once the pinned end-of-day endAt is behind now", () => {
      const pastAllDay = {
        startAt: twoHoursBefore,
        endAt: oneHourBefore,
        allDay: true,
        isArchived: false,
      };
      expect(isEventPast(pastAllDay, now)).toBe(true);
      expect(getEventWhen(pastAllDay, now)).toBe("past");
    });

    it("is upcoming while the pinned end-of-day endAt is still ahead of now", () => {
      const futureAllDay = {
        startAt: now,
        endAt: oneHourAfter,
        allDay: true,
        isArchived: false,
      };
      expect(isEventPast(futureAllDay, now)).toBe(false);
      expect(getEventWhen(futureAllDay, now)).toBe("upcoming");
    });
  });
});
