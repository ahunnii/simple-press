import { describe, expect, it } from "vitest";

import { buildEventSchema, buildVideoObjectSchema } from "./structured-data";

const business = {
  subdomain: "testshop",
  customDomain: null,
  domainStatus: null,
  name: "Test Shop",
};

describe("buildEventSchema", () => {
  it("never emits an `offers` key, even when priceLabel looks parseable", () => {
    const schema = buildEventSchema(
      {
        name: "Market Day",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        endAt: new Date("2026-08-15T21:00:00.000Z"),
        allDay: false,
        priceLabel: "$45",
      },
      business,
      "America/Detroit",
    );

    expect(schema).not.toHaveProperty("offers");
  });

  it("never emits `offers` for a free-text priceLabel like 'Free'", () => {
    const schema = buildEventSchema(
      {
        name: "Community Meetup",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        allDay: false,
        priceLabel: "Free",
      },
      business,
      "America/Detroit",
    );

    expect(schema).not.toHaveProperty("offers");
  });

  it("emits a date-only startDate/endDate for an all-day event, computed in the passed timeZone (west-of-UTC zone catches the endDate-rollover bug)", () => {
    // All-day Aug 15 2026 in America/Los_Angeles (PDT, UTC-7). Normalized per
    // normalizeEventDates: start = local midnight, end = local 23:59:59.999.
    // In UTC those instants are 2026-08-15T07:00:00.000Z and
    // 2026-08-16T06:59:59.999Z respectively — a naive UTC-based date read
    // would report the END as Aug 16, which is wrong. This is exactly the
    // regression this feature's spec calls out.
    const schema = buildEventSchema(
      {
        name: "Summer Fair",
        startAt: new Date("2026-08-15T07:00:00.000Z"),
        endAt: new Date("2026-08-16T06:59:59.999Z"),
        allDay: true,
      },
      business,
      "America/Los_Angeles",
    );

    expect(schema.startDate).toBe("2026-08-15");
    expect(schema.endDate).toBe("2026-08-15");
  });

  it("emits a date-only startDate for an all-day event in an east-of-UTC zone (catches the startDate-rollback bug)", () => {
    // All-day Aug 15 2026 in Asia/Tokyo (UTC+9, no DST). Local midnight Aug 15
    // is 2026-08-14T15:00:00.000Z — a naive UTC-based date read would report
    // the START as Aug 14, which is wrong.
    const schema = buildEventSchema(
      {
        name: "Night Market",
        startAt: new Date("2026-08-14T15:00:00.000Z"),
        endAt: new Date("2026-08-15T14:59:59.999Z"),
        allDay: true,
      },
      business,
      "Asia/Tokyo",
    );

    expect(schema.startDate).toBe("2026-08-15");
    expect(schema.endDate).toBe("2026-08-15");
  });

  it("emits full ISO instants for a timed event", () => {
    const schema = buildEventSchema(
      {
        name: "Evening Workshop",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        endAt: new Date("2026-08-15T21:00:00.000Z"),
        allDay: false,
      },
      business,
      "America/Detroit",
    );

    expect(schema.startDate).toBe("2026-08-15T19:00:00.000Z");
    expect(schema.endDate).toBe("2026-08-15T21:00:00.000Z");
  });

  it("omits endDate entirely when there is no endAt", () => {
    const schema = buildEventSchema(
      {
        name: "Pop-Up",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        endAt: null,
        allDay: false,
      },
      business,
      "America/Detroit",
    );

    expect(schema).not.toHaveProperty("endDate");
  });

  it("omits location when not set", () => {
    const schema = buildEventSchema(
      {
        name: "Pop-Up",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        allDay: false,
        location: null,
      },
      business,
      "America/Detroit",
    );

    expect(schema).not.toHaveProperty("location");
  });

  it("shapes location as a Place when set", () => {
    const schema = buildEventSchema(
      {
        name: "Pop-Up",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        allDay: false,
        location: "123 Main St, Detroit, MI",
      },
      business,
      "America/Detroit",
    );

    expect(schema.location).toEqual({
      "@type": "Place",
      name: "123 Main St, Detroit, MI",
    });
  });

  it("points url at the canonical /events index, not a per-event path", () => {
    const schema = buildEventSchema(
      {
        name: "Pop-Up",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        allDay: false,
      },
      business,
      "America/Detroit",
    );

    expect(schema.url).toBe("https://testshop.simplepress.test/events");
  });
});

describe("buildVideoObjectSchema", () => {
  it("emits every field when overrides, description, and thumbnail are all present", () => {
    const schema = buildVideoObjectSchema({
      youtubeId: "dQw4w9WgXcQ",
      publishedAt: new Date("2026-06-01T12:00:00.000Z"),
      title: "Synced title",
      description: "Synced description",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      titleOverride: "Owner title",
      descriptionOverride: "Owner description",
      thumbnailOverride:
        "https://storage.simplepress.test/business-sites/biz1/video-thumb.jpg",
    });

    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "Owner title",
      description: "Owner description",
      thumbnailUrl:
        "https://storage.simplepress.test/business-sites/biz1/video-thumb.jpg",
      uploadDate: "2026-06-01T12:00:00.000Z",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  });

  it("falls back to synced title/description/thumbnail when no override is set", () => {
    const schema = buildVideoObjectSchema({
      youtubeId: "dQw4w9WgXcQ",
      publishedAt: new Date("2026-06-01T12:00:00.000Z"),
      title: "Synced title",
      description: "Synced description",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      titleOverride: null,
      descriptionOverride: null,
      thumbnailOverride: null,
    });

    expect(schema.name).toBe("Synced title");
    expect(schema.description).toBe("Synced description");
    expect(schema.thumbnailUrl).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("emits only the required fields when description and thumbnail are absent", () => {
    const schema = buildVideoObjectSchema({
      youtubeId: "dQw4w9WgXcQ",
      publishedAt: new Date("2026-06-01T12:00:00.000Z"),
      title: "Minimal video",
    });

    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "Minimal video",
      uploadDate: "2026-06-01T12:00:00.000Z",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(schema).not.toHaveProperty("description");
    expect(schema).not.toHaveProperty("thumbnailUrl");
  });

  it("accepts a string publishedAt (as returned after JSON round-tripping) and still emits an ISO uploadDate", () => {
    const schema = buildVideoObjectSchema({
      youtubeId: "dQw4w9WgXcQ",
      publishedAt: "2026-06-01T12:00:00.000Z",
      title: "String date video",
    });

    expect(schema.uploadDate).toBe("2026-06-01T12:00:00.000Z");
  });
});
