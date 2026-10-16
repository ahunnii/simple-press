import type { CreateBatchOptions } from "resend";
import { Resend } from "resend";

import { env } from "~/env";

if (!env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set");
}

export const resend = new Resend(env.RESEND_API_KEY);

type ResendSendPayload = Parameters<typeof resend.emails.send>[0];
type ResendSendOptions = Parameters<typeof resend.emails.send>[1];

/** Waits before each retry of a rate-limited single send (plus jitter). */
const RATE_LIMIT_RETRY_DELAYS_MS = [1_000, 2_000];
const RATE_LIMIT_JITTER_MS = 250;

/**
 * Resend's per-second team rate limit (HTTP 429 `rate_limit_exceeded`), which
 * clears within a second or two. The daily / monthly quotas are also 429s but
 * won't clear soon, so they are not retried.
 */
function isRateLimited(
  error: { name: string; statusCode: number | null } | null,
): boolean {
  if (!error) return false;
  if (
    error.name === "daily_quota_exceeded" ||
    error.name === "monthly_quota_exceeded"
  ) {
    return false;
  }
  return error.name === "rate_limit_exceeded" || error.statusCode === 429;
}

/**
 * Guarded wrapper around `resend.emails.send`.
 *
 * On the preview/staging deployment (`IS_PREVIEW_ENV=true`) outbound email is
 * neutralized so the preview env — which runs on a clone of production data —
 * can never email real customers:
 *   - if `EMAIL_REDIRECT_TO` is set, all mail is rerouted to that single inbox;
 *   - otherwise the send is skipped entirely.
 *
 * All send paths (templated emails via `send.ts` and the better-auth
 * verification/reset senders) must go through this helper.
 *
 * A request rejected by the per-second team rate limit (shared with campaign
 * batches) is retried up to twice, after ~1s and ~2s, with the same payload
 * and options (so the same idempotency key, if any). A 429 means Resend did
 * not accept the request, so a retry cannot double-send.
 */
export async function sendResendEmail(
  payload: ResendSendPayload,
  options?: ResendSendOptions,
) {
  if (env.IS_PREVIEW_ENV) {
    if (env.EMAIL_REDIRECT_TO) {
      payload = { ...payload, to: env.EMAIL_REDIRECT_TO };
    } else {
      console.log(
        "[Email] Suppressed on preview env (IS_PREVIEW_ENV=true):",
        payload.subject,
      );
      return { data: null, error: null };
    }
  }

  const sendOnce = () =>
    options
      ? resend.emails.send(payload, options)
      : resend.emails.send(payload);

  let response = await sendOnce();
  for (const delayMs of RATE_LIMIT_RETRY_DELAYS_MS) {
    if (!isRateLimited(response.error)) break;
    await new Promise<void>((resolve) =>
      setTimeout(resolve, delayMs + Math.random() * RATE_LIMIT_JITTER_MS),
    );
    response = await sendOnce();
  }
  return response;
}

// ─── Batch sending (marketing campaigns) ─────────────────────────────────────

export type ResendBatchEmail = CreateBatchOptions[number];

/**
 * An API-level failure, with the SDK's `name` / `statusCode` preserved so the
 * campaign worker can classify it. `statusCode` is `null` for network failures
 * (the SDK swallows `fetch` exceptions into
 * `{ name: "application_error", statusCode: null }`).
 */
export type ResendBatchApiError = {
  name: string;
  statusCode: number | null;
  message: string;
  /** True when the request outlasted `timeoutMs`; the send may still have gone through, so retry with the SAME idempotency key. */
  timedOut?: boolean;
};

export type ResendBatchResult = {
  /**
   * Positionally aligned with the `emails` argument: `{ id }` for each email
   * Resend accepted, `null` for each one it rejected (see `errors`) or that was
   * skipped on the preview env. `null` overall when the whole request failed
   * (see `error`).
   */
  data: Array<{ id: string } | null> | null;
  /** Per-email rejections from `batchValidation: "permissive"` (index into `emails`). */
  errors: Array<{ index: number; message: string }>;
  /** Whole-request failure. When set, nothing in the batch can be assumed sent. */
  error: ResendBatchApiError | null;
};

/**
 * Whether retrying the SAME request (same idempotency key) can plausibly
 * succeed: rate limiting, server errors, network failures, timeouts, and a
 * still-in-flight duplicate request. Everything else (validation, auth,
 * `invalid_idempotent_request`, quotas) is permanent and needs a human.
 *
 * Quota errors are also HTTP 429 but will not clear within the worker's retry
 * window, so they are classified as permanent.
 */
