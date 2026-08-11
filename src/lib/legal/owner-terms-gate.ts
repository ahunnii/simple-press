import {
  MERCHANT_TERMS_VERSION,
  PLATFORM_TERMS_VERSION,
} from "~/lib/legal/policy-versions";

/**
 * Retroactive terms acceptance — the pure decision layer.
 *
 * Terms acceptance was added after this platform already had live stores, and
 * the existing rows were deliberately NOT backfilled: `null` honestly means
 * "never accepted". `/admin` therefore soft-blocks owners with nothing on file
 * (see `src/app/admin/layout.tsx`) until they accept, and the acceptance is
 * written by `legal.acceptOwnerTerms` (`src/server/api/routers/legal.ts`).
 *
 * Both decisions live here, dependency-free, so they can be unit tested without
 * a database or a request — same pattern as
 * `src/server/better-auth/terms-acceptance.ts`.
 */

/**
 * `undefined` is a THIRD state, distinct from `null`, and the distinction is
 * load-bearing:
 *
 * - `Date` — an acceptance is on file. Never prompt, never overwrite.
 * - `null` — nothing on file. Prompt.
 * - `undefined` — we could not determine it (e.g. the columns are not in this
 *   database yet; see the fallback in `src/lib/check-business.ts`). Do NOT
 *   prompt. An owner who slips through un-prompted is a cheap mistake; an owner
 *   staring at a consent screen we cannot record the answer to is locked out of
 *   their own orders.
 */
export type AcceptanceState = Date | null | undefined;

/**
 * Should this admin visitor see the retroactive acceptance interstitial?
 *
 * Gated on the membership role being exactly `"OWNER"`, which is what makes
 * this correct for PLATFORM_ADMIN without a special case: `requireAdminAccess`
 * resolves platform admins to `membershipRole: null` (they bypass membership
 * entirely), so they never match. That is deliberate — a platform admin
 * browsing a tenant's admin is not that merchant, and stamping an acceptance
 * from them would fabricate a legal record. Do not "improve" this into
 * something that includes them.
 *
 * MANAGER and STAFF never see it either: the Seller & Merchant Agreement is the
 * owner's, and they have no standing to accept it.
 */
export function shouldPromptOwnerTerms(input: {
  membershipRole: string | null;
  merchantTermsAcceptedAt: AcceptanceState;
}): boolean {
  if (input.membershipRole !== "OWNER") return false;
  // Strict `=== null`: `undefined` (unknown) must fail OPEN. See AcceptanceState.
  return input.merchantTermsAcceptedAt === null;
}

/** What `legal.acceptOwnerTerms` should actually write, if anything. */
export type OwnerTermsWrite = {
  /** Stamp on `BusinessMembership`, or null to leave the existing one alone. */
  membership: {
    merchantTermsAcceptedAt: Date;
    merchantTermsVersion: string;
  } | null;
  /** Stamp on `User`, or null to leave the existing one alone. */
  user: {
    termsAcceptedAt: Date;
    termsVersion: string;
  } | null;
};

/**
 * Resolve the acceptance write for a retroactive acceptance submission.
 *
 * Returns `null` when the caller did not explicitly signal acceptance — the
 * router turns that into a `BAD_REQUEST`. `true` and only `true` counts;
 * truthiness is not consent.
 *
 * `now` is passed in (the router supplies `new Date()`) so this stays pure and
 * testable. It is never read from the request: a client can tell us THAT the
 * box was ticked, but a client-controlled timestamp is not evidence of
 * anything. Versions likewise come from `~/lib/legal/policy-versions`, never a
 * hardcoded date.
 *
 * Both writes are skipped when something is already on file. An earlier
 * acceptance — its timestamp and its version — is the actual evidence; a later
 * one overwriting it would destroy the record it is supposed to create.
 */
export function resolveOwnerTermsWrite(input: {
  /** Acceptance of the Seller & Merchant Agreement + Acceptable Use Policy. */
  acceptedTerms: unknown;
  /**
   * Acceptance of the platform ToS + Privacy Policy. Only honored when the
   * account has nothing on file — matching `/api/claim`'s semantics, so an
   * owner who already agreed is never re-stamped.
   */
  acceptedPlatformTerms: unknown;
  existingMerchantTermsAcceptedAt: Date | null;
  existingPlatformTermsAcceptedAt: Date | null;
  now: Date;
}): OwnerTermsWrite | null {
  if (input.acceptedTerms !== true) return null;

  return {
    membership: input.existingMerchantTermsAcceptedAt
      ? null
      : {
          merchantTermsAcceptedAt: input.now,
          merchantTermsVersion: MERCHANT_TERMS_VERSION,
        },
    user:
      input.acceptedPlatformTerms === true &&
      !input.existingPlatformTermsAcceptedAt
        ? {
            termsAcceptedAt: input.now,
            termsVersion: PLATFORM_TERMS_VERSION,
          }
        : null,
  };
}
