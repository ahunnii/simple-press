"use client";

import type { CaptchaRenderProps } from "@better-auth-ui/react/plugins";
import { useEffect, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useTheme } from "next-themes";

import { env } from "~/env";

/**
 * hCaptcha widget for Better Auth UI's `captchaPlugin`.
 *
 * Rendered above the submit button on the sign-in, sign-up, and
 * forgot-password forms — exactly the three endpoints better-auth's server-side
 * `captcha()` plugin protects by default (see `src/server/better-auth/config.tsx`).
 *
 * The plugin owns the `x-captcha-response` header; this component only has to
 * report the token's lifecycle:
 *
 * - `setToken`   ← the widget resolved a token
 * - `clearToken` ← it errored or expired, so the header must not be sent
 * - `setReset`   ← how to get a *fresh* token. Tokens are single-use and
 *                  better-auth's captcha middleware consumes them via
 *                  `/siteverify` even when the request is later rejected for
 *                  an unrelated reason (wrong password, email already taken),
 *                  so every form resets the widget from its `onError`.
 *
 * ---
 *
 * **This deliberately has no `NODE_ENV === "development"` bypass**, unlike the
 * sibling `HCaptchaField` (`src/components/inputs/hcaptcha-form-field.tsx`) used
 * by the onboarding and claim forms.
 *
 * Those forms are checked by `src/lib/captcha/verify-hcaptcha.ts`, which skips
 * verification in development. better-auth's `captcha()` plugin has no such
 * escape hatch — it calls hCaptcha's `/siteverify` for real on every request.
 * Emitting a fake dev token here would therefore produce a confusing
 * server-side "captcha invalid" failure rather than a working dev sign-in.
 *
 * The one bypass that *is* safe is a missing site key: with nothing to render
 * we emit no token, matching the server, which cannot be enforcing verification
 * without a configured key either.
 */
export function HCaptchaWidget({
  setToken,
  clearToken,
  setReset,
}: CaptchaRenderProps) {
  const captchaRef = useRef<HCaptcha>(null);
  const { resolvedTheme } = useTheme();
  const siteKey = env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;

    setReset(() => captchaRef.current?.resetCaptcha());
    return () => setReset(null);
  }, [setReset, siteKey]);

  if (!siteKey) return null;

  return (
    <HCaptcha
      ref={captchaRef}
      sitekey={siteKey}
      onVerify={setToken}
      onExpire={clearToken}
      onError={clearToken}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
}
