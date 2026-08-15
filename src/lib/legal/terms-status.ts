import { MERCHANT_TERMS_VERSION } from "./policy-versions";

/**
 * Resolved merchant-terms acceptance status for a business, derived from its
 * OWNER memberships only (never MANAGER/STAFF — the Seller & Merchant
 * Agreement is the owner's to sign). Three states, because they carry
 * different meaning for a platform admin:
 *
 * - `"none"` — no OWNER membership has ever accepted. The actionable one:
 *   this business currently has no signed agreement on file at all.
 * - `"current"` — at least one OWNER accepted the version in force right now
 *   (`MERCHANT_TERMS_VERSION`).
 * - `"outdated"` — at least one OWNER accepted at some point, but not the
 *   current version. Surfaces after a material policy update.
 *
 * A business can have more than one OWNER. If any of them is current, that's
 * the status reported — one signed, current agreement is enough to cover the
 * store. Otherwise the most recent acceptance (necessarily a stale version)
 * is reported.
 */
export type MerchantTermsStatus =
  | { state: "none" }
  | { state: "current"; acceptedAt: Date; version: string }
  | { state: "outdated"; acceptedAt: Date; version: string | null };

type OwnerAcceptance = {
  merchantTermsAcceptedAt: Date | null;
  merchantTermsVersion: string | null;
};

export function getMerchantTermsStatus(
  ownerMemberships: OwnerAcceptance[],
): MerchantTermsStatus {
  const accepted = ownerMemberships.filter(
    (m): m is OwnerAcceptance & { merchantTermsAcceptedAt: Date } =>
      m.merchantTermsAcceptedAt !== null,
  );

  if (accepted.length === 0) {
    return { state: "none" };
  }

  const current = accepted.find(
    (m) => m.merchantTermsVersion === MERCHANT_TERMS_VERSION,
  );
  if (current) {
    return {
      state: "current",
      acceptedAt: current.merchantTermsAcceptedAt,
      version: MERCHANT_TERMS_VERSION,
    };
  }

  const mostRecent = accepted.reduce((latest, m) =>
    m.merchantTermsAcceptedAt > latest.merchantTermsAcceptedAt ? m : latest,
  );
  return {
    state: "outdated",
    acceptedAt: mostRecent.merchantTermsAcceptedAt,
    version: mostRecent.merchantTermsVersion,
  };
}
