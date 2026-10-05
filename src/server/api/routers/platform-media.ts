/**
 * Platform hub Media Library router — a PLATFORM_ADMIN managing ANY business's
 * library from `platform.*` (the hub has no host-resolved business, so the
 * shop `media` router can't serve it).
 *
 *   list           — query    — the business's files + usage, and whether its
 *                                `media` flag is on (for the page's note)
 *   delete         — mutation — delete one unused file
 *   bulkDelete     — mutation — delete many unused files (partial success)
 *   getDownloadUrl — mutation — presigned download URL
 *
 * Every procedure takes a REQUIRED `businessId` and checks the business exists
 * (any status — suspended stores still need remediation). There is no
 * `featureGate`: the hub isn't tied to the tenant's flag, and the page shows a
 * note instead when it's off. Key-prefix, logo/favicon and usage guards all
 * live in `~/server/media/library`, shared with the shop router.
 */

import { TRPCError } from "@trpc/server";

import type { DbClient } from "~/server/db";
import { resolveFlags } from "~/lib/features/resolve-flags";
import {
  platformMediaBulkDeleteInput,
  platformMediaDeleteInput,
  platformMediaDownloadInput,
  platformMediaListInput,
} from "~/lib/validators/media";
import { createTRPCRouter, platformAdminProcedure } from "~/server/api/trpc";
import {
  bulkDeleteMedia,
  deleteMedia,
  getMediaDownloadUrl,
  listMedia,
} from "~/server/media/library";

/**
 * Load the target business or throw NOT_FOUND. Runs before any S3 call so a
 * typo'd or deleted id never lists/deletes under a dangling `${id}/` prefix.
 */
async function requireBusiness(db: DbClient, businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { id: true, featureFlags: true },
  });
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  return business;
}

export const platformMediaRouter = createTRPCRouter({
  list: platformAdminProcedure
    .input(platformMediaListInput)
    .query(async ({ ctx, input }) => {
      const business = await requireBusiness(ctx.db, input.businessId);
      const { businessId, items } = await listMedia(business.id);
      // Same merge + dependency cascade as `features.getFlags` / `featureGate`.
      const mediaEnabled = resolveFlags(business.featureFlags).isEnabled(
        "media",
      );
      return { businessId, items, mediaEnabled };
    }),

  delete: platformAdminProcedure
    .input(platformMediaDeleteInput)
    .mutation(async ({ ctx, input }) => {
      const business = await requireBusiness(ctx.db, input.businessId);
      return deleteMedia(ctx.db, business.id, input.key);
    }),

  bulkDelete: platformAdminProcedure
    .input(platformMediaBulkDeleteInput)
    .mutation(async ({ ctx, input }) => {
      const business = await requireBusiness(ctx.db, input.businessId);
      return bulkDeleteMedia(ctx.db, business.id, input.keys);
    }),

  getDownloadUrl: platformAdminProcedure
    .input(platformMediaDownloadInput)
    .mutation(async ({ ctx, input }) => {
      const business = await requireBusiness(ctx.db, input.businessId);
      return getMediaDownloadUrl(business.id, input.key);
    }),
});
