import { describe, expect, it } from "vitest";

import type { GalleryForHtml, GalleryMap } from "./tiptap-to-html";
import { tiptapToHtml } from "./tiptap-to-html";

function galleryMap(entries: GalleryForHtml[]): GalleryMap {
  return new Map(entries.map((g) => [g.id, g]));
}

const emptyGalleries: GalleryMap = new Map();

describe("tiptapToHtml", () => {
  it("renders a basic doc (heading, paragraph with bold + link, image)", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Hello" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Bold" },
            { type: "text", text: " and " },
            {
              type: "text",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
              text: "a link",
            },
          ],
        },
        {
          type: "image",
          attrs: { src: "https://cdn.example.com/pic.jpg", alt: "Pic" },
        },
      ],
    };

    const result = tiptapToHtml(doc, emptyGalleries);

    expect(result.html).toContain("<h2");
    expect(result.html).toContain("Hello");
    expect(result.html).toContain("<strong>Bold</strong>");
    expect(result.html).toContain('href="https://example.com"');
    expect(result.html).toContain('<img');
    expect(result.html).toContain("https://cdn.example.com/pic.jpg");
    expect(result.imageUrls).toContain("https://cdn.example.com/pic.jpg");
    expect(result.warnings).toEqual([]);
  });

  it("renders a gallery with captions honored per showCaptions", () => {
    const gallery: GalleryForHtml = {
      id: "gal-1",
      name: "My Gallery",
      showCaptions: true,
      images: [
        {
          url: "https://cdn.example.com/a.jpg",
          altText: "Alt A",
          caption: "Caption A",
        },
        {
          url: "https://cdn.example.com/b.jpg",
          altText: null,
          caption: null,
        },
      ],
    };

    const doc = {
      type: "doc",
      content: [{ type: "gallery", attrs: { galleryId: "gal-1" } }],
    };

    const result = tiptapToHtml(doc, galleryMap([gallery]));

    expect(result.html).toContain('<figure class="wp-block-gallery">');
    // one <img> per image
    const imgCount = (result.html.match(/<img /g) ?? []).length;
    expect(imgCount).toBe(2);
    expect(result.html).toContain('src="https://cdn.example.com/a.jpg"');
    expect(result.html).toContain('alt="Alt A"');
    // caption present for the first image
    expect(result.html).toContain("<figcaption>Caption A</figcaption>");
    // second image has no caption (null) — only one figcaption total
    const captionCount = (result.html.match(/<figcaption>/g) ?? []).length;
    expect(captionCount).toBe(1);
    // both gallery image urls collected
    expect(result.imageUrls).toContain("https://cdn.example.com/a.jpg");
    expect(result.imageUrls).toContain("https://cdn.example.com/b.jpg");
    expect(result.warnings).toEqual([]);
  });

  it("omits captions when showCaptions is false", () => {
    const gallery: GalleryForHtml = {
      id: "gal-2",
      name: "No Captions",
      showCaptions: false,
      images: [
        {
          url: "https://cdn.example.com/c.jpg",
          altText: "Alt C",
          caption: "Should not show",
        },
      ],
    };

    const doc = {
      type: "doc",
      content: [{ type: "gallery", attrs: { galleryId: "gal-2" } }],
    };

    const result = tiptapToHtml(doc, galleryMap([gallery]));

    expect(result.html).not.toContain("<figcaption>");
    expect(result.html).not.toContain("Should not show");
  });

  it("skips a missing gallery with a warning but still renders the rest", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "gallery", attrs: { galleryId: "does-not-exist" } },
        {
          type: "paragraph",
          content: [{ type: "text", text: "After gallery" }],
        },
      ],
    };

    const result = tiptapToHtml(doc, emptyGalleries);

    expect(result.html).not.toContain("wp-block-gallery");
    expect(result.html).toContain("After gallery");
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("gallery");
  });

  it("renders an embed node as an iframe with src/height/title", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "embed",
          attrs: {
            src: "https://embed.example.com/widget",
            height: 480,
            title: "My Widget",
            displayMode: "dialog",
            triggerLabel: "Open",
          },
        },
      ],
    };

    const result = tiptapToHtml(doc, emptyGalleries);

    expect(result.html).toContain("<iframe");
    expect(result.html).toContain('src="https://embed.example.com/widget"');
    expect(result.html).toContain('height="480"');
    expect(result.html).toContain('title="My Widget"');
    expect(result.html).toContain('loading="lazy"');
    // dialog semantics ignored — always a plain iframe
    expect(result.html).not.toContain("triggerLabel");
  });

  it("omits absent embed attrs", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "embed",
          attrs: { src: "https://embed.example.com/only-src" },
        },
      ],
    };

    const result = tiptapToHtml(doc, emptyGalleries);

    expect(result.html).toContain('src="https://embed.example.com/only-src"');
    expect(result.html).not.toContain("height=");
    expect(result.html).not.toContain("title=");
  });

  it("warns on unknown node types but renders the rest", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "bogusNode", attrs: {} },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Still here" }],
        },
      ],
    };

    const result = tiptapToHtml(doc, emptyGalleries);

    expect(result.html).toContain("Still here");
    expect(result.warnings.some((w) => w.includes("bogusNode"))).toBe(true);
  });

  it("returns empty result for null / string / non-doc input without throwing", () => {
    expect(tiptapToHtml(null, emptyGalleries)).toEqual({
      html: "",
      imageUrls: [],
      warnings: [],
    });
    expect(tiptapToHtml("just a string", emptyGalleries)).toEqual({
      html: "",
      imageUrls: [],
      warnings: [],
    });
    expect(tiptapToHtml({ foo: "bar" }, emptyGalleries)).toEqual({
      html: "",
      imageUrls: [],
      warnings: [],
    });
    expect(tiptapToHtml({ type: "doc" }, emptyGalleries)).toEqual({
      html: "",
      imageUrls: [],
      warnings: [],
    });
  });

  it("strips inline event handlers and neutralizes javascript: links", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
              text: "click me",
            },
          ],
        },
      ],
    };

    const result = tiptapToHtml(doc, emptyGalleries);

    expect(result.html).not.toMatch(/href\s*=\s*["']javascript:/i);
    expect(result.html).not.toContain("javascript:alert(1)");
  });

  it("strips onclick-style attributes from custom (gallery) HTML", () => {
    // Craft a gallery whose caption tries to inject markup — escapeAttr should
    // neutralize it, and the sanitize pass strips any surviving handler attrs.
    const gallery: GalleryForHtml = {
      id: "gal-x",
      name: "x",
      showCaptions: true,
      images: [
        {
          url: 'https://cdn.example.com/x.jpg" onclick="alert(1)',
          altText: null,
          caption: null,
        },
      ],
    };
    const doc = {
      type: "doc",
      content: [{ type: "gallery", attrs: { galleryId: "gal-x" } }],
    };

    const result = tiptapToHtml(doc, galleryMap([gallery]));

    // The quote in the url is escaped, so it cannot break out of the src
    // attribute to form a real onclick handler.
    expect(result.html).not.toContain('" onclick="');
    expect(result.html).toContain("&quot;");
  });

  it("collects nested image urls (image inside a blockquote)", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "quote" }],
            },
            {
              type: "image",
              attrs: { src: "https://cdn.example.com/nested.jpg" },
            },
          ],
        },
      ],
    };

    const result = tiptapToHtml(doc, emptyGalleries);

    expect(result.imageUrls).toContain("https://cdn.example.com/nested.jpg");
  });

  it("dedupes repeated image urls", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://cdn.example.com/dup.jpg" } },
        { type: "image", attrs: { src: "https://cdn.example.com/dup.jpg" } },
      ],
    };

    const result = tiptapToHtml(doc, emptyGalleries);

    expect(
      result.imageUrls.filter((u) => u === "https://cdn.example.com/dup.jpg")
        .length,
    ).toBe(1);
  });

  it("skips a quote calculator node with a warning and renders surrounding paragraphs", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Before calculator" }],
        },
        {
          type: "quoteCalculator",
          attrs: { calculatorId: "calc-1", businessId: "biz-1" },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "After calculator" }],
        },
      ],
    };

    const result = tiptapToHtml(doc, emptyGalleries);

    expect(result.html).toContain("Before calculator");
    expect(result.html).toContain("After calculator");
    expect(result.html).toContain("<em>[Quote calculator: interactive widget not exported]</em>");
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("quote calculator");
  });
});
