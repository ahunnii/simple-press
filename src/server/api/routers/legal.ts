import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { resolveOwnerTermsWrite } from "~/lib/legal/owner-terms-gate";
import { createTRPCRouter, ownerOnlyProcedure } from "~/server/api/trpc";

/**
 * Legal / policy acceptance.
 *
 * Terms acceptance was introduced after this platform already had live stores,
 * and the existing rows were deliberately not backfilled — `null` honestly
 * means "never accepted". `/admin` soft-blocks owners in that state (see
 * `src/app/admin/layout.tsx`); this is where their answer is recorded.
 *
 * Semantics deliberately mirror `src/app/api/claim/route.ts`, which is the
 * other place an OWNER membership acquires an acceptance.
 */
export const legalRouter = createTRPCRouter({
  /**
   * Record a store owner's retroactive acceptance of the Seller & Merchant
   * Agreement + Acceptable Use Policy, and (only if they have none on file)
   * the platform Terms of Service + Privacy Policy.
   *
   * Everything that makes this a usable record is derived server-side:
   *
   * - The business comes from `ownerOnlyProcedure`, which re-resolves it from
   *   the request host. A businessId from the client is never accepted, so an
   *   owner of store A cannot mark store B accepted.
   * - The membership is re-read here and must be `role === "OWNER"`. This is a
   *   second check on top of `ownerOnlyProcedure` for one specific reason: that
   *   procedure lets PLATFORM_ADMIN bypass the membership check, and a platform
   *   admin has no membership row to stamp — signing on a merchant's behalf
   *   would fabricate a legal record. They get FORBIDDEN instead.
   * - The timestamp is `new Date()` here; the version comes from
   *   `~/lib/legal/policy-versions`. Neither is ever read from the request.
   */
  acceptOwnerTerms: ownerOnlyProcedure
    .input(
      z.object({
        /** Seller & Merchant Agreement + Acceptable Use Policy. Must be true. */
        acceptedTerms: z.boolean(),
        /**
         * Platform ToS + Privacy Policy. Only honored when the account has
         * nothing on file — an owner who already agreed is never re-stamped.
         */
        acceptedPlatformTerms: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const businessId = ctx.businessId;

      const membership = await ctx.db.businessMembership.findUnique({
        where: { userId_businessId: { userId, businessId } },
        select: { role: true, merchantTermsAcceptedAt: true },
      });

      if (membership?.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only the owner of this store can accept the merchant agreement.",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { termsAcceptedAt: true },
      });

      const write = resolveOwnerTermsWrite({
        acceptedTerms: input.acceptedTerms,
        acceptedPlatformTerms: input.acceptedPlatformTerms,
        existingMerchantTermsAcceptedAt: membership.merchantTermsAcceptedAt,
        existingPlatformTermsAcceptedAt: user?.termsAcceptedAt ?? null,
        // Server clock. A client-controlled consent timestamp is not evidence.
        now: new Date(),
      });

      if (!write) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You must accept the Seller & Merchant Agreement and Acceptable Use Policy to continue.",
        });
      }

      // Nothing to write means an acceptance is already on file — that is a
      // success, not an error, so a double-click or a stale tab resolves
      // cleanly instead of stranding the owner on the interstitial.
      if (write.membership || write.user) {
        await ctx.db.$transaction(async (tx) => {
          if (write.membership) {
            // `updateMany` with the null guard in the WHERE, rather than
            // `update`, so two concurrent submissions cannot race one over the
            // other: the second matches zero rows and the first acceptance —
            // the one that is actually the evidence — survives.
            await tx.businessMembership.updateMany({
              where: {
                userId,
                businessId,
                role: "OWNER",
                merchantTermsAcceptedAt: null,
              },
              data: write.membership,
            });
          }
          if (write.user) {
            await tx.user.updateMany({
              where: { id: userId, termsAcceptedAt: null },
              data: write.user,
            });
          }
        });
      }

      return { accepted: true };
    }),
});
