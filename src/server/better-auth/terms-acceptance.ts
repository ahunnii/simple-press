import { APIError } from "better-auth";

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

/** The credential sign-up endpoint. Discord OAuth sign-ups go through
 * `/callback/discord` instead (a completely different endpoint backed by
 * `internalAdapter.createOAuthUser` rather than `createUser`), so they never
 * match this and are correctly left alone below — no stamp, no rejection. */
const SIGN_UP_EMAIL_PATH = "/sign-up/email";

/**
 * Decides whether an in-flight `user.create` was the credential sign-up form
 * affirmatively signaling platform terms acceptance, and if so, returns the
 * server-computed stamp to write. Called from `config.tsx`'s
 * `databaseHooks.user.create.before`.
 *
 * Gated on `context.path === "/sign-up/email"` — see `SIGN_UP_EMAIL_PATH`
 * above for why this scoping excludes OAuth. For any OTHER path (OAuth
 * sign-ups, `user.update`, …) this returns `null` immediately without even
 * looking at `body`: those flows have no terms checkbox to report on, and
 * must be left completely alone.
 *
 * For the sign-up/email path specifically, two things can happen:
 * - `body.termsAccepted === true` — the explicit signal
 *   `src/components/auth/sign-up.tsx` sends once its required terms checkbox
 *   has been checked (native constraint validation blocks the `submit` event
 *   otherwise, so this can only be `true` when the box was actually checked).
 *   Returns the stamp to write.
 * - anything else (missing, `false`, not a boolean) — throws an `APIError`
 *   that aborts user creation. `databaseHooks.user.create.before` runs
 *   *inside* `internalAdapter.createUser` (see `with-hooks.mjs`), and a throw
 *   there propagates uncaught, through better-auth's own
 *   `if (isAPIError(e)) throw e` in the `/sign-up/email` route handler
 *   (`better-auth/dist/api/routes/sign-up.mjs`), all the way to the HTTP
 *   response — this is the same mechanism better-auth's own `username`
 *   plugin uses to reject a `create.before` (see
 *   `better-auth/dist/plugins/username/index.mjs`). Before this, a direct
 *   POST to `/sign-up/email` with no `termsAccepted` in the body created a
 *   fully working account with `termsAcceptedAt` left `null` forever — the
 *   UI's required checkbox meant this could only happen by skipping the
 *   browser form entirely.
 *
 * The returned `termsAcceptedAt` is always computed here via `new Date()`,
 * and `termsVersion` is always the current `PLATFORM_TERMS_VERSION` constant
 * — neither is ever read from the request. A client can tell this function
 * THAT the box was checked; it has no way to say WHEN or under WHICH policy
 * version, which is the whole point: a client-controlled consent timestamp
 * would not be evidence of anything.
 */
export function resolvePlatformTermsAcceptance(
  context: TermsAcceptanceContext | null | undefined,
): { termsAcceptedAt: Date; termsVersion: string } | null {
  if (context?.path !== SIGN_UP_EMAIL_PATH) return null;

  const body = context.body as Record<string, unknown> | undefined;
  if (body?.termsAccepted !== true) {
    throw new APIError("BAD_REQUEST", {
      code: "TERMS_NOT_ACCEPTED",
      message: "You must accept the Terms of Service to create an account.",
    });
  }

  return {
    termsAcceptedAt: new Date(),
    termsVersion: PLATFORM_TERMS_VERSION,
  };
}
