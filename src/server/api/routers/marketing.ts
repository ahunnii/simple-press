import type { JSONContent } from "@tiptap/core";
import { after } from "next/server";
import { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import Papa from "papaparse";
import { z } from "zod";

import type { CampaignRecipientStatus } from "~/lib/marketing/campaign-status";
import type { DbClient } from "~/server/db";
import { getBusinessUrl } from "~/lib/business-url";
import { sanitizeCsvRows } from "~/lib/csv/escape-cell";
import { EMAIL_FROM, formatFromAddress, sendEmail } from "~/lib/email/send";
import { marketingAudienceWhere } from "~/lib/marketing/audience";
import {
  ACCEPTED_RECIPIENT_STATUSES,
  CAMPAIGN_RECIPIENT_STATUSES,
} from "~/lib/marketing/campaign-status";
import {
  BATCH_SIZE,
  cancelPendingWork,
  drainCampaign,
} from "~/lib/marketing/campaign-worker";
import { marketingConsentSourceLabel } from "~/lib/marketing/consent";
import {
  campaignEmailElement,
  getBusinessPostalAddress,
  renderCampaign,
} from "~/lib/marketing/render-campaign";
import { tiptapHasContent } from "~/lib/marketing/tiptap-to-email";
import { marketingTestSendLimiter } from "~/lib/rate-limit";

import { createTRPCRouter, featureGate, ownerAdminProcedure } from "../trpc";

/** How long the post-response drain may run before leaving the rest to cron. */
const AFTER_DRAIN_DEADLINE_MS = 10 * 60_000;
/** Recipient rows per `createMany` when snapshotting the audience. */
const SNAPSHOT_CHUNK = 1000;

const MISSING_ADDRESS_MESSAGE =
  "Add a full business address in Settings before sending (street, city, and state or ZIP, or a PO box) — the law requires a postal address in marketing emails.";

/** Same display-name format `sendEmail` uses (`~/lib/email/send.ts`). */
function marketingFromAddress(businessName: string): string {
  return formatFromAddress(
    `${businessName} via SimplePress`,
    EMAIL_FROM.MARKETING,
  );
}

const BUSINESS_SELECT = {
  name: true,
  ownerEmail: true,
  subdomain: true,
  customDomain: true,
  domainStatus: true,
  addressStreet: true,
  addressCity: true,
  addressState: true,
  addressPostalCode: true,
  businessAddress: true,
  siteContent: { select: { logoUrl: true } },
} satisfies Prisma.BusinessSelect;

async function loadBusiness(db: DbClient, businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: BUSINESS_SELECT,
  });
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  return {
    ...business,
    logoUrl: business.siteContent?.logoUrl ?? null,
    baseUrl: getBusinessUrl(business),
  };
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

/** Throws NOT_FOUND for a missing / other-tenant id, else BAD_REQUEST. */
async function rejectStateChange(
  db: DbClient,
  businessId: string,
  id: string,
  message: string,
): Promise<never> {
  await findCampaign(db, businessId, id, { id: true });
  throw new TRPCError({ code: "BAD_REQUEST", message });
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

/**
 * Starts sending once the response is out. `after()` keeps the work alive
 * past the response in the tRPC route handler; outside a request scope (a
 * script, a test caller) it throws, and we fall back to a detached promise.
 * Either way the cron resumes whatever this doesn't finish.
 */
function startDrain(db: DbClient, campaignId: string) {
  const run = () =>
    drainCampaign(db, campaignId, {
      deadlineMs: AFTER_DRAIN_DEADLINE_MS,
    }).then(
      () => undefined,
      (err: unknown) => {
        Sentry.captureException(err, {
          tags: { "marketing.campaign": "drain_error" },
          extra: { campaignId },
        });
      },
    );
  try {
    after(run);
  } catch {
    void run();
  }
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

/** The stored campaign body as a tiptap doc, or `null` when it isn't one. */
function storedBodyJson(value: unknown): JSONContent | null {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as { type?: unknown }).type === "doc"
    ? (value as JSONContent)
    : null;
}

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
});

