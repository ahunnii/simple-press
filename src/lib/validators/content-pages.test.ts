import { describe, expect, it } from "vitest";

import {
  BLOG_SORT_DEFAULT,
  BLOG_SORT_VALUES,
  BLOG_STATUS_DEFAULT,
  BLOG_STATUS_VALUES,
  comparePageListRows,
  getPageStatus,
  PAGE_SORT_DEFAULT,
  PAGE_SORT_VALUES,
  PAGE_STATUS_DEFAULT,
  PAGE_STATUS_VALUES,
} from "./content-pages";

/**
 * `getPageStatus` is the single status derivation for BOTH admin lists backed
 * by the `Page` model — the CMS Pages list and the Blog list. Priority is
 * **published ▸ scheduled ▸ draft**, checked in that order.
 *
 * It reads mechanical columns only and takes no `now`: whoever publishes a row
 * (the cron sweep, either editor, `content.bulkSetPublished`) nulls
 * `scheduledPublishAt`, so a non-null value on an unpublished row already
 * means "publish pending". Keeping the clock out is also what makes the
 * derivation safe to run in an RSC render — a `Date.now()` comparison could
 * land a row on different sides of the split between the server render and the
 * client's first paint.
 */
describe("getPageStatus", () => {
  const scheduled = new Date("2026-09-01T12:00:00Z");

  describe("allowScheduled: true (Blog list)", () => {
    const options = { allowScheduled: true } as const;

    it("returns 'published' for a published row", () => {
      expect(
        getPageStatus({ published: true, scheduledPublishAt: null }, options),
      ).toBe("published");
    });

    it("returns 'published' even if a stale schedule is still set (published outranks scheduled)", () => {
      expect(
        getPageStatus({ published: true, scheduledPublishAt: scheduled }, options),
      ).toBe("published");
    });

    it("returns 'scheduled' for an unpublished row with a schedule", () => {
      expect(
        getPageStatus(
          { published: false, scheduledPublishAt: scheduled },
          options,
        ),
      ).toBe("scheduled");
    });

    it("returns 'scheduled' for an OVERDUE schedule the cron has not swept yet", () => {
      // Cron-lag tolerance, the counterpart to `isEventPast`'s: the sweep in
      // src/app/api/cron/route.ts runs on an interval, so between ticks a due
      // row is still `published: false` with its schedule intact. Reporting
      // "Scheduled" keeps it from flickering Draft on its way to Published.
      const overdue = new Date("2020-01-01T00:00:00Z");
      expect(
        getPageStatus({ published: false, scheduledPublishAt: overdue }, options),
      ).toBe("scheduled");
    });

    it("returns 'draft' for an unpublished row with no schedule", () => {
      expect(
        getPageStatus({ published: false, scheduledPublishAt: null }, options),
      ).toBe("draft");
    });
  });

  describe("allowScheduled: false (CMS Pages list)", () => {
    const options = { allowScheduled: false } as const;

    it("collapses a scheduled row into 'draft'", () => {
      // The Pages list offers no Scheduled filter option (the CMS page editor
      // has no scheduling control, so only an API write or a legacy import can
      // set the column). Collapsing keeps the badge and the Drafts filter in
      // agreement instead of stranding the row outside every filter but "All".
      expect(
        getPageStatus(
          { published: false, scheduledPublishAt: scheduled },
          options,
        ),
      ).toBe("draft");
    });

    it("still returns 'published' and 'draft' normally", () => {
      expect(
        getPageStatus({ published: true, scheduledPublishAt: null }, options),
      ).toBe("published");
      expect(
        getPageStatus({ published: false, scheduledPublishAt: null }, options),
      ).toBe("draft");
    });
  });

  it("never returns a status outside the entity's own filter vocabulary", () => {
    // The contract the filter predicates rely on: `status === "all" ||
    // row.status === status` can only ever match if every derivable status is
    // a member of that list's tuple. A status with no tuple member would be
    // unreachable by every filter but "All".
    const rows = [
      { published: true, scheduledPublishAt: null },
      { published: false, scheduledPublishAt: null },
      { published: false, scheduledPublishAt: new Date() },
    ];

    for (const row of rows) {
      expect(BLOG_STATUS_VALUES).toContain(
        getPageStatus(row, { allowScheduled: true }),
      );
      expect(PAGE_STATUS_VALUES).toContain(
        getPageStatus(row, { allowScheduled: false }),
      );
    }
  });
});

/**
 * Tuple/default agreement. Each `_DEFAULT` is consumed in two places that must
 * agree — `pickParam`'s fallback on the page and the `FilterDefFor`
 * `defaultValue` that `AdminFilters` uses to decide when to DELETE the param —
 * so a default outside its own tuple is a control that appears selected while
 * doing nothing.
 */
