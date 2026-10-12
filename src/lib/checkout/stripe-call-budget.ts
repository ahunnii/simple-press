/**
 * A time budget for a short chain of Stripe calls on a shopper's request
 * path (see `discount-holds.ts`). A per-call timeout alone does not bound the
 * chain: five sequential calls at 5s each — plus stripe-node's retry backoff —
 * could still stall the request for half a minute. So each step creates ONE
 * deadline up front and runs every call through `callWithinDeadline`, which:
 *
 * - skips the call entirely (throws `DeadlineExceededError`, never invoking
 *   it) when less than `MIN_CALL_BUDGET_MS` is left;
 * - otherwise hands it a stripe-node `timeout` of
 *   min(per-call timeout, remaining budget) — always a positive integer
 *   (stripe-node silently falls back to its 80s default for 0 or a
 *   non-integer);
 * - and stops waiting at the deadline even if the call has not settled. The
 *   `timeout` bounds each ATTEMPT, not the call: with `maxNetworkRetries` > 0
 *   stripe-node sleeps (≥ 0.5s, or longer if Stripe sends Retry-After) and
 *   sends a second attempt with the same timeout. The cut-off makes the
 *   deadline hard regardless. An abandoned attempt may still reach Stripe, so
 *   callers must treat a cut-off like a timeout: outcome UNKNOWN.
 */

/** Below this much remaining budget a call is skipped, not started. */
export const MIN_CALL_BUDGET_MS = 250;

/** A call skipped for (or cut off by) the step's deadline. Outcome unknown. */
export class DeadlineExceededError extends Error {
  readonly type = "DeadlineExceededError";
  constructor(message: string) {
    super(message);
    this.name = "DeadlineExceededError";
  }
}

/**
 * True for a call skipped or cut off by a step deadline. Matches on the
 * error's `type` (not `instanceof`) so it holds across module instances
 * (route bundles, test mocks) and for plain objects, and so the two places
 * that care — `classifyStripeError` and the hold-failure reporter — can never
 * disagree.
 */
export function isDeadlineExceeded(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { type?: unknown }).type === "DeadlineExceededError"
  );
}

export type Deadline = {
  /** Milliseconds left until the deadline (never negative). */
  remainingMs(): number;
};

/** `now` is injectable for deterministic tests. */
export function createDeadline(
  budgetMs: number,
  now: () => number = () => Date.now(),
): Deadline {
  const end = now() + budgetMs;
  return { remainingMs: () => Math.max(0, end - now()) };
}

/**
 * Run one Stripe call within `deadline`; `call` receives the `timeout` to pass
 * to stripe-node. See the module comment for the skip / cut-off rules.
 */
export async function callWithinDeadline<T>(
  deadline: Deadline,
  perCallTimeoutMs: number,
  call: (timeoutMs: number) => Promise<T>,
): Promise<T> {
  const remaining = deadline.remainingMs();
  if (remaining < MIN_CALL_BUDGET_MS) {
    throw new DeadlineExceededError(
      `Skipped Stripe call: ${remaining}ms of budget left`,
    );
  }
  const timeoutMs = Math.max(
    1,
    Math.floor(Math.min(perCallTimeoutMs, remaining)),
  );
  const pending = call(timeoutMs);
  // If the cut-off wins, a later rejection of the abandoned call must not
  // surface as an unhandled rejection.
  pending.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cutoff = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new DeadlineExceededError(
            `Stripe call cut off at the deadline (${remaining}ms)`,
          ),
        ),
      remaining,
    );
  });
  try {
    return await Promise.race([pending, cutoff]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * How a failed Stripe call is to be read — what it says about whether a WRITE
 * (update / expire) took effect on Stripe:
 *
 * | error                                             | class     | did the write happen?          |
 * | ------------------------------------------------- | --------- | ------------------------------ |
 * | StripeInvalidRequestError (4xx: not found, not    | "invalid" | no — Stripe refused it         |
 * |   open, wrong account)                            |           |                                |
 * | StripeConnectionError (timeout, socket reset)     | "unknown" | maybe — Stripe may have        |
 * | DeadlineExceededError (skipped / cut off)         | "unknown" |   committed it, or may still   |
 * | anything without a Stripe `type` (non-Stripe)     | "unknown" |   (an abandoned attempt)       |
 * | any other Stripe error: StripeAPIError (5xx),      | "failed"  | no — Stripe answered with an   |
 * |   StripeRateLimitError (429), StripeIdempotency-  |           |   error response (after        |
 * |   Error, auth/permission, StripeUnknownError      |           |   stripe-node's retry)         |
 */
export type StripeErrorClass = "invalid" | "unknown" | "failed";

export function classifyStripeError(err: unknown): StripeErrorClass {
  const type =
    typeof err === "object" && err !== null
      ? (err as { type?: unknown }).type
      : undefined;
  if (type === "StripeInvalidRequestError") return "invalid";
  if (
    typeof type !== "string" ||
    type === "StripeConnectionError" ||
    isDeadlineExceeded(err)
  ) {
    return "unknown";
  }
  return "failed";
}
