/**
 * Media Library tRPC router.
 *
 * Provides four procedures gated behind the `media` feature flag:
 *
 *   list          — query   — list all S3 objects for a business with usage info
 *   delete        — mutation — delete an unused S3 object (blocks if in use)
 *   bulkDelete    — mutation — delete multiple unused S3 objects (owner-only,
 *                              partial success by design — see its own doc comment)
 *   getDownloadUrl — mutation — generate a presigned download URL
 *
 * All procedures accept an optional `businessId` that is only honoured when the
 * caller is a PLATFORM_ADMIN.  Non-platform-admins are silently scoped to their
 * own business (mirrors the discardUploads pattern in upload.ts).
 */

import type { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";

import type { DbClient } from "~/server/db";
import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { scrubUrlsFromCustomFields } from "~/lib/media/scrub-custom-fields";
import { buildUsedMediaIndex, isAlwaysInUseKey } from "~/lib/media/usage";
import { deleteStoredObjects } from "~/lib/s3/delete";
import { listBusinessObjects } from "~/lib/s3/list";
import { getPresignedDownloadUrl } from "~/lib/s3/presign";
import { keyToPublicUrl } from "~/lib/s3/url";
import {
  mediaBulkDeleteInput,
  mediaDeleteInput,
  mediaDownloadInput,
  mediaListInput,
} from "~/lib/validators/media";

import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  ownerOnlyProcedure,
} from "../trpc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SessionCtx = {
  session: { user: { id: string } };
  businessId: string;
};

/**
 * Return the target `businessId` for the operation.
 *
 * Platform admins may target any business via `inputBusinessId`.
 * All other callers are always scoped to `ctx.businessId`.
 */
async function resolveTarget(
  ctx: SessionCtx,
  inputBusinessId?: string,
): Promise<string> {
  if (inputBusinessId && (await isPlatformAdmin(ctx.session.user.id))) {
    return inputBusinessId;
  }
  return ctx.businessId;
}

/**
 * Scrub a set of file URLs out of a business's `SiteContent.customFields` /
 * `previewCustomFields` blobs — the leftover field values a template stops
 * pointing at once the owner switches away from it (see the `inactiveTemplate`
 * flag in `~/lib/media/usage`).
 *
 * Callers MUST only pass URLs whose every usage is `inactiveTemplate` — the
 * scrub is blob-wide, not template-scoped (see `scrubUrlsFromCustomFields`'s
 * own contract), so scrubbing a URL with any active usage would blank live
 * content. Both `delete` and `bulkDelete` only reach this after confirming
 * the file has zero ACTIVE usages, so that invariant holds by construction.
 *
 * One read, at most one write — a no-op (no SiteContent row, or neither blob
 * changed) issues zero writes.
 */
