import type { JSONContent } from "@tiptap/core";
import * as Sentry from "@sentry/nextjs";

import type { LoadedCampaignBusiness } from "./campaign-business";
import type { CampaignKind } from "./campaign-status";
import type { Audience } from "./segments";
import type { DbClient } from "~/server/db";

import {
  marketingAudienceWhere,
  repermissionAudienceWhere,
  withoutDoNotEmail,
} from "./audience";
import {
  BATCH_SIZE,
  isBusinessActive,
  isBusinessSendable,
  loadCampaignBusiness,
  marketingFromAddress,
  SENDABLE_BUSINESS_WHERE,
  storedBodyJson,
} from "./campaign-business";
import { hydrateEmailProducts } from "./email-products";
import {
  CONFIRM_TOKEN_PLACEHOLDER,
  getBusinessPostalAddress,
  renderCampaign,
} from "./render-campaign";
import { parseStoredAudience } from "./segments";
import { tiptapHasContent } from "./tiptap-to-email";

/**
 * Turning a campaign into sendable work: validate it, freeze its render,
 * snapshot the audience into recipient + batch rows, and move it to QUEUED —
 * all behind one compare-and-set on its status. Shared by the router's
 * `sendCampaign` (DRAFT → QUEUED) and the cron sweep for scheduled sends
 * (SCHEDULED → QUEUED, `queueDueScheduledCampaigns`), so a concurrent
 * unschedule, a second sweep, or a double click can never queue a campaign
 * twice: exactly one CAS wins, and the loser's transaction rolls back.
 */

/** Recipient rows per `createMany` when snapshotting the audience. */
const SNAPSHOT_CHUNK = 1000;

/** How long a scheduled campaign of a paused store waits before failing. */
export const PAUSED_SCHEDULE_GRACE_MS = 24 * 60 * 60_000;

/** Statuses a campaign may be queued from. */
export type QueueableStatus = "DRAFT" | "SCHEDULED";

/** Why a campaign can't be sent, as checked before send / schedule / queue. */
export type SendBlocker =
  | "no_postal_address"
  | "invalid_audience"
  | "empty_body"
  | "empty_product_block";

export type QueueCampaignFailureReason =
  | "not_found"
  | "business_not_found"
  | "status_changed"
  /** The campaign's `kind` isn't the one the caller queues (see `kind`). */
  | "wrong_kind"
  | SendBlocker;

export type QueueCampaignResult =
  | {
      ok: true;
      campaignId: string;
      recipientCount: number;
      /** Nobody matched: the campaign went straight to SENT. */
      sentImmediately: boolean;
      /**
       * A SCHEDULED campaign whose audience was empty at send time: it was
       * marked FAILED (`NO_RECIPIENTS_SCHEDULE_ERROR`) with nothing created.
       * Never set for a manual send (DRAFT), which the UI blocks at zero.
       */
      failedNoRecipients: boolean;
    }
  | {
      ok: false;
      reason: QueueCampaignFailureReason;
      /** The campaign's status when it wasn't `expectStatus` (status_changed). */
      status?: string;
    };

export type PreparedCampaignBody = {
  bodyJson: JSONContent | null;
  /** Non-blocking notes for the owner (e.g. "1 product is out of stock"). */
  warnings: string[];
  /** Product blocks left with nothing to show; any > 0 blocks the send. */
  emptyProductBlocks: number;
};

/**
 * Resolves dynamic body content at send time: product blocks are rebuilt from
 * the store's current published products (name, price, photo, link) — the
 * editor's snapshot is never trusted. Blocks left with no products are counted
 * in `emptyProductBlocks`, which blocks the send.
 */
export async function prepareCampaignBody(
  db: DbClient,
  businessId: string,
  bodyJson: JSONContent | null,
): Promise<PreparedCampaignBody> {
  if (!bodyJson) return { bodyJson, warnings: [], emptyProductBlocks: 0 };
  const hydrated = await hydrateEmailProducts(db, businessId, bodyJson);
  return {
    bodyJson: hydrated.doc,
    warnings: hydrated.warnings,
    emptyProductBlocks: hydrated.emptyProductBlocks,
  };
}

