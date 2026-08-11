"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { env } from "~/env";

/**
 * Sentinel token used by the automated-test bypass.
 *
 * **This literal is defined in two places and they must not drift:**
 * here, and `RECAPTCHA_TEST_BYPASS_TOKEN` in
 * `src/lib/captcha/verify-recaptcha.ts` (which short-circuits verification
 * when it sees exactly this string). It is duplicated rather than imported
 * because the verifier reaches the database through
 * `src/lib/captcha/known-hosts.ts` — importing it from a `"use client"`
 * module would drag server-only code into the browser bundle.
 *
 * The bypass has to be *client-visible*, not merely server-side: the vendored
 * `src/components/auth/sign-in.tsx` refuses to submit when the
 * `x-captcha-response` header is absent, before any network call happens. A
 * server-only bypass would leave the sign-in form permanently unsubmittable
 * in tests.
 */
export const RECAPTCHA_TEST_BYPASS_TOKEN = "test-bypass-no-captcha";

const SCRIPT_SRC = (siteKey: string) =>
  `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

/**
 * Module-level so the `<script>` is injected once per page no matter how many
 * components mount the hook simultaneously (sign-in renders the auth widget
 * while a storefront page may render a `RecaptchaField` in the same tree).
 * Reset to `null` on failure so a transient network error doesn't
 * permanently poison every later `execute()`.
 */
let scriptPromise: Promise<void> | null = null;

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (scriptPromise) return scriptPromise;

  const src = SCRIPT_SRC(siteKey);

  const promise = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("recaptcha: no document"));
      return;
    }

    // A previous page render (or a Fast Refresh cycle that cleared the module
    // cache) may already have injected the tag. Adopt it instead of adding a
    // second copy — Google's script warns and re-registers on double load.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (window.grecaptcha) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("recaptcha: script failed to load")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () =>
      reject(new Error("recaptcha: script failed to load")),
    );
    document.head.appendChild(script);
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });

  scriptPromise = promise;
  return promise;
}

/**
 * `true` when the automated-test bypass is active.
 *
 * Both conditions are required so the bypass cannot survive into a deployed
 * build: `NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS` is inlined at build time, and
 * `process.env.NODE_ENV` is `"production"` in any `next build` output.
 */
function isTestBypass(): boolean {
  return (
    env.NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS === "1" &&
    process.env.NODE_ENV !== "production"
  );
}

async function mintToken(
  siteKey: string,
  action: string,
): Promise<string | null> {
  try {
    await loadRecaptchaScript(siteKey);

    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) return null;

    await new Promise<void>((resolve) => grecaptcha.ready(resolve));

    const token = await grecaptcha.execute(siteKey, { action });
    return token || null;
  } catch {
    // Callers treat `null` as "no token" and clear whatever they had staged;
    // throwing here would only push the same decision up one level.
    return null;
  }
}

/**
 * reCAPTCHA v3 — mints invisible, score-based tokens.
 *
 * v3 has no widget and nothing for the user to solve: a token is *minted* on
 * demand and carries a score the server checks. Tokens are single-use and
 * expire 120 seconds after minting, so consumers must keep re-minting rather
 * than holding one for the lifetime of a form. See `RecaptchaField` and
 * `RecaptchaWidget` for the refresh policy.
 *
 * `execute` resolves `null` — never throws — on any failure (script blocked,
 * network down, `grecaptcha` missing, site key absent). A missing site key
 * also loads nothing at all, mirroring the server: it cannot be enforcing
 * verification without a key either.
 *
 * Deliberately hand-rolled instead of pulling in `react-google-recaptcha-v3`,
 * which is thinly maintained and adds nothing over these ~40 lines.
 */
export function useRecaptchaV3(): {
  execute: (action: string) => Promise<string | null>;
} {
  const siteKey = env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Warm the script as soon as a consumer mounts so the first `execute()` —
  // which usually happens on that same mount — isn't waiting on a cold fetch.
  useEffect(() => {
    if (isTestBypass() || !siteKey) return;
    void loadRecaptchaScript(siteKey).catch(() => {
      /* handled per-call in mintToken */
    });
  }, [siteKey]);

  return useMemo(
    () => ({
      execute: async (action: string) => {
        if (isTestBypass()) return RECAPTCHA_TEST_BYPASS_TOKEN;
        if (!siteKey) return null;
        return mintToken(siteKey, action);
      },
    }),
    [siteKey],
  );
}

/**
 * v3 tokens expire 120 seconds after minting. 90s leaves a 30s cushion for a
 * slow submit without minting so often that we burn quota.
 */
export const RECAPTCHA_REFRESH_INTERVAL_MS = 90_000;

/**
 * Keeps a *live* v3 token available at all times for a form that has no
 * pre-submit hook to mint one on demand.
 *
 * Both consumers of this hook stage their token ahead of time — the Better
 * Auth UI captcha plugin stashes it into fetch headers the moment it is
 * produced, and every legacy form holds it in React state and gates its
 * submit button on it. Neither gets a callback right before the request goes
 * out, so whatever was minted last is what ships. Given the 120s TTL that
 * means three things are all required:
 *
 * 1. **Mint on mount.** Nothing in the codebase calls the imperative
 *    `execute()`, so a field that only minted on demand would hand every one
 *    of those forms a permanently empty token and a permanently disabled
 *    submit button.
 * 2. **Refresh on an interval.** A user who reads the page for three minutes
 *    before submitting must not send a token minted at mount.
 * 3. **Re-mint on `visibilitychange`.** Chrome throttles background timers to
 *    roughly once a minute after five minutes and freezes them outright in
 *    frozen tabs, so the interval alone can leave an expired token staged for
 *    someone returning to an old tab. This is correctness, not polish.
 *
 * `onToken` receives `null` when minting failed, so the consumer can clear
 * the stale value rather than submit a token the server will reject.
 *
 * The returned `mint` is also what a "reset" should call: better-auth burns
 * the token at `/siteverify` even when the request is later rejected for an
 * unrelated reason (wrong password, email already taken), so a retry needs a
 * genuinely fresh token, not the one that was already spent.
 */
export function useRecaptchaAutoRefresh(
  action: string,
  onToken: (token: string | null) => void,
): { mint: () => Promise<string | null> } {
  const { execute } = useRecaptchaV3();

  // Consumers overwhelmingly pass inline arrow functions; holding the latest
  // in a ref keeps them out of the effect's dependency array so the refresh
  // cycle isn't torn down and rebuilt on every parent render.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mint = useCallback(async () => {
    const token = await execute(action);
    if (!mountedRef.current) return token;
    onTokenRef.current(token);
    return token;
  }, [execute, action]);

  useEffect(() => {
    void mint();

    const interval = setInterval(() => {
      void mint();
    }, RECAPTCHA_REFRESH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void mint();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [mint]);

  return { mint };
}
