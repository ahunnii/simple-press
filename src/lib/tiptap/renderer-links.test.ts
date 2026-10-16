import { generateHTML } from "@tiptap/html/server";
import { describe, expect, it } from "vitest";

import { isInternalHref } from "./link-extension";
import { RENDERER_BASE_EXTENSIONS } from "./renderer-extensions";

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

  it("respects an explicit _self target on an external link", () => {
    const html = render("https://example.com", "_self");
    expect(html).toContain('target="_self"');
    expect(html).toContain("nofollow");
  });
});
