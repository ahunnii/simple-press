import { describe, expect, it } from "vitest";

import { PUBLISH_RULES_VERSION } from "~/lib/youtube/publish-rules";

import {
  parseStoredPublishRules,
  publishRulesSchema,
  resolveVideoThumbnail,
  resolveVideoTitle,
  videoSourceBadgeText,
  videoSourceCreateSchema,
  videoSourceUpdateSchema,
  videoUpdateSchema,
} from "./videos";

/**
 * `videos.update` destructures `{ id, ...updates }` and hands `updates` straight
 * to `prisma.video.update({ data })`. Prisma's contract there is:
 *
 *   undefined → leave the column alone
 *   null      → write NULL
 *
 * So any validator that materializes an OMITTED optional key into `null` turns
 * every partial update into a destructive one. These tests pin that boundary for
 * the three owner-owned override columns; the `thumbnailOverride` case is a
 * regression test for a real bug (a `.transform(v => v || null)` that also fired
 * on `undefined`, silently erasing a custom thumbnail whenever the owner toggled
 * `published`).
 */
describe("videoUpdateSchema — omitted keys must not become null", () => {
  it("does not materialize thumbnailOverride when the key is absent", () => {
    const parsed = videoUpdateSchema.parse({ id: "v1", published: false });

    // Either the key is absent entirely, or it is present-but-undefined.
    // Both mean "no change" to Prisma; `null` would mean "erase it".
    expect(parsed.thumbnailOverride).toBeUndefined();
  });

  it("does not materialize titleOverride or descriptionOverride when absent", () => {
    const parsed = videoUpdateSchema.parse({ id: "v1", sortOrder: 3 });

    expect(parsed.titleOverride).toBeUndefined();
    expect(parsed.descriptionOverride).toBeUndefined();
  });

  it("collapses an emptied titleOverride to null, not to a blank string", () => {
    const parsed = videoUpdateSchema.parse({ id: "v1", titleOverride: "" });

    // Must be null, NOT "". The storefront resolves `titleOverride ?? title`,
    // and `??` does not fall through on "" — a stored empty string would
    // render a video with no title at all instead of YouTube's.
    expect(parsed.titleOverride).toBeNull();
  });

  it("collapses an emptied descriptionOverride to null", () => {
    const parsed = videoUpdateSchema.parse({
      id: "v1",
      descriptionOverride: "",
    });

    expect(parsed.descriptionOverride).toBeNull();
  });

  it("still lets the owner explicitly clear a thumbnail with an empty string", () => {
    const parsed = videoUpdateSchema.parse({ id: "v1", thumbnailOverride: "" });

    expect(parsed.thumbnailOverride).toBeNull();
  });

  it("still lets the owner explicitly clear a thumbnail with null", () => {
    const parsed = videoUpdateSchema.parse({
      id: "v1",
      thumbnailOverride: null,
    });

    expect(parsed.thumbnailOverride).toBeNull();
  });

  it("preserves a valid thumbnail URL", () => {
    const parsed = videoUpdateSchema.parse({
      id: "v1",
      thumbnailOverride: "https://example.com/thumb.jpg",
    });

    expect(parsed.thumbnailOverride).toBe("https://example.com/thumb.jpg");
  });

  it("rejects a non-URL thumbnail value", () => {
    expect(() =>
      videoUpdateSchema.parse({ id: "v1", thumbnailOverride: "not a url" }),
    ).toThrow();
  });

  it("carries through the plain owner-owned scalars untouched", () => {
    const parsed = videoUpdateSchema.parse({
      id: "v1",
      titleOverride: "Owner's title",
      published: false,
      sortOrder: 7,
    });

    expect(parsed).toMatchObject({
      id: "v1",
      titleOverride: "Owner's title",
      published: false,
      sortOrder: 7,
    });
  });
});

// The "" case is intentionally not tested here — it's impossible by schema.
// `videoUpdateSchema` collapses "" to null before it ever reaches storage
// (pinned by the tests above), so a resolver never sees an empty-string
// override.
describe("resolveVideoTitle", () => {
  it("uses the override when set", () => {
    expect(
      resolveVideoTitle({
        title: "YouTube title",
        titleOverride: "Owner's title",
      }),
    ).toBe("Owner's title");
  });

  it("falls back to the synced title when the override is null", () => {
    expect(
      resolveVideoTitle({ title: "YouTube title", titleOverride: null }),
    ).toBe("YouTube title");
  });
});

describe("resolveVideoThumbnail", () => {
  it("uses the override when set", () => {
    expect(
      resolveVideoThumbnail({
        thumbnailUrl: "https://example.com/synced.jpg",
        thumbnailOverride: "https://example.com/override.jpg",
      }),
    ).toBe("https://example.com/override.jpg");
  });

  it("falls back to the synced thumbnail when the override is null", () => {
    expect(
      resolveVideoThumbnail({
        thumbnailUrl: "https://example.com/synced.jpg",
        thumbnailOverride: null,
      }),
    ).toBe("https://example.com/synced.jpg");
  });

  it("returns null when both are null", () => {
    expect(
      resolveVideoThumbnail({ thumbnailUrl: null, thumbnailOverride: null }),
    ).toBeNull();
  });
});

