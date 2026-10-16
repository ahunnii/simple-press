import * as Sentry from "@sentry/nextjs";

import type {
  CampaignBatchStatus,
  CampaignRecipientStatus,
} from "./campaign-status";
import type { Throttle } from "./send-throttle";
import type {
  ResendBatchApiError,
  ResendBatchEmail,
  ResendBatchResult,
} from "~/lib/email/resend";
import type { DbClient } from "~/server/db";
import { isRetryableResendError, sendResendBatch } from "~/lib/email/resend";
import {
  buildUnsubscribeUrl,
  oneClickUnsubscribeHeaders,
} from "~/lib/email/unsubscribe-token";
import { resolveFlags } from "~/lib/features/resolve-flags";

import { marketingAudienceWhere } from "./audience";
import {
  ACCEPTED_RECIPIENT_STATUSES,
  ACTIVE_CAMPAIGN_STATUSES,
} from "./campaign-status";
import { applyUnsubscribeUrl } from "./render-campaign";
import { marketingSendThrottle } from "./send-throttle";

/**
 * Background sender for marketing campaigns.
 *
 * `sendCampaign` (marketing router) snapshots the audience into
 * `MarketingCampaignRecipient` rows and one `MarketingCampaignBatch` row per
 * 100 recipients, then calls `drainCampaign` from `after()`. The cron job
 * (`resumeMarketingCampaigns`) picks up anything a crash or deploy left behind.
 *
 * SAFETY MODEL. Every batch is sent with the Resend idempotency key
 * `mkt:<campaignId>:<batchIndex>` and a payload rebuilt byte-for-byte from the
 * campaign's frozen render, so a retry after a timeout or crash can never
 * double-send within Resend's 24h key window:
 *   - a batch is claimed with one atomic `FOR UPDATE SKIP LOCKED` statement
 *     and a 5-minute lease, so two drains (after() + cron, two containers)
 *     never send the same batch concurrently;
 *   - membership is frozen on the batch's first claim (PENDING → SENDING /
 *     SKIPPED) and never re-filtered, so the retry payload matches the first;
 *   - a batch first tried more than 23h ago is failed as "outcome unknown"
 *     instead of risking a send under an expired key.
 * Every outcome write is conditional on still holding the lease (status
 * SENDING + the attempt number we claimed), so a worker whose lease expired
 * mid-send cannot clobber the worker that reclaimed it.
 */

export const BATCH_SIZE = 100;
export const LEASE_MS = 5 * 60_000;
export const MAX_ATTEMPTS = 6;
export const SEND_TIMEOUT_MS = 60_000;
/** Resend keeps an idempotency key for 24h; stop retrying an hour short of that. */
export const IDEMPOTENCY_GUARD_MS = 23 * 60 * 60_000;

const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 60_000;
/** Resend's daily quota resets on a rolling basis; check back hourly. */
const DAILY_QUOTA_BACKOFF_MS = 60 * 60_000;
/**
 * Longest a drain will sit idle waiting for a backoff (`notBefore`) or an
 * expired lease before handing the rest to the cron. Covers the full 429
 * backoff ladder without parking an `after()` callback for a 5-minute lease.
 */
const MAX_IDLE_WAIT_MS = 65_000;

export type SendBatchFn = (
  emails: ResendBatchEmail[],
  opts: { idempotencyKey: string; timeoutMs?: number },
) => Promise<ResendBatchResult>;

export type DrainOptions = {
  /** Wall-clock budget for this drain, measured from the call. */
  deadlineMs: number;
  /** Defaults to the process-wide 1 req/s marketing throttle. */
  throttle?: Throttle;
  /** Defaults to `sendResendBatch`. Injected by tests. */
  send?: SendBatchFn;
  /** Clock for leases, backoff and the 23h guard. Injected by tests. */
  now?: () => Date;
  /** Idle wait between retries. Injected by tests (e.g. to advance a fake clock). */
  sleep?: (ms: number) => Promise<void>;
};

export type DrainResult = {
  /** Batches this drain handed to Resend successfully. */
  batchesSent: number;
  /** Why the drain stopped. */
  stopped:
    | "finished" // nothing left; campaign finalized
    | "idle" // remaining batches are leased elsewhere or backing off too long
    | "deadline"
    | "canceled"
    | "paused" // flag off or store not active; cron resumes once both are back
    | "not_active"; // campaign missing, still a draft, or already final
};

