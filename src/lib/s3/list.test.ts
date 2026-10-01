import { describe, expect, it } from "vitest";

import { parseContents } from "./list";

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

  it("skips editor-note attachments (not site media)", () => {
    const objs = parseContents(
      `<ListBucketResult>${contents("biz1/editor-notes/0123456789abcdef.jpg")}${contents("biz1/image-abc.png")}</ListBucketResult>`,
    );
    expect(objs.map((o) => o.key)).toEqual(["biz1/image-abc.png"]);
  });
});
