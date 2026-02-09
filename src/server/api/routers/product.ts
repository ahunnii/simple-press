import { TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { z } from "zod";
import { checkBusiness } from "~/lib/check-business";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const productRouter = createTRPCRouter({
  create: ownerAdminProcedure
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        price: z.number(),
        published: z.boolean(),
        variants: z.array(
          z.object({
            name: z.string(),
            sku: z.string().optional(),
            price: z.number(),
            inventoryQty: z.number(),
            options: z.record(z.string(), z.string()),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, slug, description, price, published, variants } = input;

      const business = await checkBusiness();

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const product = await ctx.db.product.create({
        data: {
          name,
          slug,
          description,
          price,
          published,
          businessId: business.id,
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
      return product;
    }),

  update: ownerAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        price: z.number(),
        published: z.boolean(),
        variants: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            sku: z.string().optional(),
            price: z.number(),
            inventoryQty: z.number(),
            options: z.record(z.string(), z.string()),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, slug, description, price, published, variants } = input;

      const product = await ctx.db.product.update({
        where: { id },
        data: { name, slug, description, price, published },
      });
      if (variants) {
        await ctx.db.$transaction(async (tx) => {
          await tx.productVariant.deleteMany({
            where: { productId: product.id },
          });
          await tx.productVariant.createMany({
            data: variants.map((v) => ({
              productId: product.id,
              name: v.name,
              sku: v.sku,
              price: v.price,
              inventoryQty: v.inventoryQty,
              options: v.options,
            })),
          });
        });
      }
      return product;
    }),

  secureGet: ownerAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const business = await checkBusiness();

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const product = await ctx.db.product.findUnique({
        where: { id },
        include: {
          variants: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
      return product;
    }),

  secureListAll: ownerAdminProcedure.query(async ({ ctx }) => {
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
        _count: {
          select: { variants: true },
        },
      },
      orderBy: { createdAt: "desc" },
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
      },
    });
    return product;
  }),
});
