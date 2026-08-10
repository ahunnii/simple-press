import { describe, expect, it } from "vitest";

import {
  resolveVideoThumbnail,
  resolveVideoTitle,
  videoSourceBadgeText,
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
      resolveVideoTitle({ title: "YouTube title", titleOverride: "Owner's title" }),
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