export function idempotencyKeyFor(campaignId: string, batchIndex: number) {
  return `mkt:${campaignId}:${batchIndex}`;
}

/** The frozen, per-campaign inputs every batch payload is built from. */
type FrozenCampaign = {
  id: string;
  businessId: string;
  subject: string;
  renderedHtml: string;
  renderedText: string;
  fromAddress: string;
  replyTo: string | null;
  baseUrl: string;
};

type ClaimedBatch = {
  id: string;
  batchIndex: number;
  attempts: number;
  firstAttemptAt: Date | null;
  /** Claimed from SENDING with an expired lease: an earlier attempt may have gone out. */
  reclaimed: boolean;
};

/** Failure message for a batch whose earlier attempt never reported back. */
const UNKNOWN_OUTCOME_ON_CANCEL =
  "Canceled after a send attempt that never reported back; some of these emails may have gone out.";

/** Only an active store sends; `checkBusiness` resolves the same value. */
const ACTIVE_BUSINESS_STATUS = "active";

type Ctx = {
  db: DbClient;
  campaign: FrozenCampaign;
  throttle: Throttle;
  send: SendBatchFn;
  now: () => Date;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Postgres literal for a `timestamp(3)` (UTC wall time, as Prisma stores it). */
function ts(date: Date): string {
  return date.toISOString();
}

// ─── Claiming ────────────────────────────────────────────────────────────────

/**
 * Atomically claims the campaign's next sendable batch: PENDING whose backoff
 * has passed, or SENDING whose lease expired (a crashed or timed-out worker).
 * `SKIP LOCKED` makes concurrent claimers take different batches instead of
 * blocking. The claim takes a fresh lease and counts an attempt;
 * `firstAttemptAt` is set once and drives the 23h guard.
 *
 * Timestamps are bound as ISO strings cast to `timestamp`, which drops the
 * zone designator and compares UTC wall time to UTC wall time — independent
 * of the database session's TimeZone.
 */
export async function claimNextBatch(
  db: DbClient,
  campaignId: string,
  now: Date,
): Promise<ClaimedBatch | null> {
  const nowTs = ts(now);
  const leaseTs = ts(new Date(now.getTime() + LEASE_MS));
  const rows = await db.$queryRaw<ClaimedBatch[]>`
    WITH next AS (
      SELECT "id", "status" = 'SENDING' AS "reclaimed"
      FROM "MarketingCampaignBatch"
      WHERE "campaignId" = ${campaignId}
        AND (
          ("status" = 'PENDING'
            AND ("notBefore" IS NULL OR "notBefore" <= ${nowTs}::timestamp))
          OR ("status" = 'SENDING'
            AND ("leaseUntil" IS NULL OR "leaseUntil" < ${nowTs}::timestamp))
        )
      ORDER BY "batchIndex"
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "MarketingCampaignBatch" AS b
    SET "status" = 'SENDING',
        "leaseUntil" = ${leaseTs}::timestamp,
        "attempts" = b."attempts" + 1,
        "firstAttemptAt" = COALESCE(b."firstAttemptAt", ${nowTs}::timestamp),
        "updatedAt" = ${nowTs}::timestamp
    FROM next
    WHERE b."id" = next."id"
    RETURNING b."id", b."batchIndex", b."attempts", b."firstAttemptAt",
      next."reclaimed"
  `;
  return rows[0] ?? null;
}

// ─── Draining ────────────────────────────────────────────────────────────────

/**
 * Sends a campaign's remaining batches until none are left, the deadline
 * passes, the owner cancels, the `emailMarketing` flag is switched off, or the
 * store is suspended / closed.
 * Safe to run concurrently with itself for the same campaign. Never throws
 * for a per-batch failure (those are recorded on the batch); a database error
 * propagates, and whatever batch was in hand is retried after its lease.
 */
export async function drainCampaign(
  db: DbClient,
  campaignId: string,
  opts: DrainOptions,
): Promise<DrainResult> {
  const deadline = Date.now() + opts.deadlineMs;
  const now = opts.now ?? (() => new Date());
  const sleep = opts.sleep ?? defaultSleep;
  let batchesSent = 0;
  let ctx: Ctx | null = null;

  while (Date.now() < deadline) {
    const state = await db.marketingCampaign.findUnique({
      where: { id: campaignId },
      select: {
        status: true,
        business: { select: { featureFlags: true, status: true } },
      },
    });
    if (!state) return { batchesSent, stopped: "not_active" };
    if (state.status === "CANCELED") {
      await cancelPendingWork(db, campaignId, now());
      return { batchesSent, stopped: "canceled" };
    }
    if (state.status !== "QUEUED" && state.status !== "SENDING") {
      return { batchesSent, stopped: "not_active" };
    }
    // Checked before every batch so switching the feature off, or a
    // platform admin suspending the store, stops a send within one batch.
    // The campaign stays QUEUED/SENDING; the cron resumes it once both clear.
    if (
      state.business.status !== ACTIVE_BUSINESS_STATUS ||
      !resolveFlags(state.business.featureFlags).isEnabled("emailMarketing")
    ) {
      return { batchesSent, stopped: "paused" };
    }
    if (state.status === "QUEUED") {
      await db.marketingCampaign.updateMany({
        where: { id: campaignId, status: "QUEUED" },
        data: { status: "SENDING", startedAt: now() },
      });
    }

    ctx ??= await loadFrozenCampaign(db, campaignId, opts, now);
    if (!ctx) return { batchesSent, stopped: "not_active" };

    const batch = await claimNextBatch(db, campaignId, now());
    if (batch) {
      if (await processBatch(ctx, batch)) batchesSent++;
      continue;
    }

    // Nothing claimable right now. Either the campaign is done, or the rest
    // is backing off / leased by another worker.
    const wakeAt = await nextWakeTime(db, campaignId);
    if (wakeAt === null) {
      await finalizeCampaign(db, campaignId, now());
      return { batchesSent, stopped: "finished" };
    }
    const waitMs = Math.max(0, wakeAt.getTime() - now().getTime());
    if (waitMs > MAX_IDLE_WAIT_MS || Date.now() + waitMs >= deadline) {
      return { batchesSent, stopped: "idle" };
    }
    await sleep(waitMs);
  }
  return { batchesSent, stopped: "deadline" };
}

async function loadFrozenCampaign(
  db: DbClient,
  campaignId: string,
  opts: DrainOptions,
  now: () => Date,
): Promise<Ctx | null> {
  const c = await db.marketingCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      businessId: true,
      subject: true,
      renderedHtml: true,
      renderedText: true,
      fromAddress: true,
      replyTo: true,
      baseUrl: true,
    },
  });
  // A queued campaign always has its render frozen (sendCampaign writes it in
  // the same transaction as DRAFT → QUEUED); guard anyway rather than send
  // an empty email. Such a campaign can never send, so fail it (once) instead
  // of leaving it active for the cron to re-find every tick.
  if (
    !c?.renderedHtml ||
    c.renderedText === null ||
    !c.fromAddress ||
    !c.baseUrl
  ) {
    if (c && (await failCampaignMissingRender(db, campaignId, now()))) {
      Sentry.captureMessage(
        "Marketing campaign queued without a frozen render",
        {
          level: "error",
          tags: { "marketing.campaign": "missing_render" },
          extra: { campaignId },
        },
      );
    }
    return null;
  }
  return {
    db,
    campaign: {
      ...c,
      renderedHtml: c.renderedHtml,
      renderedText: c.renderedText,
      fromAddress: c.fromAddress,
      baseUrl: c.baseUrl,
    },
    throttle: opts.throttle ?? marketingSendThrottle,
    send: opts.send ?? sendResendBatch,
    now,
  };
}

