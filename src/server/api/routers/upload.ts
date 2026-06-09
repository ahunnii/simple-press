/**
 * Feature-agnostic upload utility router.
 *
 * Provides a shared `discardUploads` mutation that any admin feature (galleries,
 * products, collections, …) can call to clean up S3 objects that were uploaded
 * but never persisted to the DB.  It is intentionally NOT gated behind any
 * feature flag so that all current and future features can use it.
 */

import { z } from "zod";

import { env } from "~/env";
import { deleteStoredObjects } from "~/lib/s3/delete";

import { createTRPCRouter, ownerAdminProcedure } from "../trpc";

export const uploadRouter = createTRPCRouter({
  /**
   * Discard uploaded S3 objects that were never persisted to the DB.
   *
   * Only objects whose URLs begin with the caller's own business-scoped prefix
   * are deleted — requests for other tenants' objects are silently filtered out
   * (cross-tenant safety without throwing so the caller's error path stays clean).
   */
  discardUploads: ownerAdminProcedure
    .input(z.object({ urls: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const allowedPrefix = `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${businessId}/`;

      const ownedUrls = input.urls.filter((url) =>
        url.startsWith(allowedPrefix),
      );

      if (ownedUrls.length > 0) {
        await deleteStoredObjects(ownedUrls);
      }

      return { success: true };
    }),
});
