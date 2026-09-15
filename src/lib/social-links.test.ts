import { describe, expect, it } from "vitest";

import { resolveSocialLinks } from "./social-links";

/**
 * `SiteContent.socialLinks` predates the scheme allowlist that
 * `socialLinksSchema` now enforces on save, so legacy rows can still hold an
 * unsafe value. Every template renders these straight into an `<a href>`.
 */
describe("resolveSocialLinks", () => {
  it("returns filled-in networks in canonical order, trimmed", () => {
    const resolved = resolveSocialLinks({
      youtube: "https://youtube.com/@store",
      instagram: "  https://instagram.com/store  ",
    });

    expect(resolved.map((r) => [r.key, r.url])).toEqual([
      ["instagram", "https://instagram.com/store"],
      ["youtube", "https://youtube.com/@store"],
    ]);
  });

  it("drops a network whose stored value carries an unsafe scheme", () => {
    const resolved = resolveSocialLinks({
      instagram: "javascript:alert(1)",
      facebook: "data:text/html;base64,AAA",
      twitter: "https://x.com/store",
    });

    expect(resolved.map((r) => r.key)).toEqual(["twitter"]);
  });

  it("drops blank and non-string values", () => {
    expect(resolveSocialLinks({ instagram: "", facebook: "   " })).toEqual([]);
    expect(resolveSocialLinks({ instagram: 5, facebook: null })).toEqual([]);
  });

  it("is safe against null / undefined / non-objects", () => {
    expect(resolveSocialLinks(null)).toEqual([]);
    expect(resolveSocialLinks(undefined)).toEqual([]);
    expect(resolveSocialLinks("nope")).toEqual([]);
  });
});
