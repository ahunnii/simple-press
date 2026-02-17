import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const collectionsRouter = createTRPCRouter({
  getAll: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    const collections = await ctx.db.collection.findMany({
      where: { businessId },
      include: {
        _count: { select: { collectionProducts: true } },
      },
      orderBy: { sortOrder: "asc" },
    });
    return collections;
  }),

  // Get all collections for a business (public)
  getByBusiness: publicProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    const collections = await ctx.db.collection.findMany({
      where: { businessId: business.id, published: true },
      include: {
        _count: { select: { collectionProducts: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return collections;
  }),

  // Get single collection by slug (public)
  getBySlug: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: slug }) => {
      const business = await checkBusiness();

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const collection = await ctx.db.collection.findUnique({
        where: {
          businessId_slug: {
            businessId: business.id,
            slug,
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
            orderBy: { sortOrder: "asc" },
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
  getById: ownerAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      const collection = await ctx.db.collection.findUnique({
        where: { id, businessId },
        include: {
          business: { select: { id: true } },
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
            orderBy: { sortOrder: "asc" },
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

  create: ownerAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        imageUrl: z.string().url().optional(),
        published: z.boolean().default(true),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Generate slug
      let slug = generateSlug(input.name);

      // Ensure unique slug
      let counter = 1;
      while (true) {
        const existing = await ctx.db.collection.findUnique({
          where: {
            businessId_slug: {
              businessId,
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
        where: { businessId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const collection = await ctx.db.collection.create({
        data: {
          businessId,
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

  update: ownerAdminProcedure
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
      const { businessId } = ctx;

      const { id, ...updates } = input;

      // Get collection with business
      const collection = await ctx.db.collection.findUnique({
        where: { id, businessId },
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

  delete: ownerAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      const collection = await ctx.db.collection.findUnique({
        where: { id, businessId },
        select: {
          id: true,
          businessId: true,
        },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      await ctx.db.collection.delete({
        where: { id, businessId },
      });

      return { success: true };
    }),

  addProduct: ownerAdminProcedure
    .input(
      z.object({
        collectionId: z.string(),
        productId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const collection = await ctx.db.collection.findUnique({
        where: { id: input.collectionId, businessId },
        select: { id: true, businessId: true },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
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

  removeProduct: ownerAdminProcedure
    .input(
      z.object({
        collectionId: z.string(),
        productId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const collection = await ctx.db.collection.findUnique({
        where: { id: input.collectionId, businessId },
        select: { id: true, businessId: true },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
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

  updateProductOrder: ownerAdminProcedure
    .input(
      z.object({
        collectionId: z.string(),
        productIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const collection = await ctx.db.collection.findUnique({
        where: { id: input.collectionId, businessId },
        select: { id: true, businessId: true },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
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

  updateCollectionOrder: ownerAdminProcedure
    .input(z.array(z.string()))
    .mutation(async ({ ctx, input: collectionIds }) => {
      const { businessId } = ctx;

      await ctx.db.$transaction(
        collectionIds.map((collectionId, index) =>
          ctx.db.collection.update({
            where: { id: collectionId, businessId },
            data: { sortOrder: index },
          }),
        ),
      );

      return { success: true };
    }),
});
