import { describe, expect, it } from "vitest";

import {
  resolveSocialLinks,
  SOCIAL_NETWORKS,
  socialHostMismatch,
} from "./social-links";

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

describe("threads + Google Business Profile", () => {
  it("resolves threads right after instagram, and never resolves googleBusinessProfile", () => {
    const resolved = resolveSocialLinks({
      facebook: "https://facebook.com/store",
      threads: "https://www.threads.net/@store",
      instagram: "https://instagram.com/store",
      googleBusinessProfile: "https://maps.app.goo.gl/abc",
    });

    expect(resolved.map((r) => r.key)).toEqual([
      "instagram",
      "threads",
      "facebook",
    ]);
    expect(SOCIAL_NETWORKS.map((n) => n.key)).not.toContain(
      "googleBusinessProfile",
    );
  });
});

describe("socialHostMismatch", () => {
  it("returns null when the host belongs to the slot (host or subdomain)", () => {
    expect(
      socialHostMismatch("instagram", "https://www.instagram.com/store"),
    ).toBeNull();
    expect(socialHostMismatch("twitter", "https://x.com/store")).toBeNull();
    expect(socialHostMismatch("facebook", "https://fb.me/store")).toBeNull();
    expect(socialHostMismatch("linkedin", "https://lnkd.in/abc")).toBeNull();
    expect(socialHostMismatch("youtube", "https://youtu.be/abc")).toBeNull();
    expect(
      socialHostMismatch("threads", "https://www.threads.com/@store"),
    ).toBeNull();
    expect(socialHostMismatch("pinterest", "https://pin.it/abc")).toBeNull();
    expect(
      socialHostMismatch("pinterest", "https://www.pinterest.co.uk/store"),
    ).toBeNull();
    expect(
      socialHostMismatch("tiktok", "https://vm.tiktok.com/abc"),
    ).toBeNull();
  });

  it("accepts every Google Business Profile share-link shape", () => {
    for (const url of [
      "https://maps.app.goo.gl/abc123",
      "https://goo.gl/maps/abc",
      "https://g.page/my-store",
      "https://g.co/kgs/abc",
      "https://www.google.com/maps/place/My+Store",
      "https://maps.google.com/?cid=123",
      "https://www.google.co.uk/maps/place/x",
      "https://business.google.com/n/123",
    ]) {
      expect(socialHostMismatch("googleBusinessProfile", url)).toBeNull();
    }
  });

  it("names the other network when the host belongs to a different one", () => {
    expect(
      socialHostMismatch("instagram", "https://www.threads.net/@store"),
    ).toBe("This looks like a Threads link, not Instagram.");
    expect(
      socialHostMismatch("googleBusinessProfile", "https://facebook.com/store"),
    ).toBe("This looks like a Facebook link, not Google Business Profile.");
    expect(socialHostMismatch("facebook", "https://x.com/store")).toBe(
      "This looks like an X (Twitter) link, not Facebook.",
    );
  });

  it("falls back to a generic hint for an unknown host", () => {
    expect(socialHostMismatch("instagram", "https://example.com/store")).toBe(
      "This doesn't look like an Instagram link.",
    );
  });

  it("does not match look-alike hosts", () => {
    expect(
      socialHostMismatch("twitter", "https://notx.com/store"),
    ).not.toBeNull();
    expect(
      socialHostMismatch("instagram", "https://instagram.com.evil.io/x"),
    ).not.toBeNull();
    expect(
      socialHostMismatch("googleBusinessProfile", "https://notgoogle.com/x"),
    ).not.toBeNull();
  });

  it("returns null for empty, blank, or unparseable values", () => {
    expect(socialHostMismatch("instagram", "")).toBeNull();
    expect(socialHostMismatch("instagram", "   ")).toBeNull();
    expect(socialHostMismatch("instagram", null)).toBeNull();
    expect(socialHostMismatch("instagram", undefined)).toBeNull();
    expect(socialHostMismatch("instagram", "not a url")).toBeNull();
    expect(socialHostMismatch("instagram", "javascript:alert(1)")).toBeNull();
  });
});
