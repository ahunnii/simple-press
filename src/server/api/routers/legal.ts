import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { PolicyAcceptanceEntry } from "~/lib/legal/policy-acceptance.server";
import {
  findMaterialUpdate,
  MATERIAL_POLICY_UPDATES,
  policyToday,
} from "~/lib/legal/material-updates";
import { resolveOwnerTermsWrite } from "~/lib/legal/owner-terms-gate";
import { recordPolicyAcceptance } from "~/lib/legal/policy-acceptance.server";
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
        const { membershipWon, userWon } = await ctx.db.$transaction(
          async (tx) => ({
            // `updateMany` with the null guard in the WHERE, rather than
            // `update`, so two concurrent submissions cannot race one over the
            // other: the second matches zero rows and the first acceptance —
            // the one that is actually the evidence — survives.
            membershipWon: write.membership
              ? (
                  await tx.businessMembership.updateMany({
                    where: {
                      userId,
                      businessId,
                      role: "OWNER",
                      merchantTermsAcceptedAt: null,
                    },
                    data: write.membership,
                  })
                ).count > 0
              : false,
            userWon: write.user
              ? (
                  await tx.user.updateMany({
                    where: { id: userId, termsAcceptedAt: null },
                    data: write.user,
                  })
                ).count > 0
              : false,
          }),
        );

        // Append to the PolicyAcceptance log only what THIS request actually
        // stamped (a racing duplicate matched zero rows above), after commit,
        // best-effort — a missing table can never undo the acceptance.
        const logRows: PolicyAcceptanceEntry[] = [];
        if (write.membership && membershipWon) {
          logRows.push({
            userId,
            businessId,
            bundle: "merchant",
            version: write.membership.merchantTermsVersion,
            method: "clickwrap",
            acceptedAt: write.membership.merchantTermsAcceptedAt,
          });
        }
        if (write.user && userWon) {
          logRows.push({
            userId,
            businessId,
            bundle: "platform",
            version: write.user.termsVersion,
            method: "clickwrap",
            acceptedAt: write.user.termsAcceptedAt,
          });
        }
        await recordPolicyAcceptance(logRows);
      }

      return { accepted: true };
    }),

  /**
   * Record a store owner's acknowledgement of a MATERIAL policy update (see
   * `~/lib/legal/material-updates`) — one `notice-ack` row in the
   * `PolicyAcceptance` log per bundle the update touches.
   *
   * Same trust model as `acceptOwnerTerms`:
   *
   * - The business comes from `ownerOnlyProcedure` (request host), never the
   *   client.
   * - OWNER only, and never a PLATFORM_ADMIN. `ownerOnlyProcedure` lets
   *   platform admins through with `ctx.membershipRole === null`; they are
   *   rejected here even if they also hold a membership row, because an
   *   acknowledgement from them would fabricate a merchant's legal record.
   *   The membership is also re-read, like `acceptOwnerTerms`.
   * - `updateId` must name an update in `MATERIAL_POLICY_UPDATES` that has
   *   already been announced. The timestamp is the server clock.
   *
   * Idempotent: bundles already acknowledged (for the merchant bundle, in
   * THIS store) are skipped, so a double-click or a second tab is harmless.
   * Unlike the clickwrap paths, this does NOT fail open: the acknowledgement
   * is the whole point of the call, so a failed write surfaces as an error
   * and the notice stays up.
   */
  acknowledgePolicyUpdate: ownerOnlyProcedure
    .input(z.object({ updateId: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const businessId = ctx.businessId;

      if (ctx.membershipRole !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only the owner of this store can acknowledge policy updates.",
        });
      }

      const membership = await ctx.db.businessMembership.findUnique({
        where: { userId_businessId: { userId, businessId } },
        select: { role: true },
      });
      if (membership?.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only the owner of this store can acknowledge policy updates.",
        });
      }

      const now = new Date();
      const update = findMaterialUpdate(
        MATERIAL_POLICY_UPDATES,
        input.updateId,
      );
      if (!update || update.announcedOn > policyToday(now)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "That policy update doesn't exist.",
        });
      }

      // Which bundles already have a row for this update. Merchant acks are
      // per store; platform acks attach to the account.
      const existing = await ctx.db.policyAcceptance.findMany({
        where: {
          userId,
          version: update.id,
          method: "notice-ack",
          bundle: { in: [...update.documents] },
          OR: [{ bundle: "platform" }, { businessId }],
        },
        select: { bundle: true },
      });
      const done = new Set(existing.map((row) => row.bundle));

      const toWrite = update.documents.filter((bundle) => !done.has(bundle));
      if (toWrite.length > 0) {
        await ctx.db.policyAcceptance.createMany({
          data: toWrite.map((bundle) => ({
            userId,
            businessId,
            bundle,
            version: update.id,
            method: "notice-ack",
            // Server clock. A client-controlled timestamp is not evidence.
            acceptedAt: now,
          })),
        });
      }

      return { acknowledged: true, updateId: update.id };
    }),
});
