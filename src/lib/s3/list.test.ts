import { describe, expect, it } from "vitest";

import { classifyKind, hasImageExtension, parseContents } from "./list";

function contents(key: string) {
  return `<Contents><Key>${key}</Key><LastModified>2026-09-30T00:00:00.000Z</LastModified><Size>1234</Size></Contents>`;
}

describe("parseContents", () => {
  it("classifies regular business media", () => {
    const objs = parseContents(
      `<ListBucketResult>${contents("biz1/image-abc.png")}${contents("biz1/gallery-def.jpg")}</ListBucketResult>`,
    );
    expect(objs.map((o) => [o.key, o.kind])).toEqual([
      ["biz1/image-abc.png", "image"],
      ["biz1/gallery-def.jpg", "gallery"],
    ]);
  });

  it("classifies Media Library uploads as images", () => {
    const objs = parseContents(
      `<ListBucketResult>${contents("biz1/library-abc.webp")}</ListBucketResult>`,
    );
    expect(objs.map((o) => [o.key, o.kind])).toEqual([
      ["biz1/library-abc.webp", "image"],
    ]);
  });

  it("skips editor-note attachments (not site media)", () => {
    const objs = parseContents(
      `<ListBucketResult>${contents("biz1/editor-notes/0123456789abcdef.jpg")}${contents("biz1/image-abc.png")}</ListBucketResult>`,
    );
    expect(objs.map((o) => o.key)).toEqual(["biz1/image-abc.png"]);
  });
});

describe("image-kind classification", () => {
  it("does not classify font files under image prefixes as images", () => {
    for (const ext of [".woff2", ".woff", ".ttf", ".otf", ".eot"]) {
      expect(classifyKind(`image-abc${ext}`)).toBe("other");
      expect(classifyKind(`library-abc${ext}`)).toBe("other");
      expect(classifyKind(`gallery-abc${ext}`)).toBe("other");
      expect(classifyKind(`testimonials/abc${ext}`)).toBe("other");
    }
  });

  it("keeps real images as image kinds, case-insensitively", () => {
    expect(classifyKind("image-abc.JPG")).toBe("image");
    expect(classifyKind("library-abc.svg")).toBe("image");
    expect(classifyKind("gallery-abc.avif")).toBe("gallery");
    expect(classifyKind("testimonials/abc.png")).toBe("testimonial");
  });

  it("leaves videos, logo and favicon classification alone", () => {
    expect(classifyKind("video-abc.mp4")).toBe("video");
    expect(classifyKind("logo.svg")).toBe("logo");
    expect(classifyKind("favicon.ico")).toBe("favicon");
    expect(classifyKind("notes.pdf")).toBe("other");
  });

  it("treats extensionless keys as non-images", () => {
    expect(hasImageExtension("biz1/image-abc")).toBe(false);
    expect(hasImageExtension("biz1/image-abc.webp")).toBe(true);
  });

  it("lists font files as 'other' via parseContents", () => {
    const objs = parseContents(
      `<ListBucketResult>${contents("biz1/image-f.woff2")}${contents("biz1/image-p.png")}</ListBucketResult>`,
    );
    expect(objs.map((o) => [o.key, o.kind])).toEqual([
      ["biz1/image-f.woff2", "other"],
      ["biz1/image-p.png", "image"],
    ]);
  });
});
