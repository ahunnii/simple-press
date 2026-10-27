import type { JSONContent } from "@tiptap/core";
import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import Papa from "papaparse";
import { z } from "zod";

import type { CampaignRecipientStatus } from "~/lib/marketing/campaign-status";
import type { SendBlocker } from "~/lib/marketing/queue-campaign";
import type { Audience } from "~/lib/marketing/segments";
import type { DbClient } from "~/server/db";
import { getBusinessUrl } from "~/lib/business-url";
import { TEMPLATES } from "~/lib/constants";
import { sanitizeCsvRows } from "~/lib/csv/escape-cell";
import { EMAIL_FROM, sendEmail } from "~/lib/email/send";
import { marketingAudienceWhere } from "~/lib/marketing/audience";
import {
  loadCampaignBusiness,
  storedBodyJson,
} from "~/lib/marketing/campaign-business";
import {
  ACCEPTED_RECIPIENT_STATUSES,
  CAMPAIGN_RECIPIENT_STATUSES,
} from "~/lib/marketing/campaign-status";
import {
  cancelPendingWork,
  startDrainAfterResponse,
} from "~/lib/marketing/campaign-worker";
import { marketingConsentSourceLabel } from "~/lib/marketing/consent";
import {
  emailStyleSchema,
  parseEmailStyle,
  resolveEmailStyle,
} from "~/lib/marketing/email-style";
import {
  emailSocialLinks,
  renderCampaignPreview,
} from "~/lib/marketing/preview-campaign";
import {
  checkCampaignSendable,
  prepareCampaignBody,
  queueCampaign,
} from "~/lib/marketing/queue-campaign";
import { campaignEmailElement } from "~/lib/marketing/render-campaign";
import { audienceSchema, parseAudience } from "~/lib/marketing/segments";
import {
  marketingPreviewLimiter,
  marketingTestSendLimiter,
} from "~/lib/rate-limit";

import { createTRPCRouter, featureGate, ownerAdminProcedure } from "../trpc";

const MISSING_ADDRESS_MESSAGE =
  "Add a full business address in Settings before sending (street, city, and state or ZIP, or a PO box) — the law requires a postal address in marketing emails.";

/** Earliest / latest a campaign may be scheduled, relative to now. */
const MIN_SCHEDULE_LEAD_MS = 10 * 60_000;
const MAX_SCHEDULE_AHEAD_MS = 90 * 24 * 60 * 60_000;

/**
 * The business as a `CampaignBusiness` (same select the scheduled-send sweep
 * uses, `~/lib/marketing/campaign-business.ts`).
 */
async function loadBusiness(db: DbClient, businessId: string) {
  const business = await loadCampaignBusiness(db, businessId);
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  return business;
}

/** The router's message for a send check that failed (send + schedule). */
const SEND_BLOCKER_MESSAGES: Record<SendBlocker, string> = {
  no_postal_address: MISSING_ADDRESS_MESSAGE,
  invalid_audience:
    "This campaign's audience is no longer valid. Pick the audience again and save.",
  empty_body: "Write a message before sending.",
  empty_product_block:
    "A product block has no products to show. Pick products for it or remove it before sending.",
};

/**
 * Refusal for any composer write aimed at a contact import's re-permission
 * invite (`kind: "REPERMISSION"`). Its content, audience and one-time send
 * belong to the import (`~/lib/marketing/repermission-invite.ts`); only
 * cancel works on it here.
 */
const INVITE_CAMPAIGN_MESSAGE =
  "This is the one-time invite sent to an imported contact list. It can't be edited, copied, scheduled or sent again.";

function inviteCampaignError() {
  return new TRPCError({
    code: "BAD_REQUEST",
    message: INVITE_CAMPAIGN_MESSAGE,
  });
}

/** Throws the invite refusal for a REPERMISSION campaign. */
function assertComposerCampaign(campaign: { kind: string }) {
  if (campaign.kind !== "STANDARD") throw inviteCampaignError();
}

/** Tenant-scoped campaign lookup: another business's id is NOT_FOUND. */
async function findCampaign<S extends Prisma.MarketingCampaignSelect>(
  db: DbClient,
  businessId: string,
  id: string,
  select: S,
) {
  const campaign = await db.marketingCampaign.findFirst({
    where: { id, businessId },
    select,
  });
  if (!campaign) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
  }
  return campaign;
}

