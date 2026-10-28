import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import type { EmailBodyTheme } from "./tiptap-to-email";
import type { EmailProductItem } from "~/lib/tiptap/email-products-node";

import { countEmptyProductBlocks } from "./email-products";
import { tiptapHasContent, tiptapToEmailHtml } from "./tiptap-to-email";

const BASE = "https://shop.example.com";

const item = (overrides: Partial<EmailProductItem> = {}): EmailProductItem => ({
  productId: "p1",
  name: "Tote",
  imageUrl: "https://cdn.example.com/tote.jpg",
  priceCents: 1200,
  compareAtCents: null,
  slug: "tote",
  ...overrides,
});

const productsBlock = (
  items: unknown[],
  buttonLabel?: string,
): JSONContent => ({
  type: "emailProducts",
  attrs: { items, ...(buttonLabel !== undefined && { buttonLabel }) },
});

const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
});

const theme: EmailBodyTheme = {
  linkColor: "#9d174d",
  accent: "#e8b4c0",
  buttonText: "#1f2937",
  fontStack: 'Georgia,"Times New Roman",Times,serif',
};

/** Number of `<tr>` rows directly inside the product table. */
const rowCount = (html: string) => html.split("<tr>").length - 1;

describe("emailProducts: single card", () => {
  const evil = item({
    name: `<script>alert("x")</script> Mo's "Tote"`,
    slug: "tote bag/<x>",
    compareAtCents: 1500,
  });

  it("escapes the name everywhere it appears", () => {
    const { html } = tiptapToEmailHtml(doc(productsBlock([evil])), {
      baseUrl: BASE,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; Mo&#39;s &quot;Tote&quot;",
    );
    // Alt text carries the escaped name too.
    expect(html).toContain(
      'alt="&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; Mo&#39;s &quot;Tote&quot;"',
    );
  });

  it("links to /shop/<encoded slug> on the base URL", () => {
    const { html } = tiptapToEmailHtml(doc(productsBlock([evil])), {
      baseUrl: BASE,
    });
    expect(html).toContain(
      'href="https://shop.example.com/shop/tote%20bag%2F%3Cx%3E"',
    );
  });

  it("renders a centered presentation table with a 600px photo", () => {
    const { html } = tiptapToEmailHtml(doc(productsBlock([item()])), {
      baseUrl: BASE,
    });
    expect(html.startsWith('<table role="presentation" width="100%"')).toBe(
      true,
    );
    expect(html).toContain('<td align="center"');
    expect(html).toContain(
      '<img src="https://cdn.example.com/tote.jpg" alt="Tote" width="600" style="width:100%;max-width:600px;height:auto;display:block;border:0;margin:0 auto">',
    );
    expect(html).toContain("font-size:18px");
    expect(html).toContain("font-weight:700");
    expect(html).not.toMatch(/class=|display:flex|display:grid/);
  });

  it("strikes the compare-at price before the current price", () => {
    const { html } = tiptapToEmailHtml(doc(productsBlock([evil])), {
      baseUrl: BASE,
    });
    expect(html).toContain(
      '<s style="color:#9ca3af">$15.00</s>&nbsp;$12.00</p>',
    );
  });

  it("shows no strike when compare-at isn't above the price", () => {
    const { html } = tiptapToEmailHtml(
      doc(productsBlock([item({ compareAtCents: 1000 })])),
      { baseUrl: BASE },
    );
    expect(html).not.toContain("<s ");
    expect(html).toContain("$12.00");
  });

  it("uses the neutral solid button without a theme", () => {
    const { html } = tiptapToEmailHtml(
      doc(productsBlock([item()], "Buy <now>")),
      { baseUrl: BASE },
    );
    expect(html).toContain(
      'style="display:inline-block;padding:10px 20px;border-radius:6px;background-color:#111827;color:#ffffff;text-decoration:none;font-weight:600">Buy &lt;now&gt;</a>',
    );
  });

  it("colors the button and sets the font from the theme", () => {
    const { html } = tiptapToEmailHtml(doc(productsBlock([item()])), {
      baseUrl: BASE,
      theme,
    });
    expect(html).toContain(
      "border:1px solid #e8b4c0;background-color:#e8b4c0;color:#1f2937",
    );
    expect(html).toContain(">Shop now</a>");
    expect(html).toContain("font-family:Georgia,'Times New Roman',Times,serif");
  });

  it("leaves out a non-http(s) photo but keeps the card", () => {
    const { html } = tiptapToEmailHtml(
      doc(productsBlock([item({ imageUrl: "javascript:alert(1)" })])),
      { baseUrl: BASE },
    );
    expect(html).not.toContain("<img");
    expect(html).toContain(">Tote</p>");
  });

  it("resolves a site-relative photo against the store URL", () => {
    const { html } = tiptapToEmailHtml(
      doc(productsBlock([item({ imageUrl: "/templates/glove/a.jpg" })])),
      { baseUrl: BASE },
    );
    expect(html).toContain(`src="${BASE}/templates/glove/a.jpg"`);
  });

  it("drops a protocol-relative or relative photo without a base URL", () => {
    const off = tiptapToEmailHtml(
      doc(productsBlock([item({ imageUrl: "//evil.example/a.jpg" })])),
      { baseUrl: BASE },
    );
    expect(off.html).not.toContain("<img");
    const noBase = tiptapToEmailHtml(
      doc(productsBlock([item({ imageUrl: "/templates/glove/a.jpg" })])),
    );
    expect(noBase.html).not.toContain("<img");
  });
});

describe("emailProducts: grid", () => {
  const three = [
    item({ productId: "a", name: "A", slug: "a" }),
    item({ productId: "b", name: "B", slug: "b", compareAtCents: 2000 }),
    item({ productId: "c", name: "C", slug: "c", imageUrl: null }),
  ];

  it("lays 3 products out in two rows with an empty last cell", () => {
    const { html } = tiptapToEmailHtml(doc(productsBlock(three)), {
      baseUrl: BASE,
    });
    expect(rowCount(html)).toBe(2);
    expect(html.match(/<td width="50%"/g)).toHaveLength(4);
    expect(html).toMatch(/>&nbsp;<\/td><\/tr><\/table>$/);
    expect(html).toContain("max-width:280px");
    expect(html).toContain("font-size:15px");
    expect(html).toContain("padding:8px 16px;font-size:14px");
    // C has no photo: only A and B render images.
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html).toContain('href="https://shop.example.com/shop/c"');
  });

  it("puts 2 products in one row and 4 in two full rows", () => {
    const two = tiptapToEmailHtml(doc(productsBlock(three.slice(0, 2))), {
      baseUrl: BASE,
    }).html;
    expect(rowCount(two)).toBe(1);
    expect(two).not.toContain("&nbsp;</td>");

    const four = tiptapToEmailHtml(
      doc(
        productsBlock([
          ...three,
          item({ productId: "d", name: "D", slug: "d" }),
        ]),
      ),
      { baseUrl: BASE },
    ).html;
    expect(rowCount(four)).toBe(2);
    expect(four).not.toContain("&nbsp;</td>");
  });

  it("has no links or buttons without a base URL", () => {
    const { html, text } = tiptapToEmailHtml(doc(productsBlock(three)));
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("Shop now");
    expect(html).toContain(">A</p>");
    expect(text).toBe("A — $12.00\nB — $12.00 (was $20.00)\nC — $12.00");
  });

  it("writes one text line per product with its link", () => {
    const { text } = tiptapToEmailHtml(
      doc(
        { type: "paragraph", content: [{ type: "text", text: "New in" }] },
        productsBlock(three),
      ),
      { baseUrl: BASE },
    );
    expect(text).toBe(
      [
        "New in",
        "",
        "A — $12.00: https://shop.example.com/shop/a",
        "B — $12.00 (was $20.00): https://shop.example.com/shop/b",
        "C — $12.00: https://shop.example.com/shop/c",
      ].join("\n"),
    );
  });
});

