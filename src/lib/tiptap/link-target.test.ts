import { describe, expect, it } from "vitest";

import {
  autoOpenInNewTab,
  defaultOpenInNewTab,
  linkTargetAttr,
  resolveLinkTarget,
} from "./link-target";

describe("resolveLinkTarget", () => {
  it("honours an explicit choice on any link", () => {
    expect(resolveLinkTarget("https://example.com", "_blank")).toBe("_blank");
    expect(resolveLinkTarget("/contact", "_blank")).toBe("_blank");
    expect(resolveLinkTarget("https://example.com", "_self")).toBeNull();
    expect(resolveLinkTarget("/contact", "_self")).toBeNull();
  });

  it("defaults an unset target to a new tab for external links only", () => {
    for (const unset of [null, undefined, "", "junk"]) {
      expect(resolveLinkTarget("https://example.com", unset)).toBe("_blank");
      expect(resolveLinkTarget("sms:+15551234567", unset)).toBe("_blank");
      expect(resolveLinkTarget("/contact", unset)).toBeNull();
      expect(resolveLinkTarget("#faq", unset)).toBeNull();
    }
  });
});

describe("defaultOpenInNewTab", () => {
  it("shows the switch ON for an external link with no stored target", () => {
    expect(defaultOpenInNewTab("https://example.com", null)).toBe(true);
    expect(defaultOpenInNewTab("https://example.com", "")).toBe(true);
  });

  it("shows OFF for an external link saved as same tab", () => {
    expect(defaultOpenInNewTab("https://example.com", "_self")).toBe(false);
  });

  it("shows OFF for an internal link unless it was saved as a new tab", () => {
    expect(defaultOpenInNewTab("/contact", null)).toBe(false);
    expect(defaultOpenInNewTab("/contact", "")).toBe(false);
    expect(defaultOpenInNewTab("/contact", "_blank")).toBe(true);
  });
});

describe("linkTargetAttr", () => {
  it("always stores an explicit choice", () => {
    expect(linkTargetAttr(true)).toBe("_blank");
    expect(linkTargetAttr(false)).toBe("_self");
  });
});

describe("autoOpenInNewTab", () => {
  it("is on for web pages on other sites", () => {
    for (const url of [
      "https://example.com",
      "http://example.com",
      "//cdn.example.com/x",
      "www.example.com",
      "example.com/x",
    ]) {
      expect(autoOpenInNewTab(url)).toBe(true);
    }
  });

  it("is off for pages on this site, app links, empty, and refused input", () => {
    for (const url of [
      "",
      "/contact",
      "#faq",
      "contact",
      "mailto:a@b.com",
      "tel:+15551234567",
      "sms:+15551234567",
      "javascript:alert(1)",
    ]) {
      expect(autoOpenInNewTab(url)).toBe(false);
    }
  });

  it("treats a full address of this store as internal", () => {
    expect(
      autoOpenInNewTab("https://mystore.com/contact", ["mystore.com"]),
    ).toBe(false);
  });
});
