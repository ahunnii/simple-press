import { PLATFORM_TERMS_VERSION } from "~/lib/legal/policy-versions";

/**
 * The pieces of Better Auth's `GenericEndpointContext` this module actually
 * reads. Deliberately narrow (not imported from `better-auth`) so this stays
 * a pure, dependency-free function that's cheap to unit test — the real
 * caller in `config.tsx` passes the real context, which satisfies this shape.
 */
export type TermsAcceptanceContext = {
  path?: string | null;
  body?: unknown;
};

/**
 * Decides whether an in-flight `user.create` was the credential sign-up form
 * affirmatively signaling platform terms acceptance, and if so, returns the
 * server-computed stamp to write.
 *
 * Two conditions must both hold:
 * - `context.path === "/sign-up/email"` — the credential sign-up endpoint.
 *   Discord OAuth sign-ups go through `/callback/discord` instead (a
 *   completely different endpoint backed by `internalAdapter.createOAuthUser`
 *   rather than `createUser`), so they never match this and are correctly
 *   left unstamped.
 * - `context.body.termsAccepted === true` — the explicit signal
 *   `src/components/auth/sign-up.tsx` sends once its required terms checkbox
 *   has been checked (native constraint validation blocks the `submit` event
 *   otherwise, so this can only be `true` when the box was actually checked).
 *
 * The returned `termsAcceptedAt` is always computed here via `new Date()`,
 * and `termsVersion` is always the current `PLATFORM_TERMS_VERSION` constant
 * — neither is ever read from the request. A client can tell this function
 * THAT the box was checked; it has no way to say WHEN or under WHICH policy
 * version, which is the whole point: a client-controlled consent timestamp
 * would not be evidence of anything.
 *
 * Returns `null` for every other case (OAuth sign-ups, updates, requests
 * that never sent the flag) — callers should leave `termsAcceptedAt` /
 * `termsVersion` untouched in that case, not backfill a timestamp.
 */
export function resolvePlatformTermsAcceptance(
  context: TermsAcceptanceContext | null | undefined,
): { termsAcceptedAt: Date; termsVersion: string } | null {
  if (context?.path !== "/sign-up/email") return null;

  const body = context.body as Record<string, unknown> | undefined;
  if (body?.termsAccepted !== true) return null;

  return {
    termsAcceptedAt: new Date(),
    termsVersion: PLATFORM_TERMS_VERSION,
  };
}
