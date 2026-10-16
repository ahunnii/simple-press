import type { MarketingSuppressionReason } from "~/lib/marketing/consent";
import type { DbClient } from "~/server/db";
import { recordConsentEvent } from "~/lib/marketing/consent-log";

/**
 * Applies a verified Resend webhook event to the campaign-recipient row it
 * belongs to (and, for hard failures, to the customer behind it).
 *
 * Called by `src/app/api/webhooks/resend/route.ts` AFTER signature
 * verification. The DB is passed in so the logic is unit-testable with a fake.
 *
 * ── Which events we care about ────────────────────────────────────────────
 * Only emails the campaign worker tagged `category=marketing_broadcast`.
 * Transactional mail (order confirmations, invoices, auth) shares the same
 * Resend account and webhook endpoint; those events return before any DB
 * access. Resend documents `data.tags` as an object map
 * (`{ category: "marketing_broadcast" }`), but the send API takes an array of
 * `{ name, value }`, so both shapes are accepted.
 *
 * ── Recipient status precedence ───────────────────────────────────────────
 * Resend does not guarantee delivery order (a `delivered` can arrive after a
 * `bounced` for the same email, and any event can be re-delivered), so status
 * only ever moves "up":
 *
 *     PENDING = SENDING  <  SENT  <  DELIVERED  <  BOUNCED  <  COMPLAINED
 *
 *   - BOUNCED outranks DELIVERED: a late `delivered` never hides a bounce.
 *   - COMPLAINED outranks everything: a complaint is the strongest signal and
 *     the one with compliance consequences.
 *   - FAILED (Resend could not send it at all) can only be entered from
 *     PENDING / SENDING / SENT. A failure report after DELIVERED / BOUNCED /
 *     COMPLAINED is contradicted by stronger evidence and is ignored.
 *     Conversely DELIVERED / BOUNCED / COMPLAINED may replace FAILED: each of
 *     them proves the message actually reached a receiving server.
 *   - SKIPPED / CANCELED rows were never handed to Resend (they have no
 *     `resendId`), so no event can move them; they are excluded from every
 *     allowed-from set anyway as a second guard.
 *
 * Each transition is a conditional `updateMany` (`status IN allowedFrom`), so a
 * re-delivered event, or one that lost the race to a stronger one, matches
 * zero rows and changes nothing. The customer-side effects (suppression,
 * opt-out) are separately conditional and are applied even when the recipient
 * row did not move, e.g. a hard bounce arriving after a complaint still
 * suppresses. Everything is therefore safe to retry, which the route relies on
 * by answering 500 on unexpected errors so Resend redelivers.
 *
 * Every write is scoped by the row id AND the recipient's own `businessId`;
 * customer writes by `{ id: customerId, businessId }`.
 *
 * ── Finding the recipient ─────────────────────────────────────────────────
 * Normally by `resendId = data.email_id`. But the worker stores the ids only
 * after `resend.batch.send` returns, so an early event (`email.sent`, a fast
 * `delivered` or bounce) can beat that commit. In that case the signed tags
 * (`campaign`, `business`) plus `data.to[0]` identify the row: same campaign,
 * same business, same address. Customer emails are stored as entered (not
 * normalized), so the address is compared trimmed and case-insensitively, and
 * an ambiguous match (two rows differing only in case, none exact) is skipped.
 * A matched row whose `resendId` is still null gets this id via a conditional
 * `updateMany ... WHERE resendId IS NULL`, so it can never clobber or collide
 * with the worker's own write; a row that already holds a different id belongs
 * to a different Resend email and is left alone. The worker's own write is
 * `WHERE status = 'SENDING'`, so it also cannot downgrade a row this handler
 * has already moved to DELIVERED/BOUNCED/COMPLAINED.
 */

export const MARKETING_TAG_CATEGORY = "marketing_broadcast";

export type RecipientStatus =
  | "PENDING"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "BOUNCED"
  | "COMPLAINED"
  | "FAILED"
  | "SKIPPED"
  | "CANCELED";

/** The states an event-driven transition may move a recipient INTO. */
export type EventTargetStatus =
  | "DELIVERED"
  | "BOUNCED"
  | "COMPLAINED"
  | "FAILED";

