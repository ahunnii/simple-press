import { describe, expect, it } from "vitest";

import { isSafeHref, safeHref, safeHrefOr, safeHrefSchema } from "./safe-href";

describe("safeHref — accepted values", () => {
  it.each([
    ["rooted path", "/shop"],
    ["fragment", "#top"],
    ["query only", "?x=1"],
    ["bare host", "www.example.com"],
    ["bare host with path", "example.com/path"],
    ["protocol-relative", "//cdn.example.com/a.js"],
    ["http", "http://a.b"],
    ["uppercase https with query + fragment", "HTTPS://A.B/x?y#z"],
    ["mailto", "mailto:a@b.c"],
    ["tel", "tel:+15551234567"],
    ["sms", "sms:+1555"],
  ])("accepts a %s", (_label, value) => {
    expect(safeHref(value)).toBe(value);
  });

  it("returns the trimmed value, not the original padding", () => {
    expect(safeHref(" https://x ")).toBe("https://x");
  });

  it("never returns the percent-decoded form", () => {
    // The decode is a scheme probe only — a legitimate escape survives.
    expect(safeHref("https://x/a%20b")).toBe("https://x/a%20b");
  });

  it("tolerates a malformed percent escape rather than dropping the link", () => {
    expect(safeHref("https://x/100%discount")).toBe("https://x/100%discount");
  });
});

describe("safeHref — refused values", () => {
  it.each([
    ["javascript", "javascript:alert(1)"],
    ["mixed-case javascript", "JaVaScRiPt:1"],
    ["data", "data:text/html;base64,AAA"],
    ["vbscript", "vbscript:x"],
    ["file", "file:///etc/passwd"],
    ["blob", "blob:https://x/y"],
    ["ftp", "ftp://x"],
    ["tab-split javascript", "java\tscript:alert(1)"],
    ["newline-split javascript", "java\nscript:1"],
    ["percent-encoded javascript", "%6Aavascript:alert(1)"],
    ["double-encoded javascript", "%256Aavascript:1"],
    ["leading-space javascript", " javascript:1"],
    ["zero-width-prefixed javascript", "\u200Bjavascript:1"],
    ["NUL-laced javascript", "java\u0000script:1"],
  ])("refuses %s", (_label, value) => {
    expect(safeHref(value)).toBeNull();
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["number", 5],
    ["object", {}],
    ["array", []],
  ])("refuses a non-string (%s)", (_label, value) => {
    expect(safeHref(value)).toBeNull();
  });

  it("refuses an empty / whitespace-only string", () => {
    expect(safeHref("")).toBeNull();
    expect(safeHref("   ")).toBeNull();
  });
});

describe("safeHrefSchema", () => {
  it("accepts the empty string so owners can clear a link", () => {
    expect(safeHrefSchema.parse("")).toBe("");
  });

  it("trims what it stores", () => {
    expect(safeHrefSchema.parse("  /shop  ")).toBe("/shop");
  });

  it("accepts a relative path and an http(s) URL", () => {
    expect(safeHrefSchema.parse("/shop")).toBe("/shop");
    expect(safeHrefSchema.parse("https://example.com")).toBe(
      "https://example.com",
    );
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "ftp://x"])(
    "refuses %s",
    (value) => {
      expect(safeHrefSchema.safeParse(value).success).toBe(false);
    },
  );

  it("refuses a value over 2048 characters", () => {
    expect(safeHrefSchema.safeParse(`/${"a".repeat(2048)}`).success).toBe(
      false,
    );
  });
});

describe("isSafeHref", () => {
  it("treats blank as safe (a cleared field) but non-strings as unsafe", () => {
    expect(isSafeHref("")).toBe(true);
    expect(isSafeHref("   ")).toBe(true);
    expect(isSafeHref(null)).toBe(false);
    expect(isSafeHref("javascript:1")).toBe(false);
    expect(isSafeHref("/shop")).toBe(true);
  });
});

describe("safeHrefOr", () => {
  it("returns the value when safe and the fallback otherwise", () => {
    expect(safeHrefOr("/shop", "/")).toBe("/shop");
    expect(safeHrefOr("javascript:1", "/")).toBe("/");
    expect(safeHrefOr("", "/")).toBe("/");
    expect(safeHrefOr(undefined, "/fallback")).toBe("/fallback");
  });
});