/** The campaign fields a send needs. */
const QUEUE_CAMPAIGN_SELECT = {
  id: true,
  businessId: true,
  status: true,
  subject: true,
  previewText: true,
  contentFormat: true,
  bodyText: true,
  bodyJson: true,
  audience: true,
  kind: true,
  importId: true,
} as const;

type SendableCampaign = {
  contentFormat: string;
  bodyText: string | null;
  bodyJson: unknown;
  /** The stored `MarketingCampaign.audience` (null = everyone opted in). */
  audience: unknown;
};

export type SendCheck =
  | {
      ok: true;
      isTiptap: boolean;
      prepared: PreparedCampaignBody;
      /** The stored segment, validated strictly (`parseStoredAudience`). */
      audience: Audience;
    }
  | { ok: false; reason: SendBlocker };

/**
 * The checks every send path runs before anything is frozen: a postal
 * address (CAN-SPAM), a stored segment that still parses (never widened to
 * everyone), no empty product blocks, and a non-empty body. Used by
 * `queueCampaign` and by `scheduleCampaign` (which checks at schedule time
 * and again — through `queueCampaign` — when the campaign comes due).
 *
 * The body checks run on the HYDRATED body (product blocks rebuilt from the
 * store), never on the editor's snapshot: blocks left with nothing to show
 * are `empty_product_block`; otherwise a body with nothing in it is
 * `empty_body`.
 */
export async function checkCampaignSendable(
  db: DbClient,
  businessId: string,
  business: LoadedCampaignBusiness,
  campaign: SendableCampaign,
): Promise<SendCheck> {
  if (getBusinessPostalAddress(business) === null) {
    return { ok: false, reason: "no_postal_address" };
  }
  const audience = parseStoredAudience(campaign.audience);
  if (!audience.ok) return { ok: false, reason: "invalid_audience" };

  const isTiptap = campaign.contentFormat === "tiptap";
  if (!isTiptap) {
    if (!campaign.bodyText?.trim()) return { ok: false, reason: "empty_body" };
    return {
      ok: true,
      isTiptap,
      prepared: { bodyJson: null, warnings: [], emptyProductBlocks: 0 },
      audience: audience.audience,
    };
  }

  const prepared = await prepareCampaignBody(
    db,
    businessId,
    storedBodyJson(campaign.bodyJson),
  );
  if (prepared.emptyProductBlocks > 0) {
    return { ok: false, reason: "empty_product_block" };
  }
  if (!tiptapHasContent(prepared.bodyJson)) {
    return { ok: false, reason: "empty_body" };
  }
  return { ok: true, isTiptap, prepared, audience: audience.audience };
}

/**
 * Footer line of a re-permission invite: its recipients have NOT opted in
 * here, so the standard "you opted in" line would be false.
 */
export function repermissionFooterReason(businessName: string): string {
  return `You received this one-time email because you were on ${businessName}'s email list before it moved to a new website.`;
}

/** Thrown inside the queue transaction to roll it back when the CAS loses. */
class StatusChangedError extends Error {}

/**
 * Queues a campaign that is currently `expectStatus`: validates it, freezes
 * the render, snapshots the audience (the segment is applied here, at queue
 * time), creates the batch rows, and moves it to QUEUED (or straight to SENT
 * when nobody matches a manual send; a SCHEDULED campaign nobody matches is
 * FAILED instead, so the owner hears about it). Never starts the drain — the
 * caller does.
 *
 * Tenant-scoped: a campaign of another business is `not_found`.
 *
 * `kind` (default STANDARD) must match the campaign's, else `wrong_kind`: the
 * composer's send and the scheduled sweep can never queue a re-permission
 * invite, and `queueRepermissionInvite` can never queue a standard campaign.
 * A REPERMISSION campaign snapshots `repermissionAudienceWhere` for its import
 * minus the do-not-email list (its stored segment is ignored), and its render
 * must carry the per-recipient confirm-token placeholder.
 */
