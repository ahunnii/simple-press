import { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type {
  ContactImportCounts,
  ContactImportRow,
  ParsedContactCsv,
} from "~/lib/marketing/contact-import";
import type { TxClient } from "~/server/db";
import { startDrainAfterResponse } from "~/lib/marketing/campaign-worker";
import {
  CONTACT_IMPORT_ATTESTATION_WORDING,
  ContactCsvError,
  parseContactCsv,
} from "~/lib/marketing/contact-import";
import {
  addManyToDoNotEmail,
  findDoNotEmailed,
} from "~/lib/marketing/do-not-email";
import {
  queueRepermissionInvite,
  REPERMISSION_INVITE_ERROR_MESSAGES,
  REPERMISSION_NOTE_MAX,
  REPERMISSION_SUBJECT_MAX,
  repermissionInviteAudienceCount,
} from "~/lib/marketing/repermission-invite";
import { normalizeEmail } from "~/lib/utils";

import { createTRPCRouter, ownerAdminProcedure } from "../trpc";

/** Same rule as the campaign composer's subject (CR/LF never in a header). */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Importing a contact list is PLATFORM_ADMIN-only for now (same narrowing as
 * the WooCommerce import, `routers/import.ts`): `ownerAdminProcedure` resolves
 * the tenant, then `membershipRole` is null only for a platform admin, so any
 * membership role - OWNER and MANAGER included - is refused. Owners and
 * managers can still READ the import history (`list` / `get`).
 *
 * Compliance core: an import NEVER sets `acceptsMarketing`, and never changes
 * an existing Customer. Contacts the old site marked unsubscribed go on the
 * do-not-email list so no later import or invite can reach them.
 */
const contactImportProcedure = ownerAdminProcedure.use(({ ctx, next }) => {
  if (ctx.membershipRole !== null) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform admin access required",
    });
  }
  return next();
});

const columnMapSchema = z.object({
  email: z.string().min(1).max(200),
  firstName: z.string().max(200).nullable().optional(),
  lastName: z.string().max(200).nullable().optional(),
  status: z.string().max(200).nullable().optional(),
});

const csvInputSchema = z.object({
  csvContent: z.string().max(5_000_000),
  columnMap: columnMapSchema.optional(),
  /** "Everyone in this file is …" — refused when the file has a status column. */
  fileStatus: z.enum(["subscribed", "unsubscribed"]).optional(),
});

function parseOrThrow(input: z.infer<typeof csvInputSchema>): ParsedContactCsv {
  try {
    return parseContactCsv(input.csvContent, input.columnMap, {
      fileStatus: input.fileStatus,
    });
  } catch (error) {
    if (error instanceof ContactCsvError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
}

/**
 * Normalized addresses (of `emails`) that already belong to a Customer of this
 * business, matched case-insensitively: Customer emails are stored as typed
 * and `@@unique([businessId, email])` is case-sensitive.
 */
async function findExistingCustomerEmails(
  db: TxClient,
  businessId: string,
  emails: readonly string[],
): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < emails.length; i += 1000) {
    const chunk = emails.slice(i, i + 1000);
    const rows = await db.$queryRaw<Array<{ email: string }>>(
      Prisma.sql`SELECT lower("email") AS email FROM "Customer" WHERE "businessId" = ${businessId} AND lower("email") = ANY(${chunk})`,
    );
    for (const row of rows) found.add(normalizeEmail(row.email));
  }
  return found;
}

type Classified = {
  counts: ContactImportCounts;
  existing: Set<string>;
  doNotEmail: Map<string, string>;
  newRows: ContactImportRow[];
};

async function classify(
  db: TxClient,
  businessId: string,
  parsed: ParsedContactCsv,
): Promise<Classified> {
  const emails = parsed.rows.map((r) => r.email);
  const [existing, doNotEmail] = await Promise.all([
    findExistingCustomerEmails(db, businessId, emails),
    findDoNotEmailed(db, businessId, emails),
  ]);
  const newRows = parsed.rows.filter((r) => !existing.has(r.email));
  const counts: ContactImportCounts = {
    ...parsed.counts,
    created: newRows.length,
    matchedExisting: parsed.rows.length - newRows.length,
    onDoNotEmail: emails.filter((e) => doNotEmail.has(e)).length,
    inviteEligible: newRows.filter(
      (r) => r.status === "subscribed" && !doNotEmail.has(r.email),
    ).length,
    ...(parsed.fileStatus ? { fileStatus: parsed.fileStatus } : {}),
  };
  return { counts, existing, doNotEmail, newRows };
}