export function isRetryableResendError(error: ResendBatchApiError): boolean {
  if (error.timedOut) return true;
  if (error.name === "concurrent_idempotent_requests") return true;
  if (error.name === "rate_limit_exceeded") return true;
  if (
    error.name === "daily_quota_exceeded" ||
    error.name === "monthly_quota_exceeded"
  ) {
    return false;
  }
  if (error.statusCode === null) return true; // network failure
  return error.statusCode === 429 || error.statusCode >= 500;
}

/**
 * Guarded wrapper around `resend.batch.send` (up to 100 emails per request).
 *
 * Always sends with `batchValidation: "permissive"` so one bad address rejects
 * only its own email (reported in `errors`) instead of failing the batch, and
 * with the caller's `idempotencyKey` so a retry after a timeout or crash cannot
 * double-send (Resend honours a key for 24h).
 *
 * Never throws: API failures come back in `error`, and unexpected exceptions
 * become a synthetic retryable `application_error`.
 *
 * Preview env mirrors `sendResendEmail`: with `EMAIL_REDIRECT_TO` only the
 * first email is sent, redirected to that inbox, as a single send; without it
 * nothing is sent. Either way `data` stays aligned with `emails`.
 *
 * Note the raw permissive response lists only the ACCEPTED emails in `data`
 * (rejections appear in `errors` by index), so this helper re-aligns the ids
 * to the input positions. That realignment assumes Resend lists accepted ids
 * in input order, which its docs don't promise; so when `errors` is non-empty
 * the campaign worker records the accepted rows WITHOUT their ids and lets the
 * webhook's campaign+business+address fallback backfill them (see
 * `processBatch`). With no errors, ids map 1:1 and are trusted.
 */
export async function sendResendBatch(
  emails: ResendBatchEmail[],
  opts: { idempotencyKey: string; timeoutMs?: number },
): Promise<ResendBatchResult> {
  if (emails.length === 0) return { data: [], errors: [], error: null };

  const aligned = (first: { id: string } | null) =>
    emails.map((_, i) => (i === 0 ? first : null));

  if (env.IS_PREVIEW_ENV) {
    if (!env.EMAIL_REDIRECT_TO) {
      console.log(
        "[Email] Batch suppressed on preview env (IS_PREVIEW_ENV=true):",
        emails[0]?.subject,
      );
      return { data: emails.map(() => null), errors: [], error: null };
    }
    const first = emails[0];
    if (!first) return { data: [], errors: [], error: null };
    try {
      // `sendResendEmail` performs the redirect itself.
      const single = await sendResendEmail(first, {
        idempotencyKey: opts.idempotencyKey,
      });
      if (single.error) {
        return {
          data: null,
          errors: [],
          error: {
            name: single.error.name,
            statusCode: single.error.statusCode,
            message: single.error.message,
          },
        };
      }
      return {
        data: aligned(single.data ? { id: single.data.id } : null),
        errors: [],
        error: null,
      };
    } catch (err) {
      return { data: null, errors: [], error: toSyntheticError(err) };
    }
  }

  try {
    const call = resend.batch.send(emails, {
      idempotencyKey: opts.idempotencyKey,
      batchValidation: "permissive",
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const response = await (
      opts.timeoutMs
        ? Promise.race([
            call,
            new Promise<"timeout">((resolve) => {
              timer = setTimeout(() => resolve("timeout"), opts.timeoutMs);
            }),
          ])
        : call
    ).finally(() => {
      if (timer) clearTimeout(timer);
    });

    if (response === "timeout") {
      // Swallow the eventual outcome of the abandoned request.
      void call.catch(() => undefined);
      return {
        data: null,
        errors: [],
        error: {
          name: "application_error",
          statusCode: null,
          message: `Resend batch request timed out after ${opts.timeoutMs}ms`,
          timedOut: true,
        },
      };
    }

    if (response.error) {
      return {
        data: null,
        errors: [],
        error: {
          name: response.error.name,
          statusCode: response.error.statusCode,
          message: response.error.message,
        },
      };
    }

    const accepted = response.data?.data ?? [];
    const errors = response.data?.errors ?? [];
    const rejected = new Set(errors.map((e) => e.index));
    let next = 0;
    const data = emails.map((_, i) => {
      if (rejected.has(i)) return null;
      const item = accepted[next++];
      return item ? { id: item.id } : null;
    });
    return { data, errors, error: null };
  } catch (err) {
    return { data: null, errors: [], error: toSyntheticError(err) };
  }
}

function toSyntheticError(err: unknown): ResendBatchApiError {
  return {
    name: "application_error",
    statusCode: null,
    message: err instanceof Error ? err.message : "Unknown Resend error",
  };
}