export async function queueCampaign(
  db: DbClient,
  args: {
    campaignId: string;
    businessId: string;
    expectStatus: QueueableStatus;
    kind?: CampaignKind;
    now?: Date;
  },
): Promise<QueueCampaignResult> {
  const { campaignId, businessId, expectStatus } = args;
  const campaign = await db.marketingCampaign.findFirst({
    where: { id: campaignId, businessId },
    select: QUEUE_CAMPAIGN_SELECT,
  });
  if (!campaign) return { ok: false, reason: "not_found" };
  if (campaign.status !== expectStatus) {
    return { ok: false, reason: "status_changed", status: campaign.status };
  }
  if (campaign.kind !== (args.kind ?? "STANDARD")) {
    return { ok: false, reason: "wrong_kind" };
  }
  const inviteImportId =
    campaign.kind === "REPERMISSION" ? campaign.importId : null;
  if (campaign.kind === "REPERMISSION" && !inviteImportId) {
    return { ok: false, reason: "invalid_audience" };
  }

  const business = await loadCampaignBusiness(db, businessId);
  if (!business) return { ok: false, reason: "business_not_found" };

  const check = await checkCampaignSendable(db, businessId, business, campaign);
  if (!check.ok) return { ok: false, reason: check.reason };

  const rendered = await renderCampaign({
    business,
    subject: campaign.subject,
    previewText: campaign.previewText,
    contentFormat: check.isTiptap ? "tiptap" : "text",
    bodyText: campaign.bodyText,
    bodyJson: check.prepared.bodyJson,
    ...(inviteImportId
      ? { footerReason: repermissionFooterReason(business.name) }
      : {}),
  });
  // The invite's button is its whole point: never send one whose link was
  // dropped (e.g. an unusable store URL made the walker discard it).
  if (
    inviteImportId &&
    !(
      rendered.html.includes(CONFIRM_TOKEN_PLACEHOLDER) &&
      rendered.text.includes(CONFIRM_TOKEN_PLACEHOLDER)
    )
  ) {
    throw new Error("Re-permission invite render is missing its confirm link");
  }

  try {
    const outcome = await db.$transaction(
      async (tx) => {
        const now = args.now ?? new Date();
        // The recipient snapshot. Ordered by id so batch membership is
        // deterministic; the worker re-checks each row on first claim.
        // The segment is applied here, once; the worker only re-checks
        // consent/suppression. Read before the CAS so a scheduled campaign
        // nobody matches can be failed without freezing anything.
        const audience = inviteImportId
          ? await withoutDoNotEmail(
              tx,
              businessId,
              await tx.customer.findMany({
                where: repermissionAudienceWhere(businessId, inviteImportId),
                select: { id: true, email: true },
                orderBy: { id: "asc" },
              }),
            )
          : await tx.customer.findMany({
              where: marketingAudienceWhere(businessId, check.audience, now),
              select: { id: true, email: true },
              orderBy: { id: "asc" },
            });

        // A scheduled send nobody is left to receive is a failure the owner
        // should see (the list shrank, or the segment emptied, since they
        // scheduled it) — not a silent "sent to 0". Same CAS as the queue
        // below; no render is stored and no recipient/batch rows exist.
        if (expectStatus === "SCHEDULED" && audience.length === 0) {
          const { count: failedCount } = await tx.marketingCampaign.updateMany({
            where: {
              id: campaign.id,
              businessId,
              status: "SCHEDULED",
              scheduledAt: { lte: now },
            },
            data: {
              status: "FAILED",
              completedAt: now,
              recipientCount: 0,
              lastError: NO_RECIPIENTS_SCHEDULE_ERROR,
            },
          });
          if (failedCount === 0) throw new StatusChangedError();
          return { recipientCount: 0, failedNoRecipients: true };
        }

        // Compare-and-set: exactly one of send / sweep / unschedule wins. A
        // scheduled campaign must also still be due: one unscheduled, edited
        // and rescheduled for later while this render ran is left alone (it
        // goes out at its new time, with its new content).
        const { count } = await tx.marketingCampaign.updateMany({
          where: {
            id: campaign.id,
            businessId,
            status: expectStatus,
            ...(expectStatus === "SCHEDULED"
              ? { scheduledAt: { lte: now } }
              : {}),
          },
          data: {
            status: "QUEUED",
            queuedAt: now,
            scheduledAt: null,
            // A retry note from an earlier failed sweep attempt is moot now.
            lastError: null,
            renderedHtml: rendered.html,
            renderedText: rendered.text,
            fromAddress: marketingFromAddress(business.name),
            replyTo: business.ownerEmail,
            baseUrl: business.baseUrl,
          },
        });
        if (count === 0) throw new StatusChangedError();

        for (let i = 0; i < audience.length; i += SNAPSHOT_CHUNK) {
          await tx.marketingCampaignRecipient.createMany({
            data: audience.slice(i, i + SNAPSHOT_CHUNK).map((c, j) => ({
              campaignId: campaign.id,
              businessId,
              customerId: c.id,
              email: c.email,
              batchIndex: Math.floor((i + j) / BATCH_SIZE),
            })),
            skipDuplicates: true,
          });
        }
        const batchCount = Math.ceil(audience.length / BATCH_SIZE);
        if (batchCount > 0) {
          await tx.marketingCampaignBatch.createMany({
            data: Array.from({ length: batchCount }, (_, batchIndex) => ({
              campaignId: campaign.id,
              businessId,
              batchIndex,
            })),
          });
        }

        await tx.marketingCampaign.update({
          where: { id: campaign.id },
          data: {
            recipientCount: audience.length,
            // Nobody to send to (a manual send): done already.
            ...(audience.length === 0
              ? { status: "SENT", completedAt: now }
              : {}),
          },
        });
        return { recipientCount: audience.length, failedNoRecipients: false };
      },
      // Large lists: tens of thousands of rows inserted in one transaction.
      { timeout: 60_000, maxWait: 10_000 },
    );
    return {
      ok: true,
      campaignId: campaign.id,
      recipientCount: outcome.recipientCount,
      sentImmediately:
        outcome.recipientCount === 0 && !outcome.failedNoRecipients,
      failedNoRecipients: outcome.failedNoRecipients,
    };
  } catch (err) {
    if (err instanceof StatusChangedError) {
      const current = await db.marketingCampaign.findUnique({
        where: { id: campaign.id },
        select: { status: true },
      });
      return current
        ? { ok: false, reason: "status_changed", status: current.status }
        : { ok: false, reason: "not_found" };
    }
    throw err;
  }
}

