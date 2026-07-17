import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { buildUsedMediaIndex, normalizeUrl } from "~/lib/media/usage";
import { deleteStoredObjects } from "~/lib/s3/delete";
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
      // per-image usage entries here (see src/lib/media/usage.ts), so we
      // scan each of this gallery's image URLs and ignore only the
      // "galleryImage" entries (a gallery's own listing of its images, or —
      // when a duplicated gallery reuses the same S3 URL — another
      // gallery's own listing). Anything else means a blog post, page, or
      // product description still embeds this gallery. Mirrors the
      // usage check in the media router (src/server/api/routers/media.ts).
      if (gallery && gallery.images.length > 0) {
        const usageIndex = await buildUsedMediaIndex(businessId);
        const externalUsages = new Map<
          string,
          { location: string; entityLabel?: string }
        >();
        for (const img of gallery.images) {
          const usages = usageIndex.get(normalizeUrl(img.url)) ?? [];
          for (const u of usages) {
            if (u.entityType === "galleryImage") continue;
            externalUsages.set(`${u.entityType}:${u.entityId ?? u.location}`, {
              location: u.location,
              entityLabel: u.entityLabel,
            });
          }
        }

        if (externalUsages.size > 0) {
          const list = Array.from(externalUsages.values());
          const summary = list
            .slice(0, 5)
            .map((u) => u.location + (u.entityLabel ? ` (${u.entityLabel})` : ""))
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

      // Clean up S3 objects — best-effort, after the DB delete
      if (gallery) {
        const urlsToDelete: string[] = [];
        for (const img of gallery.images) {
          // Only delete from S3 if no other GalleryImage row references this URL
          const remaining = await ctx.db.galleryImage.count({
            where: { url: img.url },
          });
          if (remaining === 0) {
            urlsToDelete.push(img.url);
          }
        }
        if (urlsToDelete.length > 0) {
          await deleteStoredObjects(urlsToDelete);
        }
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
      const updates = input.imageIds.map((id, index) =>
        ctx.db.galleryImage.update({
          where: { id, gallery: { businessId } },
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
      // Only delete if no other GalleryImage row references the same URL
      // (the duplicate mutation reuses URLs across galleries).
      const remaining = await ctx.db.galleryImage.count({
        where: { url: image.url },
      });
      if (remaining === 0) {
        await deleteStoredObjects([image.url]);
      }

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
