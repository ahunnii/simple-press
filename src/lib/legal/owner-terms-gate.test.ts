import { describe, expect, it } from "vitest";

import {
  MERCHANT_TERMS_VERSION,
  PLATFORM_TERMS_VERSION,
} from "~/lib/legal/policy-versions";
import {
  resolveOwnerTermsWrite,
  shouldPromptOwnerTerms,
} from "~/lib/legal/owner-terms-gate";

const NOW = new Date("2026-08-11T12:00:00.000Z");
const EARLIER = new Date("2026-01-02T03:04:05.000Z");

describe("shouldPromptOwnerTerms", () => {
  it("prompts an OWNER with nothing on file", () => {
    expect(
      shouldPromptOwnerTerms({
        membershipRole: "OWNER",
        merchantTermsAcceptedAt: null,
      }),
    ).toBe(true);
  });

  it("does not prompt an OWNER who already accepted", () => {
    expect(
      shouldPromptOwnerTerms({
        membershipRole: "OWNER",
        merchantTermsAcceptedAt: EARLIER,
      }),
    ).toBe(false);
  });

  it("never prompts a PLATFORM_ADMIN (membershipRole null)", () => {
    // requireAdminAccess resolves platform admins to `membershipRole: null`.
    // Stamping an acceptance from them would fabricate a legal record.
    expect(
      shouldPromptOwnerTerms({
        membershipRole: null,
        merchantTermsAcceptedAt: null,
      }),
    ).toBe(false);
  });

  it.each(["MANAGER", "STAFF"])("never prompts %s", (role) => {
    expect(
      shouldPromptOwnerTerms({
        membershipRole: role,
        merchantTermsAcceptedAt: null,
      }),
    ).toBe(false);
  });

  it("fails OPEN when the acceptance state is unknown (undefined)", () => {
    // The columns may not exist in this database yet. An un-prompted owner is a
    // far cheaper mistake than an owner who cannot reach their orders.
    expect(
      shouldPromptOwnerTerms({
        membershipRole: "OWNER",
        merchantTermsAcceptedAt: undefined,
      }),
    ).toBe(false);
  });
});

describe("resolveOwnerTermsWrite", () => {
  const base = {
    acceptedTerms: true,
    acceptedPlatformTerms: false,
    existingMerchantTermsAcceptedAt: null,
    existingPlatformTermsAcceptedAt: null,
    now: NOW,
  };

  it("rejects anything that is not an explicit `true`", () => {
    for (const acceptedTerms of [
      false,
      undefined,
      null,
      "true",
      1,
      {},
    ] as unknown[]) {
      expect(resolveOwnerTermsWrite({ ...base, acceptedTerms })).toBeNull();
    }
  });

  it("stamps the merchant agreement with the server clock and current version", () => {
    const write = resolveOwnerTermsWrite(base);
    expect(write?.membership).toEqual({
      merchantTermsAcceptedAt: NOW,
      merchantTermsVersion: MERCHANT_TERMS_VERSION,
    });
    expect(write?.user).toBeNull();
  });

  it("is idempotent: never overwrites an existing merchant acceptance", () => {
    const write = resolveOwnerTermsWrite({
      ...base,
      existingMerchantTermsAcceptedAt: EARLIER,
    });
    expect(write).not.toBeNull();
    expect(write?.membership).toBeNull();
  });

  it("stamps the platform terms only when signalled and none on record", () => {
    const write = resolveOwnerTermsWrite({
      ...base,
      acceptedPlatformTerms: true,
    });
    expect(write?.user).toEqual({
      termsAcceptedAt: NOW,
      termsVersion: PLATFORM_TERMS_VERSION,
    });
  });

  it("does not re-stamp platform terms an account already accepted", () => {
    const write = resolveOwnerTermsWrite({
      ...base,
      acceptedPlatformTerms: true,
      existingPlatformTermsAcceptedAt: EARLIER,
    });
    expect(write?.user).toBeNull();
  });

  it("does not stamp platform terms the client never signalled", () => {
    const write = resolveOwnerTermsWrite({
      ...base,
      acceptedPlatformTerms: "true",
    });
    expect(write?.user).toBeNull();
  });

  it("returns both writes for a pre-existing owner with nothing on file", () => {
    const write = resolveOwnerTermsWrite({
      ...base,
      acceptedPlatformTerms: true,
    });
    expect(write?.membership).not.toBeNull();
    expect(write?.user).not.toBeNull();
  });
});
