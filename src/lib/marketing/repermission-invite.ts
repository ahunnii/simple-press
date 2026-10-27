import type { JSONContent } from "@tiptap/core";
import type { Prisma } from "generated/prisma";

import type { QueueCampaignFailureReason } from "./queue-campaign";
import type { DbClient } from "~/server/db";
import { buildNewsletterConfirmUrl } from "~/lib/email/newsletter-confirm-token";
import { isUniqueConstraintError } from "~/lib/prisma-errors";

import { repermissionAudienceWhere, withoutDoNotEmail } from "./audience";
import { isBusinessSendable, loadCampaignBusiness } from "./campaign-business";
import { REPERMISSION_CONFIRM_LABEL } from "./consent-wording";
import { queueCampaign } from "./queue-campaign";
import {
  CONFIRM_TOKEN_PLACEHOLDER,
  getBusinessPostalAddress,
} from "./render-campaign";
import { plainTextToTiptapDoc } from "./tiptap-to-email";

/**
 * A contact import's one-time re-permission invite: "Still want to hear from
 * {store}?" sent to the import's NOT-opted-in contacts, whose button links to
 * the newsletter double opt-in confirm page with an `s: "imp"` token. Only
 * the people who press it join the list (as IMPORT_CONFIRM).
 *
 * Built on the campaign machinery as a `kind: "REPERMISSION"` campaign
 * (`MarketingCampaign.importId` is unique: one invite per import, ever), so
 * throttling, batching, idempotent retries, the postal-address gate, the
 * unsubscribe link + one-click headers, and bounce / complaint handling all
 * come for free. What differs:
 *  - audience: `repermissionAudienceWhere` minus the do-not-email list, at
 *    queue time AND on each batch's first claim (`campaign-worker.ts`);
 *  - content: fixed (below), never editable through the composer;
 *  - per recipient: a confirm token minted with `iat = queuedAt`, swapped in
 *    for `CONFIRM_TOKEN_PLACEHOLDER`.
 *
 * Platform-admin-only for now; the caller (the contact-import router) does
 * the role check, then starts the drain on success
 * (`startDrainAfterResponse`), as `marketing.sendCampaign` does.
 */

/** Longest subject / owner note accepted (the composer's own limits). */
export const REPERMISSION_SUBJECT_MAX = 200;
export const REPERMISSION_NOTE_MAX = 2000;

/** The subject when none is given. */
export function defaultRepermissionSubject(businessName: string): string {
  return `Still want to hear from ${businessName}?`;
}

/**
 * The invite body as a tiptap document: rendered by the same walker, layout
 * and footer (postal address, unsubscribe link) as every campaign, and shown
 * as-is on the campaign's detail page. The owner's note goes through the
 * walker like any text, so it is escaped. The button's link is SITE-RELATIVE
 * with the token placeholder: the walker resolves it against the store URL
 * frozen at queue time, so it always points at the store the email is sent
 * from.
 */
export function repermissionInviteDoc(input: {
  businessName: string;
  note?: string | null;
}): JSONContent {
  const { businessName } = input;
  const note = plainTextToTiptapDoc(input.note).content;
  const paragraph = (text: string): JSONContent => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  });
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [
          { type: "text", text: `Still want to hear from ${businessName}?` },
        ],
      },
      paragraph(
        `${businessName} has moved to a new website. You were on our email list before the move, and we only want to keep writing to you if you'd like us to.`,
      ),
      ...note,
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          {
            type: "text",
            text: REPERMISSION_CONFIRM_LABEL,
            marks: [
              {
                type: "link",
                attrs: {
                  href: buildNewsletterConfirmUrl(
                    "",
                    CONFIRM_TOKEN_PLACEHOLDER,
                  ),
                  variant: "solid",
                },
              },
            ],
          },
        ],
      },
      paragraph(
        `If you'd rather not, you don't need to do anything: unless you press the button, you won't get marketing emails from ${businessName}. The button works for 30 days.`,
      ),
    ],
  };
}

