import { describe, expect, it } from "vitest";

import { resolveEmailStyle } from "./email-style";
import {
  applyUnsubscribeUrl,
  campaignEmailThemes,
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

  it("resolves site-relative links against the business baseUrl in html and text", async () => {
    const input = {
      ...tiptapInput,
      business: { ...business, baseUrl: "https://acme.test" },
      bodyJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Contact us",
                marks: [{ type: "link", attrs: { href: "/contact" } }],
              },
            ],
          },
        ],
      },
    };
    const { html, text } = await renderCampaign(input);
    expect(html).toContain('href="https://acme.test/contact"');
    expect(text).toContain("Contact us (https://acme.test/contact)");

    const noBase = await renderCampaign({
      ...input,
      business,
    });
    expect(noBase.html).not.toContain("/contact");
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

  it("rejects a structured address that is only a state", () => {
    expect(getBusinessPostalAddress({ addressState: "MI" })).toBeNull();
  });

  it("rejects structured parts missing the street", () => {
    expect(
      getBusinessPostalAddress({
        addressCity: "Detroit",
        addressState: "MI",
        addressPostalCode: "48201",
      }),
    ).toBeNull();
  });

  it("accepts a complete structured address", () => {
    expect(
      getBusinessPostalAddress({
        addressStreet: "123 Main St",
        addressCity: "Detroit",
        addressPostalCode: "48201",
      }),
    ).toBe("123 Main St, Detroit, 48201");
  });

  it("accepts a free-form PO box with a digit and comma", () => {
    expect(
      getBusinessPostalAddress({
        businessAddress: "PO Box 123, Detroit MI 48201",
      }),
    ).toBe("PO Box 123, Detroit MI 48201");
  });

  it("rejects a free-form value that is only a state", () => {
    expect(getBusinessPostalAddress({ businessAddress: "MI" })).toBeNull();
  });

  it("rejects a short free-form value with no digit or comma", () => {
    expect(getBusinessPostalAddress({ businessAddress: "Detroit" })).toBeNull();
  });
});

describe("campaign email style", () => {
  const styledDoc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Shop",
            marks: [
              {
                type: "link",
                attrs: { href: "https://acme.test/shop", variant: "solid" },
              },
            ],
          },
        ],
      },
    ],
  };
  const styled = {
    ...base,
    contentFormat: "tiptap" as const,
    bodyText: null,
    bodyJson: styledDoc,
    business: {
      ...business,
      logoUrl: "https://cdn.test/logo.png",
      templateId: "olive",
      emailStyle: {
        accent: "#123456",
        pageBackground: "#faf5ee",
        header: "logo-left",
        footerNote: "See you soon.",
      },
      socialLinks: {
        instagram: "https://instagram.com/acme",
        twitter: "https://x.com/acme",
        facebook: "mailto:hi@acme.test",
        youtube: "javascript:alert(1)",
        tiktok: "/tiktok",
      },
    },
  };

  it("uses the template's defaults when nothing is stored", async () => {
    const defaults = resolveEmailStyle({
      emailStyle: null,
      templateId: "olive",
    });
    const { html } = await renderCampaign({
      ...styled,
      business: { ...business, templateId: "olive" },
    });
    expect(html).toContain(`background-color:${defaults.pageBackground}`);
    expect(html).toContain(
      `background-color:${defaults.accent};color:${defaults.buttonText}`,
    );
  });

  it("applies the stored style to the body, header and footer", async () => {
    const { html, text } = await renderCampaign(styled);
    expect(html).toContain("background-color:#faf5ee");
    expect(html).toContain(
      "border:1px solid #123456;background-color:#123456;color:#ffffff",
    );
    expect(html).toMatch(/style="padding:32px 24px;text-align:left"/);
    expect(html).toContain("See you soon.");
    expect(text).toContain("See you soon.");
    expect(count(html, UNSUBSCRIBE_PLACEHOLDER)).toBe(1);
    expect(count(text, UNSUBSCRIBE_PLACEHOLDER)).toBe(1);
  });

  it("lists only http(s) social links, with short labels", async () => {
    const { html } = await renderCampaign(styled);
    expect(html).toContain('href="https://instagram.com/acme"');
    expect(html).toMatch(/href="https:\/\/x\.com\/acme"[^>]*>X<\/a>/);
    expect(html).not.toContain("mailto:hi@acme.test");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("/tiktok");
  });

  it("hides social links when showSocial is off", async () => {
    const { html } = await renderCampaign({
      ...styled,
      business: {
        ...styled.business,
        emailStyle: { ...styled.business.emailStyle, showSocial: false },
      },
    });
    expect(html).not.toContain("instagram.com");
  });

  it("lets styleOverride replace the stored style", async () => {
    const { html } = await renderCampaign({
      ...styled,
      styleOverride: { accent: "#abcdef", header: "name" },
    });
    expect(html).toContain("background-color:#abcdef");
    expect(html).not.toContain("#123456");
    expect(html).not.toContain("See you soon.");
    expect(html).not.toContain("https://cdn.test/logo.png");
  });

  it("ignores an invalid stored style", () => {
    const themes = campaignEmailThemes({
      ...business,
      templateId: "olive",
      emailStyle: { accent: "red" },
    });
    expect(themes.style).toEqual(
      resolveEmailStyle({ emailStyle: null, templateId: "olive" }),
    );
  });
});