/**
 * Fails an active campaign that has no frozen render and cancels its unsent
 * batches. True when this call made the transition (so it reports once).
 */
async function failCampaignMissingRender(
  db: DbClient,
  campaignId: string,
  now: Date,
): Promise<boolean> {
  const { count } = await db.marketingCampaign.updateMany({
    where: { id: campaignId, status: { in: [...ACTIVE_CAMPAIGN_STATUSES] } },
    data: {
      status: "FAILED",
      completedAt: now,
      lastError:
        "This campaign's email content was missing, so nothing was sent. Contact SimplePress support.",
    },
  });
  if (count > 0) await cancelPendingWork(db, campaignId, now);
  return count > 0;
}

/**
 * When the earliest unfinished batch becomes claimable (a backoff ending or a
 * lease expiring), or `null` when no batch is PENDING or SENDING.
 */
async function nextWakeTime(
  db: DbClient,
  campaignId: string,
): Promise<Date | null> {
  const open = await db.marketingCampaignBatch.findMany({
    where: { campaignId, status: { in: ["PENDING", "SENDING"] } },
    select: { status: true, notBefore: true, leaseUntil: true },
  });
  if (open.length === 0) return null;
  let earliest = Infinity;
  for (const b of open) {
    const at = b.status === "PENDING" ? b.notBefore : b.leaseUntil;
    earliest = Math.min(earliest, at ? at.getTime() : 0);
  }
  return new Date(earliest);
}