/**
 * How many contacts the invite for this import would reach right now (the
 * admin preview): the same audience the queue snapshots. 0 when the import
 * isn't this business's.
 */
export async function repermissionInviteAudienceCount(
  db: DbClient,
  businessId: string,
  importId: string,
): Promise<number> {
  const rows = await db.customer.findMany({
    where: repermissionAudienceWhere(businessId, importId),
    select: { email: true },
  });
  return (await withoutDoNotEmail(db, businessId, rows)).length;
}

export type QueueRepermissionInviteFailureReason =
  | "import_not_found"
  /** This import already has its invite (sent, sending or canceled). */
  | "already_invited"
  | "no_recipients"
  | "no_postal_address"
  /**
   * The store is paused or has email marketing off: the send would wait and
   * the confirm page would say sign-up is unavailable.
   */
  | "marketing_off"
  /** queueCampaign refused after the campaign was created (rolled back). */
  | "not_queued";

export type QueueRepermissionInviteResult =
  | { ok: true; campaignId: string; recipientCount: number }
  | {
      ok: false;
      reason: QueueRepermissionInviteFailureReason;
      /** For `not_queued`: queueCampaign's own reason. */
      queueReason?: QueueCampaignFailureReason;
    };

/** Owner-facing messages for the router to throw (BAD_REQUEST / NOT_FOUND). */
export const REPERMISSION_INVITE_ERROR_MESSAGES: Record<
  QueueRepermissionInviteFailureReason,
  string
> = {
  import_not_found: "Import not found",
  already_invited:
    "This import's invite has already been sent. Each import gets one invite.",
  no_recipients: "Nobody from this import can be invited.",
  marketing_off:
    "Turn on email marketing for this store (and make sure the store is active) before sending the invite.",
  no_postal_address:
    "Add a full business address in Settings before sending (street, city, and state or ZIP, or a PO box) — the law requires a postal address in marketing emails.",
  not_queued: "The invite couldn't be queued. Please try again.",
};

/**
 * Creates the import's REPERMISSION campaign and queues it.
 *
 * 1. The import must belong to `businessId`.
 * 2. One invite per import, ever: an existing campaign for it refuses
 *    (`already_invited`), and so does losing the race on the unique
 *    `importId` (P2002). The one exception is a leftover DRAFT invite — a
 *    create whose queue never ran (crash) or failed — which sent nothing and
 *    is replaced.
 * 3. Refuses up front when the store can't send marketing email (paused, or
 *    the `emailMarketing` flag off), without a postal address, or with
 *    nobody to invite.
 * 4. In one transaction: stamps the attestation (wording, when, who) on the
 *    import and creates the campaign. Then queues it through `queueCampaign`
 *    (kind REPERMISSION); if that refuses or throws, the draft is deleted
 *    and the attestation cleared, so nothing claims an invite went out.
 *
 * Never starts the drain — the caller does (`startDrainAfterResponse`).
 */
