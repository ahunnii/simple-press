import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  productCreateSchema,
  productUpdateSchema,
} from "~/lib/validators/product";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const productRouter = createTRPCRouter({
  getFeatured: publicProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }
    const products = await ctx.db.product.findMany({
      where: { businessId: business.id },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        variants: true,
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
    return products;
  }),
  create: ownerAdminProcedure
    .input(productCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        name,
        slug,
        description,
        price,
        published,
        trackInventory,
        allowBackorders,
        inventoryQty,
        variants,
      } = input;

      const { businessId } = ctx;

      // Check if slug is already taken for this business
      const existingProduct = await ctx.db.product.findFirst({
        where: {
          businessId,
          slug,
        },
      });

      if (existingProduct) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A product with this slug already exists",
        });
      }

      const product = await ctx.db.product.create({
        data: {
          name,
          slug,
          description,
          price,
          published,
          trackInventory,
          allowBackorders,
          inventoryQty,
          businessId,
          variants: {
            create: variants.map((v) => ({
              name: v.name,
              sku: v.sku,
              price: v.price,
              inventoryQty: v.inventoryQty,
              options: v.options,
            })),
          },
        },
      });
      return {
        message: "Product created successfully!",
        productId: product.id,
      };
    }),

  update: ownerAdminProcedure
    .input(productUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const {
        id,
        name,
        slug,
        description,
        price,
        published,
        trackInventory,
        allowBackorders,
        inventoryQty,
        variants,
      } = input;

      // Check if slug is already taken for this business
      const existingProduct = await ctx.db.product.findFirst({
        where: {
          businessId,
          slug,
          id: { not: id },
        },
      });

      if (existingProduct) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A product with this slug already exists",
        });
      }

      const product = await ctx.db.product.update({
        where: { id, businessId },
        data: {
          name,
          slug,
          description,
          price,
          published,
          trackInventory,
          allowBackorders,
          inventoryQty,
        },
      });
      if (variants) {
        await ctx.db.$transaction(async (tx) => {
          const variantIds = variants
            .filter((v): v is typeof v & { id: string } => !!v.id)
            .map((v) => v.id);
          await tx.productVariant.deleteMany({
            where:
              variantIds.length > 0
                ? { productId: product.id, id: { notIn: variantIds } }
                : { productId: product.id },
          });
          for (const v of variants) {
            if (v.id) {
              await tx.productVariant.update({
                where: { id: v.id, productId: product.id },
                data: {
                  name: v.name,
                  sku: v.sku ?? null,
                  price: v.price,
                  inventoryQty: v.inventoryQty,
                  options: v.options,
                },
              });
            } else {
              await tx.productVariant.create({
                data: {
                  productId: product.id,
                  name: v.name,
                  sku: v.sku ?? null,
                  price: v.price,
                  inventoryQty: v.inventoryQty,
                  options: v.options,
                },
              });
            }
          }
        });
      }
      return {
        message: "Product updated successfully!",
        productId: product.id,
      };
    }),

  secureGet: ownerAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      const product = await ctx.db.product.findUnique({
        where: { id, businessId },
        include: {
          variants: {
            orderBy: { createdAt: "asc" },
          },
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
      return product;
    }),

  secureListAll: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    const products = await ctx.db.product.findMany({
      where: { businessId },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        _count: {
          select: { variants: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return products;
  }),

  secureGetAll: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;
    const products = await ctx.db.product.findMany({
      where: { businessId },
      include: { variants: true, images: true },
      orderBy: { name: "asc" },
    });

    return products;
  }),

  get: publicProcedure.input(z.string()).query(async ({ ctx, input: slug }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }
    const product = await ctx.db.product.findFirst({
      where: {
        slug,
        businessId: business.id,
        published: true,
      },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
        variants: {
          orderBy: { createdAt: "asc" },
        },
        business: {
          select: {
            siteContent: {
              select: {
                primaryColor: true,
              },
            },
          },
        },
      },
    });
    return product;
  }),

  delete: ownerAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      const product = await ctx.db.product.delete({
        where: { id, businessId },
      });

      return {
        message: "Product deleted successfully!",
        productId: product.id,
      };
    }),

  // Add images to product
  addImages: ownerAdminProcedure
    .input(
      z.object({
        images: z.array(
          z.object({
            productId: z.string(),
            url: z.string().url(),
            altText: z.string().nullable(),
            sortOrder: z.number().int(),
          }),
        ),
        productId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      // Verify product ownership
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId, businessId },
        select: { businessId: true },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      await ctx.db.image.createMany({
        data: input.images.map((image) => ({
          productId: input.productId,
          url: image.url,
          altText: image.altText,
          sortOrder: image.sortOrder,
        })),
      });

      return {
        message: "Images added successfully!",
        productId: input.productId,
      };
    }),

  addImage: ownerAdminProcedure
    .input(
      z.object({
        productId: z.string(),
        url: z.string().url(),
        altText: z.string().nullable(),
        sortOrder: z.number().int(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      // Verify product ownership
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId, businessId },
        select: { businessId: true },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const image = await ctx.db.image.create({
        data: {
          productId: input.productId,
          url: input.url,
          altText: input.altText,
          sortOrder: input.sortOrder,
        },
      });

      return image;
    }),

  // Update image
  updateImage: ownerAdminProcedure
    .input(
      z.object({
        imageId: z.string(),
        altText: z.string().nullable(),
        sortOrder: z.number().int(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const image = await ctx.db.image.update({
        where: { id: input.imageId, businessId },
        data: {
          altText: input.altText,
          sortOrder: input.sortOrder,
        },
      });

      return image;
    }),

  // Delete image
  deleteImage: ownerAdminProcedure
    .input(z.object({ imageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      await ctx.db.image.delete({
        where: { id: input.imageId, businessId },
      });

      return { success: true };
    }),

  // Sync all images (helper for bulk update)
  syncImages: ownerAdminProcedure
    .input(
      z.object({
        productId: z.string(),
        images: z.array(
          z.object({
            id: z.string().optional(),
            url: z.string().url(),
            altText: z.string().nullable(),
            sortOrder: z.number().int(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      // Verify ownership
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId, businessId },
        include: { images: true },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Get existing image IDs
      const existingIds = new Set(product.images.map((img) => img.id));
      const newIds = new Set(
        input.images.filter((img) => img.id).map((img) => img.id!),
      );

      // Delete removed images
      const toDelete = [...existingIds].filter((id) => !newIds.has(id));
      await ctx.db.image.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });

      // Update or create images
      await Promise.all(
        input.images.map(async (image) => {
          if (image.id) {
            // Update existing
            await ctx.db.image.update({
              where: { id: image.id },
              data: {
                altText: image.altText,
                sortOrder: image.sortOrder,
              },
            });
          } else {
            // Create new
            await ctx.db.image.create({
              data: {
                productId: input.productId,
                url: image.url,
                altText: image.altText,
                sortOrder: image.sortOrder,
              },
            });
          }
        }),
      );

      return { success: true, productId: input.productId };
    }),
});
