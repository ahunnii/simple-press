import { describe, expect, it } from "vitest";

import { MAX_PRODUCT_VIDEOS } from "~/lib/products/media";

import {
  MAX_PRODUCT_IMAGES,
  productImageSchema,
  productImagesListSchema,
} from "./product";

type Entry = {
  url: string;
  sortOrder: number;
  mediaType?: "IMAGE" | "VIDEO";
  posterUrl?: string | null;
};

const photo = (n: number, extra: Partial<Entry> = {}): Entry => ({
  url: `https://cdn.example.com/p${n}.jpg`,
  sortOrder: n,
  ...extra,
});

const video = (n: number, extra: Partial<Entry> = {}): Entry => ({
  url: `https://cdn.example.com/v${n}.mp4`,
  sortOrder: n,
  mediaType: "VIDEO",
  posterUrl: `https://cdn.example.com/v${n}-poster.jpg`,
  ...extra,
});

function messages(list: Entry[]): string[] {
  const result = productImagesListSchema.safeParse(list);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("productImageSchema", () => {
  it("defaults mediaType to IMAGE", () => {
    const parsed = productImageSchema.parse({
      url: "https://cdn.example.com/a.jpg",
      sortOrder: 0,
    });
    expect(parsed.mediaType).toBe("IMAGE");
  });

  it("accepts a poster URL and rejects a malformed one", () => {
    expect(productImageSchema.safeParse(video(1)).success).toBe(true);
    expect(
      productImageSchema.safeParse(video(1, { posterUrl: "nope" })).success,
    ).toBe(false);
  });
});

describe("productImagesListSchema", () => {
  it("accepts photo-only galleries, including empty", () => {
    expect(messages([])).toEqual([]);
    expect(messages([photo(0), photo(1), photo(2)])).toEqual([]);
  });

  it("accepts exactly MAX_PRODUCT_IMAGES photos and rejects one more", () => {
    const full = Array.from({ length: MAX_PRODUCT_IMAGES }, (_, i) => photo(i));
    expect(messages(full)).toEqual([]);
    expect(messages([...full, photo(MAX_PRODUCT_IMAGES)])).toEqual([
      `A product can have at most ${MAX_PRODUCT_IMAGES} images`,
    ]);
  });

  it("accepts a photo followed by videos", () => {
    expect(messages([photo(0), video(1), photo(2), video(3)])).toEqual([]);
  });

  it("allows up to MAX_PRODUCT_VIDEOS videos and rejects one more", () => {
    const ok = [
      photo(0),
      ...Array.from({ length: MAX_PRODUCT_VIDEOS }, (_, i) => video(i + 1)),
    ];
    expect(messages(ok)).toEqual([]);
    expect(messages([...ok, video(MAX_PRODUCT_VIDEOS + 1)])).toEqual([
      `A product can have at most ${MAX_PRODUCT_VIDEOS} videos`,
    ]);
  });

  it("counts videos toward the total image cap", () => {
    const list = [
      ...Array.from({ length: MAX_PRODUCT_IMAGES - 1 }, (_, i) => photo(i)),
      video(MAX_PRODUCT_IMAGES - 1),
      video(MAX_PRODUCT_IMAGES),
    ];
    expect(messages(list)).toEqual([
      `A product can have at most ${MAX_PRODUCT_IMAGES} images`,
    ]);
  });

  it("requires a photo when any video exists", () => {
    expect(messages([video(0)])).toEqual(["Add a photo before adding videos."]);
    expect(messages([video(0), video(1)])).toEqual([
      "Add a photo before adding videos.",
    ]);
  });

  it("requires the lowest-sortOrder item to be a photo", () => {
    expect(messages([video(0), photo(1)])).toEqual([
      "The first item must be a photo — it's what shows on product cards and at checkout.",
    ]);
  });

  it("judges 'first' by sortOrder, not array position", () => {
    // Array lists the video first, but the photo has the lowest sortOrder.
    expect(messages([video(2), photo(0), video(1)])).toEqual([]);
    // Array lists the photo first, but the video has the lowest sortOrder.
    expect(messages([photo(5), video(1)])).toEqual([
      "The first item must be a photo — it's what shows on product cards and at checkout.",
    ]);
  });
});
