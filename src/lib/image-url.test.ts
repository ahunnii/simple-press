import { describe, expect, it } from "vitest";

import {
  isAvifUrl,
  isSvgUrl,
  rasterImageUrl,
  shareableImageUrl,
} from "./image-url";

describe("isSvgUrl", () => {
  it("matches .svg with or without a cache-busting query", () => {
    expect(isSvgUrl("https://s.example/biz/logo.svg")).toBe(true);
    expect(isSvgUrl("https://s.example/biz/logo.svg?v=1712345")).toBe(true);
    expect(isSvgUrl("https://s.example/biz/LOGO.SVG#x")).toBe(true);
  });

  it("rejects raster URLs, empty values and svg only in the query", () => {
    expect(isSvgUrl("https://s.example/biz/logo.png?v=1")).toBe(false);
    expect(isSvgUrl("https://s.example/biz/logo.png?f=a.svg")).toBe(false);
    expect(isSvgUrl("")).toBe(false);
    expect(isSvgUrl(null)).toBe(false);
    expect(isSvgUrl(undefined)).toBe(false);
  });
});

describe("rasterImageUrl", () => {
  it("passes raster URLs through and drops SVG / empty", () => {
    expect(rasterImageUrl("https://s.example/biz/logo.png?v=1")).toBe(
      "https://s.example/biz/logo.png?v=1",
    );
    expect(
      rasterImageUrl("https://s.example/biz/logo.svg?v=1"),
    ).toBeUndefined();
    expect(rasterImageUrl(null)).toBeUndefined();
    expect(rasterImageUrl("")).toBeUndefined();
  });
});

describe("isAvifUrl / shareableImageUrl", () => {
  it("matches .avif ignoring query, hash and case", () => {
    expect(isAvifUrl("https://s.example/biz/logo.avif")).toBe(true);
    expect(isAvifUrl("https://s.example/biz/LOGO.AVIF?v=1")).toBe(true);
    expect(isAvifUrl("https://s.example/biz/logo.png?f=a.avif")).toBe(false);
    expect(isAvifUrl(null)).toBe(false);
  });

  it("drops AVIF and blanks, keeps everything else", () => {
    expect(shareableImageUrl("https://s.example/p.avif?v=2")).toBeUndefined();
    expect(shareableImageUrl("")).toBeUndefined();
    expect(shareableImageUrl(undefined)).toBeUndefined();
    expect(shareableImageUrl("https://s.example/p.jpg")).toBe(
      "https://s.example/p.jpg",
    );
  });
});