// ─── Scheduled-send sweep (cron) ─────────────────────────────────────────────

export const PAUSED_STORE_SCHEDULE_ERROR =
  "The store was paused when this campaign was scheduled to send.";

/** `lastError` when the `emailMarketing` flag was off at the scheduled time. */
export const EMAIL_MARKETING_OFF_SCHEDULE_ERROR =
  "Email marketing was turned off when this campaign was scheduled to send. Turn it back on, then duplicate the campaign to send it.";

/** `lastError` when a scheduled send had no audience left at send time. */
export const NO_RECIPIENTS_SCHEDULE_ERROR =
  "No one matched this campaign's audience when it was time to send, so nothing went out.";

/** `lastError` for a scheduled campaign that fails a check when it comes due. */
export const SCHEDULED_SEND_BLOCKED_ERRORS: Record<SendBlocker, string> = {
  no_postal_address:
    "Not sent: the business address was missing at the scheduled time. Marketing emails must include a postal address — add a full address in Settings and send it again.",
  invalid_audience:
    "Not sent: this campaign's audience was no longer valid at the scheduled time. Duplicate it, pick the audience again, and send it.",
  empty_body: "Not sent: the message was empty at the scheduled time.",
  empty_product_block:
    "Not sent: a product block in the message had no products left to show at the scheduled time (they were removed, hidden, or the shop is turned off).",
};

const SCHEDULED_SEND_GENERIC_ERROR =
  "Not sent: this campaign couldn't be queued at its scheduled time.";