/**
 * Throws NOT_FOUND for a missing / other-tenant id, the invite refusal for a
 * re-permission invite, else BAD_REQUEST. `message` may be a function of the
 * campaign's current status (to word the error for a scheduled campaign
 * differently from a sent one).
 */
async function rejectStateChange(
  db: DbClient,
  businessId: string,
  id: string,
  message: string | ((status: string) => string),
): Promise<never> {
  const { status, kind } = await findCampaign(db, businessId, id, {
    status: true,
    kind: true,
  });
  assertComposerCampaign({ kind });
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: typeof message === "function" ? message(status) : message,
  });
}

type CampaignCounts = {
  byStatus: Record<CampaignRecipientStatus, number>;
  /** Handed to the provider: SENT + DELIVERED + BOUNCED + COMPLAINED. */
  accepted: number;
  unsubscribed: number;
};

function emptyCounts(): CampaignCounts {
  const byStatus = Object.fromEntries(
    CAMPAIGN_RECIPIENT_STATUSES.map((s) => [s, 0]),
  ) as Record<CampaignRecipientStatus, number>;
  return { byStatus, accepted: 0, unsubscribed: 0 };
}

/** Per-campaign recipient counts: one groupBy for statuses, one for unsubscribes. */
async function recipientCounts(
  db: DbClient,
  campaignIds: string[],
): Promise<Map<string, CampaignCounts>> {
  const counts = new Map(campaignIds.map((id) => [id, emptyCounts()]));
  if (campaignIds.length === 0) return counts;

  const [byStatus, unsubscribed] = await Promise.all([
    db.marketingCampaignRecipient.groupBy({
      by: ["campaignId", "status"],
      where: { campaignId: { in: campaignIds } },
      _count: { _all: true },
    }),
    db.marketingCampaignRecipient.groupBy({
      by: ["campaignId"],
      where: { campaignId: { in: campaignIds }, unsubscribedAt: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const accepted = new Set<string>(ACCEPTED_RECIPIENT_STATUSES);
  for (const row of byStatus) {
    const c = counts.get(row.campaignId);
    if (!c) continue;
    const status = row.status as CampaignRecipientStatus;
    if (status in c.byStatus) c.byStatus[status] = row._count._all;
    if (accepted.has(status)) c.accepted += row._count._all;
  }
  for (const row of unsubscribed) {
    const c = counts.get(row.campaignId);
    if (c) c.unsubscribed = row._count._all;
  }
  return counts;
}

/** Largest tiptap document (serialized) a campaign may store. */
const MAX_BODY_JSON_BYTES = 200_000;

const bodyJsonSchema = z
  .record(z.string(), z.unknown())
  .refine((doc) => doc.type === "doc", {
    message: "The message must be a rich-text document.",
  })
  .refine((doc) => JSON.stringify(doc).length <= MAX_BODY_JSON_BYTES, {
    message: "The message is too large. Remove some content and try again.",
  });

/** ASCII control characters (incl. CR/LF), which have no place in a header. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const draftInput = z.object({
  id: z.string().min(1).optional(),
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(200)
    .refine((v) => !CONTROL_CHARS.test(v), {
      message: "The subject can't contain line breaks or control characters.",
    }),
  previewText: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !CONTROL_CHARS.test(v), {
      message:
        "The preview text can't contain line breaks or control characters.",
    })
    .optional(),
  contentFormat: z.enum(["text", "tiptap"]).default("text"),
  bodyText: z.string().max(20_000).optional(),
  /** Tiptap document for `contentFormat: "tiptap"` (the rich composer). */
  bodyJson: bodyJsonSchema.optional(),
  /**
   * Segment to send to. Omitted = leave the saved audience as is (new
   * drafts: everyone); null or `{ type: "all" }` = everyone opted in.
   */
  audience: audienceSchema.nullish(),
});

/** The stored form of an audience: null for "everyone opted in". */
function storedAudience(
  audience: Audience | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return audience && audience.type !== "all"
    ? (audience as Prisma.InputJsonValue)
    : Prisma.DbNull;
}

/** Rejects a "bought" segment naming any product outside this business. */
async function assertAudienceProducts(
  db: DbClient,
  businessId: string,
  audience: Audience | null | undefined,
) {
  if (audience?.type !== "bought") return;
  const owned = await db.product.count({
    where: { id: { in: audience.productIds }, businessId },
  });
  if (owned !== audience.productIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more of the chosen products wasn't found.",
    });
  }
}

const CAMPAIGN_LIST_SELECT = {
  id: true,
  subject: true,
  status: true,
  createdAt: true,
  queuedAt: true,
  completedAt: true,
  scheduledAt: true,
  recipientCount: true,
  /** STANDARD | REPERMISSION (the UI labels and locks invites). */
  kind: true,
  createdBy: { select: { name: true } },
} satisfies Prisma.MarketingCampaignSelect;

export const marketingRouter = createTRPCRouter({
  /**
   * Returns the count of opted-in, non-anonymized customers for this business.
   * No featureGate here — the page needs this to show the audience size even
   * before the owner enables the feature.
   */
  listRecipients: ownerAdminProcedure.query(async ({ ctx }) => {
    const [count, suppressedCount, business] = await Promise.all([
      ctx.db.customer.count({
        where: marketingAudienceWhere(ctx.businessId),
      }),
      // Opted-in customers we will not email because the provider reported a
      // hard bounce / complaint / suppression. Shown so the owner can see why
      // the audience is smaller than their opt-in list.
      ctx.db.customer.count({
        where: {
          businessId: ctx.businessId,
          anonymizedAt: null,
          marketingSuppressedAt: { not: null },
        },
      }),
      // The store's public URL, so the composer's preview resolves page links
      // the same way the sent email does.
      ctx.db.business.findUnique({
        where: { id: ctx.businessId },
        select: { subdomain: true, customDomain: true, domainStatus: true },
      }),
    ]);
    return {
      count,
      suppressedCount,
      baseUrl: business ? getBusinessUrl(business) : null,
    };
  }),

  /**
   * How many opted-in customers a segment reaches right now. Same guards as
   * listRecipients (owner/manager, not featureGated). A "bought" segment
   * naming another store's products simply matches nobody here — those ids
   * are rejected when the draft is saved.
   */
  countAudience: ownerAdminProcedure
    .input(z.object({ audience: audienceSchema }))
    .query(async ({ ctx, input }) => {
      const count = await ctx.db.customer.count({
        where: marketingAudienceWhere(ctx.businessId, input.audience),
      });
      return { count };
    }),

  /**
   * Export the opted-in marketing list as a CSV. Like listRecipients, this is
   * not featureGated — the owner's opt-in list is their data regardless of
   * whether the broadcast feature is enabled. An optional `audience` exports
   * just that segment.
   */
  exportRecipients: ownerAdminProcedure
    .input(z.object({ audience: audienceSchema.optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const customers = await ctx.db.customer.findMany({
        where: marketingAudienceWhere(businessId, input?.audience),
        select: {
          marketingConsentSource: true,
          marketingConsentAt: true,
          email: true,
          firstName: true,
          lastName: true,
          orderCount: true,
          totalSpent: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (customers.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No opted-in customers to export",
        });
      }

      const rows = customers.map((c) => ({
        Email: c.email,
        "First Name": c.firstName ?? "",
        "Last Name": c.lastName ?? "",
        "Order Count": c.orderCount,
        "Total Spent": (c.totalSpent / 100).toFixed(2),
        "Customer Since": c.createdAt.toISOString(),
        "Consent Source": marketingConsentSourceLabel(c.marketingConsentSource),
        "Consent Date": c.marketingConsentAt?.toISOString() ?? "",
      }));

      const csv = Papa.unparse(sanitizeCsvRows(rows), {
        quotes: true,
        header: true,
      });

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      });

      const slug = (business?.name ?? "store")
        .toLowerCase()
        .replace(/\s+/g, "-");
      const date = new Date().toISOString().split("T")[0];

      return {
        csv,
        filename: `marketing-list-${slug}-${date}.csv`,
        count: customers.length,
      };
    }),

  // ─── Campaign history (reads; not feature-gated, like the audience) ───────

  /** Newest first, cursor-paged, with recipient counts per campaign. */
  listCampaigns: ownerAdminProcedure
    .input(
      z.object({
        cursor: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.marketingCampaign.findMany({
        where: { businessId: ctx.businessId },
        select: CAMPAIGN_LIST_SELECT,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      const page = rows.slice(0, input.limit);
      const counts = await recipientCounts(
        ctx.db,
        page.map((c) => c.id),
      );
      return {
        campaigns: page.map(({ createdBy, ...c }) => ({
          ...c,
          createdByName: createdBy?.name ?? null,
          counts: counts.get(c.id) ?? emptyCounts(),
        })),
        nextCursor:
          rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
      };
    }),

  /** One campaign: content, status, recipient counts and batch progress. */
  getCampaign: ownerAdminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const campaign = await findCampaign(ctx.db, ctx.businessId, input.id, {
        ...CAMPAIGN_LIST_SELECT,
        previewText: true,
        contentFormat: true,
        bodyText: true,
        bodyJson: true,
        audience: true,
        baseUrl: true,
        startedAt: true,
        canceledAt: true,
        lastError: true,
      });
      const [counts, batches, business] = await Promise.all([
        recipientCounts(ctx.db, [campaign.id]),
        ctx.db.marketingCampaignBatch.groupBy({
          by: ["status"],
          where: { campaignId: campaign.id },
          _count: { _all: true },
        }),
        // Fallback for `baseUrl` below: a campaign that never queued (failed
        // while scheduled, canceled) has no frozen one.
        ctx.db.business.findUnique({
          where: { id: ctx.businessId },
          select: { subdomain: true, customDomain: true, domainStatus: true },
        }),
      ]);
      const batchCount = (status: string) =>
        batches.find((b) => b.status === status)?._count._all ?? 0;
      const { createdBy, audience, ...rest } = campaign;
      const parsedAudience = parseAudience(audience);
      // Names for a "bought" segment's products (the composer's chips and the
      // detail page's audience line). Products since deleted simply drop out.
      const productRows =
        parsedAudience.type === "bought"
          ? await ctx.db.product.findMany({
              where: {
                businessId: ctx.businessId,
                id: { in: parsedAudience.productIds },
              },
              select: { id: true, name: true },
            })
          : [];
      return {
        ...rest,
        // The frozen send-time URL, else the store's current public URL, so
        // relative product photos / page links in the preview always resolve.
        baseUrl: rest.baseUrl ?? (business ? getBusinessUrl(business) : null),
        audience: parsedAudience,
        audienceProductNames: Object.fromEntries(
          productRows.map((p) => [p.id, p.name]),
        ) as Record<string, string>,
        createdByName: createdBy?.name ?? null,
        counts: counts.get(campaign.id) ?? emptyCounts(),
        batches: {
          total: batches.reduce((sum, b) => sum + b._count._all, 0),
          sent: batchCount("SENT"),
          failed: batchCount("FAILED"),
          canceled: batchCount("CANCELED"),
        },
      };
    }),

  /** A campaign's recipients, optionally filtered by status, cursor-paged by id. */
  listCampaignRecipients: ownerAdminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.enum(CAMPAIGN_RECIPIENT_STATUSES).optional(),
        cursor: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      await findCampaign(ctx.db, ctx.businessId, input.id, { id: true });
      const rows = await ctx.db.marketingCampaignRecipient.findMany({
        where: {
          campaignId: input.id,
          businessId: ctx.businessId,
          ...(input.status ? { status: input.status } : {}),
        },
        select: {
          id: true,
          customerId: true,
          email: true,
          status: true,
          error: true,
          sentAt: true,
          deliveredAt: true,
          bouncedAt: true,
          complainedAt: true,
          unsubscribedAt: true,
        },
        orderBy: { id: "asc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      const page = rows.slice(0, input.limit);
      return {
        recipients: page,
        nextCursor:
          rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
      };
    }),

  // ─── Drafts ───────────────────────────────────────────────────────────────

  /** Creates a draft, or updates one that is still a DRAFT. */
  saveDraft: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .input(draftInput)
    .mutation(async ({ ctx, input }) => {
      await assertAudienceProducts(ctx.db, ctx.businessId, input.audience);
      const content = {
        subject: input.subject,
        previewText:
          input.previewText === "" ? null : (input.previewText ?? null),
        contentFormat: input.contentFormat,
        // Each format keeps only its own body, so a draft converted to the
        // rich editor doesn't leave stale plain text behind.
        bodyText:
          input.contentFormat === "text" ? (input.bodyText ?? null) : null,
        bodyJson:
          input.contentFormat === "tiptap" && input.bodyJson
            ? (input.bodyJson as Prisma.InputJsonValue)
            : Prisma.DbNull,
        ...(input.audience !== undefined
          ? { audience: storedAudience(input.audience) }
          : {}),
      };

      if (!input.id) {
        const created = await ctx.db.marketingCampaign.create({
          data: {
            ...content,
            businessId: ctx.businessId,
            createdById: ctx.session.user.id,
          },
          select: { id: true },
        });
        return { id: created.id };
      }

      // Compare-and-set: content is frozen once the campaign is queued, and
      // an invite's is never the composer's to change.
      const { count } = await ctx.db.marketingCampaign.updateMany({
        where: {
          id: input.id,
          businessId: ctx.businessId,
          status: "DRAFT",
          kind: "STANDARD",
        },
        data: content,
      });
      if (count === 0) {
        await rejectStateChange(ctx.db, ctx.businessId, input.id, (status) =>
          status === "SCHEDULED"
            ? "This campaign is scheduled. Unschedule it first to edit it."
            : "This campaign has already been sent and can no longer be edited.",
        );
      }
      return { id: input.id };
    }),

  deleteDraft: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.marketingCampaign.deleteMany({
        where: {
          id: input.id,
          businessId: ctx.businessId,
          status: "DRAFT",
          kind: "STANDARD",
        },
      });
      if (count === 0) {
        await rejectStateChange(ctx.db, ctx.businessId, input.id, (status) =>
          status === "SCHEDULED"
            ? "This campaign is scheduled. Unschedule it first to delete it."
            : "Only drafts can be deleted.",
        );
      }
      return { id: input.id };
    }),

  /**
   * Copies any campaign (whatever its status) into a new draft: content,
   * preview text and audience. Nothing about its sending (status, schedule,
   * recipients, results) carries over. A re-permission invite is refused (a
   * copy would be a standard campaign with the invite's wording and a
   * confirm link that never gets filled in).
   */
  duplicateCampaign: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const source = await findCampaign(ctx.db, ctx.businessId, input.id, {
        subject: true,
        previewText: true,
        contentFormat: true,
        bodyText: true,
        bodyJson: true,
        audience: true,
        kind: true,
      });
      assertComposerCampaign(source);
      const copySubject = `Copy of ${source.subject}`;
      const created = await ctx.db.marketingCampaign.create({
        data: {
          businessId: ctx.businessId,
          createdById: ctx.session.user.id,
          subject: copySubject.length <= 200 ? copySubject : source.subject,
          previewText: source.previewText,
          contentFormat: source.contentFormat,
          bodyText: source.bodyText,
          bodyJson:
            source.bodyJson === null
              ? Prisma.DbNull
              : (source.bodyJson as Prisma.InputJsonValue),
          audience:
            source.audience === null
              ? Prisma.DbNull
              : (source.audience as Prisma.InputJsonValue),
        },
        select: { id: true },
      });
      return { id: created.id };
    }),

  /**
   * Sends the draft's current content once, to whoever is signed in (a
   * manager's test shouldn't land in the owner's inbox; the owner address is
   * only a fallback). Uses the same render as the real send, with a
   * placeholder `?t=test` unsubscribe link.
   */
  sendTest: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await findCampaign(ctx.db, ctx.businessId, input.id, {
        subject: true,
        previewText: true,
        contentFormat: true,
        bodyText: true,
        bodyJson: true,
        kind: true,
      });
      // Its render differs (confirm link, footer); not a composer test send.
      assertComposerCampaign(campaign);

      try {
        await marketingTestSendLimiter.consume(
          `${ctx.businessId}:${ctx.session.user.id}`,
        );
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many test emails. Please try again later.",
        });
      }

      const business = await loadBusiness(ctx.db, ctx.businessId);
      const to = ctx.session.user.email ?? business.ownerEmail;
      if (!to) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email address found to send the test to.",
        });
      }

      const isTiptap = campaign.contentFormat === "tiptap";
      const testBody = isTiptap
        ? (
            await prepareCampaignBody(
              ctx.db,
              ctx.businessId,
              storedBodyJson(campaign.bodyJson),
            )
          ).bodyJson
        : null;

      const unsubscribeUrl = `${business.baseUrl}/api/unsubscribe?t=test`;
      const result = await sendEmail({
        from: EMAIL_FROM.MARKETING,
        fromName: business.name,
        to,
        replyTo: business.ownerEmail,
        subject: `[TEST] ${campaign.subject}`,
        react: campaignEmailElement(
          {
            business,
            subject: campaign.subject,
            previewText: campaign.previewText,
            contentFormat: isTiptap ? "tiptap" : "text",
            bodyText: campaign.bodyText,
            bodyJson: testBody,
          },
          unsubscribeUrl,
        ),
        // Not `marketing_broadcast`: the Resend webhook only tracks real sends.
        tags: [
          { name: "category", value: "marketing_test" },
          { name: "business", value: ctx.businessId },
        ],
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      return { sent: result.success, to };
    }),

  /**
   * Queues a draft for sending: freezes the render, snapshots the audience
   * into recipient + batch rows (one transaction), and starts the background
   * drain after the response. Returns immediately; progress is read from
   * `getCampaign`.
   */
  sendCampaign: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await queueCampaign(ctx.db, {
        campaignId: input.id,
        businessId: ctx.businessId,
        expectStatus: "DRAFT",
      });
      if (!result.ok) {
        switch (result.reason) {
          case "not_found":
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Campaign not found",
            });
          case "business_not_found":
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Business not found",
            });
          case "status_changed":
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                result.status === "SCHEDULED"
                  ? "This campaign is scheduled. Unschedule it to send it now."
                  : "This campaign has already been sent.",
            });
          case "wrong_kind":
            throw inviteCampaignError();
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: SEND_BLOCKER_MESSAGES[result.reason],
            });
        }
      }

      if (result.recipientCount > 0) {
        startDrainAfterResponse(ctx.db, result.campaignId);
      }
      return { id: result.campaignId, recipientCount: result.recipientCount };
    }),

  /**
   * Schedules a draft to be sent at `scheduledAt` (10 minutes to 90 days
   * out). Runs the send checks now so the owner hears about problems while
   * they can fix them; nothing is rendered or snapshotted — the cron sweep
   * (`queueDueScheduledCampaigns`) does that when it comes due, so the
   * segment and content are applied as of the send time. The campaign is
   * frozen (no edits) while scheduled; `unscheduleCampaign` returns it to a
   * draft.
   */
  scheduleCampaign: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .input(z.object({ id: z.string().min(1), scheduledAt: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const campaign = await findCampaign(ctx.db, businessId, input.id, {
        id: true,
        status: true,
        contentFormat: true,
        bodyText: true,
        bodyJson: true,
        audience: true,
        kind: true,
      });
      assertComposerCampaign(campaign);
      if (campaign.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            campaign.status === "SCHEDULED"
              ? "This campaign is already scheduled. Unschedule it to pick a new time."
              : "Only drafts can be scheduled.",
        });
      }

      const now = new Date();
      const at = input.scheduledAt.getTime();
      if (Number.isNaN(at) || at < now.getTime() + MIN_SCHEDULE_LEAD_MS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pick a time at least 10 minutes from now.",
        });
      }
      if (at > now.getTime() + MAX_SCHEDULE_AHEAD_MS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pick a time within the next 90 days.",
        });
      }

      const business = await loadBusiness(ctx.db, businessId);
      const check = await checkCampaignSendable(
        ctx.db,
        businessId,
        business,
        campaign,
      );
      if (!check.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: SEND_BLOCKER_MESSAGES[check.reason],
        });
      }

      // Refuse an empty audience now rather than "sending" to nobody later.
      // The segment (validated strictly by the check above, never widened to
      // everyone) is applied again when the campaign is queued.
      const audienceCount = await ctx.db.customer.count({
        where: marketingAudienceWhere(businessId, check.audience, now),
      });
      if (audienceCount === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No one matches this audience yet.",
        });
      }

      // Compare-and-set: a concurrent send / delete / schedule wins cleanly.
      const { count } = await ctx.db.marketingCampaign.updateMany({
        where: {
          id: campaign.id,
          businessId,
          status: "DRAFT",
          kind: "STANDARD",
        },
        // `lastError: null`: on a SCHEDULED campaign, lastError is the sweep's
        // retry marker (`SCHEDULED_SEND_RETRY_ERROR`); start clean.
        data: {
          status: "SCHEDULED",
          scheduledAt: input.scheduledAt,
          lastError: null,
        },
      });
      if (count === 0) {
        await rejectStateChange(
          ctx.db,
          businessId,
          campaign.id,
          "Only drafts can be scheduled.",
        );
      }
      return {
        id: campaign.id,
        scheduledAt: input.scheduledAt,
        audienceCount,
        warnings: check.prepared.warnings,
      };
    }),

  /**
   * Returns a scheduled campaign to a draft. CONFLICT when it is no longer
   * scheduled (the sweep already queued it, or it was unscheduled already).
   *
   * Deliberately not featureGated, like cancelCampaign: with the flag off a
   * scheduled campaign only waits (up to 24h past its time), and the owner
   * must be able to pull it back meanwhile.
   */
  unscheduleCampaign: ownerAdminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.marketingCampaign.updateMany({
        where: {
          id: input.id,
          businessId: ctx.businessId,
          status: "SCHEDULED",
        },
        data: { status: "DRAFT", scheduledAt: null, lastError: null },
      });
      if (count === 0) {
        await findCampaign(ctx.db, ctx.businessId, input.id, { id: true });
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This campaign is no longer scheduled — it may have already started sending.",
        });
      }
      return { id: input.id };
    }),

  /**
   * Stops a queued or sending campaign. Batches not yet sent are canceled; a
   * batch mid-send finishes, and the worker stops at its next check.
   *
   * Deliberately not featureGated: switching the flag off only pauses a
   * campaign (the cron resumes it when the flag comes back), so the owner
   * must be able to cancel it while the flag is off.
   */
  cancelCampaign: ownerAdminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const { count } = await ctx.db.marketingCampaign.updateMany({
        where: {
          id: input.id,
          businessId: ctx.businessId,
          status: { in: ["QUEUED", "SENDING"] },
        },
        data: { status: "CANCELED", canceledAt: now },
      });
      if (count === 0) {
        await rejectStateChange(
          ctx.db,
          ctx.businessId,
          input.id,
          "Only a campaign that is queued or sending can be canceled.",
        );
      }
      await cancelPendingWork(ctx.db, input.id, now);
      return { id: input.id };
    }),

  // ─── Email style + live preview ───────────────────────────────────────────

  /**
   * The store's marketing email style: what the owner saved (`{}` = nothing),
   * the resolved defaults for its storefront template, and what the style
   * page needs to explain itself (logo present? which social links exist?).
   */
  getEmailStyle: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .query(async ({ ctx }) => {
      const business = await loadBusiness(ctx.db, ctx.businessId);
      const template = TEMPLATES.find((t) => t.id === business.templateId);
      return {
        saved: parseEmailStyle(business.emailStyle),
        defaults: resolveEmailStyle({
          emailStyle: null,
          templateId: business.templateId,
        }),
        templateId: business.templateId,
        templateName: template?.name ?? "Default",
        hasLogo: !!business.logoUrl,
        businessName: business.name,
        socialLinks: emailSocialLinks(business),
      };
    }),

  /**
   * Saves the style exactly as submitted (so a later change to a template's
   * defaults never silently shifts a customized store). `null` resets to the
   * template defaults.
   */
  saveEmailStyle: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .input(emailStyleSchema.nullable())
    .mutation(async ({ ctx, input }) => {
      // JSON? column: a plain `null` is not reliably SQL NULL; use DbNull.
      const emailStyle = input ?? Prisma.DbNull;
      await ctx.db.siteContent.upsert({
        where: { businessId: ctx.businessId },
        create: { businessId: ctx.businessId, emailStyle },
        update: { emailStyle },
      });
      return { saved: input ?? {} };
    }),

  /**
   * Renders the email for the admin's live preview (composer + style page).
   * Nothing is stored or sent; a missing postal address does not block it.
   * `styleOverride`: omitted = the saved style, null = template defaults,
   * object = unsaved settings.
   */
  previewCampaign: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .input(
      z.object({
        subject: z.string().max(200).optional(),
        previewText: z.string().max(200).optional(),
        bodyJson: bodyJsonSchema,
        styleOverride: emailStyleSchema.nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await marketingPreviewLimiter.consume(
          `${ctx.businessId}:${ctx.session.user.id}`,
        );
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many previews. Please wait a moment.",
        });
      }

      const business = await loadBusiness(ctx.db, ctx.businessId);
      // Product blocks preview exactly as they'd send: rebuilt from the
      // store's current published products, never the editor's snapshot.
      const prepared = await prepareCampaignBody(
        ctx.db,
        ctx.businessId,
        input.bodyJson as JSONContent,
      );
      const rendered = await renderCampaignPreview({
        business,
        previewText: input.previewText,
        bodyJson: prepared.bodyJson ?? (input.bodyJson as JSONContent),
        styleOverride: input.styleOverride,
      });
      return {
        html: rendered.html,
        warnings: [...new Set([...prepared.warnings, ...rendered.warnings])],
      };
    }),
});
