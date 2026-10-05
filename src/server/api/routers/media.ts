/**
 * Media Library tRPC router (shop admin).
 *
 * Provides four procedures gated behind the `media` feature flag:
 *
 *   list          — query   — list all S3 objects for a business with usage info
 *   delete        — mutation — delete an unused S3 object (blocks if in use)
 *   bulkDelete    — mutation — delete multiple unused S3 objects (owner-only,
 *                              partial success by design — see its own doc comment)
 *   getDownloadUrl — mutation — generate a presigned download URL
 *
 * Every procedure acts on the HOST-resolved business (`ctx.businessId`) only.
 * There is deliberately no `businessId` override: platform admins manage
 * another business's library from the platform hub instead
 * (`platformMedia`, src/server/api/routers/platform-media.ts). The bodies —
 * and every key/usage guard — live in `~/server/media/library`, shared by
 * both routers.
 */

import {
  mediaBulkDeleteInput,
  mediaDeleteInput,
  mediaDownloadInput,
  mediaListInput,
} from "~/lib/validators/media";
import {
  bulkDeleteMedia,
  deleteMedia,
  getMediaDownloadUrl,
  listMedia,
} from "~/server/media/library";

import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  ownerOnlyProcedure,
} from "../trpc";

export const mediaRouter = createTRPCRouter({
  /**
   * List all S3 objects for the host's business, annotated with usage info.
   * See `listMedia`.
   */
  list: ownerAdminProcedure
    .use(featureGate("media"))
    .input(mediaListInput)
    .query(({ ctx }) => listMedia(ctx.businessId)),

  /**
   * Delete one S3 object — blocked when it has any ACTIVE usage or is a
   * logo/favicon fixed-key asset; inactive-template-only usages are scrubbed.
   * See `deleteMedia` for the full contract.
   */
  delete: ownerAdminProcedure
    .use(featureGate("media"))
    .input(mediaDeleteInput)
    .mutation(({ ctx, input }) =>
      deleteMedia(ctx.db, ctx.businessId, input.key),
    ),

  /**
   * Bulk-delete S3 objects — owner-only, per platform standard (bulk delete
   * reaches outside the DB into S3 cleanup, so it stays a notch stricter than
   * the per-file `delete` above, which is ownerAdminProcedure). Partial
   * success by design — see `bulkDeleteMedia`.
   */
  bulkDelete: ownerOnlyProcedure
    .use(featureGate("media"))
    .input(mediaBulkDeleteInput)
    .mutation(({ ctx, input }) =>
      bulkDeleteMedia(ctx.db, ctx.businessId, input.keys),
    ),

  /**
   * Generate a short-lived presigned download URL. A mutation (not a query)
   * so URLs are never cached by tRPC's query layer — see `getMediaDownloadUrl`.
   */
  getDownloadUrl: ownerAdminProcedure
    .use(featureGate("media"))
    .input(mediaDownloadInput)
    .mutation(({ ctx, input }) =>
      getMediaDownloadUrl(ctx.businessId, input.key),
    ),
});