export async function queueRepermissionInvite(
  db: DbClient,
  input: {
    businessId: string;
    importId: string;
    createdById: string;
    /** Trimmed; blank = `defaultRepermissionSubject`. */
    subject?: string | null;
    /** The owner's own words, plain text; blank = none. */
    note?: string | null;
    /** Exactly what the platform admin attested to (stored on the import). */
    attestationWording: string;
    now?: Date;
  },
): Promise<QueueRepermissionInviteResult> {
  const { businessId, importId } = input;

  const imported = await db.customerImport.findFirst({
    where: { id: importId, businessId },
    select: {
      id: true,
      inviteCampaign: { select: { id: true, status: true } },
    },
  });
  if (!imported) return { ok: false, reason: "import_not_found" };
  const existing = imported.inviteCampaign;
  if (existing && existing.status !== "DRAFT") {
    return { ok: false, reason: "already_invited" };
  }

  const [business, state] = await Promise.all([
    loadCampaignBusiness(db, businessId),
    db.business.findUnique({
      where: { id: businessId },
      select: { status: true, featureFlags: true },
    }),
  ]);
  if (!business || !state) return { ok: false, reason: "import_not_found" };
  if (!isBusinessSendable(state)) return { ok: false, reason: "marketing_off" };
  if (getBusinessPostalAddress(business) === null) {
    return { ok: false, reason: "no_postal_address" };
  }
  if ((await repermissionInviteAudienceCount(db, businessId, importId)) === 0) {
    return { ok: false, reason: "no_recipients" };
  }

  // Control characters (CR/LF) have no place in a header; the router's
  // input schema should refuse them, this keeps the library safe regardless.
  const typedSubject = (input.subject ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, REPERMISSION_SUBJECT_MAX);
  const subject =
    typedSubject === ""
      ? defaultRepermissionSubject(business.name)
      : typedSubject;
  const note = input.note?.trim().slice(0, REPERMISSION_NOTE_MAX) ?? "";
  const now = input.now ?? new Date();

  let campaignId: string;
  try {
    campaignId = await db.$transaction(async (tx) => {
      if (existing) {
        // A leftover draft sent nothing; conditional so a concurrent queue
        // of it wins (and then the create below hits the unique index).
        await tx.marketingCampaign.deleteMany({
          where: { id: existing.id, businessId, status: "DRAFT" },
        });
      }
      await tx.customerImport.update({
        where: { id: importId },
        data: {
          attestationWording: input.attestationWording,
          attestedAt: now,
          attestedById: input.createdById,
        },
      });
      const created = await tx.marketingCampaign.create({
        data: {
          businessId,
          createdById: input.createdById,
          kind: "REPERMISSION",
          importId,
          subject,
          previewText: `${business.name} has moved to a new website.`,
          contentFormat: "tiptap",
          bodyText: null,
          bodyJson: repermissionInviteDoc({
            businessName: business.name,
            note,
          }) as Prisma.InputJsonValue,
          // `audience` is left out on purpose (the column defaults to NULL,
          // and segments never apply to an invite). Don't write
          // Prisma.DbNull here: in the Next dev bundle it can serialize as
          // `{}`, which parseStoredAudience rejects as invalid_audience.
        },
        select: { id: true },
      });
      return created.id;
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { ok: false, reason: "already_invited" };
    }
    throw err;
  }

  const rollBack = () =>
    db.$transaction([
      db.marketingCampaign.deleteMany({
        where: { id: campaignId, businessId, status: "DRAFT" },
      }),
      db.customerImport.updateMany({
        where: { id: importId, businessId, attestedAt: now },
        data: {
          attestationWording: null,
          attestedAt: null,
          attestedById: null,
        },
      }),
    ]);

  let queued: Awaited<ReturnType<typeof queueCampaign>>;
  try {
    queued = await queueCampaign(db, {
      campaignId,
      businessId,
      expectStatus: "DRAFT",
      kind: "REPERMISSION",
      now,
    });
  } catch (err) {
    await rollBack();
    throw err;
  }
  if (!queued.ok) {
    await rollBack();
    return queued.reason === "no_postal_address"
      ? { ok: false, reason: "no_postal_address" }
      : { ok: false, reason: "not_queued", queueReason: queued.reason };
  }
  if (queued.recipientCount === 0) {
    // The audience emptied between the pre-check and the snapshot (everyone
    // unsubscribed / opted in / got blocked meanwhile). A zero-recipient
    // campaign sent nothing, so don't let it use up the import's one invite.
    await db.$transaction([
      db.marketingCampaign.deleteMany({
        where: { id: campaignId, businessId, recipientCount: 0 },
      }),
      db.customerImport.updateMany({
        where: { id: importId, businessId, attestedAt: now },
        data: {
          attestationWording: null,
          attestedAt: null,
          attestedById: null,
        },
      }),
    ]);
    return { ok: false, reason: "no_recipients" };
  }
  return {
    ok: true,
    campaignId: queued.campaignId,
    recipientCount: queued.recipientCount,
  };
}
