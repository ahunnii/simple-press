import { describe, expect, it } from "vitest";

import type { ProductMediaType } from "./media";

import { isVideoMedia, photosOnly, primaryPhoto, videosOnly } from "./media";

const item = (url: string, mediaType?: ProductMediaType | null) => ({
  url,
  mediaType,
});

describe("isVideoMedia", () => {
  it("is true only for VIDEO", () => {
    expect(isVideoMedia(item("a", "VIDEO"))).toBe(true);
    expect(isVideoMedia(item("a", "IMAGE"))).toBe(false);
  });

  it("treats a missing or null mediaType as a photo", () => {
    expect(isVideoMedia(item("a"))).toBe(false);
    expect(isVideoMedia(item("a", null))).toBe(false);
    expect(isVideoMedia(null)).toBe(false);
    expect(isVideoMedia(undefined)).toBe(false);
  });
});

describe("photosOnly / videosOnly", () => {
  const gallery = [
    item("p1", "IMAGE"),
    item("v1", "VIDEO"),
    item("p2"),
    item("v2", "VIDEO"),
  ];

  it("keeps photos in order, including legacy items with no mediaType", () => {
    expect(photosOnly(gallery).map((i) => i.url)).toEqual(["p1", "p2"]);
  });

  it("keeps videos in order", () => {
    expect(videosOnly(gallery).map((i) => i.url)).toEqual(["v1", "v2"]);
  });

  it("handles empty lists", () => {
    expect(photosOnly([])).toEqual([]);
    expect(videosOnly([])).toEqual([]);
  });
});

describe("primaryPhoto", () => {
  it("returns the first photo", () => {
    expect(primaryPhoto([item("p1"), item("p2")])?.url).toBe("p1");
  });

  it("skips leading videos", () => {
    expect(primaryPhoto([item("v1", "VIDEO"), item("p1", "IMAGE")])?.url).toBe(
      "p1",
    );
  });

  it("is undefined when there is no photo or no list", () => {
    expect(primaryPhoto([item("v1", "VIDEO")])).toBeUndefined();
    expect(primaryPhoto([])).toBeUndefined();
    expect(primaryPhoto(null)).toBeUndefined();
    expect(primaryPhoto(undefined)).toBeUndefined();
  });
});