// ─── One batch ───────────────────────────────────────────────────────────────

/** Sends one claimed batch and records the outcome. True when Resend accepted it. */
async function processBatch(ctx: Ctx, batch: ClaimedBatch): Promise<boolean> {
  const { db, campaign } = ctx;
  const now = ctx.now();

  if (
    batch.firstAttemptAt &&
    now.getTime() - batch.firstAttemptAt.getTime() > IDEMPOTENCY_GUARD_MS
  ) {
    await failBatch(
      ctx,
      batch,
      "Outcome unknown: this batch was first attempted over 23 hours ago, past the window in which a retry is safe from duplicates.",
    );
    return false;
  }

  await freezeMembership(db, campaign, batch.batchIndex);

  const rows = await db.marketingCampaignRecipient.findMany({
    where: {
      campaignId: campaign.id,
      batchIndex: batch.batchIndex,
      status: "SENDING",
    },
    select: { id: true, email: true, customerId: true },
    orderBy: { id: "asc" },
  });

  // A customer deleted or anonymized after the freeze has no usable address
  // or unsubscribe token. Drop them; the payload then differs from the first
  // attempt, and Resend rejects the reused key, failing the batch loudly
  // rather than risking a duplicate.
  const sendable: Array<{ id: string; email: string; customerId: string }> = [];
  const unusable: string[] = [];
  for (const r of rows) {
    if (r.customerId !== null && r.email !== "") {
      sendable.push({ id: r.id, email: r.email, customerId: r.customerId });
    } else {
      unusable.push(r.id);
    }
  }
  if (unusable.length > 0) {
    await db.marketingCampaignRecipient.updateMany({
      where: { id: { in: unusable }, status: "SENDING" },
      data: {
        status: "FAILED" satisfies CampaignRecipientStatus,
        error: "Customer was removed before this email could be sent",
      },
    });
  }

  if (sendable.length === 0) {
    await completeBatch(ctx, batch, []);
    return false;
  }

  const emails = sendable.map((row) => buildEmail(campaign, row));
  await ctx.throttle.acquire();

  // A cancel that landed after this claim (or during the throttle wait)
  // leaves our leased batch alone; honour it here, before anything is sent.
  const current = await db.marketingCampaign.findUnique({
    where: { id: campaign.id },
    select: { status: true },
  });
  if (current?.status === "CANCELED") {
    if (batch.reclaimed) {
      await failBatch(ctx, batch, UNKNOWN_OUTCOME_ON_CANCEL);
    } else {
      await cancelClaimedBatch(ctx, batch);
    }
    return false;
  }

  const result = await ctx.send(emails, {
    idempotencyKey: idempotencyKeyFor(campaign.id, batch.batchIndex),
    timeoutMs: SEND_TIMEOUT_MS,
  });

  if (!result.error) {
    const errorByIndex = new Map(
      result.errors.map((e) => [e.index, e.message]),
    );
    // With any per-email rejection, `sendResendBatch` has to realign the
    // accepted ids to input positions on the assumption that Resend lists
    // them in input order. Don't trust that: record the accepted rows as
    // SENT without an id, and let the webhook's campaign + business + address
    // fallback (resend-events.ts) backfill the right id onto each row.
    const trustIds = result.errors.length === 0;
    const outcomes = sendable.map((row, i) => {
      const error = errorByIndex.get(i) ?? null;
      return {
        rowId: row.id,
        accepted: trustIds ? Boolean(result.data?.[i]) : error === null,
        resendId: trustIds ? (result.data?.[i]?.id ?? null) : null,
        error,
      };
    });
    return completeBatch(ctx, batch, outcomes);
  }

  await handleSendError(ctx, batch, result.error);
  return false;
}

/**
 * First claim only: rows still PENDING are re-checked against the live
 * audience. Eligible rows become SENDING (frozen into this batch's payload for
 * every retry); the rest — unsubscribed, suppressed, anonymized or deleted
 * since queue time — become SKIPPED. On a retry no rows are PENDING, so this
 * is a no-op and the payload stays identical.
 */
