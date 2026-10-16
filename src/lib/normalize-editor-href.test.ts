import { describe, expect, it } from "vitest";

import { normalizeEditorHref } from "./normalize-editor-href";

const siteHosts = ["demo.localhost:3000", "www.mystore.com"];
const n = (v: string) => normalizeEditorHref(v, { siteHosts });

describe("normalizeEditorHref", () => {
  it("leaves site paths, anchors and queries untouched", () => {
    expect(n("/contact")).toBe("/contact");
    expect(n("/shop?x=1#top")).toBe("/shop?x=1#top");
    expect(n("#faq")).toBe("#faq");
    expect(n("?page=2")).toBe("?page=2");
  });

  it("trims surrounding whitespace", () => {
    expect(n("  /contact  ")).toBe("/contact");
  });

  it("turns bare words and relative paths into site paths", () => {
    expect(n("contact")).toBe("/contact");
    expect(n("about-us")).toBe("/about-us");
    expect(n("shop/tees")).toBe("/shop/tees");
    expect(n("contact#form")).toBe("/contact#form");
  });

  it("reduces full URLs on a site host to their path", () => {
    expect(n("http://demo.localhost:3000/contact")).toBe("/contact");
    expect(n("https://mystore.com/about?a=1#b")).toBe("/about?a=1#b");
    expect(n("https://www.mystore.com")).toBe("/");
    expect(n("HTTPS://MyStore.com/Contact")).toBe("/Contact");
  });

  it("keeps external URLs as typed", () => {
    expect(n("https://example.com/x")).toBe("https://example.com/x");
    expect(n("http://other.mystore.com/x")).toBe("http://other.mystore.com/x");
    expect(n("//cdn.example.com/a")).toBe("//cdn.example.com/a");
  });

  it("does not treat a different port as the site", () => {
    expect(n("http://demo.localhost:4000/x")).toBe(
      "http://demo.localhost:4000/x",
    );
  });

  it("prepends https:// to domain-looking input", () => {
    expect(n("www.example.com")).toBe("https://www.example.com");
    expect(n("example.com/x")).toBe("https://example.com/x");
    expect(n("mystore.com/contact")).toBe("/contact");
    expect(n("demo.localhost:3000/contact")).toBe("/contact");
  });

  it("passes mailto, tel and sms", () => {
    expect(n("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(n("tel:+15555550123")).toBe("tel:+15555550123");
    expect(n("sms:+15555550123")).toBe("sms:+15555550123");
  });

  it("refuses empty, spaced and unsafe input", () => {
    expect(n("")).toBeNull();
    expect(n("   ")).toBeNull();
    expect(n("my page")).toBeNull();
    expect(n("javascript:alert(1)")).toBeNull();
    expect(n("JaVaScRiPt:alert(1)")).toBeNull();
    expect(n("data:text/html,hi")).toBeNull();
    expect(n("ftp://example.com")).toBeNull();
  });

  it("works with no site hosts", () => {
    expect(normalizeEditorHref("https://mystore.com/x")).toBe(
      "https://mystore.com/x",
    );
    expect(normalizeEditorHref("contact")).toBe("/contact");
  });
});
