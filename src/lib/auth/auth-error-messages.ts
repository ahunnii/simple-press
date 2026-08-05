/**
 * Turns a Better Auth failure into copy a shopper can act on.
 *
 * SIMPLEPRESS LOCAL FILE — hand-authored, not part of the Better Auth UI
 * registry. Safe to keep across a re-fetch of `src/lib/auth/**`.
 *
 * Before this existed, the only surface for an auth failure was
 * `src/components/auth/error-toaster.tsx`, which toasts the server's raw
 * message. That leaks internal strings ("Missing CAPTCHA response") and pins
 * the message to a corner of the screen rather than to the control that
 * caused it. The four auth forms call this instead and render the result
 * inline.
 *
 * Error shapes this reads, in the order they occur in practice:
 *
 * - `BetterFetchError` — thrown by `@better-fetch/fetch` whenever the auth
 *   endpoint answers non-2xx. `status` is the HTTP status; `error` is the
 *   parsed JSON body, which for better-auth is `{ message, code }` (see
 *   `better-auth/dist/utils/middleware-response.mjs`). Its own `.message` is
 *   just `statusText`, so it is NOT the server's message and is not used as
 *   one here.
 * - A raw `TypeError` — `betterFetch` does not catch fetch rejections unless
 *   `catchAllError` is set, so a dropped connection surfaces as
 *   "Failed to fetch" with no status at all.
 *
 * The `code` values are the KEYS of better-auth's error-code tables, not the
 * messages: `defineErrorCodes` maps each entry to `{ code: key, message }`
 * (`@better-auth/core/dist/utils/error-codes.mjs`). Captcha codes come from
 * `better-auth/dist/plugins/captcha/error-codes.mjs`, the rest from
 * `@better-auth/core/dist/error/codes.mjs`.
 *
 * Pure and dependency-free by design — see `auth-error-messages.test.ts`.
 */

/** Control an error should be reported next to, when it belongs to one. */
export type AuthErrorField = "captcha" | "email" | "password";

export type AuthErrorInfo = {
  /** Ready-to-render copy. Never a raw server string unless nothing else fits. */
  message: string;
  /**
   * When set, the form renders the message beneath that control instead of in
   * the form-level alert.
   */
  field?: AuthErrorField;
};

const GENERIC_MESSAGE = "Something went wrong. Please try again.";
const SERVER_MESSAGE = "Something went wrong on our end. Please try again.";
const RATE_LIMIT_MESSAGE = "Too many attempts. Wait a minute and try again.";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/**
 * HTTP status of the failed request, or `undefined` when the request never
 * produced a response (network failure, or a non-fetch throw).
 *
 * `BetterFetchError` puts it on the error itself; the non-throwing
 * `{ data, error }` form of better-fetch puts it on the error body instead,
 * so both are checked.
 */
function readStatus(error: unknown): number | undefined {
  const root = asRecord(error);
  if (!root) return undefined;

  if (typeof root.status === "number") return root.status;

  const body = asRecord(root.error);
  if (body && typeof body.status === "number") return body.status;

  return undefined;
}

/** better-auth's machine-readable error code, when the response carried one. */
function readCode(error: unknown): string | undefined {
  const root = asRecord(error);
  if (!root) return undefined;

  const body = asRecord(root.error);
  return asNonEmptyString(body?.code) ?? asNonEmptyString(root.code);
}

/**
 * The message the *server* sent, which lives in the response body.
 *
 * Deliberately does not fall back to `error.message`: on a `BetterFetchError`
 * that is the HTTP status text ("Unauthorized"), which reads like a bug report
 * rather than an explanation.
 */
function readServerMessage(error: unknown): string | undefined {
  const root = asRecord(error);
  if (!root) return undefined;

  const body = asRecord(root.error);
  return asNonEmptyString(body?.message);
}

/**
 * Resolve a user-facing message for an auth failure.
 *
 * @param error - Whatever the mutation's `onError` received.
 * @returns The message to render, or `null` when the failure must stay silent
 *   because the form is already navigating somewhere that explains it
 *   (`EMAIL_NOT_VERIFIED` → the verify-email view).
 */
export function resolveAuthErrorMessage(error: unknown): AuthErrorInfo | null {
  if (error == null) return null;

  switch (readCode(error)) {
    case "MISSING_RESPONSE":
      return {
        message: 'Please complete the "I am human" check below, then try again.',
        field: "captcha",
      };

    case "VERIFICATION_FAILED":
      return {
        message:
          "That human-verification check didn't go through. Please try it again.",
        field: "captcha",
      };

    case "INVALID_EMAIL_OR_PASSWORD":
      return { message: "That email and password don't match an account." };

    // The sign-in form navigates to the verify-email view for this one, so an
    // alert would flash and then be thrown away with the page.
    case "EMAIL_NOT_VERIFIED":
      return null;

    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        message:
          "An account with this email already exists. Try signing in instead.",
        field: "email",
      };
  }

  const status = readStatus(error);

  if (status === 429) return { message: RATE_LIMIT_MESSAGE };

  // No status means the request never reached a response — treat it the same
  // as a server fault rather than surfacing "Failed to fetch".
  if (status === undefined || status >= 500) return { message: SERVER_MESSAGE };

  return { message: readServerMessage(error) ?? GENERIC_MESSAGE };
}
