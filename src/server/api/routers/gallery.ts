import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "../trpc";

export const galleryRouter = createTRPCRouter({
  // List galleries
  list: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;
    return ctx.db.gallery.findMany({
      where: { businessId },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
          take: 4, // Preview images
        },
        _count: {
          select: { images: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  // Get single gallery
  getById: ownerAdminProcedure
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

  // Get single gallery by id (public, for storefront page content) Not really sure if this is needed yet... maybe public / private galleries?
  getByIdPublic: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const businessId = await checkBusiness();
      if (!businessId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const gallery = await ctx.db.gallery.findUnique({
        where: { id: input.id, businessId: businessId.id },
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

  // Get by slug (for public display)
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const businessId = await checkBusiness();
      if (!businessId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      return ctx.db.gallery.findUnique({
        where: {
          businessId_slug: {
            businessId: businessId.id,
            slug: input.slug,
          },
        },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });
    }),

  // Create gallery
  create: ownerAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        layout: z.enum(["grid", "masonry", "carousel", "collage", "justified"]),
        columns: z.number().min(1).max(5).default(3),
        gap: z.number().default(16),
        aspectRatio: z.string().optional(),
        showCaptions: z.boolean().default(true),
        enableLightbox: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.gallery.create({
        data: {
          ...input,
          businessId,
        },
      });
    }),

  // Update gallery
  update: ownerAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        layout: z
          .enum(["grid", "masonry", "carousel", "collage", "justified"])
          .optional(),
        columns: z.number().min(1).max(5).optional(),
        gap: z.number().optional(),
        aspectRatio: z.string().optional(),
        showCaptions: z.boolean().optional(),
        enableLightbox: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, ...data } = input;

      return ctx.db.gallery.update({
        where: { id, businessId },
        data,
      });
    }),

  // Delete gallery
  delete: ownerAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.gallery.delete({
        where: { id: input.id, businessId },
      });
    }),

  // Add images to gallery
  addImages: ownerAdminProcedure
    .input(
      z.object({
        galleryId: z.string(),
        images: z.array(
          z.object({
            url: z.string(),
            altText: z.string().optional(),
            caption: z.string().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
          }),
        ),
      }),
    )
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

      return { success: true, count: images.length };
    }),

  // Update image order
  reorderImages: ownerAdminProcedure
    .input(
      z.object({
        galleryId: z.string(),
        imageIds: z.array(z.string()), // Ordered array of image IDs
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Update each image's sortOrder based on position in array
      const updates = input.imageIds.map((id, index) =>
        ctx.db.galleryImage.update({
          where: { id },
          data: { sortOrder: index },
        }),
      );

      await ctx.db.$transaction(updates);
      return { success: true };
    }),

  // Update single image
  updateImage: ownerAdminProcedure
    .input(
      z.object({
        id: z.string(),
        altText: z.string().optional(),
        caption: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.galleryImage.update({
        where: { id },
        data,
      });
    }),

  // Delete image
  deleteImage: ownerAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.galleryImage.delete({
        where: { id: input.id },
      });
    }),
});
