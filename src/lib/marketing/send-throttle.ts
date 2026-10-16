/**
 * Process-wide request pacing for Resend's API (default plan: 2 requests per
 * second per TEAM, shared with every transactional send — order emails, auth,
 * newsletter confirmations). Campaigns take 1 req/s, leaving the other half
 * for transactional mail; at 100 emails per batch request that is still 100
 * emails/s. A simple "next free slot" scheduler: each `acquire()`
 * reserves the next slot at least `1000 / ratePerSecond` ms after the previous
 * one, so concurrent callers in one process queue up in order and never exceed
 * the rate. It does not coordinate across containers; the worker's 429 backoff
 * covers that.
 */
export type Throttle = {
  acquire: () => Promise<void>;
};

export function createThrottle(opts: { ratePerSecond: number }): Throttle {
  if (!(opts.ratePerSecond > 0)) {
    throw new Error("ratePerSecond must be greater than 0");
  }
  const intervalMs = 1000 / opts.ratePerSecond;
  let nextSlot = 0;

  return {
    acquire() {
      const now = Date.now();
      const slot = Math.max(now, nextSlot);
      nextSlot = slot + intervalMs;
      const wait = slot - now;
      if (wait <= 0) return Promise.resolve();
      return new Promise<void>((resolve) => setTimeout(resolve, wait));
    },
  };
}

/** One per process: every campaign batch send in this server shares it. */
export const marketingSendThrottle: Throttle = createThrottle({
  ratePerSecond: 1,
});
