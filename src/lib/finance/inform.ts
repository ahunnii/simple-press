/**
 * INFORM Consumers Act gauge — pure, no I/O, no Prisma imports.
 *
 * The FTC treats an online-marketplace seller as "high-volume" at 200+
 * discrete sales AND $5,000+ gross revenue in any continuous 12-month period
 * within the previous 24 months. The Finances page approximates that with ONE
 * rolling window: the trailing 12 months ending today. Shared by the finance
 * router (counts + `thresholdReached`) and the INFORM card/alerts (bars, tone,
 * early warning) so the two can never disagree on a threshold.
 */

/** 200+ discrete sales in the window… */
export const INFORM_TRANSACTION_THRESHOLD = 200;
/** …AND $5,000+ gross revenue in the same window. */
export const INFORM_REVENUE_THRESHOLD_CENTS = 500_000;
/**
 * Early-warning ratio. Drives BOTH the amber "approaching" alert and the amber
 * bar tone, so the alert never fires while the bars still read green.
 */
export const INFORM_WARN_RATIO = 0.75;

export type InformCounts = {
  transactions: number;
  revenueCents: number;
};

export type InformBarTone = "green" | "amber" | "red";

export type InformStatus = {
  /** 0–100, capped. */
  transactionPct: number;
  /** 0–100, capped. */
  revenuePct: number;
  /** Both thresholds met — the FTC test is AND, not OR. */
  thresholdReached: boolean;
  /**
   * Either metric is at or past the warn ratio but the AND threshold is not
   * met yet — the early warning. Verification status is the caller's concern.
   */
  isApproaching: boolean;
};

/**
 * Trailing 12 months ending today, as a local-midnight half-open window.
 *
 * Uses `setDate`/`setMonth` rather than epoch-ms subtraction so DST cannot
 * shift the window by an hour (same approach as the finance router's
 * `resolveRange`).
 */
export function resolveInformWindow(now = new Date()): {
  start: Date;
  endExclusive: Date;
} {
  const endExclusive = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  endExclusive.setDate(endExclusive.getDate() + 1);
  const start = new Date(endExclusive);
  start.setMonth(start.getMonth() - 12);
  return { start, endExclusive };
}

function pct(value: number, threshold: number): number {
  return Math.min((value / threshold) * 100, 100);
}

export function evaluateInform(counts: InformCounts): InformStatus {
  const transactionPct = pct(counts.transactions, INFORM_TRANSACTION_THRESHOLD);
  const revenuePct = pct(counts.revenueCents, INFORM_REVENUE_THRESHOLD_CENTS);
  const thresholdReached =
    counts.transactions >= INFORM_TRANSACTION_THRESHOLD &&
    counts.revenueCents >= INFORM_REVENUE_THRESHOLD_CENTS;
  const warnPct = INFORM_WARN_RATIO * 100;

  return {
    transactionPct,
    revenuePct,
    thresholdReached,
    isApproaching:
      !thresholdReached && (transactionPct >= warnPct || revenuePct >= warnPct),
  };
}

/**
 * Per-metric bar colour: red once that metric alone is met, amber from the
 * warn ratio. A red bar is not the AND threshold — the badge reports that.
 */
export function informBarTone(pctValue: number): InformBarTone {
  if (pctValue >= 100) return "red";
  if (pctValue >= INFORM_WARN_RATIO * 100) return "amber";
  return "green";
}
