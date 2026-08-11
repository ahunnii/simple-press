import { describe, expect, it } from "vitest";

import { PLATFORM_TERMS_VERSION } from "~/lib/legal/policy-versions";
import { resolvePlatformTermsAcceptance } from "./terms-acceptance";

describe("resolvePlatformTermsAcceptance", () => {
  it("stamps a server-generated timestamp + version for credential sign-up with the box checked", () => {
    const before = Date.now();
    const result = resolvePlatformTermsAcceptance({
      path: "/sign-up/email",
      body: { termsAccepted: true },
    });
    const after = Date.now();

    expect(result).not.toBeNull();
    expect(result?.termsVersion).toBe(PLATFORM_TERMS_VERSION);
    expect(result?.termsAcceptedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result?.termsAcceptedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("ignores a client-supplied termsAcceptedAt/termsVersion in the body", () => {
    const spoofedDate = new Date("2000-01-01T00:00:00.000Z");
    const result = resolvePlatformTermsAcceptance({
      path: "/sign-up/email",
      body: {
        termsAccepted: true,
        termsAcceptedAt: spoofedDate.toISOString(),
        termsVersion: "1999-01-01",
      },
    });

    expect(result).not.toBeNull();
    expect(result?.termsVersion).toBe(PLATFORM_TERMS_VERSION);
    expect(result?.termsAcceptedAt.getTime()).not.toBe(spoofedDate.getTime());
  });

  it("returns null when the box was not checked", () => {
    expect(
      resolvePlatformTermsAcceptance({
        path: "/sign-up/email",
        body: { termsAccepted: false },
      }),
    ).toBeNull();

    expect(
      resolvePlatformTermsAcceptance({
        path: "/sign-up/email",
        body: {},
      }),
    ).toBeNull();
  });

  it("returns null for a different endpoint even if termsAccepted is somehow present (e.g. Discord OAuth)", () => {
    expect(
      resolvePlatformTermsAcceptance({
        path: "/callback/discord",
        body: { termsAccepted: true },
      }),
    ).toBeNull();
  });

  it("returns null when context is missing entirely", () => {
    expect(resolvePlatformTermsAcceptance(null)).toBeNull();
    expect(resolvePlatformTermsAcceptance(undefined)).toBeNull();
  });

  it("returns null when body is missing", () => {
    expect(
      resolvePlatformTermsAcceptance({ path: "/sign-up/email" }),
    ).toBeNull();
  });
});
