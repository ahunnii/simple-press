import { describe, expect, it } from "vitest";

import { resolveAuthErrorMessage } from "./auth-error-messages";

/**
 * Shapes a `BetterFetchError` the way `@better-fetch/fetch` builds one: the
 * HTTP status on the error, better-auth's `{ message, code }` body on `.error`.
 */
function fetchError(
  status: number,
  body?: { code?: string; message?: string },
) {
  return { status, statusText: "", error: body ?? {} };
}

describe("resolveAuthErrorMessage", () => {
  it("names the captcha when its response is missing", () => {
    expect(
      resolveAuthErrorMessage(
        fetchError(400, {
          code: "MISSING_RESPONSE",
          message: "Missing CAPTCHA response",
        }),
      ),
    ).toEqual({
      message:
        "We couldn't verify your browser. Wait a moment and try again — if it keeps happening, a browser extension or network filter may be blocking reCAPTCHA.",
      field: "captcha",
    });
  });

  it("names the captcha when verification fails", () => {
    expect(
      resolveAuthErrorMessage(
        fetchError(403, {
          code: "VERIFICATION_FAILED",
          message: "Captcha verification failed",
        }),
      ),
    ).toEqual({
      message:
        "We couldn't verify this request. Please try again, or contact support if the problem continues.",
      field: "captcha",
    });
  });

  it("explains a credential mismatch without naming which half was wrong", () => {
    expect(
      resolveAuthErrorMessage(
        fetchError(401, {
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password",
        }),
      ),
    ).toEqual({ message: "That email and password don't match an account." });
  });

  // The sign-in form navigates to the verify-email view for this one, so an
  // alert would flash and then be discarded with the page.
  it("stays silent for an unverified email", () => {
    expect(
      resolveAuthErrorMessage(
        fetchError(403, {
          code: "EMAIL_NOT_VERIFIED",
          message: "Email not verified",
        }),
      ),
    ).toBeNull();
  });

  it("points a duplicate sign-up at the email field", () => {
    expect(
      resolveAuthErrorMessage(
        fetchError(422, {
          code: "USER_ALREADY_EXISTS",
          message: "User already exists.",
        }),
      ),
    ).toEqual({
      message:
        "An account with this email already exists. Try signing in instead.",
      field: "email",
    });
  });

  it("tells a throttled caller to wait", () => {
    expect(
      resolveAuthErrorMessage(
        fetchError(429, {
          message: "Too many requests. Please try again later.",
        }),
      ),
    ).toEqual({ message: "Too many attempts. Wait a minute and try again." });
  });

  it("owns a server fault rather than repeating its message", () => {
    expect(
      resolveAuthErrorMessage(
        fetchError(500, {
          code: "UNKNOWN_ERROR",
          message: "Something went wrong",
        }),
      ),
    ).toEqual({
      message: "Something went wrong on our end. Please try again.",
    });
  });

  // `betterFetch` does not catch fetch rejections, so a dropped connection
  // arrives as a bare TypeError with no status at all.
  it("treats a network failure as a server fault", () => {
    expect(resolveAuthErrorMessage(new TypeError("Failed to fetch"))).toEqual({
      message: "Something went wrong on our end. Please try again.",
    });
  });

  it("falls back to the server's own message for an unmapped 4xx", () => {
    expect(
      resolveAuthErrorMessage(
        fetchError(400, {
          code: "PASSWORD_TOO_SHORT",
          message: "Password too short",
        }),
      ),
    ).toEqual({ message: "Password too short" });
  });

  it("falls back to generic copy when there is no message to show", () => {
    expect(resolveAuthErrorMessage(fetchError(400))).toEqual({
      message: "Something went wrong. Please try again.",
    });
  });

  it("returns null when there is no error", () => {
    expect(resolveAuthErrorMessage(null)).toBeNull();
    expect(resolveAuthErrorMessage(undefined)).toBeNull();
  });
});