const CAMPAIGN_LIST_SELECT = {
  id: true,
  subject: true,
  status: true,
  createdAt: true,
  queuedAt: true,
  completedAt: true,
  recipientCount: true,
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
   * Export the opted-in marketing list as a CSV. Like listRecipients, this is
   * not featureGated — the owner's opt-in list is their data regardless of
   * whether the broadcast feature is enabled.
   */
  exportRecipients: ownerAdminProcedure.mutation(async ({ ctx }) => {
    const { businessId } = ctx;

    const customers = await ctx.db.customer.findMany({
      where: marketingAudienceWhere(businessId),
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

    const slug = (business?.name ?? "store").toLowerCase().replace(/\s+/g, "-");
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
        baseUrl: true,
        startedAt: true,
        canceledAt: true,
        lastError: true,
      });
      const [counts, batches] = await Promise.all([
        recipientCounts(ctx.db, [campaign.id]),
        ctx.db.marketingCampaignBatch.groupBy({
          by: ["status"],
          where: { campaignId: campaign.id },
          _count: { _all: true },
        }),
      ]);
      const batchCount = (status: string) =>
        batches.find((b) => b.status === status)?._count._all ?? 0;
      const { createdBy, ...rest } = campaign;
      return {
        ...rest,
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

      // Compare-and-set: content is frozen once the campaign is queued.
      const { count } = await ctx.db.marketingCampaign.updateMany({
        where: { id: input.id, businessId: ctx.businessId, status: "DRAFT" },
        data: content,
      });
      if (count === 0) {
        await rejectStateChange(
          ctx.db,
          ctx.businessId,
          input.id,
          "This campaign has already been sent and can no longer be edited.",
        );
      }
      return { id: input.id };
    }),

  deleteDraft: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.marketingCampaign.deleteMany({
        where: { id: input.id, businessId: ctx.businessId, status: "DRAFT" },
      });
      if (count === 0) {
        await rejectStateChange(
          ctx.db,
          ctx.businessId,
          input.id,
          "Only drafts can be deleted.",
        );
      }
      return { id: input.id };
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
      });

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
            contentFormat:
              campaign.contentFormat === "tiptap" ? "tiptap" : "text",
            bodyText: campaign.bodyText,
            bodyJson: storedBodyJson(campaign.bodyJson),
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
      const { businessId } = ctx;
      const campaign = await findCampaign(ctx.db, businessId, input.id, {
        id: true,
        status: true,
        subject: true,
        previewText: true,
        contentFormat: true,
        bodyText: true,
        bodyJson: true,
      });
      if (campaign.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This campaign has already been sent.",
        });
      }

      const business = await loadBusiness(ctx.db, businessId);
      if (getBusinessPostalAddress(business) === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: MISSING_ADDRESS_MESSAGE,
        });
      }

      const isTiptap = campaign.contentFormat === "tiptap";
      const bodyJson = isTiptap ? storedBodyJson(campaign.bodyJson) : null;
      const hasBody = isTiptap
        ? tiptapHasContent(bodyJson)
        : !!campaign.bodyText?.trim();
      if (!hasBody) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Write a message before sending.",
        });
      }

      const rendered = await renderCampaign({
        business,
        subject: campaign.subject,
        previewText: campaign.previewText,
        contentFormat: isTiptap ? "tiptap" : "text",
        bodyText: campaign.bodyText,
        bodyJson,
      });

      const recipientCount = await ctx.db.$transaction(
        async (tx) => {
          const now = new Date();
          const { count } = await tx.marketingCampaign.updateMany({
            where: { id: campaign.id, businessId, status: "DRAFT" },
            data: {
              status: "QUEUED",
              queuedAt: now,
              renderedHtml: rendered.html,
              renderedText: rendered.text,
              fromAddress: marketingFromAddress(business.name),
              replyTo: business.ownerEmail,
              baseUrl: business.baseUrl,
            },
          });
          if (count === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "This campaign has already been sent.",
            });
          }

          // Snapshot the audience. Ordered by id so batch membership is
          // deterministic; the worker re-checks each row on first claim.
          const audience = await tx.customer.findMany({
            where: marketingAudienceWhere(businessId),
            select: { id: true, email: true },
            orderBy: { id: "asc" },
          });
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
              // Nobody to send to: done already.
              ...(audience.length === 0
                ? { status: "SENT", completedAt: now }
                : {}),
            },
          });
          return audience.length;
        },
        // Large lists: tens of thousands of rows inserted in one transaction.
        { timeout: 60_000, maxWait: 10_000 },
      );

      if (recipientCount > 0) startDrain(ctx.db, campaign.id);
      return { id: campaign.id, recipientCount };
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
});
