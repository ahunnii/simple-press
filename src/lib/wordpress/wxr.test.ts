import { describe, expect, it } from "vitest";

import {
  buildWxrDocument,
  cdata,
  escapeXml,
  formatWpDate,
  type WxrChannel,
  type WxrItem,
} from "./wxr";

const channel: WxrChannel = {
  title: "Acme Storefront",
  link: "https://acme.example.com",
};

function baseItem(overrides: Partial<WxrItem> = {}): WxrItem {
  return {
    title: "About Us",
    slug: "about-us",
    contentHtml: "<p>Hello</p>",
    postDateGmt: new Date(Date.UTC(2026, 0, 5, 9, 30, 0)),
    status: "publish",
    type: "page",
    ...overrides,
  };
}

describe("escapeXml", () => {
  it("escapes all five special characters", () => {
    expect(escapeXml(`& < > " '`)).toBe(
      "&amp; &lt; &gt; &quot; &#039;",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeXml("Hello World")).toBe("Hello World");
  });
});

describe("cdata", () => {
  it("wraps a simple string in a CDATA section", () => {
    expect(cdata("hello")).toBe("<![CDATA[hello]]>");
  });

  it("splits embedded ]]> so the CDATA section stays valid", () => {
    expect(cdata("before]]>after")).toBe(
      "<![CDATA[before]]]]><![CDATA[>after]]>",
    );
  });
});

describe("formatWpDate", () => {
  it("formats a UTC date as 'YYYY-MM-DD HH:MM:SS'", () => {
    const d = new Date(Date.UTC(2026, 0, 5, 9, 30, 0));
    expect(formatWpDate(d)).toBe("2026-01-05 09:30:00");
  });
});

