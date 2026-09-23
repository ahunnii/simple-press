import { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { zonedCalendarDate } from "~/lib/calendar-date";
import { captchaFailureToTrpcError } from "~/lib/captcha/trpc-error";
import { verifyRecaptcha } from "~/lib/captcha/verify-recaptcha";
import { checkBusiness } from "~/lib/check-business";
import {
  sendFormConfirmation,
  sendNewFormSubmissionNotification,
} from "~/lib/email/templates";
import {
  formatAnswerOrDash,
  getConfirmationEmail,
  parseAnswersJson,
  serializeAnswers,
  toAnswerSnapshot,
  validateFormAnswers,
} from "~/lib/forms/answers";
import {
  buildFormCsv,
  generateFormCsvFilename,
  parseFormCsv,
} from "~/lib/forms/csv";
import {
  findMatchingSubmissions,
  type FormSubmissionScanRow,
} from "~/lib/forms/query";
import { formSubmitLimiter, getClientIpFromHeaders } from "~/lib/rate-limit";
import type { FormStatusFilterValue } from "~/lib/validators/form";
import {
  formBulkAddTagsSchema,
  formBulkDeleteSchema,
  formBulkRemoveTagsSchema,
  formBulkSetStatusSchema,
  formImportSchema,
  formSetTagsSchema,
  formSubmissionExportSchema,
  formSubmissionListSchema,
  formSubmissionSetStatusSchema,
  formSubmitSchema,
  normalizeTags,
  parseStoredFormDefinition,
} from "~/lib/validators/form";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const FORM_SUBMISSION_SELECT = {
  id: true,
  submittedAt: true,
  status: true,
  tags: true,
  source: true,
  answers: true,
} satisfies Prisma.FormSubmissionSelect;

/** Shared filter → Prisma where, for `list`, `exportCsv`'s scan, and (indirectly) `listTags`. */
function buildSubmissionWhere(
  businessId: string,
  input: {
    formId: string;
    status: FormStatusFilterValue;
    tags?: string[];
    from?: Date;
    to?: Date;
  },
): Prisma.FormSubmissionWhereInput {
  return {
    businessId,
    formId: input.formId,
    ...(input.status !== "ALL" ? { status: input.status } : {}),
    ...(input.tags && input.tags.length > 0
      ? { tags: { hasSome: input.tags } }
      : {}),
    ...(input.from ?? input.to
      ? {
          submittedAt: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
  };
}

export const formSubmissionRouter = createTRPCRouter({
  // ─── Public: storefront submit ──────────────────────────────────────────

  /**
   * The one write path a visitor can reach. Same shape as
   * `quoteSubmission.submit`: throttle before the captcha round trip, verify
   * the captcha before touching the database, and re-validate every answer
   * against the STORED definition before writing anything.
   *
   * Returns a discriminated union: validation failures come back as a value
   * (`{ success: false, fieldErrors }`) because they are something the
   * visitor can fix; everything else (rate limit, captcha, tenant, the
   * published gate, definition drift) throws.
   */
  submit: publicProcedure
    .use(async ({ ctx, next }) => {
      const requestHost = ctx.headers.get("host") ?? "";
      const rawIp = getClientIpFromHeaders(ctx.headers);
      try {
        await formSubmitLimiter.consume(`${rawIp}:${requestHost}`);
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many submissions. Please try again later.",
        });
      }
      return next();
    })
    .use(featureGate("forms"))
    .input(formSubmitSchema)
    .mutation(async ({ ctx, input }) => {
      const requestHost = ctx.headers.get("host") ?? "";
      const rawIp = getClientIpFromHeaders(ctx.headers);
      const remoteIp = rawIp === "unknown" ? undefined : rawIp;

      const captcha = await verifyRecaptcha(input.recaptchaToken, {
        action: "form",
        requestHost,
        remoteIp,
      });
      if (!captcha.ok) {
        throw captchaFailureToTrpcError(captcha.reason);
      }

      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const businessData = await ctx.db.business.findUnique({
        where: { id: business.id },
        select: {
          name: true,
          ownerEmail: true,
          supportEmail: true,
          subdomain: true,
          customDomain: true,
          domainStatus: true,
          siteContent: { select: { logoUrl: true } },
        },
      });
      if (!businessData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const form = await ctx.db.form.findUnique({
        where: { id: input.formId, businessId: business.id },
        select: { id: true, name: true, definition: true, published: true },
      });

      // Missing and unpublished are indistinguishable — an unpublished form
      // is a draft and must not be submittable through a stale embed.
      if (!form?.published) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const parsedDefinition = parseStoredFormDefinition(form.definition);
      if (!parsedDefinition.success) {
        Sentry.captureException(parsedDefinition.error, {
          tags: { feature: "forms", step: "definition-drift" },
          extra: { formId: form.id, businessId: business.id },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "We couldn't submit your form. Please try again or contact us directly.",
        });
      }
      const definition = parsedDefinition.data;

      const validation = validateFormAnswers(definition.fields, input.answers, {
        optionMatch: "id",
        today: zonedCalendarDate(new Date(), business.timeZone),
      });

      if (!validation.ok) {
        return { success: false as const, fieldErrors: validation.errors };
      }

      const snapshot = toAnswerSnapshot(definition.fields, validation.values);
      const submitterEmail = getConfirmationEmail(
        definition,
        validation.values,
      );

      const submission = await ctx.db.formSubmission.create({
        data: {
          businessId: business.id,
          formId: form.id,
          formName: form.name,
          answers: serializeAnswers(snapshot),
          submitterEmail,
          source: "WEB",
          status: "NEW",
        },
        select: { id: true, submittedAt: true },
      });

      const displayAnswers = snapshot.map((row) => ({
        label: row.label,
        value: formatAnswerOrDash(row),
      }));

      // Owner alert — never fails the submit. `sendEmail` never throws (see
      // src/lib/email/send.ts); this checks `.success` and records context.
      const notifyTo =
        definition.settings.notifyEmail ??
        businessData.supportEmail ??
        businessData.ownerEmail;
      try {
        const ownerResult = await sendNewFormSubmissionNotification({
          submissionId: submission.id,
          formId: form.id,
          formName: form.name,
          submittedAt: submission.submittedAt,
          answers: displayAnswers,
          submitterEmail,
          notifyTo,
          business: {
            name: businessData.name,
            ownerEmail: businessData.ownerEmail,
            siteContent: businessData.siteContent,
            subdomain: businessData.subdomain,
            customDomain: businessData.customDomain,
            domainStatus: businessData.domainStatus,
          },
          idempotencyKey: `form-owner-${submission.id}`,
        });
        if (!ownerResult.success) {
          console.error("[Forms] Failed to send owner notification email");
          Sentry.captureMessage("Form owner notification email failed", {
            level: "warning",
            tags: { feature: "forms", step: "email-owner" },
            extra: { submissionId: submission.id },
          });
        }
      } catch (err) {
        Sentry.captureException(err, {
          level: "warning",
          tags: { feature: "forms", step: "email-owner" },
          extra: { submissionId: submission.id },
        });
      }

      // Confirmation to the submitter — only when the owner configured a
      // confirmation field AND the visitor answered it with a valid email.
      if (definition.settings.confirmationFieldId && submitterEmail) {
        try {
          const confirmResult = await sendFormConfirmation({
            to: submitterEmail,
            formId: form.id,
            formName: form.name,
            message: definition.settings.confirmationMessage,
            subject: definition.settings.confirmationSubject,
            answers: displayAnswers,
            business: {
              name: businessData.name,
              ownerEmail: businessData.ownerEmail,
              supportEmail: businessData.supportEmail,
              siteContent: businessData.siteContent,
              subdomain: businessData.subdomain,
            },
            idempotencyKey: `form-confirm-${submission.id}`,
          });
          if (!confirmResult.success) {
            console.error("[Forms] Failed to send confirmation email");
            Sentry.captureMessage("Form confirmation email failed", {
              level: "warning",
              tags: { feature: "forms", step: "email-confirmation" },
              extra: { submissionId: submission.id },
            });
          }
        } catch (err) {
          Sentry.captureException(err, {
            level: "warning",
            tags: { feature: "forms", step: "email-confirmation" },
            extra: { submissionId: submission.id },
          });
        }
      }

      return { success: true as const, message: definition.settings.successMessage };
    }),

  // ─── Admin: the entries inbox ───────────────────────────────────────────
  //
  // Deliberately NOT gated by featureGate("forms") — same reasoning as
  // quoteSubmission's inbox procedures: entries are business records an
  // owner must still be able to read/export/delete after turning the
  // feature off. Only the storefront-facing `submit` above is gated.

  list: ownerAdminProcedure
    .input(formSubmissionListSchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const where = buildSubmissionWhere(businessId, input);

      if (!input.search && !input.fieldFilter) {
        const [rows, total] = await ctx.db.$transaction([
          ctx.db.formSubmission.findMany({
            where,
            select: FORM_SUBMISSION_SELECT,
            orderBy: { submittedAt: "desc" },
            skip: (input.page - 1) * input.pageSize,
            take: input.pageSize,
          }),
          ctx.db.formSubmission.count({ where }),
        ]);

        return {
          items: rows.map((row) => ({
            ...row,
            answers: parseAnswersJson(row.answers),
          })),
          total,
          page: input.page,
          pageSize: input.pageSize,
          scanCapped: false,
        };
      }

      const { items: matched, scanCapped } = await findMatchingSubmissions(
        { search: input.search, fieldFilter: input.fieldFilter },
        async ({ cursor, take }): Promise<FormSubmissionScanRow[]> =>
          ctx.db.formSubmission.findMany({
            where: { ...where, ...(cursor ? { id: { gt: cursor } } : {}) },
            select: FORM_SUBMISSION_SELECT,
            orderBy: { id: "asc" },
            take,
          }),
      );

      // Newest first, to match the plain-filter branch above.
      matched.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

      const total = matched.length;
      const start = (input.page - 1) * input.pageSize;

      return {
        items: matched.slice(start, start + input.pageSize),
        total,
        page: input.page,
        pageSize: input.pageSize,
        scanCapped,
      };
    }),

  getById: ownerAdminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const submission = await ctx.db.formSubmission.findUnique({
        where: { id: input.id, businessId },
      });
      if (!submission) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found" });
      }

      if (submission.status === "NEW") {
        await ctx.db.formSubmission.updateMany({
          where: { id: input.id, businessId, status: "NEW" },
          data: { status: "READ" },
        });
        submission.status = "READ";
      }

      const form = await ctx.db.form.findUnique({
        where: { id: submission.formId, businessId },
        select: { definition: true },
      });
      const parsedDefinition = form
        ? parseStoredFormDefinition(form.definition)
        : null;

      return {
        ...submission,
        answers: parseAnswersJson(submission.answers),
        definition: parsedDefinition?.success ? parsedDefinition.data : null,
      };
    }),

  setStatus: ownerAdminProcedure
    .input(formSubmissionSetStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const existing = await ctx.db.formSubmission.findUnique({
        where: { id: input.id, businessId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found" });
      }
      return ctx.db.formSubmission.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  bulkSetStatus: ownerAdminProcedure
    .input(formBulkSetStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.formSubmission.updateMany({
        where: { id: { in: input.ids }, businessId },
        data: { status: input.status },
      });
      return { count: result.count };
    }),

  setTags: ownerAdminProcedure
    .input(formSetTagsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const existing = await ctx.db.formSubmission.findUnique({
        where: { id: input.id, businessId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found" });
      }
      return ctx.db.formSubmission.update({
        where: { id: input.id },
        data: { tags: normalizeTags(input.tags) },
      });
    }),

  // Prisma can't append-unique into a String[] column inside `updateMany`, so
  // this loads ids + current tags, computes the union in JS, and writes each
  // row back inside one transaction — fine at the `FORM_BULK_LIMIT` (500) cap.
  bulkAddTags: ownerAdminProcedure
    .input(formBulkAddTagsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const rows = await ctx.db.formSubmission.findMany({
        where: { id: { in: input.ids }, businessId },
        select: { id: true, tags: true },
      });

      await ctx.db.$transaction(
        rows.map((row) =>
          ctx.db.formSubmission.update({
            where: { id: row.id },
            data: { tags: normalizeTags([...row.tags, ...input.tags]) },
          }),
        ),
      );

      return { count: rows.length };
    }),

  bulkRemoveTags: ownerAdminProcedure
    .input(formBulkRemoveTagsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const removeKeys = new Set(
        input.tags.map((tag) => tag.trim().toLowerCase()),
      );
      const rows = await ctx.db.formSubmission.findMany({
        where: { id: { in: input.ids }, businessId },
        select: { id: true, tags: true },
      });

      await ctx.db.$transaction(
        rows.map((row) =>
          ctx.db.formSubmission.update({
            where: { id: row.id },
            data: {
              tags: row.tags.filter(
                (tag) => !removeKeys.has(tag.trim().toLowerCase()),
              ),
            },
          }),
        ),
      );

      return { count: rows.length };
    }),

  listTags: ownerAdminProcedure
    .input(z.object({ formId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      // `Prisma.sql` tagged template — parameters are bound, not interpolated.
      const rows = await ctx.db.$queryRaw<{ tag: string }[]>(
        Prisma.sql`
          SELECT DISTINCT unnest("tags") AS tag
          FROM "FormSubmission"
          WHERE "businessId" = ${businessId} AND "formId" = ${input.formId}
          ORDER BY tag
        `,
      );
      return rows.map((r) => r.tag);
    }),

  // OWNER only — same reasoning as quoteSubmission.bulkDelete: a status
  // change is reversible, deleting entries destroys PII with no undo.
  bulkDelete: ownerOnlyProcedure
    .input(formBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.formSubmission.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });
      return { count: result.count };
    }),

  exportCsv: ownerAdminProcedure
    .input(formSubmissionExportSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const form = await ctx.db.form.findUnique({
        where: { id: input.formId, businessId },
        select: { name: true, definition: true },
      });
      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      const parsedDefinition = parseStoredFormDefinition(form.definition);
      if (!parsedDefinition.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "This form's definition could not be read.",
        });
      }

      const where = buildSubmissionWhere(businessId, input);
      const { items, scanCapped } = await findMatchingSubmissions(
        { search: input.search, fieldFilter: input.fieldFilter },
        async ({ cursor, take }): Promise<FormSubmissionScanRow[]> =>
          ctx.db.formSubmission.findMany({
            where: { ...where, ...(cursor ? { id: { gt: cursor } } : {}) },
            select: FORM_SUBMISSION_SELECT,
            orderBy: { id: "asc" },
            take,
          }),
      );

      if (items.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No entries match the current filters",
        });
      }

      const csv = buildFormCsv(
        parsedDefinition.data,
        items.map((item) => ({
          submittedAt: item.submittedAt,
          status: item.status,
          tags: item.tags,
          answers: item.answers,
        })),
      );

      return {
        csv,
        filename: generateFormCsvFilename(form.name),
        scanCapped,
      };
    }),

  previewImport: ownerAdminProcedure
    .input(formImportSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const form = await ctx.db.form.findUnique({
        where: { id: input.formId, businessId },
        select: { definition: true },
      });
      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      const parsedDefinition = parseStoredFormDefinition(form.definition);
      if (!parsedDefinition.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "This form's definition could not be read.",
        });
      }
      const definition = parsedDefinition.data;

      const parsed = parseFormCsv(definition, input.csvContent);

      const sample = parsed.validRows.slice(0, 5).map((row) => ({
        submittedAt: row.submittedAt,
        status: row.status,
        tags: row.tags,
        answers: toAnswerSnapshot(definition.fields, row.values),
      }));

      return {
        matchedColumns: parsed.matchedColumns,
        ignoredColumns: parsed.ignoredColumns,
        missingFields: parsed.missingFields,
        totalRows: parsed.totalRows,
        validCount: parsed.validRows.length,
        skippedEmptyRows: parsed.skippedEmptyRows,
        errors: parsed.errors.slice(0, 100),
        errorCount: parsed.errors.length,
        sample,
      };
    }),

  commitImport: ownerAdminProcedure
    .input(formImportSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const form = await ctx.db.form.findUnique({
        where: { id: input.formId, businessId },
        select: { id: true, name: true, definition: true },
      });
      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      const parsedDefinition = parseStoredFormDefinition(form.definition);
      if (!parsedDefinition.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "This form's definition could not be read.",
        });
      }
      const definition = parsedDefinition.data;

      // Re-parsed server-side rather than trusting `previewImport`'s output:
      // the owner may have edited the form between preview and commit.
      const parsed = parseFormCsv(definition, input.csvContent);
      if (parsed.validRows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No valid rows to import.",
        });
      }

      const rows = parsed.validRows.map((row) => {
        const snapshot = toAnswerSnapshot(definition.fields, row.values);
        return {
          businessId,
          formId: form.id,
          formName: form.name,
          submittedAt: row.submittedAt,
          status: row.status,
          tags: row.tags,
          source: "IMPORT",
          answers: serializeAnswers(snapshot),
          submitterEmail: getConfirmationEmail(definition, row.values),
        };
      });

      // `prisma-field-encryption` encrypts `createMany`'s `data` array the
      // same as any other write — it traverses the whole `args` tree, not
      // just `create`/`update` shapes — so a plain chunked `createMany`
      // encrypts `answers`/`submitterEmail` exactly like `create` does.
      let imported = 0;
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const result = await ctx.db.formSubmission.createMany({ data: chunk });
        imported += result.count;
      }

      return { imported };
    }),
});
