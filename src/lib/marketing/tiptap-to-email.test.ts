import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import {
  plainTextToTiptapDoc,
  tiptapHasContent,
  tiptapToEmailHtml,
} from "./tiptap-to-email";

const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
});
const p = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  content,
});
const t = (text: string, marks?: JSONContent["marks"]): JSONContent => ({
  type: "text",
  text,
  ...(marks ? { marks } : {}),
});

describe("tiptapToEmailHtml", () => {
  it("renders paragraphs with inline styles only", () => {
    const { html, text, warnings } = tiptapToEmailHtml(
      doc(p(t("Hello there")), p(t("Second"))),
    );
    expect(html).toContain("<p style=");
    expect(html).toContain("Hello there");
    expect(html).not.toMatch(/class=/);
    expect(text).toBe("Hello there\n\nSecond");
    expect(warnings).toEqual([]);
  });

  it("escapes markup in text", () => {
    const { html } = tiptapToEmailHtml(
      doc(p(t(`<script>alert("x")</script> & 'y'`))),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&amp; &#39;y&#39;");
  });

  it("escapes attribute values (link href, image alt/src)", () => {
    const { html } = tiptapToEmailHtml(
      doc(
        p(
          t("go", [
            {
              type: "link",
              attrs: { href: `https://x.test/?a="><script>1</script>` },
            },
          ]),
        ),
        {
          type: "image",
          attrs: {
            src: `https://cdn.test/a.png?x="onerror="1`,
            alt: `"><script>1</script>`,
          },
        },
      ),
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain(`"onerror="`);
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("applies bold, italic, underline, strike and keeps the link outermost", () => {
    const { html } = tiptapToEmailHtml(
      doc(
        p(
          t("hi", [
            { type: "bold" },
            { type: "italic" },
            { type: "underline" },
            { type: "strike" },
            { type: "link", attrs: { href: "https://shop.test/a" } },
          ]),
        ),
      ),
    );
    expect(html).toContain(
      '<a href="https://shop.test/a" target="_blank" rel="noopener"',
    );
    expect(html).toMatch(
      /<a [^>]+><strong><em><u><s>hi<\/s><\/u><\/em><\/strong><\/a>/,
    );
  });

  it("drops javascript: and other unsafe links but keeps the text", () => {
    const { html, text, warnings } = tiptapToEmailHtml(
      doc(
        p(
          t("bad", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]),
          t(" data", [
            { type: "link", attrs: { href: "data:text/html,<b>x" } },
          ]),
          t(" rel", [{ type: "link", attrs: { href: "/relative" } }]),
        ),
      ),
    );
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("bad");
    expect(text).toBe("bad data rel");
    expect(warnings).toHaveLength(1);
  });

  it("allows http and mailto links and prints them in plain text", () => {
    const { html, text } = tiptapToEmailHtml(
      doc(
        p(
          t("web", [{ type: "link", attrs: { href: "http://a.test/x" } }]),
          t(" mail", [{ type: "link", attrs: { href: "mailto:hi@a.test" } }]),
        ),
      ),
    );
    expect(html).toContain('href="http://a.test/x"');
    expect(html).toContain('href="mailto:hi@a.test"');
    expect(text).toBe("web (http://a.test/x) mail (mailto:hi@a.test)");
  });

  describe("site-relative links", () => {
    const link = (text: string, href: string) =>
      t(text, [{ type: "link", attrs: { href } }]);
    const base = "https://shop.example.com";

    it("resolves /paths against the base URL", () => {
      const { html, text, warnings } = tiptapToEmailHtml(
        doc(p(link("Contact", "/contact"), link(" Shop", "/shop?x=1#top"))),
        { baseUrl: base },
      );
      expect(html).toContain('href="https://shop.example.com/contact"');
      expect(html).toContain('href="https://shop.example.com/shop?x=1#top"');
      expect(text).toBe(
        "Contact (https://shop.example.com/contact) Shop (https://shop.example.com/shop?x=1#top)",
      );
      expect(warnings).toEqual([]);
    });

    it("works with a dev http origin and a trailing slash", () => {
      const { html } = tiptapToEmailHtml(doc(p(link("Home", "/"))), {
        baseUrl: "http://demo.localhost:3000/",
      });
      expect(html).toContain('href="http://demo.localhost:3000/"');
    });

    it("drops relative links (with a warning) when there is no base URL", () => {
      for (const options of [
        undefined,
        {},
        { baseUrl: null },
        { baseUrl: "" },
      ]) {
        const { html, warnings } = tiptapToEmailHtml(
          doc(p(link("Contact", "/contact"))),
          options,
        );
        expect(html).not.toContain("<a ");
        expect(html).toContain("Contact");
        expect(warnings).toHaveLength(1);
      }
    });

    it("ignores an unsafe or non-web base URL", () => {
      for (const baseUrl of [
        "javascript:alert(1)",
        "not a url",
        "mailto:a@b.c",
      ]) {
        const { html } = tiptapToEmailHtml(
          doc(p(link("Contact", "/contact"))),
          { baseUrl },
        );
        expect(html).not.toContain("<a ");
      }
    });

    it("still drops protocol-relative and unsafe links when a base URL is set", () => {
      const { html, warnings } = tiptapToEmailHtml(
        doc(
          p(
            link("a", "//evil.test/x"),
            link("b", "/\\evil.test"),
            link("c", "javascript:alert(1)"),
            link("d", "data:text/html,<b>x"),
            link("e", "contact"),
            link("f", "/ok\nbad"),
            link("g", "#top"),
          ),
        ),
        { baseUrl: base },
      );
      expect(html).not.toContain("<a ");
      expect(html).not.toContain("evil.test");
      expect(warnings).toHaveLength(1);
    });

    it("leaves absolute links unchanged and keeps the new warning text", () => {
      const { html } = tiptapToEmailHtml(
        doc(p(link("web", "https://other.test/a"))),
        { baseUrl: base },
      );
      expect(html).toContain('href="https://other.test/a"');
      const dropped = tiptapToEmailHtml(doc(p(link("x", "ftp://a.test"))), {
        baseUrl: base,
      });
      expect(dropped.warnings).toEqual([
        "Links must be web addresses (https://…), email addresses (mailto:) or pages on your site; other links were removed.",
      ]);
    });
  });

  it("renders headings, clamping levels above 3", () => {
    const { html, text } = tiptapToEmailHtml(
      doc(
        { type: "heading", attrs: { level: 1 }, content: [t("One")] },
        { type: "heading", attrs: { level: 5 }, content: [t("Five")] },
      ),
    );
    expect(html).toContain("<h1 ");
    expect(html).toContain("<h3 ");
    expect(html).not.toContain("<h5");
    expect(text).toBe("One\n\nFive");
  });

  it("renders nested lists", () => {
    const { html, text } = tiptapToEmailHtml(
      doc({
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              p(t("Parent")),
              {
                type: "orderedList",
                content: [
                  { type: "listItem", content: [p(t("First"))] },
                  { type: "listItem", content: [p(t("Second"))] },
                ],
              },
            ],
          },
          { type: "listItem", content: [p(t("Sibling"))] },
        ],
      }),
    );
    expect(html).toMatch(/<ul [^>]*>.*<li [^>]*>.*<ol [^>]*>.*<\/ol><\/li>/);
    expect(html.match(/<li /g)).toHaveLength(4);
    expect(text).toBe("- Parent\n  1. First\n  2. Second\n- Sibling");
  });

  it("renders blockquote and horizontal rule", () => {
    const { html, text } = tiptapToEmailHtml(
      doc(
        { type: "blockquote", content: [p(t("Quoted"))] },
        { type: "horizontalRule" },
      ),
    );
    expect(html).toContain("<blockquote ");
    expect(html).toContain("<hr ");
    expect(text).toBe("> Quoted\n\n---");
  });

  it("renders hard breaks", () => {
    const { html, text } = tiptapToEmailHtml(
      doc(p(t("a"), { type: "hardBreak" }, t("b"))),
    );
    expect(html).toContain("a<br>b");
    expect(text).toBe("a\nb");
  });

  it("applies text alignment to paragraphs and headings only for known values", () => {
    const { html } = tiptapToEmailHtml(
      doc(
        {
          type: "paragraph",
          attrs: { textAlign: "center" },
          content: [t("c")],
        },
        {
          type: "heading",
          attrs: { level: 2, textAlign: "right" },
          content: [t("r")],
        },
        {
          type: "paragraph",
          attrs: { textAlign: "red;background:url(x)" },
          content: [t("x")],
        },
      ),
    );
    expect(html).toContain("text-align:center");
    expect(html).toContain("text-align:right");
    expect(html).not.toContain("background:url");
  });

  it("accepts hex and rgb colors and rejects anything else", () => {
    const colored = (color: string) =>
      tiptapToEmailHtml(
        doc(p(t("c", [{ type: "textStyle", attrs: { color } }]))),
      );
    expect(colored("#ff0000").html).toContain('<span style="color:#ff0000">');
    expect(colored("rgb(10, 20, 30)").html).toContain(
      'style="color:rgb(10, 20, 30)"',
    );
    for (const bad of [
      "red",
      "var(--x)",
      "hsl(var(--foreground))",
      'red;" onload="x',
      "url(javascript:1)",
      "#12",
    ]) {
      const out = colored(bad);
      expect(out.html).not.toContain("<span");
      expect(out.html).toContain(">c<");
      expect(out.warnings.length).toBeGreaterThan(0);
    }
  });

  it("renders highlight with a validated color", () => {
    const { html } = tiptapToEmailHtml(
      doc(
        p(t("a", [{ type: "highlight", attrs: { color: "#abcdef" } }])),
        p(t("b", [{ type: "highlight", attrs: { color: "expression(1)" } }])),
      ),
    );
    expect(html).toContain("background-color:#abcdef");
    expect(html).toContain("background-color:#fef08a");
    expect(html).not.toContain("expression");
  });

  it("keeps https images and drops data:, http: and relative ones with a warning", () => {
    const ok = tiptapToEmailHtml(
      doc({
        type: "image",
        attrs: { src: "https://cdn.test/a.png", alt: "A cat", width: 900 },
      }),
    );
    expect(ok.html).toContain('src="https://cdn.test/a.png"');
    expect(ok.html).toContain('alt="A cat"');
    expect(ok.html).toContain('width="600"');
    expect(ok.html).toContain("max-width:100%");
    expect(ok.html).toContain("height:auto");
    expect(ok.html).toContain("display:block");
    expect(ok.text).toBe("[A cat]");
    expect(ok.warnings).toEqual([]);

    for (const src of [
      "data:image/png;base64,AAAA",
      "http://cdn.test/a.png",
      "/uploads/a.png",
      "javascript:alert(1)",
      "blob:https://x.test/1",
    ]) {
      const out = tiptapToEmailHtml(doc({ type: "image", attrs: { src } }));
      expect(out.html).toBe("");
      expect(out.warnings).toHaveLength(1);
    }
  });

  it("uses the size preset and alignment for images", () => {
    const { html } = tiptapToEmailHtml(
      doc({
        type: "image",
        attrs: {
          src: "https://cdn.test/a.png",
          size: "medium",
          align: "center",
          width: 120,
        },
      }),
    );
    expect(html).toContain("width:50%");
    expect(html).not.toContain(' width="');
    expect(html).toContain("margin-left:auto;margin-right:auto");
  });

  it("renders button-style links as inline buttons", () => {
    const { html } = tiptapToEmailHtml(
      doc(
        p(
          t("Shop", [
            {
              type: "link",
              attrs: { href: "https://shop.test", variant: "solid" },
            },
          ]),
        ),
      ),
    );
    expect(html).toContain("display:inline-block");
    expect(html).toContain("background-color:#111827");
  });

  it("flattens unknown nodes to paragraphs of their text and warns by type", () => {
    const { html, text, warnings } = tiptapToEmailHtml(
      doc(
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [p(t("Cell A"))] },
                { type: "tableCell", content: [p(t("Cell B"))] },
              ],
            },
          ],
        },
        { type: "gallery", attrs: { galleryId: "g1" } },
        p(t("after")),
      ),
    );
    expect(html).toContain("Cell A");
    expect(html).toContain("Cell B");
    expect(html).not.toContain("<table");
    expect(text).toBe("Cell A\n\nCell B\n\nafter");
    expect(warnings).toHaveLength(2);
    expect(warnings.join(" ")).toContain("table");
    expect(warnings.join(" ")).toContain("gallery");
  });

  it("warns once per unknown node type", () => {
    const { warnings } = tiptapToEmailHtml(
      doc({ type: "video", attrs: {} }, { type: "video", attrs: {} }),
    );
    expect(warnings).toHaveLength(1);
  });

  it("returns empty output for a non-doc input", () => {
    expect(tiptapToEmailHtml(null)).toEqual({
      html: "",
      text: "",
      warnings: [],
    });
    expect(tiptapToEmailHtml({ type: "paragraph" })).toEqual({
      html: "",
      text: "",
      warnings: [],
    });
    expect(tiptapToEmailHtml(doc())).toEqual({
      html: "",
      text: "",
      warnings: [],
    });
  });

  it("bounds recursion on pathologically deep input", () => {
    let node: JSONContent = p(t("deep"));
    for (let i = 0; i < 200; i++) {
      node = { type: "blockquote", content: [node] };
    }
    const out = tiptapToEmailHtml(doc(node));
    expect(out.warnings.join(" ")).toContain("nested too deeply");
  });
});