describe("buildWxrDocument", () => {
  it("includes the wxr version marker", () => {
    const xml = buildWxrDocument(channel, [baseItem()]);
    expect(xml).toContain("<wp:wxr_version>1.2</wp:wxr_version>");
  });

  it("emits one <item> per input item plus one per unique attachment", () => {
    const items: WxrItem[] = [
      baseItem({
        slug: "about-us",
        attachments: [{ url: "https://cdn.example.com/img/a.jpg" }],
      }),
      baseItem({
        slug: "contact",
        attachments: [{ url: "https://cdn.example.com/img/b.jpg" }],
      }),
    ];
    const xml = buildWxrDocument(channel, items);
    const itemCount = (xml.match(/<item>/g) ?? []).length;
    expect(itemCount).toBe(4); // 2 content items + 2 attachment items
  });

  it("emits the correct wp:post_type for pages vs posts", () => {
    const xml = buildWxrDocument(channel, [
      baseItem({ slug: "about-us", type: "page" }),
      baseItem({ slug: "first-post", type: "post" }),
    ]);
    expect(xml).toContain("<wp:post_type>" + cdata("page") + "</wp:post_type>");
    expect(xml).toContain("<wp:post_type>" + cdata("post") + "</wp:post_type>");
  });

  it("marks draft items with wp:status draft", () => {
    const xml = buildWxrDocument(channel, [
      baseItem({ slug: "draft-page", status: "draft" }),
    ]);
    expect(xml).toContain(
      "<wp:status><![CDATA[draft]]></wp:status>",
    );
  });

  it("emits a category element with the correct nicename", () => {
    const xml = buildWxrDocument(channel, [
      baseItem({ categories: ["News & Updates"] }),
    ]);
    expect(xml).toContain(
      `<category domain="category" nicename="news-updates">${cdata(
        "News & Updates",
      )}</category>`,
    );
  });

  it("emits attachment items with wp:attachment_url and wp:post_parent pointing at the owning item", () => {
    const items: WxrItem[] = [
      baseItem({
        slug: "about-us",
        attachments: [{ url: "https://cdn.example.com/img/hero.jpg" }],
      }),
    ];
    const xml = buildWxrDocument(channel, items);
    // owning item's post id is 100 (first content item)
    expect(xml).toContain(
      "<wp:attachment_url>https://cdn.example.com/img/hero.jpg</wp:attachment_url>",
    );
    // Find the attachment item block and check its post_parent.
    const attachmentBlockMatch =
      /<item>[\s\S]*?<wp:attachment_url>https:\/\/cdn\.example\.com\/img\/hero\.jpg<\/wp:attachment_url>[\s\S]*?<\/item>/.exec(
        xml,
      );
    expect(attachmentBlockMatch).not.toBeNull();
    expect(attachmentBlockMatch![0]).toContain("<wp:post_parent>100</wp:post_parent>");
  });

  it("dedupes a URL referenced by two items into a single attachment parented to the first item", () => {
    const sharedUrl = "https://cdn.example.com/img/shared.jpg";
    const items: WxrItem[] = [
      baseItem({ slug: "first", attachments: [{ url: sharedUrl }] }),
      baseItem({ slug: "second", attachments: [{ url: sharedUrl }] }),
    ];
    const xml = buildWxrDocument(channel, items);
    const occurrences = (
      xml.match(
        /<wp:attachment_url>https:\/\/cdn\.example\.com\/img\/shared\.jpg<\/wp:attachment_url>/g,
      ) ?? []
    ).length;
    expect(occurrences).toBe(1);

    // first content item gets post id 100, second gets 101, so the single
    // attachment must be parented to 100 (the first item).
    const attachmentBlockMatch =
      /<item>[\s\S]*?<wp:attachment_url>https:\/\/cdn\.example\.com\/img\/shared\.jpg<\/wp:attachment_url>[\s\S]*?<\/item>/.exec(
        xml,
      );
    expect(attachmentBlockMatch).not.toBeNull();
    expect(attachmentBlockMatch![0]).toContain("<wp:post_parent>100</wp:post_parent>");

    const itemCount = (xml.match(/<item>/g) ?? []).length;
    expect(itemCount).toBe(3); // 2 content items + 1 deduped attachment item
  });

  it("emits _thumbnail_id postmeta pointing at the featured image's attachment post id", () => {
    const xml = buildWxrDocument(channel, [
      baseItem({
        slug: "about-us",
        featuredImageUrl: "https://cdn.example.com/img/featured.jpg",
      }),
    ]);
    // content item is post id 100, featured image attachment is the next id: 101
    expect(xml).toContain(
      "<wp:meta_key>_thumbnail_id</wp:meta_key>",
    );
    expect(xml).toContain("<wp:meta_value>101</wp:meta_value>");
    expect(xml).toContain(
      "<wp:attachment_url>https://cdn.example.com/img/featured.jpg</wp:attachment_url>",
    );
  });

  it("escapes a malicious title in the <title> element", () => {
    const xml = buildWxrDocument(channel, [
      baseItem({ title: "<script>alert(1)</script>" }),
    ]);
    expect(xml).not.toContain("<title><script>alert(1)</script></title>");
    expect(xml).toContain(
      "<title>&lt;script&gt;alert(1)&lt;/script&gt;</title>",
    );
  });

  it("produces well-formed XML: balanced items, no raw ]]> inside CDATA, valid envelope", () => {
    const items: WxrItem[] = [
      baseItem({
        slug: "about-us",
        contentHtml: "<p>Contains a raw ]]> sequence</p>",
        attachments: [{ url: "https://cdn.example.com/img/a.jpg" }],
        featuredImageUrl: "https://cdn.example.com/img/featured.jpg",
        categories: ["News"],
      }),
      baseItem({ slug: "second", type: "post", status: "draft" }),
    ];
    const xml = buildWxrDocument(channel, items);

    // Structural well-formedness checks (no XML parser dependency in repo).
    const openTags = (xml.match(/<item>/g) ?? []).length;
    const closeTags = (xml.match(/<\/item>/g) ?? []).length;
    expect(openTags).toBe(closeTags);
    expect(openTags).toBe(4); // 2 content + 2 attachments (a.jpg + featured.jpg)

    // Every CDATA section must be properly closed and none of the outer XML
    // structure should contain a stray, unescaped "]]>" outside of a CDATA
    // close marker.
    const cdataOpens = (xml.match(/<!\[CDATA\[/g) ?? []).length;
    const cdataCloses = (xml.match(/\]\]>/g) ?? []).length;
    expect(cdataOpens).toBe(cdataCloses);

    // The document should start with the XML declaration and end with the
    // closing </rss> tag.
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(
      true,
    );
    expect(xml.trim().endsWith("</rss>")).toBe(true);

    // Root element and required namespaces are present.
    expect(xml).toContain('xmlns:wp="http://wordpress.org/export/1.2/"');
    expect(xml).toContain(
      'xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    );
    expect(xml).toContain(
      'xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"',
    );
    expect(xml).toContain(
      'xmlns:wfw="http://wellformedweb.org/CommentAPI/"',
    );
    expect(xml).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"');
  });
});
