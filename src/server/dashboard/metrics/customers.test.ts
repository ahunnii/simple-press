import { describe, expect, it, vi } from "vitest";

import type { StatQuery } from "./types";
import { marketingAudienceWhere } from "~/lib/marketing/audience";

import {
  customerStat,
  pendingTestimonialsWhere,
  upcomingEventsWhere,
} from "./customers";

const NOW = new Date("2026-10-16T15:00:00.000Z");

function makeQuery() {
  const count = vi.fn().mockResolvedValue(7);
  const db = {
    event: { count },
    testimonial: { count },
    customer: { count },
  };
  const q = {
    db,
    ctx: { businessId: "biz_1", timeZone: "UTC", now: NOW },
    win: {
      start: null,
      endExclusive: NOW,
      startYmd: null,
      endYmdExclusive: "2026-10-17",
    },
    series: false,
    granularity: "day",
  } as unknown as StatQuery;
  return { q, db, count };
}

describe("upcoming-events", () => {
  it("counts published, unarchived events that have not ended", async () => {
    const { q, db } = makeQuery();
    const part = await customerStat(q, "upcoming-events");
    expect(part.value).toBe(7);
    expect(db.event.count).toHaveBeenCalledWith({
      where: {
        businessId: "biz_1",
        published: true,
        isArchived: false,
        OR: [{ endAt: { gte: NOW } }, { endAt: null, startAt: { gte: NOW } }],
      },
    });
  });

  it("uses endAt when set and startAt otherwise", () => {
    expect(upcomingEventsWhere("b", NOW).OR).toEqual([
      { endAt: { gte: NOW } },
      { endAt: null, startAt: { gte: NOW } },
    ]);
  });
});

describe("testimonials-pending", () => {
  it("counts testimonials that are neither approved nor hidden", async () => {
    const { q, db } = makeQuery();
    const part = await customerStat(q, "testimonials-pending");
    expect(part.value).toBe(7);
    expect(db.testimonial.count).toHaveBeenCalledWith({
      where: { businessId: "biz_1", isApproved: false, isHidden: false },
    });
    expect(pendingTestimonialsWhere("biz_1")).toEqual({
      businessId: "biz_1",
      isApproved: false,
      isHidden: false,
    });
  });
});

describe("email-subscribers", () => {
  it("uses the Email Marketing page's own audience definition", async () => {
    const { q, db } = makeQuery();
    const part = await customerStat(q, "email-subscribers");
    expect(part.value).toBe(7);
    expect(db.customer.count).toHaveBeenCalledWith({
      where: marketingAudienceWhere("biz_1"),
    });
  });
});

describe("total-customers", () => {
  it("still counts every customer row", async () => {
    const { q, db } = makeQuery();
    await customerStat(q, "total-customers");
    expect(db.customer.count).toHaveBeenCalledWith({
      where: { businessId: "biz_1" },
    });
  });
});
