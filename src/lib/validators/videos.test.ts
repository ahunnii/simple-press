import { describe, expect, it } from "vitest";

import { videoUpdateSchema } from "./videos";

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
