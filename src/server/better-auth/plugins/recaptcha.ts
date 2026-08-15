import type { BetterAuthPlugin } from "better-auth";
import * as Sentry from "@sentry/nextjs";
import { getIp } from "better-auth/api";

import { verifyRecaptcha } from "~/lib/captcha/verify-recaptcha";

/**
 * Better Auth middleware that gates the password endpoints behind reCAPTCHA v3.
 *
 * Replaces `captcha({ provider: "hcaptcha", … })`. We cannot use better-auth's
 * bundled `google-recaptcha` provider: its `allowedHostnames` is a static
 * `string[]` captured in a closure at config time, while SimplePress's set of
 * valid hosts is every active subdomain plus every ACTIVE custom domain — rows
 * in the database that change without a redeploy. `verifyRecaptcha` does that
 * lookup per request instead (see `~/lib/captcha/verify-recaptcha`), which is
 * also what enforces tenant isolation: the token's `hostname` must equal the
 * host serving *this* request, so a token minted on tenant A cannot be replayed
 * against tenant B.
 *
 * Behaviour is otherwise modelled directly on
 * `node_modules/better-auth/dist/plugins/captcha/index.mjs` — same endpoint
 * matching, same header, same JSON error body — so nothing on the client has to
 * change.
 *
 * ⚠️ EVERY short-circuit returns `{ response: … }`, never a bare `Response`.
 * This is not stylistic. better-auth's request pipeline
 * (`better-auth/dist/api/index.mjs`, in the `onRequest` loop) reads a plugin's
 * return value as:
 *
 * ```js
 * if (response && "response" in response) return response.response;
 * if (response && "request" in response) currentRequest = response.request;
 * ```
 *
 * A bare `Response` satisfies neither branch, so it is **silently discarded**
 * and the request continues to the sign-in handler with no captcha check and no
 * error — the exact fail-open hole this migration exists to close. The
 * `satisfies BetterAuthPlugin` annotation below turns that mistake into a
 * compile error, because `onRequest` is typed
 * `Promise<{ response: Response } | { request: Request } | void>`.
 */

/**
 * Same defaults as the built-in plugin's `defaultEndpoints`
 * (`better-auth/dist/plugins/captcha/constants.mjs`). Kept as a literal rather
 * than imported: that module is not a public export of the package.
 */
const GUARDED_ENDPOINTS = [
  "/sign-up/email",
  "/sign-in/email",
  "/request-password-reset",
] as const;

/**
 * Copied verbatim from the built-in. Matching is substring-based, so
 * `/sign-in/email-otp` would otherwise be caught by the `/sign-in/email` entry
 * above. Inert today (the email-OTP plugin is not enabled), but it must stay
 * correct for the day it is.
 */
const EXEMPT_PATHS = ["/sign-in/email-otp"] as const;

/** Error bodies the vendored auth UI already understands — see
 * `src/lib/auth/auth-error-messages.ts`, which switches on these `code`s and
 * renders the message next to the captcha control. Reuse them rather than
 * inventing new codes, or the UI falls through to its generic copy. */
const ERRORS = {
  MISSING_RESPONSE: {
    code: "MISSING_RESPONSE",
    message: "Missing CAPTCHA response",
  },
  VERIFICATION_FAILED: {
    code: "VERIFICATION_FAILED",
    message: "Captcha verification failed",
  },
  UNKNOWN_ERROR: { code: "UNKNOWN_ERROR", message: "Something went wrong" },
} as const;

/** Mirrors `better-auth/dist/utils/middleware-response.mjs` — the wrapper shape
 * documented above. Everything in this file goes through it. */
function middlewareResponse({
  message,
  code,
  status,
  extra,
}: {
  message: string;
  code: string;
  status: number;
  extra?: Record<string, unknown>;
}): { response: Response } {
  return {
    response: new Response(JSON.stringify({ message, code, ...extra }), {
      status,
      headers: { "content-type": "application/json" },
    }),
  };
}

