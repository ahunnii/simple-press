import { describe, expect, it } from "vitest";

import { businessHostFilter, extractSubdomain } from "./domain-utils";

// NEXT_PUBLIC_PLATFORM_DOMAIN is "simplepress.test" (tests/helpers/test-env.ts),
// and NODE_ENV=test means getMainDomain() uses the platform domain.

describe("businessHostFilter", () => {
  it("matches platform subdomain hosts by subdomain label", () => {
    expect(businessHostFilter("bloom.simplepress.test")).toEqual({
      subdomain: "bloom",
    });
  });

  it("matches any non-platform host by exact customDomain only", () => {
    expect(businessHostFilter("bloom.florist.com")).toEqual({
      customDomain: "bloom.florist.com",
    });
  });

  it("never lets a custom domain's first label match another tenant's subdomain", () => {
    // Regression: the old OR(customDomain, subdomain: firstLabel) lookup let a
    // request for bloom.florist.com resolve a business whose subdomain is
    // "bloom". The filter must not contain a subdomain branch here.
    const filter = businessHostFilter("bloom.florist.com");
    expect(filter).not.toHaveProperty("subdomain");
  });

  it("strips ports from subdomain hosts", () => {
    expect(businessHostFilter("bloom.simplepress.test:3000")).toEqual({
      subdomain: "bloom",
    });
  });

  it("strips ports from custom-domain hosts", () => {
    expect(businessHostFilter("bloom.florist.com:8443")).toEqual({
      customDomain: "bloom.florist.com",
    });
  });

  it("treats the bare platform domain as a (non-matching) custom domain", () => {
    // The apex platform host is not a storefront; the filter should not
    // resolve any tenant. customDomain: "simplepress.test" matches no row.
    expect(businessHostFilter("simplepress.test")).toEqual({
      customDomain: "simplepress.test",
    });
  });
});

describe("extractSubdomain", () => {
  it("returns null for the main domain", () => {
    expect(extractSubdomain("simplepress.test")).toBeNull();
  });

  it("returns the label for a platform subdomain", () => {
    expect(extractSubdomain("shop.simplepress.test")).toBe("shop");
  });

  it("returns null for unrelated custom domains", () => {
    expect(extractSubdomain("example.com")).toBeNull();
  });
});
