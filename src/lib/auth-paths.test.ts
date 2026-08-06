import { describe, expect, it } from "vitest";

import {
  canonicalRedirectUrl,
  resolveRedirectTo,
  sanitizeRedirectTo,
} from "./auth-paths";

describe("sanitizeRedirectTo", () => {
  it("keeps ordinary same-origin paths", () => {
    expect(sanitizeRedirectTo("/account/orders")).toBe("/account/orders");
    expect(sanitizeRedirectTo("/")).toBe("/");
    expect(sanitizeRedirectTo("/admin?tab=1#top")).toBe("/admin?tab=1#top");
  });

  it("falls back for empty or non-string input", () => {
    expect(sanitizeRedirectTo(undefined)).toBe("/");
    expect(sanitizeRedirectTo(null)).toBe("/");
    expect(sanitizeRedirectTo("")).toBe("/");
    expect(sanitizeRedirectTo("   ")).toBe("/");
  });

  it("honours a custom fallback", () => {
    expect(sanitizeRedirectTo(undefined, "/admin")).toBe("/admin");
    expect(sanitizeRedirectTo("https://evil.test", "/admin")).toBe("/admin");
  });

  // The open-redirect sink recorded in docs/audit/2026-07-13-polish-audit.md:
  // `redirectTo` comes off the query string, so a trusted SimplePress sign-in
  // link must not be usable as a launchpad to an attacker's origin.
  it("rejects absolute URLs", () => {
    expect(sanitizeRedirectTo("https://evil.test/phish")).toBe("/");
    expect(sanitizeRedirectTo("http://evil.test")).toBe("/");
    expect(sanitizeRedirectTo("//evil.test")).toBe("/");
    expect(sanitizeRedirectTo("/\\evil.test")).toBe("/");
  });

  it("rejects non-http schemes", () => {
    expect(sanitizeRedirectTo("javascript:alert(1)")).toBe("/");
    expect(sanitizeRedirectTo("data:text/html,<script>")).toBe("/");
  });

  it("rejects bare paths that are not rooted", () => {
    expect(sanitizeRedirectTo("account/orders")).toBe("/");
    expect(sanitizeRedirectTo("evil.test")).toBe("/");
  });

  it("collapses layered encoding before deciding", () => {
    // Single- and double-encoded protocol-relative URLs both resolve to
    // "//evil.test" in a browser, so both must be refused.
    expect(sanitizeRedirectTo("%2f%2fevil.test")).toBe("/");
    expect(sanitizeRedirectTo("%252f%252fevil.test")).toBe("/");
    expect(sanitizeRedirectTo("%68ttps://evil.test")).toBe("/");
  });

  it("rejects malformed percent-encoding rather than guessing", () => {
    expect(sanitizeRedirectTo("/account/%E0%A4%A")).toBe("/");
    expect(sanitizeRedirectTo("%")).toBe("/");
  });

  it("rejects control characters used to split or confuse parsers", () => {
    expect(sanitizeRedirectTo("/account\nSet-Cookie: x=1")).toBe("/");
    expect(sanitizeRedirectTo("/account\torders")).toBe("/");
    expect(sanitizeRedirectTo("/account\u0000")).toBe("/");
    expect(sanitizeRedirectTo("/account\r\n/evil")).toBe("/");
  });

  it("does not over-reject legitimate paths", () => {
    expect(sanitizeRedirectTo("/account")).toBe("/account");
    expect(sanitizeRedirectTo("/account/orders/ord_123")).toBe(
      "/account/orders/ord_123",
    );
  });
});

describe("resolveRedirectTo", () => {
  it("prefers redirectTo", () => {
    expect(resolveRedirectTo({ redirectTo: "/account/orders" })).toBe(
      "/account/orders",
    );
  });

  // These two names were emitted across the app before the auth-library
  // migration standardised on `redirectTo`. Inbound links (bookmarks, invite
  // emails already sent) still carry them.
  it("falls back to the legacy param names", () => {
    expect(resolveRedirectTo({ redirect: "/account/orders" })).toBe(
      "/account/orders",
    );
    expect(resolveRedirectTo({ callbackUrl: "/admin" })).toBe("/admin");
  });

  it("prefers redirectTo over the legacy names when both are present", () => {
    expect(
      resolveRedirectTo({ redirectTo: "/a", redirect: "/b", callbackUrl: "/c" }),
    ).toBe("/a");
  });

  it("takes the first value when a param is repeated", () => {
    expect(resolveRedirectTo({ redirectTo: ["/first", "/second"] })).toBe(
      "/first",
    );
  });

  it("sanitizes whatever it finds", () => {
    expect(resolveRedirectTo({ redirect: "https://evil.test" })).toBe("/");
    expect(resolveRedirectTo({ callbackUrl: "//evil.test" })).toBe("/");
  });

  it("falls back for missing or empty params", () => {
    expect(resolveRedirectTo(undefined)).toBe("/");
    expect(resolveRedirectTo({})).toBe("/");
    expect(resolveRedirectTo({ redirectTo: "" }, "/admin")).toBe("/admin");
  });
});

describe("canonicalRedirectUrl", () => {
  const BASE = "/auth/sign-in";

  it("returns null when the URL is already canonical and safe", () => {
    expect(canonicalRedirectUrl(BASE, { redirectTo: "/account/orders" })).toBe(
      null,
    );
  });

  it("returns null when there is no destination at all", () => {
    expect(canonicalRedirectUrl(BASE, {})).toBe(null);
    expect(canonicalRedirectUrl(BASE, undefined)).toBe(null);
  });

  it("rewrites the legacy param names to redirectTo", () => {
    expect(canonicalRedirectUrl(BASE, { redirect: "/account/orders" })).toBe(
      "/auth/sign-in?redirectTo=%2Faccount%2Forders",
    );
    expect(canonicalRedirectUrl(BASE, { callbackUrl: "/admin" })).toBe(
      "/auth/sign-in?redirectTo=%2Fadmin",
    );
  });

  // The client reads `?redirectTo` straight off the URL, so an unsafe value
  // must never survive to that point.
  it("strips an unsafe redirectTo rather than passing it through", () => {
    expect(canonicalRedirectUrl(BASE, { redirectTo: "https://evil.test" })).toBe(
      BASE,
    );
    expect(canonicalRedirectUrl(BASE, { redirectTo: "//evil.test" })).toBe(BASE);
  });

  it("strips an unsafe legacy param too", () => {
    expect(canonicalRedirectUrl(BASE, { redirect: "https://evil.test" })).toBe(
      BASE,
    );
  });

  it("respects the base path it is given", () => {
    expect(
      canonicalRedirectUrl("/auth/sign-up", { redirect: "/account" }),
    ).toBe("/auth/sign-up?redirectTo=%2Faccount");
  });
});
