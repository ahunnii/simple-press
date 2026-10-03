import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { TEMPLATES } from "~/lib/constants";
import { updateBusinessBasicsSchema } from "~/lib/validators/platform";
import { createTRPCRouter, platformAdminProcedure } from "~/server/api/trpc";
import {
  getTemplateOptionsForBusiness,
  setBusinessTemplate,
} from "~/server/business/template";

const businessIdInput = z.object({ businessId: z.string().min(1) });

export const platformBusinessRouter = createTRPCRouter({
  getOverview: platformAdminProcedure
    .input(businessIdInput)
    .query(async ({ ctx, input }) => {
      const { businessId } = input;

      const [business, latestOrder, openEditorNotes] = await Promise.all([
        ctx.db.business.findUnique({
          where: { id: businessId },
          select: {
            stripeAccountId: true,
            stripeChargesEnabled: true,
            stripePayoutsEnabled: true,
            _count: { select: { products: true, orders: true } },
          },
        }),
        ctx.db.order.findFirst({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        ctx.db.editorNote.count({
          where: { businessId, status: "open" },
        }),
      ]);

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      return {
        stripeConnected: !!business.stripeAccountId,
        stripeChargesEnabled: business.stripeChargesEnabled,
        stripePayoutsEnabled: business.stripePayoutsEnabled,
        productCount: business._count.products,
        orderCount: business._count.orders,
        lastOrderAt: latestOrder?.createdAt ?? null,
        openEditorNotes,
      };
    }),

  updateBasics: platformAdminProcedure
    .input(updateBusinessBasicsSchema.extend(businessIdInput.shape))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const supportEmail = input.supportEmail?.trim();

      return ctx.db.business.update({
        where: { id: input.businessId },
        data: {
          name: input.name,
          ownerEmail: input.ownerEmail,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must also collapse to null
          supportEmail: supportEmail ? supportEmail : null,
        },
        select: { id: true, name: true, ownerEmail: true, supportEmail: true },
      });
    }),

  setTemplate: platformAdminProcedure
    .input(
      businessIdInput.extend({
        templateId: z.enum(TEMPLATES.map((t) => t.id) as [string, ...string[]]),
      }),
    )
    .mutation(({ ctx, input }) =>
      setBusinessTemplate(ctx.db, input.businessId, input.templateId),
    ),

  listTemplateOptions: platformAdminProcedure
    .input(businessIdInput)
    .query(({ ctx, input }) =>
      getTemplateOptionsForBusiness(ctx.db, input.businessId),
    ),
});