describe("tiptapHasContent", () => {
  it("is false for an empty doc or only blank paragraphs", () => {
    expect(tiptapHasContent(doc())).toBe(false);
    expect(tiptapHasContent(doc(p(), p(t("   "))))).toBe(false);
  });

  it("is true for text or a sendable image", () => {
    expect(tiptapHasContent(doc(p(t("hi"))))).toBe(true);
    expect(
      tiptapHasContent(
        doc({ type: "image", attrs: { src: "https://cdn.test/a.png" } }),
      ),
    ).toBe(true);
  });

  it("is false when the only image is unsendable", () => {
    expect(
      tiptapHasContent(
        doc({ type: "image", attrs: { src: "data:image/png;base64,AA" } }),
      ),
    ).toBe(false);
  });
});

describe("plainTextToTiptapDoc", () => {
  it("makes a paragraph per blank-line block with hard breaks per newline", () => {
    expect(plainTextToTiptapDoc("Hi there,\nfriend\n\nBye")).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hi there," },
            { type: "hardBreak" },
            { type: "text", text: "friend" },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "Bye" }] },
      ],
    });
  });

  it("handles empty input", () => {
    expect(plainTextToTiptapDoc(null)).toEqual({ type: "doc", content: [] });
    expect(plainTextToTiptapDoc("  \n\n ")).toEqual({
      type: "doc",
      content: [],
    });
  });
});
