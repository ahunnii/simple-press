import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { checkBusiness } from "~/lib/check-business";
import { FEATURE_REGISTRY } from "~/lib/features/registry";
import { resolveFlags } from "~/lib/features/resolve-flags";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "../trpc";

/**
 * Feature keys a MANAGER may see but not toggle — only the OWNER (or a
 * PLATFORM_ADMIN) can flip them.
 */
const OWNER_ONLY_TOGGLE_KEYS = new Set(["wordpressExport"]);

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

    const { flags, disabledByDependency } = resolveFlags(business.featureFlags);

    // Preserve the Set response shape that existing callers depend on.
    return {
      flags,
      disabledByDependency: new Set(disabledByDependency),
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
      if (
        !feature.ownerCanToggle &&
        !(await isPlatformAdmin(ctx.session.user.id))
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This feature can only be toggled by platform admins",
        });
      }

      // Some owner-toggleable features are still OWNER-only to flip — this
      // procedure runs on `ownerAdminProcedure`, which also admits MANAGERs.
      // `wordpressExport` unlocks a full store export (customer records
      // included), so it stays with the owner, matching the Owner-only gate on
      // /admin/settings/data.
      if (
        OWNER_ONLY_TOGGLE_KEYS.has(input.key) &&
        !(await isPlatformAdmin(ctx.session.user.id))
      ) {
        const membership = await ctx.db.businessMembership.findUnique({
          where: {
            userId_businessId: { userId: ctx.session.user.id, businessId },
          },
          select: { role: true },
        });
        if (membership?.role !== "OWNER") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Only the store owner can turn ${feature.label} on or off.`,
          });
        }
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

      if (!(await isPlatformAdmin(ctx.session.user.id))) {
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