/**
 * For each target, the statuses a recipient may currently be in for the move
 * to happen. A status absent from the list (including the target itself) means
 * "stay put". See the precedence notes above.
 */
export const ALLOWED_FROM: Record<
  EventTargetStatus,
  readonly RecipientStatus[]
> = {
  DELIVERED: ["PENDING", "SENDING", "SENT", "FAILED"],
  BOUNCED: ["PENDING", "SENDING", "SENT", "DELIVERED", "FAILED"],
  COMPLAINED: ["PENDING", "SENDING", "SENT", "DELIVERED", "BOUNCED", "FAILED"],
  FAILED: ["PENDING", "SENDING", "SENT"],
};

/** Statuses whose `error` a transient-bounce note may still be written to. */
const TRANSIENT_NOTE_FROM: readonly RecipientStatus[] = [
  "PENDING",
  "SENDING",
  "SENT",
  "DELIVERED",
  "FAILED",
];

export function canTransition(from: string, to: EventTargetStatus): boolean {
  return (ALLOWED_FROM[to] as readonly string[]).includes(from);
}

/**
 * The verified payload, typed loosely on purpose: the SDK's
 * `WebhookEventPayload` is assignable to it, and it also tolerates the array
 * form of `tags` and fields the SDK types do not list yet.
 */
export type ResendWebhookEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    tags?: unknown;
    to?: unknown;
    bounce?: { type?: string; subType?: string; message?: string };
    failed?: { reason?: string };
    suppressed?: { type?: string; message?: string };
  };
};

export type ResendEventsDb = Pick<
  DbClient,
  "marketingCampaignRecipient" | "customer" | "$transaction"
>;

export type ApplyResendEventResult =
  | { applied: false; reason: "not-marketing" | "ignored-type" | "no-email-id" }
  | { applied: false; reason: "unknown-recipient"; emailId: string }
  | {
      applied: true;
      type: string;
      recipientId: string;
      /** Whether the recipient row itself changed. */
      recipientUpdated: boolean;
      /** Whether the customer row was suppressed by this event. */
      customerSuppressed: boolean;
      /** Found via the tag/email fallback and stamped with `data.email_id`. */
      backfilledResendId: boolean;
    };

const HANDLED_TYPES = new Set([
  "email.sent",
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.suppressed",
  "email.failed",
]);

const MAX_ERROR_LENGTH = 1000;

/** Reads a tag from either `{ name: value }` or `[{ name, value }]`. */
export function readTag(tags: unknown, name: string): string | undefined {
  if (!tags || typeof tags !== "object") return undefined;
  if (Array.isArray(tags)) {
    for (const tag of tags as unknown[]) {
      if (
        tag &&
        typeof tag === "object" &&
        (tag as { name?: unknown }).name === name
      ) {
        const value = (tag as { value?: unknown }).value;
        return typeof value === "string" ? value : undefined;
      }
    }
    return undefined;
  }
  const value = (tags as Record<string, unknown>)[name];
  return typeof value === "string" ? value : undefined;
}

export function isMarketingEvent(event: ResendWebhookEvent): boolean {
  return readTag(event.data?.tags, "category") === MARKETING_TAG_CATEGORY;
}

function eventTime(event: ResendWebhookEvent, now: Date): Date {
  const raw = event.created_at;
  if (!raw) return now;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? now : parsed;
}

function clip(text: string): string {
  return text.length > MAX_ERROR_LENGTH
    ? `${text.slice(0, MAX_ERROR_LENGTH - 1)}…`
    : text;
}

function bounceError(
  bounce: NonNullable<ResendWebhookEvent["data"]>["bounce"],
) {
  const kind = [bounce?.type, bounce?.subType].filter(Boolean).join("/");
  const message = bounce?.message?.trim();
  return clip(
    `Bounced${kind ? ` (${kind})` : ""}${message ? `: ${message}` : ""}`,
  );
}

type RecipientRef = {
  id: string;
  businessId: string;
  campaignId: string;
  customerId: string | null;
};

const RECIPIENT_SELECT = {
  id: true,
  businessId: true,
  campaignId: true,
  customerId: true,
} as const;