/**
 * `lastError` on a campaign that is still SCHEDULED after a sweep attempt
 * threw (a database hiccup, a render bug): the sweep will try again. Also the
 * marker for "a previous attempt already threw" — `scheduleCampaign` clears
 * `lastError`, so on a SCHEDULED campaign it can only come from here.
 */
export const SCHEDULED_SEND_RETRY_ERROR =
  "Not sent yet: something went wrong at the scheduled time. We'll keep trying for a while.";

/** `lastError` once a scheduled campaign that keeps throwing is given up on. */
export const SCHEDULED_SEND_GAVE_UP_ERROR =
  "We couldn't send this campaign. Duplicate it and try again, or contact support.";

/** A campaign that threw again is failed once it is this overdue. */
export const SCHEDULED_RETRY_GRACE_MS = 60 * 60_000;

/**
 * CAS SCHEDULED → FAILED. False when the campaign already moved on. With
 * `scheduledAt`, also only while it is still scheduled for that time (not
 * unscheduled and rescheduled meanwhile).
 */
async function failScheduled(
  db: DbClient,
  campaignId: string,
  lastError: string,
  now: Date,
  scheduledAt?: Date | null,
): Promise<boolean> {
  const { count } = await db.marketingCampaign.updateMany({
    where: {
      id: campaignId,
      status: "SCHEDULED",
      ...(scheduledAt !== undefined ? { scheduledAt } : {}),
    },
    data: { status: "FAILED", completedAt: now, lastError },
  });
  return count > 0;
}

export type ScheduledSweepResult = {
  /** Campaigns moved to QUEUED. */
  queued: string[];
  /** Campaigns moved to FAILED (paused / switched off too long, a failed check, no recipients, or gave up). */
  failed: string[];
};

/**
 * A sweep attempt threw. Gives up (FAILED, generic message) when the campaign
 * is more than 24h overdue, or when an earlier attempt already threw and it
 * is more than 1h overdue; otherwise records the retry note and leaves it
 * SCHEDULED for the next run. Both writes are CAS on SCHEDULED at the same
 * `scheduledAt`, so a concurrent unschedule / reschedule / queue wins. Returns true when it was failed.
 */
async function recordScheduledThrow(
  db: DbClient,
  campaign: { id: string; scheduledAt: Date | null; lastError: string | null },
  now: Date,
): Promise<boolean> {
  const overdueMs = campaign.scheduledAt
    ? now.getTime() - campaign.scheduledAt.getTime()
    : Number.POSITIVE_INFINITY;
  const threwBefore = campaign.lastError === SCHEDULED_SEND_RETRY_ERROR;
  if (
    overdueMs > PAUSED_SCHEDULE_GRACE_MS ||
    (threwBefore && overdueMs > SCHEDULED_RETRY_GRACE_MS)
  ) {
    return failScheduled(
      db,
      campaign.id,
      SCHEDULED_SEND_GAVE_UP_ERROR,
      now,
      campaign.scheduledAt,
    );
  }
  await db.marketingCampaign.updateMany({
    where: {
      id: campaign.id,
      status: "SCHEDULED",
      scheduledAt: campaign.scheduledAt,
    },
    data: { lastError: SCHEDULED_SEND_RETRY_ERROR },
  });
  return false;
}

/**
 * Cron: queues every SCHEDULED campaign whose `scheduledAt` has passed,
 * oldest first. Runs at the start of `resumeMarketingCampaigns`, so what it
 * queues drains in the same run.
 *
 * - A store that is not active or has `emailMarketing` off keeps its
 *   campaign SCHEDULED (it goes out late once the store is back) until it
 *   is more than 24h overdue; then it is FAILED (with a "paused" message for
 *   an inactive store, a "turned off" one for the flag).
 * - A campaign whose audience is empty when it comes due is FAILED
 *   (`NO_RECIPIENTS_SCHEDULE_ERROR`) rather than "sent to 0 people".
 * - A campaign that no longer passes the send checks (address removed, body
 *   emptied, products gone) is FAILED with a plain-language `lastError`.
 * - A campaign unscheduled concurrently simply isn't queued (the CAS in
 *   `queueCampaign` loses and nothing is written).
 *
 * - A campaign whose queueing THROWS is reported to Sentry and doesn't stop
 *   the rest. It stays SCHEDULED with a retry note in `lastError` and is
 *   retried on the next run — until it is more than 24h overdue, or it
 *   throws again more than 1h overdue; then it is FAILED with a generic
 *   message (`recordScheduledThrow`).
 *
 * `budgetMs` (wall clock, from the call) bounds the sweep: once it is spent,
 * no further campaign is started (each can hold a long transaction); the
 * rest wait for the next run.
 */