function warningsFor(
  parsed: ParsedContactCsv,
  counts: ContactImportCounts,
): string[] {
  const warnings: string[] = [];
  if (!parsed.columns.email) {
    warnings.push(
      "No email column was found. Pick the column that holds the email addresses.",
    );
    return warnings;
  }
  if (parsed.fileStatus === "subscribed") {
    warnings.push(
      "You said everyone in this file subscribed. Only use this when the file is the previous site's subscriber list (for example a Squarespace or Mailchimp subscriber export), not a list of all customers.",
    );
  } else if (parsed.fileStatus === "unsubscribed") {
    warnings.push(
      "You said everyone in this file unsubscribed. They will be blocked from marketing email for good, including anyone who is already a customer here.",
    );
  } else if (!parsed.hasStatusColumn) {
    warnings.push(
      "No subscription status column was found, so every contact is treated as unknown and nobody can be invited to join the list. Pick the status column if the file has one, or, if the file is a subscriber (or unsubscribed) list export, say so below.",
    );
  } else if (parsed.counts.valid > 0 && counts.inviteEligible === 0) {
    warnings.push(
      "Nobody in this file is both new and marked as subscribed, so there is no one to invite.",
    );
  }
  if (parsed.counts.unknown > 0 && parsed.hasStatusColumn) {
    warnings.push(
      `${parsed.counts.unknown} contact${parsed.counts.unknown === 1 ? " has" : "s have"} an unrecognized or blank subscription status and will not be invited.`,
    );
  }
  if (parsed.counts.invalid > 0) {
    warnings.push(
      `${parsed.counts.invalid} row${parsed.counts.invalid === 1 ? " has" : "s have"} a missing or invalid email and will be skipped.`,
    );
  }
  return warnings;
}

function asCounts(value: Prisma.JsonValue | null): ContactImportCounts | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as unknown as ContactImportCounts)
    : null;
}

const importSelect = {
  id: true,
  createdAt: true,
  fileName: true,
  sourceKind: true,
  counts: true,
  attestedAt: true,
  createdBy: { select: { name: true } },
  inviteCampaign: {
    select: {
      id: true,
      status: true,
      recipientCount: true,
      completedAt: true,
    },
  },
} satisfies Prisma.CustomerImportSelect;

type ImportRow = Prisma.CustomerImportGetPayload<{
  select: typeof importSelect;
}>;

/** Adds `confirmedCount`: imported customers who clicked join in the invite. */
async function withConfirmedCounts(
  db: TxClient,
  businessId: string,
  rows: ImportRow[],
) {
  const grouped =
    rows.length === 0
      ? []
      : await db.customer.groupBy({
          by: ["importId"],
          where: {
            businessId,
            importId: { in: rows.map((r) => r.id) },
            acceptsMarketing: true,
            marketingConsentSource: "IMPORT_CONFIRM",
          },
          _count: { _all: true },
        });
  const confirmed = new Map(grouped.map((g) => [g.importId, g._count._all]));
  return rows.map(({ counts, createdBy, ...row }) => ({
    ...row,
    counts: asCounts(counts),
    createdByName: createdBy?.name ?? null,
    confirmedCount: confirmed.get(row.id) ?? 0,
  }));
}

