import { describe, expect, it } from "vitest";

import { ADMIN_BULK_DELETE_LIMIT } from "~/lib/validators/admin-table";
import { matchesAllTokens } from "~/app/admin/_lib/table-query";

import {
  getMediaSearchFields,
  getMediaUsageStatus,
  MEDIA_SORT_DEFAULT,
  MEDIA_SORT_VALUES,
  MEDIA_TYPE_DEFAULT,
  MEDIA_TYPE_VALUES,
  MEDIA_USAGE_DEFAULT,
  MEDIA_USAGE_VALUES,
  mediaBulkDeleteInput,
} from "./media";

/**
 * `getMediaSearchFields` powers the Media Library's tokenized search. It
 * must surface the filename (not just the full key), the raw key, and every
 * usage's `location` + `entityLabel` so a search for a usage location (e.g.
 * "hero") matches files that don't contain that text in their key.
 */
describe("getMediaSearchFields", () => {
  it("extracts the filename as the last path segment of the key", () => {
    const fields = getMediaSearchFields({
      key: "biz123/image-abcd1234.jpg",
      usedBy: [],
    });
    expect(fields).toContain("image-abcd1234.jpg");
  });

  it("includes the full key alongside the filename", () => {
    const fields = getMediaSearchFields({
      key: "biz123/gallery-abcd1234.jpg",
      usedBy: [],
    });
    expect(fields).toContain("biz123/gallery-abcd1234.jpg");
    expect(fields).toContain("gallery-abcd1234.jpg");
  });

  it("includes each usage's location and entityLabel", () => {
    const fields = getMediaSearchFields({
      key: "biz123/image-abcd1234.jpg",
      usedBy: [
        { location: "Site Content", entityLabel: "Hero image" },
        { location: "Product SEO", entityLabel: "Blue Widget" },
      ],
    });
    expect(fields).toContain("Site Content");
    expect(fields).toContain("Hero image");
    expect(fields).toContain("Product SEO");
    expect(fields).toContain("Blue Widget");
  });

  it("returns just filename + key when usedBy is empty", () => {
    const fields = getMediaSearchFields({
      key: "biz123/favicon.ico",
      usedBy: [],
    });
    expect(fields).toEqual(["favicon.ico", "biz123/favicon.ico"]);
  });

  it("handles a missing entityLabel without throwing", () => {
    const fields = getMediaSearchFields({
      key: "biz123/image-abcd1234.jpg",
      usedBy: [{ location: "Product image", entityLabel: undefined }],
    });
    expect(fields).toContain("Product image");
    // undefined entityLabel is preserved positionally, not dropped
    expect(fields).toContain(undefined);
  });

  it("handles a null entityLabel without throwing", () => {
    const fields = getMediaSearchFields({
      key: "biz123/image-abcd1234.jpg",
      usedBy: [{ location: "Product image", entityLabel: null }],
    });
    expect(fields).toContain("Product image");
    expect(fields).toContain(null);
  });

  it("returns the raw key as the filename when there is no slash", () => {
    const fields = getMediaSearchFields({
      key: "image-abcd1234.jpg",
      usedBy: [],
    });
    expect(fields).toEqual(["image-abcd1234.jpg", "image-abcd1234.jpg"]);
  });

  it("includes generic entity-type keywords for known entityTypes", () => {
    const fields = getMediaSearchFields({
      key: "biz123/image-abcd1234.jpg",
      usedBy: [
        {
          location: "Product image",
          entityLabel: "Blue Widget",
          entityType: "image",
        },
      ],
    });
    expect(fields).toContain("product products");
  });

  it("contributes no keywords for an unknown entityType, without throwing", () => {
    const fields = getMediaSearchFields({
      key: "biz123/image-abcd1234.jpg",
      usedBy: [
        {
          location: "Somewhere new",
          entityLabel: null,
          entityType: "futureEntity",
        },
      ],
    });
    // undefined is preserved positionally (matchesAllTokens skips it)
    expect(fields).toContain(undefined);
    expect(() => matchesAllTokens("anything", fields)).not.toThrow();
  });

  // End-to-end through matchesAllTokens: the point of the keyword aliases is
  // that PLURAL type words work — "products" is not a substring of the
  // location "Product image", and "events" names nothing in "Event flier".
  it("matches plural entity-type tokens end-to-end", () => {
    const productFile = getMediaSearchFields({
      key: "biz123/image-abcd1234.jpg",
      usedBy: [
        {
          location: "Product image",
          entityLabel: "Blue Widget",
          entityType: "image",
        },
      ],
    });
    expect(matchesAllTokens("products", productFile)).toBe(true);

    const eventFile = getMediaSearchFields({
      key: "biz123/image-ef567890.jpg",
      usedBy: [
        {
          location: "Event flier",
          entityLabel: "Makers Market",
          entityType: "event",
        },
      ],
    });
    expect(matchesAllTokens("events", eventFile)).toBe(true);
  });

  it("does not match a type token against files not used by that type", () => {
    const galleryOnlyFile = getMediaSearchFields({
      key: "biz123/gallery-abcd1234.jpg",
      usedBy: [
        {
          location: "Gallery — Summer",
          entityLabel: "Summer",
          entityType: "galleryImage",
        },
      ],
    });
    expect(matchesAllTokens("products", galleryOnlyFile)).toBe(false);
    expect(matchesAllTokens("galleries", galleryOnlyFile)).toBe(true);
  });
});