async function freezeMembership(
  db: DbClient,
  campaign: FrozenCampaign,
  batchIndex: number,
) {
  const inBatch = { campaignId: campaign.id, batchIndex, status: "PENDING" };
  await db.$transaction([
    db.marketingCampaignRecipient.updateMany({
      where: {
        ...inBatch,
        customer: { is: marketingAudienceWhere(campaign.businessId) },
      },
      data: { status: "SENDING" satisfies CampaignRecipientStatus },
    }),
    db.marketingCampaignRecipient.updateMany({
      where: inBatch,
      data: {
        status: "SKIPPED" satisfies CampaignRecipientStatus,
        error: "No longer subscribed when this batch was sent",
      },
    }),
  ]);
}

/** One recipient's email, built only from frozen campaign fields + the row. */
function buildEmail(
  campaign: FrozenCampaign,
  row: { id: string; email: string; customerId: string },
): ResendBatchEmail {
  // Deterministic: the token has no timestamp, so a retry rebuilds the
  // identical URL (and identical bytes) for the idempotency key.
  const unsubscribeUrl = buildUnsubscribeUrl(campaign.baseUrl, {
    customerId: row.customerId,
    businessId: campaign.businessId,
    r: row.id,
  });
  return {
    from: campaign.fromAddress,
    to: [row.email],
    ...(campaign.replyTo ? { replyTo: campaign.replyTo } : {}),
    subject: campaign.subject,
    html: applyUnsubscribeUrl(campaign.renderedHtml, unsubscribeUrl),
    text: applyUnsubscribeUrl(campaign.renderedText, unsubscribeUrl),
    // RFC 8058 one-click unsubscribe (handled by /api/unsubscribe POST).
    headers: oneClickUnsubscribeHeaders(unsubscribeUrl),
    // Tag values allow only ASCII letters, digits, "_" and "-"; cuid ids comply.
    tags: [
      { name: "category", value: "marketing_broadcast" },
      { name: "campaign", value: campaign.id },
      { name: "business", value: campaign.businessId },
    ],
  };
}

/** Lease-holder condition for every outcome write. */
function heldBy(batch: ClaimedBatch) {
  return { id: batch.id, status: "SENDING", attempts: batch.attempts };
}

/**
 * Resend accepted the request: record each row's id (or its per-email
 * rejection) and mark the batch SENT, all in one transaction. An accepted row
 * may lack an id (see `processBatch`). Rows neither accepted nor rejected were
 * held back by the preview-env guard in `sendResendBatch`.
 */
async function completeBatch(
  ctx: Ctx,
  batch: ClaimedBatch,
  outcomes: Array<{
    rowId: string;
    accepted: boolean;
    resendId: string | null;
    error: string | null;
  }>,
): Promise<boolean> {
  const sentAt = ctx.now();
  return ctx.db.$transaction(
    async (tx) => {
      const { count } = await tx.marketingCampaignBatch.updateMany({
        where: heldBy(batch),
        data: {
          status: "SENT" satisfies CampaignBatchStatus,
          sentAt,
          leaseUntil: null,
          notBefore: null,
          lastError: null,
        },
      });
      // Lease lost: whoever reclaimed the batch resent under the same key and
      // got the same ids back, so their write is equivalent. Leave it to them.
      if (count === 0) return false;

      for (const o of outcomes) {
        const data = o.accepted
          ? {
              status: "SENT",
              // Absent: leave null for the webhook fallback to backfill.
              ...(o.resendId ? { resendId: o.resendId } : {}),
              sentAt,
              error: null,
            }
          : o.error
            ? { status: "FAILED", error: o.error }
            : {
                status: "SKIPPED",
                error:
                  "Not sent: email delivery is disabled in this environment",
              };
        await tx.marketingCampaignRecipient.updateMany({
          where: { id: o.rowId, status: "SENDING" },
          data,
        });
      }
      return true;
    },
    { timeout: 30_000 },
  );
}

