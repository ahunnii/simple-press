import { describe, expect, it } from "vitest";

import { isSvgUrl, rasterImageUrl } from "./image-url";

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