/** First address of `data.to` (array or bare string), trimmed. */
function firstTo(to: unknown): string | undefined {
  const raw = Array.isArray(to) ? (to as unknown[])[0] : to;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Resolves the recipient row for an event: by `resendId`, else by the
 * campaign/business tags + address (backfilling `resendId`). See "Finding the
 * recipient" in the header.
 */
async function findRecipient(
  db: ResendEventsDb,
  event: ResendWebhookEvent,
  emailId: string,
): Promise<{ recipient: RecipientRef; backfilled: boolean } | null> {
  const byId = await db.marketingCampaignRecipient.findUnique({
    where: { resendId: emailId },
    select: RECIPIENT_SELECT,
  });
  if (byId) return { recipient: byId, backfilled: false };

  const campaignId = readTag(event.data?.tags, "campaign");
  const businessId = readTag(event.data?.tags, "business");
  const to = firstTo(event.data?.to);
  if (!campaignId || !businessId || !to) return null;

  const lowered = to.toLowerCase();
  // `mode: "insensitive"` narrows in SQL; the exact comparison below makes the
  // match independent of how the driver treats LIKE wildcards (`_`, `%`).
  const candidates = (
    await db.marketingCampaignRecipient.findMany({
      where: {
        campaignId,
        businessId,
        email: { equals: to, mode: "insensitive" },
      },
      select: { ...RECIPIENT_SELECT, email: true, resendId: true },
      take: 10,
    })
  ).filter((c) => c.email.trim().toLowerCase() === lowered);
  const row =
    candidates.length === 1
      ? candidates[0]
      : candidates.find((c) => c.email.trim() === to);
  // A row that already holds another id is a different Resend email.
  if (row?.resendId !== null) return null;

  const recipient: RecipientRef = {
    id: row.id,
    businessId: row.businessId,
    campaignId: row.campaignId,
    customerId: row.customerId,
  };
  try {
    const { count } = await db.marketingCampaignRecipient.updateMany({
      where: { id: row.id, businessId: row.businessId, resendId: null },
      data: { resendId: emailId },
    });
    if (count > 0) return { recipient, backfilled: true };
  } catch (err) {
    // Another row took this id meanwhile (the unique index): that row is the
    // one this event belongs to.
    if (!isUniqueViolation(err)) throw err;
    const owner = await db.marketingCampaignRecipient.findUnique({
      where: { resendId: emailId },
      select: RECIPIENT_SELECT,
    });
    return owner ? { recipient: owner, backfilled: false } : null;
  }

  // Lost the race to the worker's write: proceed only if it stored this id.
  const fresh = await db.marketingCampaignRecipient.findUnique({
    where: { id: row.id },
    select: { resendId: true },
  });
  return fresh?.resendId === emailId ? { recipient, backfilled: false } : null;
}

export async function applyResendEvent(
  db: ResendEventsDb,
  event: ResendWebhookEvent,
  opts: { now?: Date } = {},
): Promise<ApplyResendEventResult> {
  // Fast path: no DB access for anything we didn't send as a campaign.
  if (!isMarketingEvent(event))
    return { applied: false, reason: "not-marketing" };
  if (!HANDLED_TYPES.has(event.type)) {
    return { applied: false, reason: "ignored-type" };
  }
  const emailId = event.data?.email_id;
  if (!emailId) return { applied: false, reason: "no-email-id" };

  const found = await findRecipient(db, event, emailId);
  if (!found) return { applied: false, reason: "unknown-recipient", emailId };
  const { recipient, backfilled } = found;

  const now = opts.now ?? new Date();
  const at = eventTime(event, now);
  const { id, businessId, campaignId, customerId } = recipient;

  const moveTo = async (
    target: EventTargetStatus,
    data: {
      deliveredAt?: Date;
      bouncedAt?: Date;
      complainedAt?: Date;
      error?: string;
    },
  ): Promise<boolean> => {
    const { count } = await db.marketingCampaignRecipient.updateMany({
      where: { id, businessId, status: { in: [...ALLOWED_FROM[target]] } },
      data: { status: target, ...data },
    });
    return count > 0;
  };

  /**
   * Suppress the customer (conditional on not already suppressed) and, in the
   * same transaction, log the SUPPRESSED consent event for the change.
   */
  const suppress = async (
    reason: MarketingSuppressionReason,
  ): Promise<boolean> => {
    if (!customerId) return false;
    return db.$transaction(async (tx) => {
      const { count } = await tx.customer.updateMany({
        where: { id: customerId, businessId, marketingSuppressedAt: null },
        data: {
          marketingSuppressedAt: now,
          marketingSuppressionReason: reason,
        },
      });
      if (count > 0) {
        await recordConsentEvent(tx, {
          businessId,
          customerId,
          type: "SUPPRESSED",
          source: reason,
          campaignId,
        });
      }
      return count > 0;
    });
  };

  let recipientUpdated = false;
  let customerSuppressed = false;

  switch (event.type) {
    case "email.sent": {
      const { count } = await db.marketingCampaignRecipient.updateMany({
        where: { id, businessId, sentAt: null },
        data: { sentAt: at },
      });
      recipientUpdated = count > 0;
      break;
    }

    case "email.delivered": {
      recipientUpdated = await moveTo("DELIVERED", { deliveredAt: at });
      break;
    }

    case "email.bounced": {
      const bounce = event.data?.bounce;
      const error = bounceError(bounce);
      if (bounce?.type === "Permanent") {
        recipientUpdated = await moveTo("BOUNCED", { bouncedAt: at, error });
        customerSuppressed = await suppress("HARD_BOUNCE");
      } else {
        // Transient / Undetermined: the mailbox may accept a later send. Keep
        // the note for the owner, change nothing else, and never overwrite the
        // reason on a row that already bounced hard or complained.
        const { count } = await db.marketingCampaignRecipient.updateMany({
          where: { id, businessId, status: { in: [...TRANSIENT_NOTE_FROM] } },
          data: { error },
        });
        recipientUpdated = count > 0;
      }
      break;
    }

    case "email.suppressed": {
      // Resend refused to send because the address is on its own suppression
      // list (an earlier hard bounce or complaint, possibly from another
      // store): treat as a bounce.
      const message = event.data?.suppressed?.message?.trim();
      recipientUpdated = await moveTo("BOUNCED", {
        bouncedAt: at,
        error: clip(
          `Suppressed by email provider${message ? `: ${message}` : ""}`,
        ),
      });
      customerSuppressed = await suppress("PROVIDER_SUPPRESSED");
      break;
    }

    case "email.complained": {
      recipientUpdated = await moveTo("COMPLAINED", { complainedAt: at });
      if (customerId) {
        // One transaction, one event: the complaint both opts the customer out
        // and suppresses them, and a single SUPPRESSED/COMPLAINT row records
        // it. Logged only when the complaint changed something (a redelivery
        // matches nothing and logs nothing).
        customerSuppressed = await db.$transaction(async (tx) => {
          const scope = { id: customerId, businessId };
          const optedOut = await tx.customer.updateMany({
            where: { ...scope, acceptsMarketing: true },
            data: { acceptsMarketing: false },
          });
          await tx.customer.updateMany({
            where: { ...scope, marketingUnsubscribedAt: null },
            data: { marketingUnsubscribedAt: now },
          });
          const suppressed = await tx.customer.updateMany({
            where: { ...scope, marketingSuppressedAt: null },
            data: {
              marketingSuppressedAt: now,
              marketingSuppressionReason: "COMPLAINT",
            },
          });
          if (optedOut.count > 0 || suppressed.count > 0) {
            await recordConsentEvent(tx, {
              businessId,
              customerId,
              type: "SUPPRESSED",
              source: "COMPLAINT",
              campaignId,
            });
          }
          return suppressed.count > 0;
        });
      }
      break;
    }

    case "email.failed": {
      const reason = event.data?.failed?.reason?.trim();
      recipientUpdated = await moveTo("FAILED", {
        error: clip(`Send failed${reason ? `: ${reason}` : ""}`),
      });
      break;
    }
  }

  return {
    applied: true,
    type: event.type,
    recipientId: id,
    recipientUpdated,
    customerSuppressed,
    backfilledResendId: backfilled,
  };
}
