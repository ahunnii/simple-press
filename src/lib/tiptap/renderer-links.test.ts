import { getSchema } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";
import { describe, expect, it } from "vitest";

import { isInternalHref } from "./link-extension";
import { RENDERER_BASE_EXTENSIONS } from "./renderer-extensions";
import { sanitizeTiptapDoc } from "./sanitize";

function render(href: string, target?: string): string {
  return generateHTML(
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "go",
              marks: [
                {
                  type: "link",
                  attrs: { href, ...(target !== undefined ? { target } : {}) },
                },
              ],
            },
          ],
        },
      ],
    },
    RENDERER_BASE_EXTENSIONS,
  );
}

describe("isInternalHref", () => {
  it("accepts single-slash paths and anchors only", () => {
    expect(isInternalHref("/contact")).toBe(true);
    expect(isInternalHref("/shop?x=1#top")).toBe(true);
    expect(isInternalHref("#faq")).toBe(true);
    expect(isInternalHref("//cdn.example.com")).toBe(false);
    expect(isInternalHref("https://example.com")).toBe(false);
    expect(isInternalHref("mailto:a@b.com")).toBe(false);
    expect(isInternalHref(undefined)).toBe(false);
  });
});

describe("renderer link mark", () => {
  it("leaves internal links without rel or a forced new tab", () => {
    for (const html of [render("/contact"), render("#top"), render("/a", "")]) {
      expect(html).not.toContain("rel=");
      expect(html).not.toContain("target=");
    }
  });

  it("honours an explicit new tab on an internal link (without nofollow)", () => {
    const html = render("/contact", "_blank");
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain("nofollow");
  });

  it("keeps external links nofollow and (by default) in a new tab", () => {
    for (const html of [
      render("https://example.com"),
      render("//cdn.example.com/x"),
      render("mailto:a@b.com"),
    ]) {
      expect(html).toContain('rel="noopener noreferrer nofollow"');
      expect(html).toContain('target="_blank"');
    }
  });

  it("keeps an external link with no stored choice in a new tab", () => {
    for (const html of [
      render("https://example.com"),
      render("https://example.com", ""),
    ]) {
      expect(html).toContain('target="_blank"');
    }
  });

  it("renders an external _self link with no target (same tab), still nofollow", () => {
    const html = render("https://example.com", "_self");
    expect(html).not.toContain("target=");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it("renders an internal _self link with no target", () => {
    const html = render("/contact", "_self");
    expect(html).not.toContain("target=");
    expect(html).not.toContain("rel=");
  });

  it("keeps an sms: href (it is not blanked by the protocol allowlist)", () => {
    const html = render("sms:+15551234567", "_self");
    expect(html).toContain('href="sms:+15551234567"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).not.toContain("target=");
  });

  it("still blanks a javascript: href", () => {
    const html = render("javascript:alert(1)");
    expect(html).not.toContain("javascript:");
  });
});

describe("renderer highlight / subscript / superscript marks", () => {
  const sanitized = sanitizeTiptapDoc(
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "hi",
              marks: [{ type: "highlight", attrs: { color: "red" } }],
            },
            { type: "text", text: "2", marks: [{ type: "superscript" }] },
            { type: "text", text: "3", marks: [{ type: "subscript" }] },
          ],
        },
      ],
    },
    getSchema(RENDERER_BASE_EXTENSIONS),
  );
  const html = generateHTML(sanitized!, RENDERER_BASE_EXTENSIONS);

  it("survives the sanitizer and renders <mark>, <sup> and <sub>", () => {
    expect(html).toContain('<mark class="sp-mark">hi</mark>');
    expect(html).toContain("<sup>2</sup>");
    expect(html).toContain("<sub>3</sub>");
  });

  it("never emits a colour from stored highlight attrs", () => {
    expect(html).not.toContain("red");
    expect(html).not.toContain("style=");
  });
});