/** Classifies a whole-request failure into retry, wait-out-the-lease, or fail. */
async function handleSendError(
  ctx: Ctx,
  batch: ClaimedBatch,
  error: ResendBatchApiError,
) {
  // The request may have gone through. Leave the batch SENDING: its lease
  // expires and the retry reuses the same key, so Resend either replays the
  // original response or sends it for the first time.
  if (error.timedOut) return;

  if (error.name === "monthly_quota_exceeded") {
    await failBatch(
      ctx,
      batch,
      "The platform's monthly email quota is used up. Contact SimplePress support.",
    );
    return;
  }

  // A daily quota clears within a day (the 23h guard bounds the wait). These
  // hourly re-checks don't count toward MAX_ATTEMPTS.
  if (error.name === "daily_quota_exceeded") {
    await retryLater(ctx, batch, DAILY_QUOTA_BACKOFF_MS, error.message, {
      refundAttempt: true,
    });
    return;
  }

  // 429 / 5xx / network / in-flight duplicate. (Quotas are handled above.)
  if (!isRetryableResendError(error)) {
    await failBatch(ctx, batch, error.message);
    return;
  }
  if (batch.attempts >= MAX_ATTEMPTS) {
    await failBatch(
      ctx,
      batch,
      `Gave up after ${MAX_ATTEMPTS} attempts: ${error.message}`,
    );
    return;
  }
  const backoff = Math.min(
    MAX_BACKOFF_MS,
    BASE_BACKOFF_MS * 2 ** (batch.attempts - 1),
  );
  await retryLater(ctx, batch, backoff, error.message);
}

/** Back to PENDING with a `notBefore`; frozen rows stay SENDING. */
async function retryLater(
  ctx: Ctx,
  batch: ClaimedBatch,
  delayMs: number,
  message: string,
  opts: { refundAttempt?: boolean } = {},
) {
  await ctx.db.marketingCampaignBatch.updateMany({
    where: heldBy(batch),
    data: {
      status: "PENDING" satisfies CampaignBatchStatus,
      leaseUntil: null,
      notBefore: new Date(ctx.now().getTime() + delayMs),
      lastError: message,
      ...(opts.refundAttempt ? { attempts: { decrement: 1 } } : {}),
    },
  });
}

/** Cancels a batch we hold the lease on, and its rows, without sending. */
async function cancelClaimedBatch(ctx: Ctx, batch: ClaimedBatch) {
  await ctx.db.$transaction(async (tx) => {
    const { count } = await tx.marketingCampaignBatch.updateMany({
      where: heldBy(batch),
      data: {
        status: "CANCELED" satisfies CampaignBatchStatus,
        leaseUntil: null,
        notBefore: null,
      },
    });
    if (count === 0) return;
    await tx.marketingCampaignRecipient.updateMany({
      where: {
        campaignId: ctx.campaign.id,
        batchIndex: batch.batchIndex,
        status: { in: ["PENDING", "SENDING"] },
      },
      data: { status: "CANCELED" satisfies CampaignRecipientStatus },
    });
  });
}

/** Permanently fails the batch and every row still waiting in it. */
async function failBatch(ctx: Ctx, batch: ClaimedBatch, message: string) {
  await ctx.db.$transaction(async (tx) => {
    const { count } = await tx.marketingCampaignBatch.updateMany({
      where: heldBy(batch),
      data: {
        status: "FAILED" satisfies CampaignBatchStatus,
        leaseUntil: null,
        lastError: message,
      },
    });
    if (count === 0) return;
    await tx.marketingCampaignRecipient.updateMany({
      where: {
        campaignId: ctx.campaign.id,
        batchIndex: batch.batchIndex,
        status: { in: ["PENDING", "SENDING"] },
      },
      data: {
        status: "FAILED" satisfies CampaignRecipientStatus,
        error: message,
      },
    });
  });
}

// ─── Campaign-level transitions ──────────────────────────────────────────────

/**
 * Once no batch is PENDING or SENDING: SENDING → SENT, or FAILED when batches
 * failed and not a single email was accepted. Compare-and-set, so a cancel
 * that landed first wins.
 */
export async function finalizeCampaign(
  db: DbClient,
  campaignId: string,
  now: Date = new Date(),
) {
  const [open, failedBatch, accepted] = await Promise.all([
    db.marketingCampaignBatch.count({
      where: { campaignId, status: { in: ["PENDING", "SENDING"] } },
    }),
    db.marketingCampaignBatch.findFirst({
      where: { campaignId, status: "FAILED" },
      select: { lastError: true },
      orderBy: { batchIndex: "asc" },
    }),
    db.marketingCampaignRecipient.count({
      where: { campaignId, status: { in: [...ACCEPTED_RECIPIENT_STATUSES] } },
    }),
  ]);
  if (open > 0) return;

  const failed = accepted === 0 && failedBatch !== null;
  await db.marketingCampaign.updateMany({
    where: { id: campaignId, status: { in: [...ACTIVE_CAMPAIGN_STATUSES] } },
    data: {
      status: failed ? "FAILED" : "SENT",
      completedAt: now,
      lastError: failed
        ? (failedBatch.lastError ?? "No emails could be sent")
        : null,
    },
  });
}

