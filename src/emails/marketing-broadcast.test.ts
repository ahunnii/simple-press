import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";

import type { EmailLayoutTheme } from "./components/layout";

import { MarketingBroadcastEmail } from "./marketing-broadcast";

const LOGO = "https://cdn.test/logo.png";

const theme: EmailLayoutTheme = {
  pageBackground: "#f4efe6",
  fontStack: 'Georgia,"Times New Roman",Times,serif',
  header: "logo-left",
  logoHeight: 72,
  socialLinks: [
    { label: "Instagram", url: "https://instagram.com/acme" },
    { label: "Facebook", url: "https://facebook.com/acme" },
  ],
  footerNote: "Thanks for shopping small.",
  linkColor: "#7a2e3b",
};

function email(overrides: Partial<EmailLayoutTheme> | null, logoUrl = LOGO) {
  return MarketingBroadcastEmail({
    businessName: "Acme Candles",
    logoUrl,
    body: "Hello there.\n\nShop the sale.",
    unsubscribeUrl: "https://acme.test/api/unsubscribe?t=tok",
    postalAddress: "123 Main St, Detroit, MI 48201",
    theme: overrides === null ? undefined : { ...theme, ...overrides },
  });
}

describe("MarketingBroadcastEmail with a theme", () => {
  it("paints the page background and font", async () => {
    const html = await render(email({}));
    expect(html).toMatch(
      /<td style="background-color:#f4efe6;font-family:Georgia,&quot;Times New Roman&quot;,Times,serif">/,
    );
    // Plain-text body paragraphs carry the font too.
    expect(html).toMatch(
      /<p style="[^"]*font-family:Georgia,&quot;Times New Roman&quot;,Times,serif[^"]*">Hello there\.<\/p>/,
    );
  });

  it("left-aligns a logo-left header at the chosen height", async () => {
    const html = await render(email({}));
    expect(html).toMatch(
      /role="presentation" style="padding:32px 24px;text-align:left">/,
    );
    expect(html).toMatch(
      new RegExp(
        `<img alt="Acme Candles" src="${LOGO}" style="[^"]*margin:0;height:72px`,
      ),
    );
  });

  it("centers a logo-center header", async () => {
    const html = await render(email({ header: "logo-center", logoHeight: 40 }));
    expect(html).toMatch(
      /role="presentation" style="padding:32px 24px;text-align:center">/,
    );
    expect(html).toMatch(/style="[^"]*margin:0 auto;height:40px/);
  });

  it("shows the business name, not the logo, for the name header", async () => {
    const html = await render(email({ header: "name" }));
    expect(html).not.toContain(LOGO);
    expect(html).toMatch(/>Acme Candles<\/p>/);
  });

  it("shows one row of social links in the link color", async () => {
    const html = await render(email({}));
    expect(html).toContain(
      `<a href="https://instagram.com/acme" style="color:#7a2e3b;text-decoration-line:none;text-decoration:underline" target="_blank">Instagram</a> · <a href="https://facebook.com/acme"`,
    );
    const text = await render(email({}), { plainText: true });
    expect(text).toMatch(/Instagram.*·.*Facebook/s);
  });

  it("puts the footer note above the © line", async () => {
    const html = await render(email({}));
    const note = html.indexOf("Thanks for shopping small.");
    const copyright = html.indexOf("All rights reserved.");
    expect(note).toBeGreaterThan(-1);
    expect(note).toBeLessThan(copyright);
  });

  it("omits the social row and the note when empty", async () => {
    const html = await render(email({ socialLinks: [], footerNote: "  " }));
    expect(html).not.toContain("instagram.com");
    expect(html).not.toContain("white-space:pre-line");
  });

  it("colors the unsubscribe link with the link color", async () => {
    const html = await render(email({}));
    expect(html).toMatch(
      /<a href="https:\/\/acme\.test\/api\/unsubscribe\?t=tok" style="color:#7a2e3b/,
    );
  });

  it("renders the neutral look without a theme", async () => {
    const html = await render(email(null));
    expect(html).toContain("background-color:#f6f9fc");
    expect(html).not.toContain("Georgia");
    expect(html).toMatch(/style="[^"]*margin:0 auto;height:48px/);
    expect(html).not.toContain("#7a2e3b");
  });
});
