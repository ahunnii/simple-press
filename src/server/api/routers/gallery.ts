import { TRPCError } from "@trpc/server";
import { z } from "zod";

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
      const gallery = await ctx.db.gallery.create({
        data: {
          ...input,
          businessId,
        },
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
      await ctx.db.gallery.delete({
        where: { id, businessId },
      });
      return { data: id, message: "Gallery deleted successfully!" };
    }),

  // Add images to gallery
  addImages: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(galleryImageCreateSchema)
    .mutation(async ({ ctx, input }) => {
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
      const updates = input.imageIds.map((id, index) =>
        ctx.db.galleryImage.update({
          where: { id },
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
      const { id, ...data } = input;
      const image = await ctx.db.galleryImage.update({
        where: { id },
        data,
      });
      return { data: image, message: "Image updated successfully!" };
    }),

  // Delete image
  deleteImage: ownerAdminProcedure
    .use(featureGate("galleries"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const image = await ctx.db.galleryImage.delete({
        where: { id },
      });
      return { data: image, message: "Image deleted successfully!" };
    }),
});
