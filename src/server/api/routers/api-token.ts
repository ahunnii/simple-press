import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { API_TOKEN_SCOPES, generateApiToken } from "~/lib/api-tokens";
import { getBusinessUrl } from "~/lib/business-url";
import { createTRPCRouter, ownerOnlyProcedure } from "~/server/api/trpc";

/** Most active (non-revoked) keys one store can hold at a time. */
export const MAX_ACTIVE_API_TOKENS = 10;

/**
 * Columns the owner UI may see. Deliberately excludes `tokenHash` — the hash
 * is the lookup key for authentication and must never leave the server.
 */
export const API_TOKEN_LIST_SELECT = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const;

/**
 * Owner-issued keys for the read-only Business Profile API (`/api/v1/...`).
 *
 * Every procedure uses `ownerOnlyProcedure` (OWNER of the host business, or
 * PLATFORM_ADMIN) — the same rule as the "Download your site" export route.
 * Managers and staff are rejected: a key hands the store's catalog to an
 * outside app, which is an owner-level decision.
 */
export const apiTokenRouter = createTRPCRouter({
  list: ownerOnlyProcedure.query(async ({ ctx }) => {
    const tokens = await ctx.db.businessApiToken.findMany({
      where: { businessId: ctx.businessId },
      select: API_TOKEN_LIST_SELECT,
      orderBy: { createdAt: "desc" },
    });
    // Active keys first, revoked ones after; newest first within each group.
    return [
      ...tokens.filter((t) => !t.revokedAt),
      ...tokens.filter((t) => t.revokedAt),
    ];
  }),

  create: ownerOnlyProcedure
    .input(z.object({ name: z.string().trim().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const activeCount = await ctx.db.businessApiToken.count({
        where: { businessId, revokedAt: null },
      });
      if (activeCount >= MAX_ACTIVE_API_TOKENS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You can have up to ${MAX_ACTIVE_API_TOKENS} active keys. Revoke one you no longer use first.`,
        });
      }

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { subdomain: true, customDomain: true, domainStatus: true },
      });
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const { token, tokenHash, prefix } = generateApiToken();
      const row = await ctx.db.businessApiToken.create({
        data: {
          businessId,
          name: input.name,
          tokenHash,
          prefix,
          scopes: [...API_TOKEN_SCOPES],
          createdById: ctx.session.user.id,
        },
        select: { id: true },
      });

      const siteUrl = getBusinessUrl({
        subdomain: business.subdomain ?? "",
        customDomain: business.customDomain,
        domainStatus: business.domainStatus,
      });

      // The raw token exists only in this response — it is never stored.
      return {
        id: row.id,
        token,
        prefix,
        siteUrl,
        endpointUrl: `${siteUrl}/api/v1/business-profile`,
      };
    }),

  revoke: ownerOnlyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Scoped to this business, and only touches still-active rows, so
      // revoking twice (or another store's id) is a harmless no-op.
      await ctx.db.businessApiToken.updateMany({
        where: {
          id: input.id,
          businessId: ctx.businessId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      return { success: true };
    }),
});
