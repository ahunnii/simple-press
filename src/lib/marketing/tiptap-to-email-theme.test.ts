import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import type { EmailBodyTheme } from "./tiptap-to-email";

import { tiptapToEmailHtml } from "./tiptap-to-email";

/** Covers every block and mark the walker emits styles for. */
const richDoc: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: 'Big "sale" & more' }],
    },
    {
      type: "heading",
      attrs: { level: 2, textAlign: "center" },
      content: [{ type: "text", text: "Sub" }],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "right" },
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "hardBreak" },
        {
          type: "text",
          text: "link",
          marks: [
            { type: "link", attrs: { href: "https://x.test/a?b=1&c=2" } },
          ],
        },
        {
          type: "text",
          text: " rel",
          marks: [{ type: "link", attrs: { href: "/contact" } }],
        },
        {
          type: "text",
          text: "Shop",
          marks: [
            {
              type: "link",
              attrs: { href: "https://x.test/shop", variant: "solid" },
            },
          ],
        },
        {
          type: "text",
          text: "More",
          marks: [
            {
              type: "link",
              attrs: { href: "https://x.test/more", variant: "outline" },
            },
            { type: "italic" },
          ],
        },
        {
          type: "text",
          text: "red",
          marks: [
            { type: "textStyle", attrs: { color: "#ff0000" } },
            { type: "highlight" },
          ],
        },
      ],
    },
    { type: "paragraph" },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "one" }] },
            {
              type: "orderedList",
              attrs: { start: 3 },
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "nested" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "quote" }] },
      ],
    },
    { type: "horizontalRule" },
    {
      type: "image",
      attrs: {
        src: "https://cdn.test/a.png",
        alt: "A",
        size: "medium",
        align: "center",
      },
    },
    {
      type: "table",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "cell" }] },
      ],
    },
  ],
};

/**
 * Captured from the walker BEFORE the email-style theme existed. Without a
 * theme the output must stay byte-identical (transactional-safe default).
 */
const UNTHEMED_HTML =
  '<h1 style="margin:24px 0 12px;font-size:28px;line-height:36px;font-weight:700;color:#111827">Big &quot;sale&quot; &amp; more</h1><h2 style="margin:24px 0 12px;font-size:22px;line-height:30px;font-weight:700;color:#111827;text-align:center">Sub</h2><p style="font-size:16px;line-height:26px;color:#333333;margin:0 0 16px;text-align:right">Hello <strong>bold</strong><br><a href="https://x.test/a?b=1&amp;c=2" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline">link</a><a href="https://shop.test/contact" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline"> rel</a><a href="https://x.test/shop" target="_blank" rel="noopener" style="display:inline-block;padding:10px 20px;border-radius:6px;background-color:#111827;color:#ffffff;text-decoration:none;font-weight:600">Shop</a><a href="https://x.test/more" target="_blank" rel="noopener" style="display:inline-block;padding:9px 19px;border-radius:6px;border:1px solid #111827;color:#111827;text-decoration:none;font-weight:600"><em>More</em></a><span style="color:#ff0000"><span style="background-color:#fef08a">red</span></span></p><p style="font-size:16px;line-height:26px;color:#333333;margin:0 0 16px">&nbsp;</p><ul style="margin:0 0 16px;padding:0 0 0 24px;font-size:16px;line-height:26px;color:#333333"><li style="margin:0 0 6px;font-size:16px;line-height:26px;color:#333333"><div style="margin:0">one</div><ol start="3" style="margin:6px 0 0;padding:0 0 0 24px;font-size:16px;line-height:26px;color:#333333"><li style="margin:0 0 6px;font-size:16px;line-height:26px;color:#333333"><div style="margin:0">nested</div></li></ol></li></ul><blockquote style="margin:0 0 16px;padding:4px 0 4px 16px;border-left:3px solid #d1d5db;color:#4b5563"><p style="font-size:16px;line-height:26px;color:#333333;margin:0 0 16px">quote</p></blockquote><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><img src="https://cdn.test/a.png" alt="A" style="width:50%;max-width:100%;height:auto;display:block;border:0;margin:0 0 16px;margin-left:auto;margin-right:auto"><p style="font-size:16px;line-height:26px;color:#333333;margin:0 0 16px">cell</p>';

const UNTHEMED_TEXT =
  'Big "sale" & more\n\nSub\n\nHello bold\nlink (https://x.test/a?b=1&c=2) rel (https://shop.test/contact)Shop (https://x.test/shop)More (https://x.test/more)red\n\n- one\n  3. nested\n\n> quote\n\n---\n\n[A]\n\ncell';