export const contactImportRouter = createTRPCRouter({
  /** Parse + classify only. No writes. */
  preview: contactImportProcedure
    .input(csvInputSchema)
    .mutation(async ({ ctx, input }) => {
      const parsed = parseOrThrow(input);
      const { counts, existing, doNotEmail } = await classify(
        ctx.db,
        ctx.businessId,
        parsed,
      );
      return {
        headers: parsed.headers,
        columns: parsed.columns,
        sourceKind: parsed.sourceKind,
        hasStatusColumn: parsed.hasStatusColumn,
        counts,
        errors: parsed.errors.slice(0, 100),
        errorCount: parsed.errors.length,
        warnings: warningsFor(parsed, counts),
        sample: parsed.rows.slice(0, 5).map((r) => ({
          email: r.email,
          firstName: r.firstName,
          lastName: r.lastName,
          status: r.status,
          alreadyCustomer: existing.has(r.email),
          onDoNotEmail: doNotEmail.has(r.email),
        })),
      };
    }),

  commit: contactImportProcedure
    .input(
      csvInputSchema.extend({ fileName: z.string().trim().min(1).max(200) }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Re-parsed server-side rather than trusting `preview`'s output.
      const parsed = parseOrThrow(input);
      if (!parsed.columns.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No email column was found. Pick the column with the emails.",
        });
      }
      if (parsed.rows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No valid rows to import.",
        });
      }

      const unsubscribedEmails = parsed.rows
        .filter((r) => r.status === "unsubscribed")
        .map((r) => r.email);

      // One transaction: 5,000 rows is a few dozen statements, but a remote DB
      // adds up, so allow well past the 5s default (cf. queue-campaign.ts).
      return ctx.db.$transaction(
        async (tx) => {
          const { counts, newRows, doNotEmail } = await classify(
            tx,
            businessId,
            parsed,
          );
          const now = new Date();

          const created = await tx.customerImport.create({
            data: {
              businessId,
              createdById: ctx.session.user.id,
              fileName: input.fileName,
              sourceKind: parsed.sourceKind,
            },
            select: { id: true },
          });

          // NEW customers only; never opted in. `skipDuplicates` covers a
          // same-case race; case variants were already excluded by `classify`.
          let createdCount = 0;
          for (let i = 0; i < newRows.length; i += 500) {
            const result = await tx.customer.createMany({
              data: newRows.slice(i, i + 500).map((r) => ({
                businessId,
                email: r.email,
                firstName: r.firstName,
                lastName: r.lastName,
                acceptsMarketing: false,
                importId: created.id,
                importStatus: r.status,
                ...(r.status === "unsubscribed"
                  ? { marketingUnsubscribedAt: now }
                  : {}),
              })),
              skipDuplicates: true,
            });
            createdCount += result.count;
          }

          // Unsubscribed on the old site: block them for good, new or existing.
          // (`addManyToDoNotEmail` never downgrades a stronger reason.)
          await addManyToDoNotEmail(
            tx,
            businessId,
            unsubscribedEmails,
            "UNSUBSCRIBED",
          );

          // Evidence for the rows THIS import created and stamped. Existing
          // customers get the list entry only - their record is untouched.
          const stamped = await tx.customer.findMany({
            where: {
              businessId,
              importId: created.id,
              marketingUnsubscribedAt: { not: null },
            },
            select: { id: true },
          });
          for (let i = 0; i < stamped.length; i += 500) {
            await tx.marketingConsentEvent.createMany({
              data: stamped.slice(i, i + 500).map((c) => ({
                businessId,
                customerId: c.id,
                type: "OPT_OUT",
                source: "IMPORT",
              })),
            });
          }

          const finalCounts: ContactImportCounts = {
            ...counts,
            created: createdCount,
            matchedExisting: parsed.rows.length - createdCount,
            inviteEligible: newRows.filter(
              (r) => r.status === "subscribed" && !doNotEmail.has(r.email),
            ).length,
          };
          await tx.customerImport.update({
            where: { id: created.id },
            data: { counts: finalCounts as unknown as Prisma.InputJsonValue },
          });
          return { importId: created.id, counts: finalCounts };
        },
        { timeout: 120_000, maxWait: 10_000 },
      );
    }),

  /** Import history. Owners and managers may read it. */
  list: ownerAdminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.customerImport.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { createdAt: "desc" },
      select: importSelect,
    });
    return withConfirmedCounts(ctx.db, ctx.businessId, rows);
  }),

  get: ownerAdminProcedure
    .input(z.object({ importId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.customerImport.findFirst({
        where: { id: input.importId, businessId: ctx.businessId },
        select: importSelect,
      });
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Import not found" });
      }
      const [withCount] = await withConfirmedCounts(ctx.db, ctx.businessId, [
        row,
      ]);
      return withCount!;
    }),

  /** How many people the re-permission invite would reach right now. */
  inviteAudienceCount: contactImportProcedure
    .input(z.object({ importId: z.string().min(1) }))
    .query(async ({ ctx, input }) => ({
      count: await repermissionInviteAudienceCount(
        ctx.db,
        ctx.businessId,
        input.importId,
      ),
    })),

  /**
   * Queue the one-time "still want to hear from us?" invite. `attested` must
   * be literally true: the admin confirms, on the owner's word, that the
   * people marked subscribed signed up on the previous site.
   */
  queueInvite: contactImportProcedure
    .input(
      z.object({
        importId: z.string().min(1),
        subject: z
          .string()
          .trim()
          .max(REPERMISSION_SUBJECT_MAX)
          .refine((v) => !CONTROL_CHARS.test(v), {
            message: "Subject can't contain line breaks",
          })
          .optional(),
        note: z.string().trim().max(REPERMISSION_NOTE_MAX).optional(),
        attested: z.literal(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await queueRepermissionInvite(ctx.db, {
        businessId: ctx.businessId,
        importId: input.importId,
        createdById: ctx.session.user.id,
        subject: input.subject,
        note: input.note,
        attestationWording: CONTACT_IMPORT_ATTESTATION_WORDING,
      });
      if (!result.ok) {
        if (result.reason === "not_queued") {
          // Not something the admin can fix from this screen: record why.
          Sentry.captureMessage("Re-permission invite not queued", {
            level: "warning",
            tags: { feature: "contact-import" },
            extra: {
              businessId: ctx.businessId,
              importId: input.importId,
              queueReason: result.queueReason,
            },
          });
          console.warn(
            `[contact-import] invite not queued: ${String(result.queueReason)}`,
          );
        }
        throw new TRPCError({
          code:
            result.reason === "import_not_found" ? "NOT_FOUND" : "BAD_REQUEST",
          message: REPERMISSION_INVITE_ERROR_MESSAGES[result.reason],
        });
      }
      startDrainAfterResponse(ctx.db, result.campaignId);
      return {
        campaignId: result.campaignId,
        recipientCount: result.recipientCount,
      };
    }),
});
