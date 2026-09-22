import { describe, expect, it } from "vitest";

import {
  parseFaqPickerIds,
  parseTemplateListRows,
  resolveFaqPickerItems,
} from "./template-fields";

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

describe("parseFaqPickerIds", () => {
  it("returns ordered ids for a string array", () => {
    expect(parseFaqPickerIds(["b", " a ", ""])).toEqual(["b", "a"]);
  });

  it("treats empty / missing / leftover list rows as unset", () => {
    expect(parseFaqPickerIds(undefined)).toBeNull();
    expect(parseFaqPickerIds(null)).toBeNull();
    expect(parseFaqPickerIds([])).toBeNull();
    expect(parseFaqPickerIds([{ question: "Q", answer: "A" }])).toBeNull();
    expect(parseFaqPickerIds("faq_1")).toBeNull();
  });
});

describe("resolveFaqPickerItems", () => {
  const published = [
    { id: "a", question: "A" },
    { id: "b", question: "B" },
    { id: "c", question: "C" },
  ];

  it("falls back to the first N published items when unset", () => {
    expect(resolveFaqPickerItems(undefined, published, 2)).toEqual([
      published[0],
      published[1],
    ]);
    expect(resolveFaqPickerItems([], published, 2)).toEqual([
      published[0],
      published[1],
    ]);
    expect(
      resolveFaqPickerItems([{ question: "Q", answer: "A" }], published, 2),
    ).toEqual([published[0], published[1]]);
  });

  it("honors picked order, skips missing ids, and caps at maxItems", () => {
    expect(
      resolveFaqPickerItems(["c", "missing", "a", "b"], published, 2),
    ).toEqual([published[2], published[0]]);
  });

  it("returns [] when the picker resolved to nothing", () => {
    expect(resolveFaqPickerItems(["gone"], published, 6)).toEqual([]);
    expect(resolveFaqPickerItems(undefined, [], 6)).toEqual([]);
    expect(resolveFaqPickerItems(["a"], published, 0)).toEqual([]);
  });
});
