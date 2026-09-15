import { describe, expect, it } from "vitest";

import { parseTemplateListRows } from "./template-fields";

/**
 * List rows live inside `customFields` (`z.any()` on the wire), so the row
 * parser is the only guard on the `href`/`url`/`link` values templates render.
 */
describe("parseTemplateListRows — link scrubbing", () => {
  it("keeps safe link values on every recognised key", () => {
    const [row] = parseTemplateListRows([
      {
        _id: "r1",
        href: "https://example.com",
        url: "/shop",
        link: "#top",
        linkUrl: "mailto:a@b.c",
        ctaUrl: "tel:+15551234567",
        buttonUrl: "//cdn.example.com/a",
      },
    ]);

    expect(row).toEqual({
      _id: "r1",
      href: "https://example.com",
      url: "/shop",
      link: "#top",
      linkUrl: "mailto:a@b.c",
      ctaUrl: "tel:+15551234567",
      buttonUrl: "//cdn.example.com/a",
    });
  });

  it("blanks an unsafe value on each recognised key", () => {
    const [row] = parseTemplateListRows([
      {
        _id: "r1",
        href: "javascript:alert(1)",
        url: "data:text/html,x",
        link: "vbscript:x",
        linkUrl: "%6Aavascript:1",
        ctaUrl: "java\tscript:1",
        buttonUrl: "ftp://x",
      },
    ]);

    expect(row).toEqual({
      _id: "r1",
      href: "",
      url: "",
      link: "",
      linkUrl: "",
      ctaUrl: "",
      buttonUrl: "",
    });
  });

  it("leaves every other key — and non-string values — exactly as stored", () => {
    const [row] = parseTemplateListRows([
      {
        _id: "r1",
        title: "javascript:alert(1)",
        image: "data:image/png;base64,AAA",
        href: 42,
        count: 3,
      },
    ]);

    expect(row).toEqual({
      _id: "r1",
      title: "javascript:alert(1)",
      image: "data:image/png;base64,AAA",
      href: 42,
      count: 3,
    });
  });

  it("still assigns an _id and tolerates malformed rows", () => {
    const rows = parseTemplateListRows([{ href: "/a" }, "nope", null]);
    expect(rows).toHaveLength(3);
    expect(typeof rows[0]?._id).toBe("string");
    expect(rows[0]?.href).toBe("/a");
  });

  it("returns [] for a non-array", () => {
    expect(parseTemplateListRows(null)).toEqual([]);
    expect(parseTemplateListRows({ href: "/a" })).toEqual([]);
  });
});