/**
 * `mediaBulkDeleteInput` caps a single bulk-delete call at
 * `ADMIN_BULK_DELETE_LIMIT` keys, mirroring every other admin bulk-delete
 * schema (see `discountBulkDeleteSchema` in `./discounts`).
 */
describe("mediaBulkDeleteInput", () => {
  it("rejects an empty keys array", () => {
    const result = mediaBulkDeleteInput.safeParse({ keys: [] });
    expect(result.success).toBe(false);
  });

  it("rejects more than ADMIN_BULK_DELETE_LIMIT keys", () => {
    const keys = Array.from(
      { length: ADMIN_BULK_DELETE_LIMIT + 1 },
      (_, i) => `biz123/image-${i}.jpg`,
    );
    const result = mediaBulkDeleteInput.safeParse({ keys });
    expect(result.success).toBe(false);
  });

  it("accepts exactly ADMIN_BULK_DELETE_LIMIT keys", () => {
    const keys = Array.from(
      { length: ADMIN_BULK_DELETE_LIMIT },
      (_, i) => `biz123/image-${i}.jpg`,
    );
    const result = mediaBulkDeleteInput.safeParse({ keys });
    expect(result.success).toBe(true);
  });

  it("accepts a single key with no businessId", () => {
    const result = mediaBulkDeleteInput.safeParse({
      keys: ["biz123/image-abcd1234.jpg"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional businessId for platform-admin callers", () => {
    const result = mediaBulkDeleteInput.safeParse({
      keys: ["biz123/image-abcd1234.jpg"],
      businessId: "biz123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty-string key", () => {
    const result = mediaBulkDeleteInput.safeParse({ keys: [""] });
    expect(result.success).toBe(false);
  });
});

/**
 * Tuple/default sanity: every `_DEFAULT` must be a member of its own tuple,
 * the same invariant `pickParam` relies on when a param is absent from the
 * URL.
 */
describe("value tuples and defaults", () => {
  it("MEDIA_TYPE_DEFAULT is a member of MEDIA_TYPE_VALUES", () => {
    expect(MEDIA_TYPE_VALUES).toContain(MEDIA_TYPE_DEFAULT);
  });

  it("MEDIA_USAGE_DEFAULT is a member of MEDIA_USAGE_VALUES", () => {
    expect(MEDIA_USAGE_VALUES).toContain(MEDIA_USAGE_DEFAULT);
  });

  it("MEDIA_SORT_DEFAULT is a member of MEDIA_SORT_VALUES", () => {
    expect(MEDIA_SORT_VALUES).toContain(MEDIA_SORT_DEFAULT);
  });

  it("MEDIA_TYPE_VALUES covers exactly the MediaKind union plus 'all'", () => {
    expect(MEDIA_TYPE_VALUES).toEqual([
      "all",
      "image",
      "video",
      "logo",
      "favicon",
      "testimonial",
      "gallery",
      "other",
    ]);
  });

  it("MEDIA_USAGE_VALUES is the 4-value tuple in menu order", () => {
    expect(MEDIA_USAGE_VALUES).toEqual(["all", "used", "inactive", "unused"]);
  });
});

/**
 * `getMediaUsageStatus` is the single derivation of a file's usage bucket,
 * shared by the `used` filter predicate and the `UsageBadge` component. Three
 * disjoint buckets: unused (no usages), inactive (every usage flagged
 * `inactiveTemplate`), used (at least one usage isn't).
 */
describe("getMediaUsageStatus", () => {
  it("returns 'unused' for an empty usedBy array", () => {
    expect(getMediaUsageStatus([])).toBe("unused");
  });

  it("returns 'inactive' when every usage has inactiveTemplate: true", () => {
    expect(
      getMediaUsageStatus([
        { inactiveTemplate: true },
        { inactiveTemplate: true },
      ]),
    ).toBe("inactive");
  });

  it("returns 'used' when usages are a mix of active and inactive", () => {
    expect(
      getMediaUsageStatus([
        { inactiveTemplate: true },
        { inactiveTemplate: false },
      ]),
    ).toBe("used");
  });

  it("returns 'used' when every usage is active (no flag set)", () => {
    expect(getMediaUsageStatus([{}, {}])).toBe("used");
  });

  it("returns 'used' for a single usage with inactiveTemplate explicitly false", () => {
    expect(getMediaUsageStatus([{ inactiveTemplate: false }])).toBe("used");
  });
});
