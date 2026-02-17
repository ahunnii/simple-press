import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDepency,
} from "~/lib/features/registry";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  protectedProcedure,
} from "../trpc";

export const featuresRouter = createTRPCRouter({
  // Get resolved flags for a business (merges defaults + overrides)
  getFlags: protectedProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ ctx, input }) => {
      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
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
      const disabledByDependency = getDisabledDueToDepency(merged);

      return {
        flags: merged,
        disabledByDependency,
      };
    }),

  // Owner toggles a single flag (if ownerCanToggle)
  toggle: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        key: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== input.businessId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const feature = FEATURE_REGISTRY[input.key];
      if (!feature) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown feature flag",
        });
      }
      if (!feature.ownerCanToggle) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This feature can only be toggled by platform admins",
        });
      }

      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { featureFlags: true },
      });

      const current = (business?.featureFlags as Record<string, boolean>) ?? {};
      const updated = { ...current, [input.key]: input.enabled };

      await ctx.db.business.update({
        where: { id: input.businessId },
        data: { featureFlags: updated },
      });

      return { success: true };
    }),

  // Platform admin: set flags for any business
  adminSetFlags: ownerAdminProcedure
    .input(
      z.object({
        businessId: z.string(),
        flags: z.record(z.string(), z.boolean()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Check platform admin role
      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { featureFlags: true },
      });

      const current = (business?.featureFlags as Record<string, boolean>) ?? {};
      const updated = { ...current, ...input.flags };

      await ctx.db.business.update({
        where: { id: input.businessId },
        data: { featureFlags: updated },
      });

      return { success: true };
    }),
});
