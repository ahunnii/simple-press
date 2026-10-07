import { describe, expect, it } from "vitest";

import {
  buildPageHref,
  isPlainLeftClick,
  paginatedPath,
  parsePageParam,
} from "./pagination";

describe("parsePageParam", () => {
  it("parses string page numbers", () => {
    expect(parsePageParam("1")).toBe(1);
    expect(parsePageParam("7")).toBe(7);
    expect(parsePageParam("42")).toBe(42);
  });

  it("floors decimal values", () => {
    expect(parsePageParam("2.5")).toBe(2);
    expect(parsePageParam("3.9")).toBe(3);
  });

  it("returns 1 for negative numbers", () => {
    expect(parsePageParam("-1")).toBe(1);
    expect(parsePageParam("-100")).toBe(1);
  });

  it("returns 1 for zero", () => {
    expect(parsePageParam("0")).toBe(1);
  });

  it("returns 1 for non-numeric strings", () => {
    expect(parsePageParam("foo")).toBe(1);
    expect(parsePageParam("abc123")).toBe(1);
  });

  it("takes first element if array", () => {
    expect(parsePageParam(["3", "4"])).toBe(3);
    expect(parsePageParam(["7"])).toBe(7);
  });

  it("returns 1 for null", () => {
    expect(parsePageParam(null)).toBe(1);
  });

  it("returns 1 for undefined", () => {
    expect(parsePageParam(undefined)).toBe(1);
  });
});

describe("buildPageHref", () => {
  it("removes page param when page is 1", () => {
    const params = new URLSearchParams("page=2&sort=name");
    expect(buildPageHref("/products", params, 1)).toBe(
      "/products?sort=name",
    );
  });

  it("sets page param when page >= 2", () => {
    const params = new URLSearchParams("sort=name");
    expect(buildPageHref("/products", params, 3)).toBe(
      "/products?sort=name&page=3",
    );
  });

  it("updates existing page param", () => {
    const params = new URLSearchParams("page=2&sort=name");
    const result = buildPageHref("/products", params, 5);
    expect(result).toContain("page=5");
    expect(result).toContain("sort=name");
  });

  it("returns just path when page is 1 and no other params", () => {
    const params = new URLSearchParams("");
    expect(buildPageHref("/products", params, 1)).toBe("/products");
  });

  it("preserves parameter order", () => {
    const params = new URLSearchParams("in_stock=true&sort_by=price");
    expect(buildPageHref("/products", params, 2)).toBe(
      "/products?in_stock=true&sort_by=price&page=2",
    );
  });

  it("accepts string query string", () => {
    expect(buildPageHref("/products", "sort=name", 1)).toBe(
      "/products?sort=name",
    );
    expect(buildPageHref("/products", "sort=name", 2)).toBe(
      "/products?sort=name&page=2",
    );
  });
});

describe("paginatedPath", () => {
  it("returns path when page is 1", () => {
    expect(paginatedPath("/shop", 1)).toBe("/shop");
  });

  it("appends page param when page >= 2", () => {
    expect(paginatedPath("/shop", 2)).toBe("/shop?page=2");
    expect(paginatedPath("/shop", 5)).toBe("/shop?page=5");
  });

  it("returns path when page is 0 or negative", () => {
    expect(paginatedPath("/shop", 0)).toBe("/shop");
    expect(paginatedPath("/shop", -1)).toBe("/shop");
  });
});

describe("isPlainLeftClick", () => {
  it("returns true for unmodified left click", () => {
    expect(
      isPlainLeftClick({
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        defaultPrevented: false,
      }),
    ).toBe(true);
  });

  it("returns false for middle click (button 1)", () => {
    expect(
      isPlainLeftClick({
        button: 1,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        defaultPrevented: false,
      }),
    ).toBe(false);
  });

  it("returns false for right click (button 2)", () => {
    expect(
      isPlainLeftClick({
        button: 2,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        defaultPrevented: false,
      }),
    ).toBe(false);
  });

  it("returns false when metaKey is true", () => {
    expect(
      isPlainLeftClick({
        button: 0,
        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        defaultPrevented: false,
      }),
    ).toBe(false);
  });

  it("returns false when ctrlKey is true", () => {
    expect(
      isPlainLeftClick({
        button: 0,
        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        defaultPrevented: false,
      }),
    ).toBe(false);
  });

  it("returns false when shiftKey is true", () => {
    expect(
      isPlainLeftClick({
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
        defaultPrevented: false,
      }),
    ).toBe(false);
  });

  it("returns false when altKey is true", () => {
    expect(
      isPlainLeftClick({
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: true,
        defaultPrevented: false,
      }),
    ).toBe(false);
  });

  it("returns false when defaultPrevented is true", () => {
    expect(
      isPlainLeftClick({
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        defaultPrevented: true,
      }),
    ).toBe(false);
  });
});
