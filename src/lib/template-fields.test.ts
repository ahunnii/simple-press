import { describe, expect, it } from "vitest";

import type { TemplateListItemField } from "./template-fields";

import {
  getListRowSummary,
  getRawCustomFieldString,
  isRetiredTemplateKey,
  parseFaqPickerIds,
  parseTemplateListRows,
  resolveFaqPickerItems,
  RETIRED_TEMPLATE_KEYS,
  TEMPLATE_FIELDS,
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

describe("parseTemplateListRows — deterministic ids", () => {
  it("assigns the same _id across repeated calls on the same input shape", () => {
    const input = [{ title: "A" }, { title: "B" }, { title: "C" }];
    const first = parseTemplateListRows(input);
    const second = parseTemplateListRows(input);
    expect(first.map((r) => r._id)).toEqual(second.map((r) => r._id));
    expect(first.map((r) => r._id)).toEqual(["row-0", "row-1", "row-2"]);
  });

  it("preserves an existing _id unchanged", () => {
    const rows = parseTemplateListRows([
      { _id: "custom-id", title: "A" },
      { title: "B" },
    ]);
    expect(rows[0]?._id).toBe("custom-id");
    expect(rows[1]?._id).toBe("row-1");
  });

  it("de-dupes a generated id that collides with an existing _id elsewhere in the list", () => {
    // Row at index 0 has no _id, so it would generate "row-1" — but row 1
    // already claims that id, so it must fall back to "row-0-1".
    const rows = parseTemplateListRows([
      { title: "A" },
      { _id: "row-0", title: "B" },
    ]);
    const ids = rows.map((r) => r._id);
    expect(new Set(ids).size).toBe(2);
    expect(rows[1]?._id).toBe("row-0");
    expect(rows[0]?._id).not.toBe("row-0");
  });
});

describe("getListRowSummary", () => {
  const itemSchema: TemplateListItemField[] = [
    { key: "icon", label: "Icon", type: "icon" },
    { key: "title", label: "Title", type: "text" },
    { key: "body", label: "Body", type: "textarea" },
  ];

  it("prefers summaryKey when given and non-empty", () => {
    expect(
      getListRowSummary(
        { title: "Text title", body: "Body text" },
        itemSchema,
        "body",
      ),
    ).toBe("Body text");
  });

  it("falls back to the first non-empty text sub-field when summaryKey is unset", () => {
    expect(
      getListRowSummary({ title: "Text title", body: "Body text" }, itemSchema),
    ).toBe("Text title");
  });

  it("falls back to the first non-empty textarea sub-field when no text field has a value", () => {
    expect(
      getListRowSummary({ title: "", body: "Body text" }, itemSchema),
    ).toBe("Body text");
  });

  it("collapses internal whitespace/newlines in a textarea fallback to single spaces", () => {
    expect(
      getListRowSummary(
        { title: "", body: "Line one\n\n  Line   two\tend" },
        itemSchema,
      ),
    ).toBe("Line one Line two end");
  });

  it("falls back past a missing summaryKey to text/textarea", () => {
    expect(
      getListRowSummary(
        { title: "Text title", body: "Body text" },
        itemSchema,
        "missingKey",
      ),
    ).toBe("Text title");
  });

  it("falls back past a whitespace-only summaryKey value to text/textarea", () => {
    expect(
      getListRowSummary(
        { title: "   ", body: "Body text" },
        itemSchema,
        "title",
      ),
    ).toBe("Body text");
  });

  it("returns null when nothing usable is found", () => {
    expect(getListRowSummary({}, itemSchema)).toBeNull();
    expect(
      getListRowSummary({ title: "  ", body: "\n\t " }, itemSchema),
    ).toBeNull();
    expect(
      getListRowSummary({ icon: "star" }, [
        { key: "icon", label: "Icon", type: "icon" },
      ]),
    ).toBeNull();
  });
});

describe("getRawCustomFieldString", () => {
  it("returns the saved string with no default applied", () => {
    expect(getRawCustomFieldString({ foo: "bar" }, "foo")).toBe("bar");
    expect(getRawCustomFieldString({ foo: "" }, "foo")).toBe("");
  });

  it("returns undefined when the key is missing", () => {
    expect(getRawCustomFieldString({}, "foo")).toBeUndefined();
    expect(getRawCustomFieldString({ other: "x" }, "foo")).toBeUndefined();
  });

  it("returns undefined for a non-string value", () => {
    expect(getRawCustomFieldString({ foo: 42 }, "foo")).toBeUndefined();
    expect(getRawCustomFieldString({ foo: null }, "foo")).toBeUndefined();
    expect(getRawCustomFieldString({ foo: { a: 1 } }, "foo")).toBeUndefined();
    expect(getRawCustomFieldString({ foo: ["x"] }, "foo")).toBeUndefined();
  });

  it("returns undefined for a non-object customFields input", () => {
    expect(getRawCustomFieldString(null, "foo")).toBeUndefined();
    expect(getRawCustomFieldString(undefined, "foo")).toBeUndefined();
    expect(getRawCustomFieldString("string", "foo")).toBeUndefined();
    expect(getRawCustomFieldString(["foo"], "foo")).toBeUndefined();
  });
});

describe("isRetiredTemplateKey", () => {
  it("recognises the retired keys", () => {
    expect(isRetiredTemplateKey("bamboo.global.map-lat")).toBe(true);
    expect(isRetiredTemplateKey("bamboo.global.map-lng")).toBe(true);
    expect(isRetiredTemplateKey("bamboo.contact.hours")).toBe(true);
    expect(isRetiredTemplateKey("vii.contact.map-lat")).toBe(true);
    expect(isRetiredTemplateKey("vii.global.footer-tagline")).toBe(true);
    expect(isRetiredTemplateKey("vii.homepage.instagram-embed")).toBe(true);
  });

  it("is never still declared by a template", () => {
    const declared = Object.values(TEMPLATE_FIELDS)
      .flat()
      .map((field) => field.key)
      .filter((key) => RETIRED_TEMPLATE_KEYS.has(key));
    expect(declared).toEqual([]);
  });

  it("returns false for an active key", () => {
    expect(isRetiredTemplateKey("bamboo.global.title")).toBe(false);
    expect(isRetiredTemplateKey("")).toBe(false);
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