async function scrubMediaUrlsFromSiteContent(
  db: DbClient,
  businessId: string,
  urls: ReadonlySet<string>,
): Promise<void> {
  if (urls.size === 0) return;

  const siteContent = await db.siteContent.findUnique({
    where: { businessId },
    select: { customFields: true, previewCustomFields: true },
  });
  if (!siteContent) return;

  const scrubbedCustom = scrubUrlsFromCustomFields(
    siteContent.customFields,
    urls,
  );
  const scrubbedPreview = scrubUrlsFromCustomFields(
    siteContent.previewCustomFields,
    urls,
  );

  if (!scrubbedCustom.changed && !scrubbedPreview.changed) return;

  const data: Prisma.SiteContentUpdateInput = {};
  if (scrubbedCustom.changed) {
    data.customFields = scrubbedCustom.value as Prisma.InputJsonValue;
  }
  if (scrubbedPreview.changed) {
    data.previewCustomFields = scrubbedPreview.value as Prisma.InputJsonValue;
  }

  await db.siteContent.update({ where: { businessId }, data });
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
      const target = await resolveTarget(ctx, input.businessId);

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
   * Delete an S3 object — blocked when the object has any ACTIVE usage
   * anywhere in the DB (i.e. a usage without the `inactiveTemplate` flag —
   * see `~/lib/media/usage`) or is a logo/favicon fixed-key asset. A file
   * whose every usage is `inactiveTemplate` (leftover content from a
   * template the owner switched away from) is deletable; deleting it also
   * scrubs its URL out of `SiteContent.customFields`/`previewCustomFields`
   * so the old template falls back to its field defaults if ever reactivated.
   *
   * The usage check is re-run server-side (TOCTOU guard — never trust the
   * client's `usedBy` list).
   */
  delete: ownerAdminProcedure
    .use(featureGate("media"))
    .input(mediaDeleteInput)
    .mutation(async ({ ctx, input }) => {
      const target = await resolveTarget(ctx, input.businessId);

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

      // A file is blocked only by ACTIVE usages — usages flagged
      // `inactiveTemplate` are leftover field values from a template the
      // owner switched away from, and are safe to clean up (see the doc
      // comment above).
      const activeUsages = usages.filter((u) => !u.inactiveTemplate);

      if (activeUsages.length > 0) {
        const summary = activeUsages
          .slice(0, 5)
          .map((u) => u.location + (u.entityLabel ? ` (${u.entityLabel})` : ""))
          .join(", ");
        const more =
          activeUsages.length > 5 ? ` and ${activeUsages.length - 5} more` : "";

        throw new TRPCError({
          code: "CONFLICT",
          message: `This file is in use and cannot be deleted. Referenced by: ${summary}${more}.`,
        });
      }

      // The file is deletable. If it had any (necessarily inactive-template)
      // usages, scrub its URL out of SiteContent first — DB before S3, so a
      // template field can never be left pointing at a deleted object.
      if (usages.length > 0) {
        await scrubMediaUrlsFromSiteContent(ctx.db, target, new Set([url]));
      }

      await deleteStoredObjects([url]);

      return { success: true };
    }),

  /**
   * Bulk-delete S3 objects — owner-only, per platform standard (bulk delete
   * reaches outside the DB into S3 cleanup, so it stays a notch stricter than
   * the per-file `delete` above, which is ownerAdminProcedure).
   *
   * The usage check is re-run server-side against a single freshly-built
   * usage index (TOCTOU guard — never trust the client's `usedBy` list).
   * Partial success is by design: logo/favicon keys and anything with an
   * ACTIVE usage (i.e. in use by the business's current, live setup) are
   * silently skipped rather than failing the whole batch — there's no undo
   * for S3 deletes, so the client reports the shortfall from `skipped`
   * instead of the caller retrying a half-applied mutation. A key whose every
   * usage is `inactiveTemplate` (leftover content from a template the owner
   * switched away from) IS deleted, and its URL is scrubbed out of
   * `SiteContent.customFields`/`previewCustomFields` in the same pass —
   * safe by construction, since a file with any active usage never reaches
   * `deletableKeys` in the first place.
   */
  bulkDelete: ownerOnlyProcedure
    .use(featureGate("media"))
    .input(mediaBulkDeleteInput)
    .mutation(async ({ ctx, input }) => {
      const target = await resolveTarget(ctx, input.businessId);

      // Cross-tenant guard: every key must be scoped to the resolved
      // business. Unlike the per-key skips below, this is a hard fail for
      // the whole batch — a foreign key here is an attack or a bug, not a
      // skippable row.
      const foreignKey = input.keys.find(
        (key) => !key.startsWith(`${target}/`),
      );
      if (foreignKey) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "One or more keys do not belong to the target business.",
        });
      }

      const keys = Array.from(new Set(input.keys));

      // Re-run the usage scan server-side once for the whole batch (never
      // trust client `usedBy`), then partition keys into deletable vs.
      // skipped.
      const usageIndex = await buildUsedMediaIndex(target);

      const deletableKeys: string[] = [];
      const skipped: Array<{ key: string; reason: "in-use" | "protected" }> =
        [];
      // Public URLs of deletable keys that had (necessarily inactive-template)
      // usages — these need their leftover field values scrubbed.
      const inactiveOnlyUrls = new Set<string>();

      for (const key of keys) {
        if (isAlwaysInUseKey(key)) {
          skipped.push({ key, reason: "protected" });
          continue;
        }

        const usages = usageIndex.get(keyToPublicUrl(key)) ?? [];
        const activeUsages = usages.filter((u) => !u.inactiveTemplate);
        if (activeUsages.length > 0) {
          skipped.push({ key, reason: "in-use" });
          continue;
        }

        deletableKeys.push(key);
        if (usages.length > 0) {
          inactiveOnlyUrls.add(keyToPublicUrl(key));
        }
      }

      if (inactiveOnlyUrls.size > 0) {
        await scrubMediaUrlsFromSiteContent(ctx.db, target, inactiveOnlyUrls);
      }

      if (deletableKeys.length > 0) {
        await deleteStoredObjects(
          deletableKeys.map((key) => keyToPublicUrl(key)),
        );
      }

      return {
        deletedCount: deletableKeys.length,
        deletedKeys: deletableKeys,
        skipped,
      };
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
      const target = await resolveTarget(ctx, input.businessId);

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
