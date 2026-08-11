"use client";

import type { CaptchaRenderProps } from "@better-auth-ui/react/plugins";
import { useCallback, useEffect } from "react";

import { useRecaptchaAutoRefresh } from "~/lib/captcha/use-recaptcha-v3";
import { RecaptchaDisclosure } from "~/components/inputs/recaptcha-field";

/**
 * reCAPTCHA v3 for Better Auth UI's `captchaPlugin`.
 *
 * Mounted above the submit button on the sign-in, sign-up, and
 * forgot-password forms — exactly the three endpoints our server-side
 * reCAPTCHA plugin protects (see `src/server/better-auth/plugins/recaptcha.ts`).
 *
 * The plugin owns the `x-captcha-response` header; this component only
 * reports the token's lifecycle:
 *
 * - `setToken`   ← a token was minted
 * - `clearToken` ← minting failed, so the header must not be sent
 * - `setReset`   ← how to get a *fresh* token. Tokens are single-use and the
 *                  server consumes them at `/siteverify` even when the
 *                  request is later rejected for an unrelated reason (wrong
 *                  password, email already taken), so every form resets from
 *                  its `onError`.
 *
 * ---
 *
 * **Why this mints on a timer instead of on submit.**
 *
 * `captchaPlugin` is purely reactive — verified in
 * `node_modules/@better-auth-ui/react/dist/plugins.js`: `setToken(t)` calls
 * `setFetchOptions({ headers: { "x-captcha-response": t } })` and that is the
 * whole mechanism. The library exposes no pre-submit hook, so whatever token
 * was staged last is what ships with the request.
 *
 * v3 tokens die after 120 seconds. Staging one at mount and walking away
 * would therefore send an expired token from any form the user pondered for
 * more than two minutes. `useRecaptchaAutoRefresh` covers that with a ~90s
 * refresh plus a re-mint whenever the tab regains visibility (browsers
 * throttle and eventually freeze background timers, so the interval alone is
 * not enough).
 *
 * Unlike the old hCaptcha widget this has no development bypass of its own:
 * the single bypass lives in `useRecaptchaV3`, is shared with the server
 * verifier, and requires `NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS=1` outside
 * production.
 */
export function RecaptchaWidget({
  setToken,
  clearToken,
  setReset,
}: CaptchaRenderProps) {
  const handleToken = useCallback(
    (token: string | null) => {
      if (token) {
        setToken(token);
      } else {
        // Never leave a spent or stale token staged in the fetch headers.
        clearToken();
      }
    },
    [setToken, clearToken],
  );

  const { mint } = useRecaptchaAutoRefresh("auth", handleToken);

  useEffect(() => {
    setReset(() => {
      void mint();
    });
    return () => setReset(null);
  }, [setReset, mint]);

  // No widget: v3 is invisible and the badge is hidden (`.grecaptcha-badge`
  // rule in src/styles/globals.css), so Google's terms require the
  // attribution below to appear in the flow instead.
  return <RecaptchaDisclosure className="text-center" />;
}
