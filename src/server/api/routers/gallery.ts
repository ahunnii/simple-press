import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  buildGalleryExternalUsage,
  buildUsedMediaIndex,
  isAlwaysInUseKey,
  normalizeUrl,
} from "~/lib/media/usage";
import { deleteStoredObjects } from "~/lib/s3/delete";
import { publicUrlToKey } from "~/lib/s3/url";
import { generateGallerySlug } from "~/lib/slug";
import {
  galleryCreateSchema,
  galleryImageCreateSchema,
  galleryReorderImagesSchema,
  galleryUpdateImageSchema,
  galleryUpdateSchema,
} from "~/lib/validators/gallery";

import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
  publicProcedure,
} from "../trpc";

/**
 * Deletes the given S3 objects, but only those that NOTHING in the business
 * still references. Call AFTER the owning GalleryImage rows are removed — the
 * index is built fresh here, so the caller's just-deleted rows are already
 * absent from it while every surviving reference still shows up. That ordering
 * is what makes this correct; do not hoist the scan above the delete.
 *
 * This replaces a `galleryImage.count({ where: { url } })` check, which only
 * ever asked "does another GALLERY still show this image?". That was the case it
 * was written for (`gallery.duplicate` copies image URLs BY REFERENCE, so
 * deleting a duplicate must not destroy the original's files) but it missed the
 * larger one: the same S3 object can also be attached to a product, a variant, a
 * collection, a service, a page, a template field, a testimonial or a review.
 * Two paths reach that today — `MediaPickerDialog` hands back an existing
 * object's URL, and store-transfer import content-addresses by SHA-256 so
 * identical bytes collapse onto one shared key. Removing one image from a
 * gallery could therefore destroy a file a product page was still displaying.
 * `buildUsedMediaIndex` is the platform's one authority on "who references this
 * object" (it gates the Media Library's own delete, and `gallery.delete`'s
 * CONFLICT guard reaches it through `buildGalleryExternalUsage`), so this defers
 * to it rather than growing a second, always-behind copy of that knowledge.
 *
 * Mirrors `deleteUnreferencedImageObjects` in
 * `src/server/api/routers/product.ts` — same semantics, same three deliberate
 * strictnesses: `inactiveTemplate` usages still count as references (nothing
 * here scrubs the stale field values, so honouring the flag would leave a
 * switched-away template pointing at a 404), objects outside `{businessId}/` are
 * never touched (the index is business-scoped, so a foreign tenant's object
 * would look unreferenced here), and logo/favicon fixed-key objects are never
 * touched (`isAlwaysInUseKey`, matching the media router's hard protection —
 * reachable here because MediaPicker can drop the logo into a gallery).
 *
 * Non-storage URLs are skipped rather than handed to `deleteStoredObjects`,
 * which would only log an "unrecognised URL shape" error to Sentry.
 *
 * Best-effort (`deleteStoredObjects` never throws).
 */
async function deleteUnreferencedGalleryObjects(
  businessId: string,
  urls: string[],
) {
  const unique = [
    ...new Set(urls.filter((u): u is string => !!u).map(normalizeUrl)),
  ];
  if (unique.length === 0) return;

  // One scan for the whole batch — callers must pass every candidate URL in a
  // single call rather than looping (this scan touches a dozen tables).
  //
  // If the scan itself fails we do NOT fall back to deleting: without the index
  // there is no evidence the objects are unreferenced, and an orphaned file is
  // recoverable (the Media Library lists and deletes it) while a wrongly deleted
  // one is not.
  let usageIndex;
  try {
    usageIndex = await buildUsedMediaIndex(businessId);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "s3", operation: "delete-unreferenced" },
      extra: { businessId, urlCount: unique.length },
    });
    return;
  }

  const toDelete = unique.filter((url) => {
    const key = publicUrlToKey(url);
    if (!key) return false; // external URL — not ours to delete
    if (!key.startsWith(`${businessId}/`)) return false; // another tenant's object
    if (isAlwaysInUseKey(key)) return false; // logo / favicon
    return (usageIndex.get(url) ?? []).length === 0;
  });

  if (toDelete.length > 0) await deleteStoredObjects(toDelete);
}

