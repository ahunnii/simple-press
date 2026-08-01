import { beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeEventDates } from "~/lib/events/normalize";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createEvent,
  createOwnerUser,
} from "../helpers/factories";

// Every procedure under test resolves its tenant from the request host
// (`getBusinessProcedure` for public reads, the membership check baked into
// `ownerAdminProcedure` for admin writes), so the host has to be mockable
// per-test — same boilerplate as tenant-isolation.test.ts and
// unpublished-product-leak.test.ts.
const reqHost = vi.hoisted(() => ({ value: "events-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

const DAY_MS = 24 * 60 * 60 * 1000;

// `events` is `enabledByDefault: false` in the feature registry, so every
// business used here must opt in explicitly or `featureGate("events")` throws
// FORBIDDEN before the query under test ever runs.
function eventsBusiness(opts: Parameters<typeof createBusiness>[0] = {}) {
  return createBusiness({
    ...opts,
    featureFlags: { events: true, ...opts.featureFlags },
  });
}

describe("events", () => {
  beforeEach(resetDb);

  describe("getUpcomingPublic", () => {
    it("excludes unpublished, archived, and already-over events; includes an in-progress event", async () => {
      const business = await eventsBusiness({ subdomain: "events-visibility" });
      reqHost.value = "events-visibility.simplepress.test";

      const now = Date.now();
      const past = new Date(now - DAY_MS);
      const past2 = new Date(now - 2 * DAY_MS);
      const future = new Date(now + DAY_MS);

      const unpublished = await createEvent(business.id, {
        name: "Unpublished",
        published: false,
        startAt: future,
      });
      const archived = await createEvent(business.id, {
        name: "Archived",
        isArchived: true,
        startAt: future,
      });
      const endedInPast = await createEvent(business.id, {
        name: "Ended",
        startAt: past2,
        endAt: past,
      });
      const startedNoEnd = await createEvent(business.id, {
        name: "Started, no end",
        startAt: past,
        endAt: null,
      });
      // The case a naive `startAt >= now` filter gets wrong: this event is
      // already under way but not yet over, and must still show up.
      const inProgress = await createEvent(business.id, {
        name: "In progress",
        startAt: past,
        endAt: future,
      });
      const upcoming = await createEvent(business.id, {
        name: "Upcoming",
        startAt: future,
        endAt: null,
      });

      const caller = createTestCaller({});
      const result = await caller.events.getUpcomingPublic();
      const ids = result.map((e) => e.id);

      expect(ids).not.toContain(unpublished.id);
      expect(ids).not.toContain(archived.id);
      expect(ids).not.toContain(endedInPast.id);
      expect(ids).not.toContain(startedNoEnd.id);
      expect(ids).toContain(inProgress.id);
      expect(ids).toContain(upcoming.id);
    });

    it("orders by startAt ascending and applies limit", async () => {
      const business = await eventsBusiness({ subdomain: "events-order" });
      reqHost.value = "events-order.simplepress.test";

      const now = Date.now();
      // Created out of chronological order so a query without an ORDER BY
      // would return them in insertion order instead.
      const third = await createEvent(business.id, {
        name: "Third",
        startAt: new Date(now + 3 * DAY_MS),
      });
      const first = await createEvent(business.id, {
        name: "First",
        startAt: new Date(now + 1 * DAY_MS),
      });
      const second = await createEvent(business.id, {
        name: "Second",
        startAt: new Date(now + 2 * DAY_MS),
      });

      const caller = createTestCaller({});
      const all = await caller.events.getUpcomingPublic();
      expect(all.map((e) => e.id)).toEqual([first.id, second.id, third.id]);

      const limited = await caller.events.getUpcomingPublic({ limit: 2 });
      expect(limited.map((e) => e.id)).toEqual([first.id, second.id]);
    });

    it("throws FORBIDDEN when the events feature flag is off", async () => {
      // No `events: true` override — enabledByDefault is false.
      await createBusiness({ subdomain: "events-off" });
      reqHost.value = "events-off.simplepress.test";

      const caller = createTestCaller({});
      await expect(caller.events.getUpcomingPublic()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("never returns another business's events for the resolved host", async () => {
      const businessA = await eventsBusiness({ subdomain: "events-cross-a" });
      const businessB = await eventsBusiness({ subdomain: "events-cross-b" });
      const now = Date.now();

      const eventA = await createEvent(businessA.id, {
        name: "Event A",
        startAt: new Date(now + DAY_MS),
      });
      const eventB = await createEvent(businessB.id, {
        name: "Event B",
        startAt: new Date(now + DAY_MS),
      });

      reqHost.value = "events-cross-b.simplepress.test";
      const caller = createTestCaller({});
      const result = await caller.events.getUpcomingPublic();
      const ids = result.map((e) => e.id);

      expect(ids).toContain(eventB.id);
      expect(ids).not.toContain(eventA.id);
    });
  });

  describe("cross-tenant admin writes", () => {
    it("404s update/delete/setArchived against another business's event id, and leaves the row untouched", async () => {
      const businessA = await eventsBusiness({ subdomain: "events-admin-a" });
      const businessB = await eventsBusiness({ subdomain: "events-admin-b" });
      const ownerA = await createOwnerUser(businessA.id);

      const foreignEvent = await createEvent(businessB.id, {
        name: "Belongs to B",
      });

      reqHost.value = "events-admin-a.simplepress.test";
      const callerA = createTestCaller({ userId: ownerA.id });

      await expect(
        callerA.events.update({
          id: foreignEvent.id,
          name: "Hijacked",
          startAt: "2026-01-01",
          allDay: true,
          published: true,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await expect(
        callerA.events.setArchived({ id: foreignEvent.id, isArchived: true }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await expect(
        callerA.events.delete(foreignEvent.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      // A silent no-op on any of the above would also satisfy a naive
      // "it rejected" assertion — confirm the row is completely untouched.
      const stillThere = await db.event.findUnique({
        where: { id: foreignEvent.id },
      });
      expect(stillThere).not.toBeNull();
      expect(stillThere?.name).toBe("Belongs to B");
      expect(stillThere?.isArchived).toBe(false);
    });
  });

  describe("create", () => {
    it("normalizes an all-day event using the business's own time zone", async () => {
      const business = await eventsBusiness({
        subdomain: "events-tz",
        // Deliberately non-default (schema default is America/Detroit) so a
        // router that ignored the business's zone and fell back to the
        // default would produce different, and wrong, UTC instants here.
        timeZone: "America/Los_Angeles",
      });
      const ownerUser = await createOwnerUser(business.id);

      reqHost.value = "events-tz.simplepress.test";
      const caller = createTestCaller({ userId: ownerUser.id });

      const created = await caller.events.create({
        name: "Summer Market",
        startAt: "2026-08-15",
        allDay: true,
        published: true,
      });

      const expected = normalizeEventDates(
        { startAt: "2026-08-15", endAt: null, allDay: true },
        "America/Los_Angeles",
      );

      expect(created.startAt.toISOString()).toBe(
        expected.startAt.toISOString(),
      );
      expect(created.endAt?.toISOString()).toBe(expected.endAt?.toISOString());
      // Sanity: the all-day pin actually did something zone-specific — the
      // stored start is not literally midnight UTC.
      expect(created.startAt.toISOString()).not.toBe(
        "2026-08-15T00:00:00.000Z",
      );
    });
  });
});
