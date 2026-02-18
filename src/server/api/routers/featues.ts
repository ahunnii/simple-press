import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "~/lib/features/registry";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "../trpc";

export const featuresRouter = createTRPCRouter({
  // Get resolved flags for a business (merges defaults + overrides)
  getFlags: publicProcedure.query(async ({ ctx }) => {
    const businessId = await checkBusiness();

    if (!businessId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    const business = await ctx.db.business.findUnique({
      where: { id: businessId.id },
      select: { featureFlags: true },
    });

    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    // Merge defaults with stored overrides
    const defaults = getDefaultFlags();
    const stored = (business.featureFlags as Record<string, boolean>) ?? {};
    const merged = { ...defaults, ...stored };

    // Compute which flags are disabled due to dependency
    const disabledByDependency = getDisabledDueToDependency(merged);

    return {
      flags: merged,
      disabledByDependency,
    };
  }),

  // Owner toggles a single flag (if ownerCanToggle)
  toggle: ownerAdminProcedure
    .input(
      z.object({
        key: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const feature = FEATURE_REGISTRY[input.key];

      if (!feature) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown feature flag",
        });
      }
      if (!feature.ownerCanToggle && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This feature can only be toggled by platform admins",
        });
      }

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { featureFlags: true },
      });

      const current = (business?.featureFlags as Record<string, boolean>) ?? {};
      const updated = { ...current, [input.key]: input.enabled };

      await ctx.db.business.update({
        where: { id: businessId },
        data: { featureFlags: updated },
      });

      return { success: true };
    }),

  // Platform admin: set flags for any business
  adminSetFlags: ownerAdminProcedure
    .input(z.object({ flags: z.record(z.string(), z.boolean()) }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This feature can only be set by platform admins",
        });
      }

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { featureFlags: true },
      });

      const current = (business?.featureFlags as Record<string, boolean>) ?? {};
      const updated = { ...current, ...input.flags };

      await ctx.db.business.update({
        where: { id: businessId },
        data: { featureFlags: updated },
      });

      return { success: true };
    }),
});