describe("tiptapToEmailHtml without a theme", () => {
  it("renders byte-identically to the pre-theme walker", () => {
    const r = tiptapToEmailHtml(richDoc, { baseUrl: "https://shop.test" });
    expect(r.html).toBe(UNTHEMED_HTML);
    expect(r.text).toBe(UNTHEMED_TEXT);
  });
});

const theme: EmailBodyTheme = {
  linkColor: "#7a2e3b",
  accent: "#e8b4c0",
  buttonText: "#111111",
  fontStack: 'Georgia,"Times New Roman",Times,serif',
};

/** Every `style="..."` attribute value in the HTML. */
function styleAttrs(html: string): string[] {
  return [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]!);
}

describe("tiptapToEmailHtml with a theme", () => {
  const { html, text } = tiptapToEmailHtml(richDoc, {
    baseUrl: "https://shop.test",
    theme,
  });

  it("colors text links with linkColor", () => {
    expect(html).toContain(
      `<a href="https://x.test/a?b=1&amp;c=2" target="_blank" rel="noopener" style="color:#7a2e3b;text-decoration:underline">link</a>`,
    );
    expect(html).toContain(
      `href="https://shop.test/contact" target="_blank" rel="noopener" style="color:#7a2e3b;text-decoration:underline"`,
    );
    expect(html).not.toContain("#2563eb");
  });

  it("fills solid buttons with the accent and the button text color", () => {
    expect(html).toContain(
      `<a href="https://x.test/shop" target="_blank" rel="noopener" style="display:inline-block;padding:9px 19px;border-radius:6px;border:1px solid #e8b4c0;background-color:#e8b4c0;color:#111111;text-decoration:none;font-weight:600">Shop</a>`,
    );
  });

  it("draws outline buttons in linkColor (the accent may be too light for text)", () => {
    expect(html).toContain(
      `<a href="https://x.test/more" target="_blank" rel="noopener" style="display:inline-block;padding:9px 19px;border-radius:6px;border:1px solid #7a2e3b;color:#7a2e3b;text-decoration:none;font-weight:600"><em>More</em></a>`,
    );
  });

  it("sets the font on every text block, with quotes safe inside the attribute", () => {
    const font = "font-family:Georgia,'Times New Roman',Times,serif";
    for (const tag of ["h1", "h2", "p", "ul", "ol", "li", "blockquote"]) {
      const re = new RegExp(`<${tag}[^>]*style="[^"]*${font}[^"]*"`);
      expect(html, tag).toMatch(re);
    }
    // No raw double quote leaks into (and cuts short) a style attribute:
    // every attribute that mentions the font holds the whole stack.
    for (const style of styleAttrs(html)) {
      if (style.includes("font-family")) expect(style).toContain(font);
    }
    expect(html).not.toContain('"Times New Roman"');
    expect(html).not.toContain("&quot;Times");
  });

  it("keeps heading colors, the highlight and inline colors", () => {
    expect(html).toContain(
      `<h1 style="margin:24px 0 12px;font-size:28px;line-height:36px;font-weight:700;color:#111827;font-family:Georgia,'Times New Roman',Times,serif">`,
    );
    expect(html).toContain(
      `<h2 style="margin:24px 0 12px;font-size:22px;line-height:30px;font-weight:700;color:#111827;font-family:Georgia,'Times New Roman',Times,serif;text-align:center">`,
    );
    expect(html).toContain(
      `<span style="color:#ff0000"><span style="background-color:#fef08a">red</span></span>`,
    );
  });

  it("leaves the plain text unchanged", () => {
    expect(text).toBe(UNTHEMED_TEXT);
  });

  it("falls back on unusable theme values instead of emitting them", () => {
    const r = tiptapToEmailHtml(richDoc, {
      theme: {
        linkColor: 'red;" onmouseover="x',
        accent: "url(x)",
        buttonText: '#fff"',
        fontStack: 'Arial;"><script>',
      },
    });
    expect(r.html).not.toContain("onmouseover");
    expect(r.html).not.toContain("<script>");
    expect(r.html).not.toContain("url(x)");
    expect(r.html).not.toContain("font-family");
    expect(r.html).toContain("color:#2563eb;text-decoration:underline");
    expect(r.html).toContain(
      "border:1px solid #111827;background-color:#111827;color:#ffffff",
    );
  });

  it("treats a null theme like no theme", () => {
    expect(
      tiptapToEmailHtml(richDoc, { baseUrl: "https://shop.test", theme: null })
        .html,
    ).toBe(UNTHEMED_HTML);
  });
});
