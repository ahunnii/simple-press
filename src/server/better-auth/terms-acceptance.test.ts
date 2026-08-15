import { APIError } from "better-auth";
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

  // D1: a direct POST to the credential sign-up endpoint with no (or a
  // false) `termsAccepted` must be REJECTED, not silently allowed to create
  // an account with `termsAcceptedAt` left null forever. The UI's required
  // checkbox means this can only happen by skipping the browser form
  // entirely.
  describe("rejects credential sign-up when the box was not checked", () => {
    it("throws a better-auth APIError for termsAccepted: false", () => {
      expect(() =>
        resolvePlatformTermsAcceptance({
          path: "/sign-up/email",
          body: { termsAccepted: false },
        }),
      ).toThrow(APIError);
    });

    it("throws a better-auth APIError when termsAccepted is missing from the body", () => {
      expect(() =>
        resolvePlatformTermsAcceptance({
          path: "/sign-up/email",
          body: {},
        }),
      ).toThrow(APIError);
    });

    it("throws a better-auth APIError when body itself is missing", () => {
      expect(() =>
        resolvePlatformTermsAcceptance({ path: "/sign-up/email" }),
      ).toThrow(APIError);
    });

    it("throws with a 400-class status and a stable error code the auth UI can key off of", () => {
      try {
        resolvePlatformTermsAcceptance({
          path: "/sign-up/email",
          body: { termsAccepted: false },
        });
        expect.unreachable("expected resolvePlatformTermsAcceptance to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(APIError);
        const apiError = err as InstanceType<typeof APIError>;
        expect(apiError.status).toBe("BAD_REQUEST");
        expect(apiError.body).toMatchObject({ code: "TERMS_NOT_ACCEPTED" });
      }
    });
  });

  // CRITICAL SCOPE: rejection must be scoped to the credential sign-up
  // endpoint ONLY. OAuth (Discord) sign-ups have no `termsAccepted` in their
  // body — they go through `/callback/discord`, a completely different
  // endpoint — and must never be blocked or even inspected for the flag.
  describe("OAuth sign-up is completely untouched", () => {
    it("returns null (no throw) for a different endpoint even when termsAccepted is somehow present", () => {
      expect(
        resolvePlatformTermsAcceptance({
          path: "/callback/discord",
          body: { termsAccepted: true },
        }),
      ).toBeNull();
    });

    it("returns null (no throw) for a different endpoint with no termsAccepted at all — the normal OAuth shape", () => {
      expect(() =>
        resolvePlatformTermsAcceptance({
          path: "/callback/discord",
          body: {},
        }),
      ).not.toThrow();
      expect(
        resolvePlatformTermsAcceptance({
          path: "/callback/discord",
          body: {},
        }),
      ).toBeNull();
    });
  });

  it("returns null when context is missing entirely", () => {
    expect(resolvePlatformTermsAcceptance(null)).toBeNull();
    expect(resolvePlatformTermsAcceptance(undefined)).toBeNull();
  });
});
