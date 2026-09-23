import type { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  formCreateSchema,
  formUpdateSchema,
  parseStoredFormDefinition,
  toPublicFormDefinition,
} from "~/lib/validators/form";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/**
 * Form definitions — the owner-authored side of the Forms feature.
 *
 * Mirrors `quoteCalculatorRouter`: `getByIdPublic` is the only procedure that
 * hands a definition to a browser, and it runs every response through
 * `toPublicFormDefinition` so owner-only settings (the notification address,
 * confirmation email copy) never leave the server. Admin reads return the
 * raw stored blob and are gated behind `ownerAdminProcedure`.
 */
export const formRouter = createTRPCRouter({
  // ─── Admin: read ────────────────────────────────────────────────────────

  // Lean picker/list feed: id/name/published/updatedAt plus entry counts, for
  // both the admin Forms list and the TipTap `form` node picker. Deliberately
  // NOT the full definition — nothing here needs field-level detail.
  list: ownerAdminProcedure
    .use(featureGate("forms"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;

      const [forms, unreadGroups] = await Promise.all([
        ctx.db.form.findMany({
          where: { businessId },
          select: {
            id: true,
            name: true,
            published: true,
            updatedAt: true,
            _count: { select: { submissions: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),
        ctx.db.formSubmission.groupBy({
          by: ["formId"],
          where: { businessId, status: "NEW" },
          _count: { _all: true },
        }),
      ]);

      const unreadByFormId = new Map(
        unreadGroups.map((g) => [g.formId, g._count._all]),
      );

      return forms.map(({ _count, ...form }) => ({
        ...form,
        totalEntries: _count.submissions,
        unreadCount: unreadByFormId.get(form.id) ?? 0,
      }));
    }),

  getById: ownerAdminProcedure
    .use(featureGate("forms"))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const [form, totalEntries, unreadCount] = await Promise.all([
        ctx.db.form.findUnique({ where: { id: input.id, businessId } }),
        ctx.db.formSubmission.count({
          where: { businessId, formId: input.id },
        }),
        ctx.db.formSubmission.count({
          where: { businessId, formId: input.id, status: "NEW" },
        }),
      ]);

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      // Drift guard, same reasoning as quoteCalculator.getById: the strict
      // write schema would reject a legitimately-empty draft, so this uses
      // the read (tolerant) schema. A definition that fails even that is
      // truly corrupt and the builder needs to know.
      const parsed = parseStoredFormDefinition(form.definition);

      return {
        ...form,
        definition: parsed.success ? parsed.data : form.definition,
        definitionValid: parsed.success,
        totalEntries,
        unreadCount,
      };
    }),

  // ─── Admin: write ───────────────────────────────────────────────────────

  create: ownerAdminProcedure
    .use(featureGate("forms"))
    .input(formCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      return ctx.db.form.create({
        data: {
          businessId,
          name: input.name,
          published: input.published,
          definition: input.definition as Prisma.InputJsonValue,
        },
      });
    }),

  update: ownerAdminProcedure
    .use(featureGate("forms"))
    .input(formUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.form.findUnique({
        where: { id: input.id, businessId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      return ctx.db.form.update({
        where: { id: input.id },
        data: {
          name: input.name,
          published: input.published,
          definition: input.definition as Prisma.InputJsonValue,
        },
      });
    }),

  // Cascade (`FormSubmission.formId onDelete: Cascade`) removes every entry
  // along with the form — unlike quote calculators, a form's entries have no
  // meaning without the form they were collected on. Reporting the deleted
  // entry count lets the confirmation dialog say what it is actually about
  // to destroy.
  delete: ownerAdminProcedure
    .use(featureGate("forms"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.form.findUnique({
        where: { id: input.id, businessId },
        select: {
          id: true,
          _count: { select: { submissions: true } },
        },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      await ctx.db.form.delete({ where: { id: input.id, businessId } });

      return { success: true, deletedEntryCount: existing._count.submissions };
    }),

  duplicate: ownerAdminProcedure
    .use(featureGate("forms"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.form.findUnique({
        where: { id: input.id, businessId },
        select: { name: true, definition: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      return ctx.db.form.create({
        data: {
          businessId,
          name: `${existing.name} (copy)`,
          published: false,
          definition: existing.definition as Prisma.InputJsonValue,
        },
      });
    }),

  // ─── Public: storefront read ─────────────────────────────────────────────

  /**
   * The storefront's view of a form. Missing and unpublished are
   * deliberately indistinguishable — same reasoning as
   * `quoteCalculator.getByIdPublic`: an unpublished form is a draft and must
   * not be enumerable through a stale embed.
   */
  getByIdPublic: publicProcedure
    .use(featureGate("forms"))
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const form = await ctx.db.form.findUnique({
        where: { id: input.id, businessId: business.id },
        select: { id: true, name: true, definition: true, published: true },
      });

      if (!form?.published) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const parsed = parseStoredFormDefinition(form.definition);
      if (!parsed.success) {
        Sentry.captureException(parsed.error, {
          tags: { feature: "forms", step: "definition-drift" },
          extra: { formId: form.id, businessId: business.id },
        });
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      return {
        id: form.id,
        name: form.name,
        definition: toPublicFormDefinition(parsed.data),
      };
    }),
});