export async function queueDueScheduledCampaigns(
  db: DbClient,
  opts: { now?: Date; limit?: number; budgetMs?: number } = {},
): Promise<ScheduledSweepResult> {
  const startedAt = Date.now();
  const deadline =
    opts.budgetMs === undefined
      ? Number.POSITIVE_INFINITY
      : startedAt + opts.budgetMs;
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 20;
  const result: ScheduledSweepResult = { queued: [], failed: [] };

  // 1. Paused stores' campaigns past the grace period. Filtered in JS (the
  // same `isBusinessSendable` the worker uses) rather than with a negated
  // JSON-path filter, which would silently skip stores whose flags lack the
  // key. Rare rows, so the window is generous.
  const stale = await db.marketingCampaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lt: new Date(now.getTime() - PAUSED_SCHEDULE_GRACE_MS) },
    },
    select: {
      id: true,
      business: { select: { status: true, featureFlags: true } },
    },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    take: 100,
  });
  for (const c of stale) {
    if (isBusinessSendable(c.business)) continue; // queued below
    // A store that isn't active is "paused"; an active store that simply
    // turned email marketing off gets its own message.
    const message = isBusinessActive(c.business)
      ? EMAIL_MARKETING_OFF_SCHEDULE_ERROR
      : PAUSED_STORE_SCHEDULE_ERROR;
    try {
      if (await failScheduled(db, c.id, message, now)) {
        result.failed.push(c.id);
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { "cron.job": "marketing-campaigns" },
        extra: { campaignId: c.id, step: "fail_paused_scheduled" },
      });
    }
  }

  // 2. Due campaigns of sendable stores. Paused stores are left out of the
  // query so they can't fill the window and starve sendable ones.
  const due = await db.marketingCampaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      business: SENDABLE_BUSINESS_WHERE,
    },
    select: { id: true, businessId: true, scheduledAt: true, lastError: true },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    take: limit,
  });
  for (const c of due) {
    if (Date.now() >= deadline) break; // the rest wait for the next run
    try {
      const queued = await queueCampaign(db, {
        campaignId: c.id,
        businessId: c.businessId,
        expectStatus: "SCHEDULED",
        now,
      });
      if (queued.ok) {
        // An empty audience at send time was recorded as FAILED, not queued.
        (queued.failedNoRecipients ? result.failed : result.queued).push(c.id);
        continue;
      }
      // Unscheduled / already queued by someone else: nothing to do.
      if (queued.reason === "not_found" || queued.reason === "status_changed") {
        continue;
      }
      // `wrong_kind`: a re-permission invite is never scheduled
      // (`scheduleCampaign` refuses it); fail one that somehow is.
      const message =
        queued.reason === "business_not_found" || queued.reason === "wrong_kind"
          ? SCHEDULED_SEND_GENERIC_ERROR
          : SCHEDULED_SEND_BLOCKED_ERRORS[queued.reason];
      if (await failScheduled(db, c.id, message, now)) {
        result.failed.push(c.id);
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { "cron.job": "marketing-campaigns" },
        extra: { campaignId: c.id, step: "queue_scheduled" },
      });
      try {
        if (await recordScheduledThrow(db, c, now)) result.failed.push(c.id);
      } catch (recordErr) {
        Sentry.captureException(recordErr, {
          tags: { "cron.job": "marketing-campaigns" },
          extra: { campaignId: c.id, step: "record_scheduled_throw" },
        });
      }
    }
  }
  return result;
}
