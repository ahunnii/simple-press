import "server-only";

import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { isKnownCaptchaHost } from "~/lib/captcha/known-hosts";

// NOTE: deliberately no `"use server"` directive here (the hCaptcha verifier
// this replaces carried one). That directive publishes every export as a
// callable Server Action reachable from the browser; this verifier is only ever
// called server-to-server, so exposing it is pure attack surface.

const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/**
 * Mirrors better-auth's internal `CAPTCHA_VERIFY_TIMEOUT_MS`. Without a timeout
 * a hung Google connection would hold the request open indefinitely.
 */
const VERIFY_TIMEOUT_MS = 10_000;

/**
 * Sentinel accepted in place of a real token so automated tests never touch
 * Google. Guarded twice — `NODE_ENV !== "production"` **and** an explicit
 * `NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS=1` — so it cannot take effect in a deployed
 * build even if the env var leaks into one. Must stay in sync with the client
 * hook, which stages this exact string when the same two conditions hold.
 */
export const RECAPTCHA_TEST_BYPASS_TOKEN = "test-bypass-no-captcha";

export type RecaptchaFailureReason =
  | "missing-token"
  | "provider-error"
  | "failed"
  | "low-score"
  | "bad-action"
  | "host-mismatch"
  | "unknown-host";

export type RecaptchaResult =
  | { ok: true; hostname: string; score: number }
  | { ok: false; reason: RecaptchaFailureReason };

/** Shape of the siteverify JSON we actually read. All fields are optional
 *  because a malformed/error response still returns 200 with a partial body. */
type SiteverifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

/**
 * Google reports a bare hostname; the request `Host` header carries a port in
 * development (`demo.localhost:3000`). Strip it before comparing.
 */
function stripPort(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * `provider-error` means *we* could not reach a verdict — missing secret,
 * network failure, timeout, garbage response. Because this verifier now fails
 * **closed** (unlike the hCaptcha one it replaces, which returned `true` when the
 * secret was blank), a Google outage stops sign-ups, contact forms and
 * testimonials outright. That has to be visible in Sentry rather than surfacing
 * as a mysterious wave of user-reported failures.
 *
 * Only this path is captured. `failed` / `low-score` / `bad-action` /
 * `host-mismatch` / `unknown-host` are *normal* rejections — bots and replayed
 * tokens are the point — and would drown the issue stream.
 */
function reportProviderError(detail: string, cause?: unknown): void {
  if (cause !== undefined) {
    Sentry.captureException(cause, {
      tags: { service: "recaptcha", component: "verify" },
      extra: { detail },
    });
    return;
  }
  Sentry.captureMessage(`reCAPTCHA provider error: ${detail}`, {
    level: "error",
    tags: { service: "recaptcha", component: "verify" },
  });
}

/**
 * Verify a reCAPTCHA v3 token, fail-closed.
 *
 * Our site key runs with Google's own domain verification **disabled** (one key
 * serves the platform domain and every tenant subdomain / custom domain, which
 * cannot be enumerated on Google's side). Two checks replace it, and both matter:
 *
 *  - `action` binding — one key serves every form, so without it a token minted
 *    on the public contact form replays against sign-up.
 *  - `hostname` binding — the token must have been solved on the very host now
 *    serving the request (`requestHost`), and that host must resolve to a live
 *    tenant (`isKnownCaptchaHost`). Without the first half, a token solved on
 *    `tenant-a.simplepress.co` verifies fine against `tenant-b.com` and captcha
 *    provides zero tenant isolation.
 *
 * @param token       the `g-recaptcha-response` value from the client
 * @param opts.action the action this call site expects (`auth`, `contact`, …)
 * @param opts.requestHost the `Host` header of the request being guarded
 * @param opts.remoteIp    best-effort client IP, forwarded to Google as `remoteip`
 */
export async function verifyRecaptcha(
  token: string,
  opts: { action: string; requestHost: string; remoteIp?: string },
): Promise<RecaptchaResult> {
  if (!token || token.trim() === "") {
    return { ok: false, reason: "missing-token" };
  }

  // Short-circuits ahead of every other check, including the host binding —
  // tests run against hosts that have no Business row.
  if (
    token === RECAPTCHA_TEST_BYPASS_TOKEN &&
    process.env.NODE_ENV !== "production" &&
    env.NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS === "1"
  ) {
    return { ok: true, hostname: opts.requestHost, score: 1 };
  }

  const secret = env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    // Fail CLOSED. The predecessor returned `true` here, which meant a blanked
    // env var silently disabled captcha platform-wide with no signal at all.
    reportProviderError("RECAPTCHA_SECRET_KEY is not configured");
    return { ok: false, reason: "provider-error" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (opts.remoteIp) {
    body.set("remoteip", opts.remoteIp);
  }

  let data: SiteverifyResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });

    if (!response.ok) {
      reportProviderError(`siteverify returned HTTP ${response.status}`);
      return { ok: false, reason: "provider-error" };
    }

    data = (await response.json()) as SiteverifyResponse;
  } catch (error) {
    // Network failure, DNS failure, or the 10s AbortSignal firing, plus any
    // non-JSON body from `response.json()`.
    reportProviderError("siteverify request failed", error);
    return { ok: false, reason: "provider-error" };
  }

  if (data.success !== true) {
    // Google returns HTTP 200 with success:false for both ordinary token
    // failures AND configuration errors (invalid-input-secret, etc.). Treat
    // secret/project misconfiguration as a provider outage so it alerts.
    const errorCodes = data["error-codes"] ?? [];
    const isConfigError = errorCodes.some((code) =>
      [
        "invalid-input-secret",
        "invalid-keys",
        "bad-request",
        "browser-error",
      ].includes(code),
    );
    if (isConfigError) {
      reportProviderError(
        `siteverify success=false with config error-codes: ${errorCodes.join(",")}`,
      );
      return { ok: false, reason: "provider-error" };
    }
    return { ok: false, reason: "failed" };
  }

  // v3 always returns a score. Its absence means we are not talking to a v3
  // key (or not to Google at all), which is not something to trust.
  if (typeof data.score !== "number" || data.score < env.RECAPTCHA_MIN_SCORE) {
    return { ok: false, reason: "low-score" };
  }

  if (data.action !== opts.action) {
    return { ok: false, reason: "bad-action" };
  }

  const hostname = stripPort(data.hostname ?? "");
  if (!hostname || hostname !== stripPort(opts.requestHost)) {
    return { ok: false, reason: "host-mismatch" };
  }

  if (!(await isKnownCaptchaHost(hostname))) {
    return { ok: false, reason: "unknown-host" };
  }

  return { ok: true, hostname, score: data.score };
}
