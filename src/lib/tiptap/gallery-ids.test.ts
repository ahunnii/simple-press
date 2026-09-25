import { describe, expect, it } from "vitest";

import { collectGalleryIds } from "./gallery-ids";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const para = (...content: unknown[]) => ({ type: "paragraph", content });
const gallery = (galleryId: unknown) => ({
  type: "gallery",
  attrs: { galleryId },
});

describe("collectGalleryIds — envelope", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
    ["a boolean", true],
    ["an empty string", ""],
    ["whitespace only", "   "],
    ["plain text", "hello world"],
    ["an empty object", {}],
    ["an empty array", []],
  ])("returns [] for %s", (_label, input) => {
    expect(collectGalleryIds(input)).toEqual([]);
  });
});

describe("collectGalleryIds — direct doc walk", () => {
  it("finds a single top-level gallery node", () => {
    const input = doc(para("intro"), gallery("gal-1"), para("outro"));
    expect(collectGalleryIds(input)).toEqual(["gal-1"]);
  });

  it("finds a gallery node nested inside other nodes", () => {
    const input = doc({
      type: "blockquote",
      content: [para("wrapped"), gallery("gal-nested")],
    });
    expect(collectGalleryIds(input)).toEqual(["gal-nested"]);
  });

  it("finds multiple galleries and preserves discovery order", () => {
    const input = doc(gallery("gal-a"), para("x"), gallery("gal-b"));
    expect(collectGalleryIds(input)).toEqual(["gal-a", "gal-b"]);
  });

  it("dedupes repeated gallery ids", () => {
    const input = doc(gallery("gal-1"), gallery("gal-1"), gallery("gal-1"));
    expect(collectGalleryIds(input)).toEqual(["gal-1"]);
  });

  it("ignores a gallery node with a missing galleryId attr", () => {
    const input = doc({ type: "gallery", attrs: {} });
    expect(collectGalleryIds(input)).toEqual([]);
  });

  it("ignores a gallery node with an empty-string galleryId", () => {
    const input = doc(gallery(""));
    expect(collectGalleryIds(input)).toEqual([]);
  });

  it("ignores a gallery node with a non-string galleryId", () => {
    const input = doc(gallery(123));
    expect(collectGalleryIds(input)).toEqual([]);
  });

  it("ignores a gallery-like node with no attrs at all", () => {
    const input = doc({ type: "gallery" });
    expect(collectGalleryIds(input)).toEqual([]);
  });
});

describe("collectGalleryIds — string-encoded JSON", () => {
  it("parses a JSON-stringified doc and finds its gallery", () => {
    const input = JSON.stringify(doc(gallery("gal-encoded")));
    expect(collectGalleryIds(input)).toEqual(["gal-encoded"]);
  });

  it("finds galleries inside string values nested in an object (e.g. template customFields)", () => {
    const customFields = {
      "service-one.hero-image": "/placeholder.svg",
      "service-one.intro-body": JSON.stringify(doc(gallery("gal-service"))),
      "service-one.cta-text": "Book now",
    };
    expect(collectGalleryIds(customFields)).toEqual(["gal-service"]);
  });

  it("finds galleries across multiple string-encoded fields", () => {
    const customFields = {
      a: JSON.stringify(doc(gallery("gal-1"))),
      b: "plain text, not json",
      c: JSON.stringify(doc(gallery("gal-2"))),
    };
    expect(collectGalleryIds(customFields)).toEqual(["gal-1", "gal-2"]);
  });

  it("does not throw on a string that looks like JSON but isn't valid", () => {
    const input = { field: "{not valid json" };
    expect(collectGalleryIds(input)).toEqual([]);
  });
});

describe("collectGalleryIds — arrays and mixed containers", () => {
  it("walks an array of docs", () => {
    const input = [doc(gallery("gal-1")), doc(gallery("gal-2"))];
    expect(collectGalleryIds(input)).toEqual(["gal-1", "gal-2"]);
  });

  it("walks an array of blog-like pages, each with its own content", () => {
    const pages = [
      { slug: "a", content: doc(gallery("gal-a")) },
      { slug: "b", content: doc(para("no gallery here")) },
      { slug: "c", content: doc(gallery("gal-c")) },
    ];
    expect(collectGalleryIds(pages)).toEqual(["gal-a", "gal-c"]);
  });
});
