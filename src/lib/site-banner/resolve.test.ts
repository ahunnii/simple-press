import { describe, expect, it } from "vitest";

import { resolveBanner, resolvePopup } from "./resolve";

const content = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Sale!" }] }],
};

const banner = (linkUrl: string | null) => ({
  bannerConfig: {
    enabled: true,
    version: "v1",
    content,
    linkUrl,
    linkLabel: linkUrl ? "Shop now" : null,
  },
});

const only =
  (...off: string[]) =>
  (key: string) =>
    !off.includes(key);

describe("resolveBanner", () => {
  it("returns null when the banners flag is off", () => {
    expect(resolveBanner(banner("/shop"), only("banners"))).toBeNull();
  });

  it("keeps the link when its route's flag is on", () => {
    const out = resolveBanner(banner("/shop"), () => true);
    expect(out?.linkUrl).toBe("/shop");
    expect(out?.linkLabel).toBe("Shop now");
  });

  it("drops the link but keeps the banner when the route's flag is off", () => {
    const out = resolveBanner(banner("/shop/x?ref=bar"), only("products"));
    expect(out).not.toBeNull();
    expect(out?.content).toEqual(content);
    expect(out?.linkUrl).toBeNull();
    expect(out?.linkLabel).toBeNull();
  });

  it("gates account sub-routes on the whole prefix chain", () => {
    expect(
      resolveBanner(banner("/account/rewards"), only("loyalty"))?.linkUrl,
    ).toBeNull();
    expect(
      resolveBanner(banner("/account/rewards"), only("customerAccounts"))
        ?.linkUrl,
    ).toBeNull();
  });

  it("leaves ungated and external links alone", () => {
    expect(resolveBanner(banner("/about"), () => false)).toBeNull(); // banners off
    expect(
      resolveBanner(banner("/about"), only("products"))?.linkUrl,
    ).toBe("/about");
    expect(
      resolveBanner(banner("https://example.com/shop"), only("products"))
        ?.linkUrl,
    ).toBe("https://example.com/shop");
  });

  it("returns null for a disabled or empty banner", () => {
    expect(resolveBanner(null, () => true)).toBeNull();
    expect(
      resolveBanner(
        { bannerConfig: { ...banner(null).bannerConfig, enabled: false } },
        () => true,
      ),
    ).toBeNull();
  });
});

const popup = (ctaUrl: string | null) => ({
  popupConfig: {
    enabled: true,
    version: "v1",
    mode: "text",
    heading: "Hello",
    content,
    ctaUrl,
    ctaLabel: ctaUrl ? "Shop now" : null,
  },
});

describe("resolvePopup", () => {
  it("returns null when the popups flag is off", () => {
    expect(resolvePopup(popup("/shop"), only("popups"))).toBeNull();
  });

  it("keeps the CTA when its route's flag is on", () => {
    const out = resolvePopup(popup("/shop"), () => true);
    expect(out?.ctaUrl).toBe("/shop");
    expect(out?.ctaLabel).toBe("Shop now");
  });

  it("drops the CTA but keeps the popup when the route's flag is off", () => {
    const out = resolvePopup(popup("/shop/x"), only("products"));
    expect(out).not.toBeNull();
    expect(out?.heading).toBe("Hello");
    expect(out?.ctaUrl).toBeNull();
    expect(out?.ctaLabel).toBeNull();
  });

  it("gates account sub-routes on the whole prefix chain", () => {
    expect(
      resolvePopup(popup("/account/rewards"), only("customerAccounts"))
        ?.ctaUrl,
    ).toBeNull();
  });

  it("leaves ungated and external CTAs alone", () => {
    expect(resolvePopup(popup("/about"), only("products"))?.ctaUrl).toBe(
      "/about",
    );
    expect(
      resolvePopup(popup("https://example.com/shop"), only("products"))
        ?.ctaUrl,
    ).toBe("https://example.com/shop");
  });
});