export const galleryRouter = createTRPCRouter({
  list: ownerAdminProcedure
    .use(featureGate("galleries"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      return ctx.db.gallery.findMany({
        where: { businessId },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 4 },
          _count: { select: { images: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  // Which galleries are embedded outside their own image listing (gallery-type
  // template fields, TipTap `gallery` nodes) — powers the admin "Embedded"
  // badge. Shares buildGalleryExternalUsage with the delete guard so the two
  // can never drift: a gallery present here is exactly a gallery `delete`
  // would refuse to remove.
  usage: ownerAdminProcedure
    .use(featureGate("galleries"))
    .query(async ({ ctx }) => {
      const usage = await buildGalleryExternalUsage(ctx.businessId);
      // Plain record, not a Map — lean JSON; absent key = not embedded.
      const result: Record<string, { count: number; locations: string[] }> = {};
      for (const [galleryId, usages] of usage) {
        result[galleryId] = {
          count: usages.length,
          // Same formatting as the delete guard's CONFLICT message; cap at
          // 5, the client renders "and N more" from count.
          locations: usages
            .slice(0, 5)
            .map(
              (u) => u.location + (u.entityLabel ? ` (${u.entityLabel})` : ""),
            ),
        };
      }
      return result;
    }),

  getById: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const gallery = await ctx.db.gallery.findUnique({
        where: { id: input.id, businessId },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      return gallery;
    }),

  getByIdPublic: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("galleries"))
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      const gallery = await ctx.db.gallery.findUnique({
        where: { id, businessId },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      return gallery;
    }),

  create: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(galleryCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Auto-generate a unique slug from the gallery name (never user-supplied)
      const baseSlug = generateGallerySlug(input.name) || "gallery";
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        if (counter > 1000) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not generate a unique slug.",
          });
        }
        const existing = await ctx.db.gallery.findUnique({
          where: { businessId_slug: { businessId, slug } },
        });
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const { images, ...galleryData } = input;

      const gallery = await ctx.db.$transaction(async (tx) => {
        const created = await tx.gallery.create({
          data: {
            ...galleryData,
            slug,
            businessId,
          },
          include: { images: true },
        });

        if (images && images.length > 0) {
          await tx.galleryImage.createMany({
            data: images.map((img, index) => ({
              ...img,
              galleryId: created.id,
              sortOrder: index,
            })),
          });
        }

        return created;
      });

      return { data: gallery, message: "Gallery created successfully!" };
    }),

  update: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(galleryUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, ...data } = input;

      const gallery = await ctx.db.gallery.update({
        where: { id, businessId },
        data,
      });
      return { data: gallery, message: "Gallery updated successfully!" };
    }),

  delete: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      // Fetch image URLs before the cascade removes the rows
      const gallery = await ctx.db.gallery.findUnique({
        where: { id, businessId },
        select: { images: { select: { url: true } } },
      });

      // Usage-aware guard: block deletion if this gallery's images are
      // referenced anywhere outside the gallery's own listing. TipTap
      // `gallery` blocks and gallery-type template fields resolve to
      // per-image usage entries here (see src/lib/media/usage.ts). Mirrors
      // the usage check in the media router (src/server/api/routers/media.ts)
      // and shares its dedupe/lookup logic with the `usage` query above via
      // buildGalleryExternalUsage — the two can never drift.
      if (gallery && gallery.images.length > 0) {
        const externalUsageByGallery =
          await buildGalleryExternalUsage(businessId);
        const list = externalUsageByGallery.get(id) ?? [];

        if (list.length > 0) {
          const summary = list
            .slice(0, 5)
            .map(
              (u) => u.location + (u.entityLabel ? ` (${u.entityLabel})` : ""),
            )
            .join(", ");
          const more = list.length > 5 ? ` and ${list.length - 5} more` : "";

          throw new TRPCError({
            code: "CONFLICT",
            message: `This gallery is embedded and cannot be deleted. Referenced by: ${summary}${more}.`,
          });
        }
      }

      await ctx.db.gallery.delete({
        where: { id, businessId },
      });

      // Clean up S3 objects — best-effort, after the DB delete (the helper's
      // scan must see the cascade-removed rows as already gone).
      //
      // The CONFLICT guard above already makes an EXTERNAL reference impossible
      // on this path, so the old per-image `galleryImage.count()` was very
      // nearly safe — but not entirely, and not cheaply: it issued one query per
      // image, and it had no `isAlwaysInUseKey` protection, so a gallery that
      // MediaPicker-ed in the business's logo could take `logo.png` down with
      // it. Routing both delete paths through one helper also means the guard
      // can never drift between them.
      if (gallery) {
        await deleteUnreferencedGalleryObjects(
          businessId,
          gallery.images.map((img) => img.url),
        );
      }

      return { data: id, message: "Gallery deleted successfully!" };
    }),

  // Add images to gallery
  addImages: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(galleryImageCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Verify the gallery belongs to this business (prevents cross-tenant IDOR)
      const gallery = await ctx.db.gallery.findFirst({
        where: { id: input.galleryId, businessId },
      });
      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      // Get current max sort order
      const maxSort = await ctx.db.galleryImage.aggregate({
        where: { galleryId: input.galleryId },
        _max: { sortOrder: true },
      });

      const startOrder = (maxSort._max.sortOrder ?? 0) + 1;

      // Create images
      const images = input.images.map((img, index) => ({
        ...img,
        galleryId: input.galleryId,
        sortOrder: startOrder + index,
      }));

      await ctx.db.galleryImage.createMany({
        data: images,
      });

      const updatedImages = await ctx.db.galleryImage.findMany({
        where: { galleryId: input.galleryId },
        orderBy: { sortOrder: "asc" },
      });

      return {
        images: updatedImages,
        message: "Images added successfully!",
      };
    }),

  reorderImages: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(galleryReorderImagesSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { galleryId, imageIds } = input;

      // Verify the gallery belongs to this business (cross-tenant IDOR guard,
      // same shape as addImages).
      const gallery = await ctx.db.gallery.findFirst({
        where: { id: galleryId, businessId },
        select: { id: true },
      });
      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      // ...and that every id belongs to THAT gallery. Scoping the updates by
      // businessId alone is not enough: `galleryId` was previously accepted and
      // then ignored, so a same-tenant admin could pass one gallery's id with
      // another gallery's image ids and silently rewrite the second gallery's
      // ordering. Checked up-front so a mismatch is a clean NOT_FOUND rather
      // than a Prisma P2025 surfacing as a 500 mid-transaction.
      const uniqueIds = [...new Set(imageIds)];
      if (uniqueIds.length > 0) {
        const owned = await ctx.db.galleryImage.count({
          where: { id: { in: uniqueIds }, galleryId },
        });
        if (owned !== uniqueIds.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "One or more images do not belong to this gallery.",
          });
        }
      }

      const updates = imageIds.map((id, index) =>
        // `galleryId` repeated here on purpose — the pre-check above and this
        // clause close the same hole from both ends (TOCTOU), and this one is
        // what the database actually enforces.
        ctx.db.galleryImage.update({
          where: { id, galleryId, gallery: { businessId } },
          data: { sortOrder: index },
        }),
      );

      await ctx.db.$transaction(updates);
      return { success: true, message: "Image order saved successfully!" };
    }),

  updateImage: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(galleryUpdateImageSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, ...data } = input;
      const image = await ctx.db.galleryImage.update({
        where: { id, gallery: { businessId } },
        data,
      });
      return { data: image, message: "Image updated successfully!" };
    }),

  // Delete image
  deleteImage: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      const image = await ctx.db.galleryImage.delete({
        where: { id, gallery: { businessId } },
      });

      // Clean up S3 object — best-effort, after the DB delete.
      //
      // Unlike `delete` above, this path has NO usage guard in front of it: an
      // owner can remove a single image from a gallery whose other images are
      // embedded, and the removed image's file may be attached to a product, a
      // page, a template field, etc. So the deletability decision has to consult
      // every referencing table, not just other GalleryImage rows.
      await deleteUnreferencedGalleryObjects(businessId, [image.url]);

      return { data: image, message: "Image deleted successfully!" };
    }),

  // Duplicate a gallery (clone settings + image rows, reuse S3 urls)
  duplicate: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Load the source gallery (must belong to this business)
      const source = await ctx.db.gallery.findUnique({
        where: { id: input.id, businessId },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      // Auto-generate a unique slug for the clone
      const baseName = `Copy of ${source.name}`;
      const baseSlug = generateGallerySlug(baseName) || "gallery";
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        if (counter > 1000) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not generate a unique slug.",
          });
        }
        const existing = await ctx.db.gallery.findUnique({
          where: { businessId_slug: { businessId, slug } },
        });
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const cloned = await ctx.db.$transaction(async (tx) => {
        const newGallery = await tx.gallery.create({
          data: {
            businessId,
            name: baseName,
            slug,
            description: source.description,
            layout: source.layout,
            columns: source.columns,
            gap: source.gap,
            aspectRatio: source.aspectRatio,
            captionStyle: source.captionStyle,
            showCaptions: source.showCaptions,
            enableLightbox: source.enableLightbox,
          },
        });

        if (source.images.length > 0) {
          await tx.galleryImage.createMany({
            data: source.images.map((img, index) => ({
              galleryId: newGallery.id,
              url: img.url,
              altText: img.altText,
              caption: img.caption,
              width: img.width,
              height: img.height,
              sortOrder: index,
            })),
          });
        }

        return newGallery;
      });

      return { data: cloned, message: "Gallery duplicated successfully!" };
    }),
});
