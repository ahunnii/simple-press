import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const collectionsRouter = createTRPCRouter({
  secureListAll: ownerAdminProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not authorized to access this resource",
      });
    }

    const collections = await ctx.db.collection.findMany({
      where: { businessId: business.id },
    });
    return collections;
  }),

  // Get all collections for a business (public)
  getByBusiness: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        includeUnpublished: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, string | boolean> = {
        businessId: input.businessId,
      };

      if (!input.includeUnpublished) {
        where.published = true;
      }

      const collections = await ctx.db.collection.findMany({
        where,
        include: {
          _count: {
            select: { collectionProducts: true },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      });

      return collections;
    }),

  // Get single collection by slug (public)
  getBySlug: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        slug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const collection = await ctx.db.collection.findUnique({
        where: {
          businessId_slug: {
            businessId: input.businessId,
            slug: input.slug,
          },
        },
        include: {
          collectionProducts: {
            include: {
              product: {
                include: {
                  images: {
                    orderBy: { sortOrder: "asc" },
                    take: 1,
                  },
                  variants: true,
                },
              },
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      return collection;
    }),

  // Get collection by ID (admin)
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to access this resource",
        });
      }

      const collection = await ctx.db.collection.findUnique({
        where: { id: input.id, businessId: business.id },
        include: {
          business: {
            select: { id: true },
          },
          collectionProducts: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  images: {
                    take: 1,
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== collection.business.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return collection;
    }),

  // Create collection
  create: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        imageUrl: z.string().url().optional(),
        published: z.boolean().default(true),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== input.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // Generate slug
      let slug = generateSlug(input.name);

      // Ensure unique slug
      let counter = 1;
      while (true) {
        const existing = await ctx.db.collection.findUnique({
          where: {
            businessId_slug: {
              businessId: input.businessId,
              slug,
            },
          },
        });

        if (!existing) break;
        slug = `${generateSlug(input.name)}-${counter}`;
        counter++;
      }

      // Get max sort order
      const maxSort = await ctx.db.collection.findFirst({
        where: { businessId: input.businessId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const collection = await ctx.db.collection.create({
        data: {
          businessId: input.businessId,
          name: input.name,
          slug,
          description: input.description,
          imageUrl: input.imageUrl,
          published: input.published,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          sortOrder: (maxSort?.sortOrder ?? 0) + 1,
        },
      });

      return collection;
    }),

  // Update collection
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        imageUrl: z.string().url().optional().nullable(),
        published: z.boolean().optional(),
        metaTitle: z.string().optional().nullable(),
        metaDescription: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Get collection with business
      const collection = await ctx.db.collection.findUnique({
        where: { id },
        select: {
          businessId: true,
          slug: true,
        },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== collection.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // If name changed, update slug
      let slug = collection.slug;
      if (updates.name && updates.name !== collection.slug) {
        slug = generateSlug(updates.name);

        // Ensure unique
        let counter = 1;
        while (true) {
          const existing = await ctx.db.collection.findUnique({
            where: {
              businessId_slug: {
                businessId: collection.businessId,
                slug,
              },
            },
          });

          if (!existing || existing.id === id) break;
          slug = `${generateSlug(updates.name)}-${counter}`;
          counter++;
        }
      }

      const updated = await ctx.db.collection.update({
        where: { id },
        data: {
          ...updates,
          slug,
        },
      });

      return updated;
    }),

  // Delete collection
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get collection with business
      const collection = await ctx.db.collection.findUnique({
        where: { id: input.id },
        select: {
          businessId: true,
        },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== collection.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      await ctx.db.collection.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Add product to collection
  addProduct: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        productId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify collection ownership
      const collection = await ctx.db.collection.findUnique({
        where: { id: input.collectionId },
        select: { businessId: true },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== collection.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // Check if already added
      const existing = await ctx.db.collectionProduct.findUnique({
        where: {
          collectionId_productId: {
            collectionId: input.collectionId,
            productId: input.productId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Product already in collection",
        });
      }

      // Get max sort order
      const maxSort = await ctx.db.collectionProduct.findFirst({
        where: { collectionId: input.collectionId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const collectionProduct = await ctx.db.collectionProduct.create({
        data: {
          collectionId: input.collectionId,
          productId: input.productId,
          sortOrder: (maxSort?.sortOrder ?? 0) + 1,
        },
      });

      return collectionProduct;
    }),

  // Remove product from collection
  removeProduct: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        productId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const collection = await ctx.db.collection.findUnique({
        where: { id: input.collectionId },
        select: { businessId: true },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== collection.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      await ctx.db.collectionProduct.delete({
        where: {
          collectionId_productId: {
            collectionId: input.collectionId,
            productId: input.productId,
          },
        },
      });

      return { success: true };
    }),

  // Update product positions in collection
  updateProductOrder: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        productIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const collection = await ctx.db.collection.findUnique({
        where: { id: input.collectionId },
        select: { businessId: true },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== collection.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // Update sort orders in transaction
      await ctx.db.$transaction(
        input.productIds.map((productId, index) =>
          ctx.db.collectionProduct.update({
            where: {
              collectionId_productId: {
                collectionId: input.collectionId,
                productId,
              },
            },
            data: {
              sortOrder: index,
            },
          }),
        ),
      );

      return { success: true };
    }),

  // Update collection order
  updateCollectionOrder: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        collectionIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== input.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // Update sort orders in transaction
      await ctx.db.$transaction(
        input.collectionIds.map((collectionId, index) =>
          ctx.db.collection.update({
            where: { id: collectionId },
            data: {
              sortOrder: index,
            },
          }),
        ),
      );

      return { success: true };
    }),
});
