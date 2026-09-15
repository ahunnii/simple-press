import { afterEach, describe, expect, it, vi } from "vitest";

import { isPlatformHost, parseEmbedInput, sanitizeEmbedSrc } from "~/lib/embed";

const PLATFORM = "simplepress.co";

describe("isPlatformHost", () => {
  it("matches the bare platform domain", () => {
    expect(isPlatformHost("simplepress.co", PLATFORM)).toBe(true);
  });

  it("matches a subdomain of the platform domain", () => {
    expect(isPlatformHost("shop.simplepress.co", PLATFORM)).toBe(true);
  });

  it("matches a deep subdomain of the platform domain", () => {
    expect(isPlatformHost("deep.shop.simplepress.co", PLATFORM)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isPlatformHost("SHOP.SimplePress.CO", PLATFORM)).toBe(true);
  });

  it("does not match a host that merely ends with the domain as a substring", () => {
    expect(isPlatformHost("simplepress.co.evil.com", PLATFORM)).toBe(false);
    expect(isPlatformHost("notsimplepress.co", PLATFORM)).toBe(false);
  });

  it("returns false when platformDomain is undefined or empty and env is unset", () => {
    expect(isPlatformHost("simplepress.co", undefined)).toBe(false);
    expect(isPlatformHost("simplepress.co", "")).toBe(false);
  });
});

describe("sanitizeEmbedSrc", () => {
  it("rejects the bare platform domain", () => {
    expect(
      sanitizeEmbedSrc("https://simplepress.co/x", {
        platformDomain: PLATFORM,
      }),
    ).toBeNull();
  });

  it("rejects a tenant subdomain of the platform", () => {
    expect(
      sanitizeEmbedSrc("https://shop.simplepress.co/x", {
        platformDomain: PLATFORM,
      }),
    ).toBeNull();
  });

  it("rejects a deep subdomain of the platform", () => {
    expect(
      sanitizeEmbedSrc("https://deep.shop.simplepress.co/", {
        platformDomain: PLATFORM,
      }),
    ).toBeNull();
  });

  it("allows a host that merely contains the platform domain as a substring", () => {
    expect(
      sanitizeEmbedSrc("https://simplepress.co.evil.com/", {
        platformDomain: PLATFORM,
      }),
    ).toBe("https://simplepress.co.evil.com/");
  });

  it("allows a similarly-named but distinct domain", () => {
    expect(
      sanitizeEmbedSrc("https://notsimplepress.co/", {
        platformDomain: PLATFORM,
      }),
    ).toBe("https://notsimplepress.co/");
  });

  it("rejects the platform domain regardless of case", () => {
    expect(
      sanitizeEmbedSrc("https://SHOP.SimplePress.CO/", {
        platformDomain: PLATFORM,
      }),
    ).toBeNull();
  });

  it("rejects localhost, 127.0.0.1, and *.localhost unconditionally", () => {
    expect(sanitizeEmbedSrc("https://localhost/x")).toBeNull();
    expect(sanitizeEmbedSrc("https://127.0.0.1/")).toBeNull();
    expect(sanitizeEmbedSrc("https://foo.localhost/")).toBeNull();
  });

  it("blocks hosts listed in blockedHosts, case-insensitively", () => {
    expect(
      sanitizeEmbedSrc("https://store.example.com/", {
        blockedHosts: ["store.example.com"],
      }),
    ).toBeNull();
    expect(
      sanitizeEmbedSrc("https://STORE.example.com/", {
        blockedHosts: ["store.example.com"],
      }),
    ).toBeNull();
  });

  it("does not block a subdomain of a blocked host (exact match only)", () => {
    expect(
      sanitizeEmbedSrc("https://sub.store.example.com/", {
        blockedHosts: ["store.example.com"],
      }),
    ).toBe("https://sub.store.example.com/");
  });

  it("still rejects http:", () => {
    expect(sanitizeEmbedSrc("http://example.com/")).toBeNull();
  });

  it("still rejects javascript:", () => {
    expect(sanitizeEmbedSrc("javascript:alert(1)")).toBeNull();
  });

  it("still rejects relative URLs", () => {
    expect(sanitizeEmbedSrc("/relative/path")).toBeNull();
  });

  it("still returns href for a valid, unrelated https URL", () => {
    expect(sanitizeEmbedSrc("https://example.com/foo")).toBe(
      "https://example.com/foo",
    );
  });
});

describe("parseEmbedInput with platform-domain opts", () => {
  it("rejects an <iframe> snippet whose src is a tenant subdomain of the platform", () => {
    const snippet = `<iframe src="https://shop.simplepress.co/embed" width="600" height="400"></iframe>`;
    expect(parseEmbedInput(snippet, { platformDomain: PLATFORM })).toBeNull();
  });

  it("still parses a legitimate iframe snippet with opts passed", () => {
    const snippet = `<iframe src="https://example.com/embed" width="600" height="400"></iframe>`;
    expect(parseEmbedInput(snippet, { platformDomain: PLATFORM })).toEqual({
      src: "https://example.com/embed",
      width: 600,
      height: 400,
    });
  });
});

describe("parseEmbedInput using the NEXT_PUBLIC_PLATFORM_DOMAIN env default", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a platform-subdomain src via the env default when no opts are passed", () => {
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_DOMAIN", PLATFORM);
    const snippet = `<iframe src="https://shop.simplepress.co/embed"></iframe>`;
    expect(parseEmbedInput(snippet)).toBeNull();
  });
});