describe("videoSourceBadgeText", () => {
  it("labels manual videos regardless of the source argument", () => {
    expect(videoSourceBadgeText({ sourceId: null }, undefined)).toBe(
      "Added manually",
    );
  });

  it("uses the source's owner-set label when present", () => {
    expect(
      videoSourceBadgeText(
        { sourceId: "src_1" },
        { label: "Tutorials", kind: "playlist" },
      ),
    ).toBe("Tutorials");
  });

  it("falls back to the kind when the label is null", () => {
    expect(
      videoSourceBadgeText(
        { sourceId: "src_1" },
        { label: null, kind: "playlist" },
      ),
    ).toBe("Playlist");
    expect(
      videoSourceBadgeText(
        { sourceId: "src_1" },
        { label: null, kind: "channel" },
      ),
    ).toBe("Channel");
  });

  it("returns null when the claimed source is missing — the badge renders nothing, so search must match nothing", () => {
    expect(videoSourceBadgeText({ sourceId: "src_1" }, undefined)).toBeNull();
  });
});

describe("publishRulesSchema", () => {
  it("trims and dedupes phrases case-insensitively, keeping the first casing", () => {
    const parsed = publishRulesSchema.parse({
      version: PUBLISH_RULES_VERSION,
      titleInclude: [" Bamboo Hour ", "bamboo hour", "Bamboo Hour"],
    });

    expect(parsed.titleInclude).toEqual(["Bamboo Hour"]);
  });

  it("defaults missing arrays to []", () => {
    const parsed = publishRulesSchema.parse({
      version: PUBLISH_RULES_VERSION,
    });

    expect(parsed.titleInclude).toEqual([]);
    expect(parsed.titleExclude).toEqual([]);
    expect(parsed.weekdays).toEqual([]);
  });

  it("rejects 21 phrases", () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `phrase ${i}`);

    expect(() =>
      publishRulesSchema.parse({
        version: PUBLISH_RULES_VERSION,
        titleInclude: tooMany,
      }),
    ).toThrow();
  });

  it("rejects a 101-character phrase", () => {
    expect(() =>
      publishRulesSchema.parse({
        version: PUBLISH_RULES_VERSION,
        titleInclude: ["a".repeat(101)],
      }),
    ).toThrow();
  });

  it("rejects a blank phrase", () => {
    expect(() =>
      publishRulesSchema.parse({
        version: PUBLISH_RULES_VERSION,
        titleInclude: ["  "],
      }),
    ).toThrow();
  });

  it("rejects an invalid weekday code", () => {
    expect(() =>
      publishRulesSchema.parse({
        version: PUBLISH_RULES_VERSION,
        weekdays: ["monday"],
      }),
    ).toThrow();
  });

  it("dedupes repeated weekday codes", () => {
    const parsed = publishRulesSchema.parse({
      version: PUBLISH_RULES_VERSION,
      weekdays: ["tue", "tue"],
    });

    expect(parsed.weekdays).toEqual(["tue"]);
  });

  it("rejects a version other than the current one", () => {
    expect(() =>
      publishRulesSchema.parse({
        version: 2,
      }),
    ).toThrow();
  });
});

describe("parseStoredPublishRules", () => {
  it("treats null as no rules", () => {
    expect(parseStoredPublishRules(null)).toEqual({ kind: "none" });
  });

  it("treats undefined as no rules", () => {
    expect(parseStoredPublishRules(undefined)).toEqual({ kind: "none" });
  });

  it("treats a valid but all-empty rule set as no rules", () => {
    expect(
      parseStoredPublishRules({
        version: 1,
        titleInclude: [],
        titleExclude: [],
        weekdays: [],
      }),
    ).toEqual({ kind: "none" });
  });

  it("parses a real rule set", () => {
    const result = parseStoredPublishRules({
      version: PUBLISH_RULES_VERSION,
      titleInclude: ["Bamboo Hour"],
      titleExclude: [],
      weekdays: ["tue", "thu"],
    });

    expect(result).toEqual({
      kind: "rules",
      rules: {
        version: PUBLISH_RULES_VERSION,
        titleInclude: ["Bamboo Hour"],
        titleExclude: [],
        weekdays: ["tue", "thu"],
      },
    });
  });

  it("treats an unknown version as invalid", () => {
    expect(parseStoredPublishRules({ version: 99 })).toEqual({
      kind: "invalid",
    });
  });

  it("treats non-object garbage as invalid", () => {
    expect(parseStoredPublishRules("garbage")).toEqual({ kind: "invalid" });
  });
});

describe("videoSourceUpdateSchema — publishRules follows the emptyToNull doctrine", () => {
  it("omitting publishRules yields undefined, not null", () => {
    const parsed = videoSourceUpdateSchema.parse({ id: "src_1" });

    expect(parsed.publishRules).toBeUndefined();
  });

  it("publishRules: null stays null", () => {
    const parsed = videoSourceUpdateSchema.parse({
      id: "src_1",
      publishRules: null,
    });

    expect(parsed.publishRules).toBeNull();
  });

  it("a valid publishRules object round-trips", () => {
    const parsed = videoSourceUpdateSchema.parse({
      id: "src_1",
      publishRules: {
        version: PUBLISH_RULES_VERSION,
        titleInclude: ["Trailer"],
        titleExclude: [],
        weekdays: ["mon"],
      },
    });

    expect(parsed.publishRules).toEqual({
      version: PUBLISH_RULES_VERSION,
      titleInclude: ["Trailer"],
      titleExclude: [],
      weekdays: ["mon"],
    });
  });
});

describe("videoSourceCreateSchema — publishRules is optional", () => {
  it("accepts input without publishRules", () => {
    const parsed = videoSourceCreateSchema.parse({
      input: "https://www.youtube.com/@example",
    });

    expect(parsed.publishRules).toBeUndefined();
  });
});