describe("filter/sort tuples and defaults", () => {
  it("every default is a member of its own tuple", () => {
    expect(PAGE_STATUS_VALUES).toContain(PAGE_STATUS_DEFAULT);
    expect(BLOG_STATUS_VALUES).toContain(BLOG_STATUS_DEFAULT);
    expect(PAGE_SORT_VALUES).toContain(PAGE_SORT_DEFAULT);
    expect(BLOG_SORT_VALUES).toContain(BLOG_SORT_DEFAULT);
  });

  it("has no duplicate values within a tuple", () => {
    // A duplicate would render two identical <SelectItem>s with the same
    // value, which Radix keys on.
    for (const tuple of [
      PAGE_STATUS_VALUES,
      BLOG_STATUS_VALUES,
      PAGE_SORT_VALUES,
      BLOG_SORT_VALUES,
    ]) {
      expect(new Set(tuple).size).toBe(tuple.length);
    }
  });

  it("keeps the Pages sort vocabulary a subset of the Blog one", () => {
    // `comparePageListRows` takes the WIDER (blog) union and is shared by both
    // lists. If the pages tuple ever gained a value the blog union lacks, the
    // pages list would pass a sort the comparator has no branch for and fall
    // through to the default silently.
    for (const value of PAGE_SORT_VALUES) {
      expect(BLOG_SORT_VALUES).toContain(value);
    }
  });

  it("keeps the Pages status vocabulary a subset of the Blog one", () => {
    for (const value of PAGE_STATUS_VALUES) {
      expect(BLOG_STATUS_VALUES).toContain(value);
    }
  });

  it("excludes 'scheduled' from the Pages status vocabulary", () => {
    // Paired with `getPageStatus(..., { allowScheduled: false })`: an option
    // that can never match is worse than no option.
    expect(PAGE_STATUS_VALUES).not.toContain("scheduled");
  });
});

/**
 * `comparePageListRows` is the PRIMARY ordering shared by both lists —
 * everything except the `id` tie-break, which `buildTablePage` appends itself
 * (which is why the rows here carry no `id`).
 */
describe("comparePageListRows", () => {
  const row = (over: {
    title?: string;
    publishedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) => ({
    title: over.title ?? "Untitled",
    publishedAt: over.publishedAt ?? null,
    createdAt: over.createdAt ?? new Date("2026-01-01T00:00:00Z"),
    updatedAt: over.updatedAt ?? new Date("2026-01-01T00:00:00Z"),
  });

  const older = new Date("2026-01-01T00:00:00Z");
  const newer = new Date("2026-06-01T00:00:00Z");

  it("'newest'/'oldest' sort on updatedAt, NOT createdAt", () => {
    // The Updated column both tables render is this same key, so the visible
    // date always explains the order.
    const stale = row({ updatedAt: older, createdAt: newer });
    const fresh = row({ updatedAt: newer, createdAt: older });

    expect(comparePageListRows("newest", fresh, stale)).toBeLessThan(0);
    expect(comparePageListRows("oldest", stale, fresh)).toBeLessThan(0);
  });

  it("reports a tie when the sort key is equal (leaving the id tie-break to buildTablePage)", () => {
    const a = row({ title: "Same", updatedAt: older });
    const b = row({ title: "Same", updatedAt: older });
    expect(comparePageListRows("newest", a, b)).toBe(0);
    expect(comparePageListRows("oldest", a, b)).toBe(0);
  });

  it("sorts titles both ways", () => {
    const a = row({ title: "Alpha" });
    const z = row({ title: "Zulu" });
    expect(comparePageListRows("title-asc", a, z)).toBeLessThan(0);
    expect(comparePageListRows("title-desc", a, z)).toBeGreaterThan(0);
  });

  it("puts never-published rows LAST under both published-date sorts", () => {
    // Mirrors the storefront listing's `publishedAt: { sort: "desc", nulls:
    // "last" }` in `content.getBlogPages` — a draft has no place in a
    // chronological feed at either end, including the ascending one.
    const draft = row({ title: "Draft", publishedAt: null });
    const live = row({ title: "Live", publishedAt: older });

    expect(comparePageListRows("published-desc", draft, live)).toBeGreaterThan(0);
    expect(comparePageListRows("published-asc", draft, live)).toBeGreaterThan(0);
  });

  it("orders published rows by date in the requested direction", () => {
    const first = row({ title: "First", publishedAt: older });
    const latest = row({ title: "Latest", publishedAt: newer });

    expect(comparePageListRows("published-desc", latest, first)).toBeLessThan(0);
    expect(comparePageListRows("published-asc", first, latest)).toBeLessThan(0);
  });

  it("breaks same-instant publish ties by title rather than leaving them to id", () => {
    // Bulk publishes and imports share an instant; id-order reads as random.
    const b = row({ title: "Bravo", publishedAt: older });
    const a = row({ title: "Alpha", publishedAt: older });

    expect(comparePageListRows("published-desc", a, b)).toBeLessThan(0);
    expect(comparePageListRows("published-asc", a, b)).toBeLessThan(0);
  });

  it("breaks a two-null publish tie by title too", () => {
    const b = row({ title: "Bravo", publishedAt: null });
    const a = row({ title: "Alpha", publishedAt: null });
    expect(comparePageListRows("published-desc", a, b)).toBeLessThan(0);
  });
});