/**
 * Cancels everything of a canceled campaign that hasn't gone out: PENDING
 * batches (including ones backing off) and their rows. A batch mid-send keeps
 * its lease and finishes; one whose lease expired (its worker died mid-send)
 * is failed as outcome-unknown so it doesn't sit in SENDING forever. Shared
 * by `cancelCampaign` and the worker's own cancel check.
 */
export async function cancelPendingWork(
  db: DbClient,
  campaignId: string,
  now: Date = new Date(),
) {
  await db.$transaction(async (tx) => {
    await tx.marketingCampaignBatch.updateMany({
      where: { campaignId, status: "PENDING" },
      data: {
        status: "CANCELED" satisfies CampaignBatchStatus,
        notBefore: null,
      },
    });
    await tx.marketingCampaignBatch.updateMany({
      where: { campaignId, status: "SENDING", leaseUntil: { lt: now } },
      data: {
        status: "FAILED" satisfies CampaignBatchStatus,
        leaseUntil: null,
        lastError: UNKNOWN_OUTCOME_ON_CANCEL,
      },
    });
    const closed = await tx.marketingCampaignBatch.findMany({
      where: { campaignId, status: { in: ["CANCELED", "FAILED"] } },
      select: { batchIndex: true, status: true },
    });
    const indexesWith = (status: CampaignBatchStatus) =>
      closed.filter((b) => b.status === status).map((b) => b.batchIndex);
    await tx.marketingCampaignRecipient.updateMany({
      where: {
        campaignId,
        batchIndex: { in: indexesWith("CANCELED") },
        status: { in: ["PENDING", "SENDING"] },
      },
      data: { status: "CANCELED" satisfies CampaignRecipientStatus },
    });
    await tx.marketingCampaignRecipient.updateMany({
      where: {
        campaignId,
        batchIndex: { in: indexesWith("FAILED") },
        status: { in: ["PENDING", "SENDING"] },
      },
      data: {
        status: "FAILED" satisfies CampaignRecipientStatus,
        error: UNKNOWN_OUTCOME_ON_CANCEL,
      },
    });
  });
}

// ─── Cron entry point ────────────────────────────────────────────────────────

/**
 * Cron: resumes every QUEUED / SENDING campaign, oldest first, within one
 * shared time budget. Covers drains cut short by a crash, deploy, deadline,
 * expired lease, or a flag that was off. Per-campaign failures are isolated.
 * Returns the number of batches sent.
 *
 * Campaigns of a store that is suspended / closed or has the flag off are left
 * out of the query (drainCampaign would only pause them), so they can't fill
 * the `take` window and starve sendable campaigns. `emailMarketing` has no
 * registry dependencies and defaults off, so a stored `true` is exactly
 * "enabled"; drainCampaign re-checks through `resolveFlags` anyway.
 */
export async function resumeMarketingCampaigns(
  db: DbClient,
  opts: { budgetMs: number } & Omit<DrainOptions, "deadlineMs">,
): Promise<number> {
  const startedAt = Date.now();
  const campaigns = await db.marketingCampaign.findMany({
    where: {
      status: { in: [...ACTIVE_CAMPAIGN_STATUSES] },
      business: {
        status: ACTIVE_BUSINESS_STATUS,
        featureFlags: { path: ["emailMarketing"], equals: true },
      },
    },
    select: { id: true },
    orderBy: [{ queuedAt: "asc" }, { id: "asc" }],
    take: 50,
  });

  let sent = 0;
  for (const { id } of campaigns) {
    const remaining = opts.budgetMs - (Date.now() - startedAt);
    if (remaining <= 0) break;
    try {
      const result = await drainCampaign(db, id, {
        ...opts,
        deadlineMs: remaining,
      });
      sent += result.batchesSent;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { "cron.job": "marketing-campaigns" },
        extra: { campaignId: id },
      });
    }
  }
  return sent;
}
