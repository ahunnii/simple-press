/**
 * Media Library tRPC router.
 *
 * Provides three procedures gated behind the `media` feature flag:
 *
 *   list          — query   — list all S3 objects for a business with usage info
 *   delete        — mutation — delete an unused S3 object (blocks if in use)
 *   getDownloadUrl — mutation — generate a presigned download URL
 *
 * All procedures accept an optional `businessId` that is only honoured when the
 * caller is a PLATFORM_ADMIN.  Non-platform-admins are silently scoped to their
 * own business (mirrors the discardUploads pattern in upload.ts).
 */

import { TRPCError } from "@trpc/server";

import { buildUsedMediaIndex, isAlwaysInUseKey } from "~/lib/media/usage";
import { deleteStoredObjects } from "~/lib/s3/delete";
import { listBusinessObjects } from "~/lib/s3/list";
import { getPresignedDownloadUrl } from "~/lib/s3/presign";
import { keyToPublicUrl } from "~/lib/s3/url";
import {
  mediaDeleteInput,
  mediaDownloadInput,
  mediaListInput,
} from "~/lib/validators/media";

import { createTRPCRouter, featureGate, ownerAdminProcedure } from "../trpc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SessionCtx = {
  session: { user: { platformRole: string } };
  businessId: string;
};

/**
 * Return the target `businessId` for the operation.
 *
 * Platform admins may target any business via `inputBusinessId`.
 * All other callers are always scoped to `ctx.businessId`.
 */
function resolveTarget(ctx: SessionCtx, inputBusinessId?: string): string {
  if (inputBusinessId && ctx.session.user.platformRole === "PLATFORM_ADMIN") {
    return inputBusinessId;
  }
  return ctx.businessId;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const mediaRouter = createTRPCRouter({
  /**
   * List all S3 objects for the resolved business, annotated with usage info.
   *
   * Filtering / search is intentionally deferred to the client — the list is
   * small enough (<<10 k objects per business) that in-memory filtering is fine.
   */
  list: ownerAdminProcedure
    .use(featureGate("media"))
    .input(mediaListInput)
    .query(async ({ ctx, input }) => {
      const target = resolveTarget(ctx, input.businessId);

      // Fetch S3 object list and usage index in parallel
      const [objects, usageIndex] = await Promise.all([
        listBusinessObjects(target),
        buildUsedMediaIndex(target),
      ]);

      const items = objects.map((obj) => {
        const usedBy = usageIndex.get(obj.url) ?? [];

        // Logo/favicon fixed-key objects are always in use even if the DB
        // column hasn't been updated yet (e.g., immediately after upload)
        if (isAlwaysInUseKey(obj.key) && usedBy.length === 0) {
          usedBy.push({
            url: obj.url,
            location: "Brand asset (logo/favicon)",
            entityType: "siteContent",
          });
        }

        return { ...obj, usedBy };
      });

      return { businessId: target, items };
    }),

  /**
   * Delete an S3 object — blocked when the object is referenced anywhere in
   * the DB or is a logo/favicon fixed-key asset.
   *
   * The usage check is re-run server-side (TOCTOU guard — never trust the
   * client's `usedBy` list).
   */
  delete: ownerAdminProcedure
    .use(featureGate("media"))
    .input(mediaDeleteInput)
    .mutation(async ({ ctx, input }) => {
      const target = resolveTarget(ctx, input.businessId);

      // Cross-tenant guard: key must be scoped to the resolved business
      if (!input.key.startsWith(`${target}/`)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Key does not belong to the target business.",
        });
      }

      // Always-in-use guard for logo/favicon fixed-key objects
      if (isAlwaysInUseKey(input.key)) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Logo and favicon assets are always in use and cannot be deleted from the Media Library. Upload a replacement to overwrite them.",
        });
      }

      // Re-run the usage scan server-side (never trust client `usedBy`)
      const usageIndex = await buildUsedMediaIndex(target);
      const url = keyToPublicUrl(input.key);
      const usages = usageIndex.get(url) ?? [];

      if (usages.length > 0) {
        const summary = usages
          .slice(0, 5)
          .map((u) => u.location + (u.entityLabel ? ` (${u.entityLabel})` : ""))
          .join(", ");
        const more = usages.length > 5 ? ` and ${usages.length - 5} more` : "";

        throw new TRPCError({
          code: "CONFLICT",
          message: `This file is in use and cannot be deleted. Referenced by: ${summary}${more}.`,
        });
      }

      await deleteStoredObjects([url]);

      return { success: true };
    }),

  /**
   * Generate a short-lived presigned download URL for the given S3 object key.
   *
   * Returns a mutation (not a query) so that URLs are never cached by tRPC's
   * query layer and are always freshly signed on demand.
   */
  getDownloadUrl: ownerAdminProcedure
    .use(featureGate("media"))
    .input(mediaDownloadInput)
    .mutation(async ({ ctx, input }) => {
      const target = resolveTarget(ctx, input.businessId);

      // Cross-tenant guard
      if (!input.key.startsWith(`${target}/`)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Key does not belong to the target business.",
        });
      }

      const downloadName = input.key.split("/").pop() ?? input.key;

      const url = await getPresignedDownloadUrl(input.key, { downloadName });

      return { url };
    }),
});
