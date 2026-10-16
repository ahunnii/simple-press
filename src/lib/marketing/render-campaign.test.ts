import { describe, expect, it } from "vitest";

import {
  applyUnsubscribeUrl,
  getBusinessPostalAddress,
  renderCampaign,
  UNSUBSCRIBE_PLACEHOLDER,
} from "./render-campaign";

const business = {
  name: "Acme Candles",
  logoUrl: null,
  ownerEmail: "owner@acme.test",
  addressStreet: "123 Main St",
  addressCity: "Detroit",
  addressState: "MI",
  addressPostalCode: "48201",
};

const base = {
  business,
  subject: "Fall sale",
  previewText: "Everything is 20% off this week",
  contentFormat: "text" as const,
  bodyText: "Hello there.\n\nShop the sale.",
};

function count(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

describe("renderCampaign", () => {
  it("puts the unsubscribe placeholder exactly once in html and text, unescaped", async () => {
    const { html, text } = await renderCampaign(base);
    expect(count(html, UNSUBSCRIBE_PLACEHOLDER)).toBe(1);
    expect(html).toContain(`href="${UNSUBSCRIBE_PLACEHOLDER}"`);
    expect(count(text, UNSUBSCRIBE_PLACEHOLDER)).toBe(1);
  });

  it("renders the body paragraphs", async () => {
    const { html, text } = await renderCampaign(base);
    expect(html).toContain("Hello there.");
    expect(html).toContain("Shop the sale.");
    expect(text.toLowerCase()).toContain("hello there.");
  });

  it("includes the preview text as the hidden inbox preview", async () => {
    const { html } = await renderCampaign(base);
    expect(html).toContain("Everything is 20% off this week");
    expect(html).toContain('data-skip-in-text="true"');
  });

  it("falls back to a default preview when none is given", async () => {
    const { html } = await renderCampaign({ ...base, previewText: "  " });
    expect(html).toContain("A message from Acme Candles");
  });

  it("shows the postal address in the footer", async () => {
    const { html, text } = await renderCampaign(base);
    expect(html).toContain("123 Main St, Detroit, MI 48201");
    expect(text).toContain("123 Main St, Detroit, MI 48201");
  });

  it("omits the address line when the business has none", async () => {
    const { html } = await renderCampaign({
      ...base,
      business: {
        name: "Acme Candles",
        addressStreet: null,
        addressCity: " ",
        businessAddress: null,
      },
    });
    expect(html).not.toContain("Acme Candles, ");
    expect(html).not.toContain("Detroit");
  });

  it("renders bodyHtml for tiptap campaigns", async () => {
    const { html, text } = await renderCampaign({
      ...base,
      contentFormat: "tiptap",
      bodyText: null,
      bodyHtml: "<p>Rich <strong>content</strong></p>",
    });
    expect(html).toContain("<strong>content</strong>");
    expect(text).toContain("content");
    expect(count(html, UNSUBSCRIBE_PLACEHOLDER)).toBe(1);
  });
});

describe("renderCampaign with a tiptap body", () => {
  const bodyJson = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Big news" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Fresh <b>candles</b> & more. " },
          {
            type: "text",
            text: "Shop now",
            marks: [
              { type: "link", attrs: { href: "https://acme.test/shop" } },
            ],
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Lavender" }],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Cedar" }] },
            ],
          },
        ],
      },
    ],
  };
  const tiptapInput = {
    ...base,
    contentFormat: "tiptap" as const,
    bodyText: null,
    bodyJson,
  };

  it("renders bodyJson as email-safe html with the footer", async () => {
    const { html } = await renderCampaign(tiptapInput);
    expect(html).toContain("Big news");
    expect(html).toContain("Fresh &lt;b&gt;candles&lt;/b&gt; &amp; more.");
    expect(html).not.toContain("<b>candles</b>");
    expect(html).toContain('href="https://acme.test/shop"');
    expect(html).toContain("<li ");
    expect(html).toContain("123 Main St, Detroit, MI 48201");
    expect(count(html, UNSUBSCRIBE_PLACEHOLDER)).toBe(1);
    expect(html).toContain(`href="${UNSUBSCRIBE_PLACEHOLDER}"`);
  });

  it("uses the walker's plain text plus the footer, with one placeholder", async () => {
    const { text } = await renderCampaign(tiptapInput);
    expect(text).toContain("Big news");
    expect(text).toContain(
      "Fresh <b>candles</b> & more. Shop now (https://acme.test/shop)",
    );
    expect(text).toContain("- Lavender\n- Cedar");
    expect(text).toContain("123 Main St, Detroit, MI 48201");
    expect(count(text, UNSUBSCRIBE_PLACEHOLDER)).toBe(1);
    expect(text).not.toContain("__SP_BODY_TEXT__");
  });

  it("prefers an explicit bodyHtml over bodyJson", async () => {
    const { html } = await renderCampaign({
      ...tiptapInput,
      bodyHtml: "<p>Explicit</p>",
    });
    expect(html).toContain("Explicit");
    expect(html).not.toContain("Big news");
  });
});

describe("applyUnsubscribeUrl", () => {
  it("replaces every placeholder", () => {
    const url = "https://acme.test/api/unsubscribe?t=abc.def&r=1";
    const out = applyUnsubscribeUrl(
      `a ${UNSUBSCRIBE_PLACEHOLDER} b ${UNSUBSCRIBE_PLACEHOLDER}`,
      url,
    );
    expect(out).toBe(`a ${url} b ${url}`);
    expect(out).not.toContain(UNSUBSCRIBE_PLACEHOLDER);
  });

  it("works on a real render", async () => {
    const { html, text } = await renderCampaign(base);
    const url = "https://acme.test/u?t=1";
    expect(applyUnsubscribeUrl(html, url)).toContain(`href="${url}"`);
    expect(applyUnsubscribeUrl(text, url)).toContain(url);
  });
});

describe("getBusinessPostalAddress", () => {
  it("formats structured parts", () => {
    expect(getBusinessPostalAddress(business)).toBe(
      "123 Main St, Detroit, MI 48201",
    );
  });

  it("falls back to the free-form address", () => {
    expect(
      getBusinessPostalAddress({ businessAddress: " 1 Elm, Ann Arbor " }),
    ).toBe("1 Elm, Ann Arbor");
  });

  it("returns null when blank", () => {
    expect(getBusinessPostalAddress({})).toBeNull();
    expect(
      getBusinessPostalAddress({ addressStreet: " ", businessAddress: "" }),
    ).toBeNull();
  });
});