export const recaptcha = () =>
  ({
    id: "recaptcha",
    onRequest: async (request, ctx) => {
      try {
        // Endpoint matching, copied from the built-in plugin so a basePath
        // override or a doubled slash resolves identically.
        const url = new URL(request.url);
        const basePath = ctx.options.basePath ?? "/api/auth";
        let pathname = url.pathname.replace(basePath, "");
        if (pathname.endsWith("//")) pathname = pathname.slice(0, -1);
        if (pathname.startsWith("//")) pathname = pathname.slice(1);
        if (!pathname.startsWith("/")) pathname = "/" + pathname;

        const isGuarded = GUARDED_ENDPOINTS.some(
          (endpoint) =>
            pathname.includes(endpoint) &&
            !EXEMPT_PATHS.some((exempt) => pathname.includes(exempt)),
        );

        // Not one of ours: return nothing so the pipeline keeps the original
        // request. (`void` is the "carry on" signal; see the loop quoted above.)
        if (!isGuarded) return;

        // Header name is fixed by `captchaPlugin` on the client
        // (`src/providers/providers.tsx`), which is not changing.
        const token = request.headers.get("x-captcha-response");
        if (!token) {
          return middlewareResponse({
            ...ERRORS.MISSING_RESPONSE,
            status: 400,
          });
        }

        // `getIp` is imported from `better-auth/api`, NOT
        // `@better-auth/core/utils/ip` as the built-in does internally:
        // `@better-auth/core` is a transitive dependency, and pnpm's strict
        // node_modules layout means that specifier does not resolve from app
        // code. The second argument is REQUIRED — the implementation reads
        // `options.advanced?.…`, so `getIp(request)` throws a TypeError.
        const remoteIp = getIp(request, ctx.options) ?? undefined;

        const result = await verifyRecaptcha(token, {
          action: "auth",
          requestHost: request.headers.get("host") ?? "",
          remoteIp,
        });

        if (!result.ok) {
          // Provider outages (Google down, invalid secret) are 503 so operators
          // and synthetic probes can distinguish them from ordinary bot rejects.
          if (result.reason === "provider-error") {
            return middlewareResponse({
              ...ERRORS.UNKNOWN_ERROR,
              status: 503,
              extra: { reason: result.reason },
            });
          }

          // The failure `reason` is echoed alongside the stable `code` so the
          // cross-tenant-replay check (`host-mismatch`) is observable from the
          // response instead of requiring server logs. It is a coarse enum, not
          // a detail an attacker can mine — `verifyRecaptcha` never reveals the
          // expected host or score.
          return middlewareResponse({
            ...ERRORS.VERIFICATION_FAILED,
            status: 403,
            extra: { reason: result.reason },
          });
        }

        return;
      } catch (error) {
        // Pathname only — this used to log the FULL `request.url` including the
        // query string.
        //
        // Scope note, so nobody re-rates this: the only URLs that reach here are
        // the three in GUARDED_ENDPOINTS (`/sign-up/email`, `/sign-in/email`,
        // `/request-password-reset`), because everything else returns early at
        // the `isGuarded` check above. Those are POSTs with no query string, so
        // this was NOT leaking credentials — `/verify-email?token=` and
        // `/reset-password?token=` never reach this plugin. Narrowing it is
        // hygiene (a full URL is never the useful part of a log line, and the
        // guarded set could grow), not an incident.
        //
        // The place where this genuinely matters is the isolation-scope tag in
        // `src/app/api/auth/[...all]/route.ts`, which wraps EVERY auth endpoint
        // — including the two token-bearing ones.
        let endpointPath = "unknown";
        try {
          endpointPath = new URL(request.url).pathname;
        } catch {
          // Only reachable if `request.url` is what threw above; keep the
          // sentinel rather than let the catch block itself throw.
        }

        const message = error instanceof Error ? error.message : undefined;
        ctx.logger.error(message ?? "Unknown error", {
          endpoint: endpointPath,
          message: error,
        });

        // This is the highest-severity silent failure on the auth surface: the
        // return below fails CLOSED with a 500, so for as long as the cause
        // persists — a Google outage, a rotated or invalid
        // RECAPTCHA_SECRET_KEY, blocked egress — EVERY sign-up and sign-in on
        // the platform is refused. And it cannot be caught by `onAPIError` in
        // `../config`: `onRequest` plugins short-circuit by returning a
        // `{ response }` wrapper, they never throw an `APIError`, so the
        // router's error path is never entered. Captured here or nowhere.
        Sentry.captureException(error, {
          tags: { service: "recaptcha", "auth.hook": "recaptcha-gate" },
          extra: { pathname: endpointPath },
        });

        // Never fall through to the handler on error: an unexpected throw must
        // fail closed, not silently skip verification.
        return middlewareResponse({ ...ERRORS.UNKNOWN_ERROR, status: 500 });
      }
    },
  }) satisfies BetterAuthPlugin;