describe("emailProducts: empty", () => {
  it("renders nothing and warns", () => {
    const result = tiptapToEmailHtml(
      doc(productsBlock([]), productsBlock([{ productId: "x" }])),
      { baseUrl: BASE },
    );
    expect(result.html).toBe("");
    expect(result.text).toBe("");
    expect(result.warnings).toEqual([
      "A product block has no products and was left out.",
    ]);
  });

  it("isn't reported as unsupported content", () => {
    const { warnings } = tiptapToEmailHtml(
      doc(productsBlock([item()]), { type: "spacer", attrs: { size: "lg" } }),
      { baseUrl: BASE },
    );
    expect(warnings).toEqual([]);
  });

  it("countEmptyProductBlocks counts blocks without usable items", () => {
    expect(
      countEmptyProductBlocks(
        doc(
          productsBlock([]),
          productsBlock([item()]),
          productsBlock([{ productId: "bad" }]),
        ),
      ),
    ).toBe(2);
    expect(countEmptyProductBlocks(null)).toBe(0);
  });

  it("countEmptyProductBlocks finds blocks nested deeper than the walker's depth count", () => {
    // 20 lists deep = 40 node levels (list + listItem each), yet only 20 by
    // the walker's count, so the walker renders the block.
    let node: JSONContent = productsBlock([]);
    for (let i = 0; i < 20; i++) {
      node = {
        type: "bulletList",
        content: [{ type: "listItem", content: [node] }],
      };
    }
    expect(countEmptyProductBlocks(doc(node))).toBe(1);
  });
});

describe("spacer", () => {
  it.each([
    ["sm", 16],
    ["md", 32],
    ["lg", 56],
    ["huge", 32],
  ])("size %s → %ipx", (size, px) => {
    const { html, text } = tiptapToEmailHtml(
      doc({ type: "spacer", attrs: { size } }),
    );
    expect(html).toBe(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:${px}px;line-height:${px}px;font-size:1px">&nbsp;</td></tr></table>`,
    );
    expect(text).toBe("");
  });

  it("adds no text between paragraphs", () => {
    const { text } = tiptapToEmailHtml(
      doc(
        { type: "paragraph", content: [{ type: "text", text: "One" }] },
        { type: "spacer", attrs: { size: "sm" } },
        { type: "paragraph", content: [{ type: "text", text: "Two" }] },
      ),
    );
    expect(text).toBe("One\n\nTwo");
  });
});

describe("tiptapHasContent with the email-only blocks", () => {
  it("counts a product block with products", () => {
    expect(tiptapHasContent(doc(productsBlock([item()])))).toBe(true);
  });

  it("counts an image", () => {
    expect(
      tiptapHasContent(
        doc({ type: "image", attrs: { src: "https://cdn.example.com/a.jpg" } }),
      ),
    ).toBe(true);
  });

  it("doesn't count spacers or empty product blocks alone", () => {
    expect(
      tiptapHasContent(
        doc({ type: "spacer", attrs: { size: "lg" } }, productsBlock([]), {
          type: "spacer",
        }),
      ),
    ).toBe(false);
  });
});
