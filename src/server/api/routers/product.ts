import type { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { deleteStoredObjects } from "~/lib/s3/delete";
import {
  productCreateSchema,
  productImageSchema,
  productListFiltersSchema,
  productUpdateSchema,
} from "~/lib/validators/product";
import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const productRouter = createTRPCRouter({
  getFeatured: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("products"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      const products = await ctx.db.product.findMany({
        where: { businessId },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: true,
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      });
      return products;
    }),

  getRelated: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("products"))
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId, businessId },
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const products = await ctx.db.product.findMany({
        where: { businessId, id: { not: product.id } },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 4 },
          variants: true,
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      });
      return products;
    }),

  get: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("products"))
    .input(z.string())
    .query(async ({ ctx, input: slug }) => {
      const { businessId } = ctx;

      const product = await ctx.db.product.findFirst({
        where: {
          slug,
          businessId,
          published: true,
        },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          variants: { orderBy: { createdAt: "asc" } },
          business: {
            select: {
              siteContent: {
                select: { primaryColor: true, customFields: true },
              },
            },
          },
          baseInventoryUnit: {
            select: { inventoryQty: true, allowBackorders: true },
          },
        },
      });
      return product;
    }),

  secureGet: ownerAdminProcedure
    .use(featureGate("products"))
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      const product = await ctx.db.product.findUnique({
        where: { id, businessId },
        include: {
          variants: { orderBy: { createdAt: "asc" } },
          images: { orderBy: { sortOrder: "asc" } },
          collectionProducts: { select: { collectionId: true } },
        },
      });
      return product;
    }),

  secureListAll: ownerAdminProcedure
    .use(featureGate("products"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;

      const products = await ctx.db.product.findMany({
        where: { businessId },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: { select: { price: true, compareAtPrice: true } },
          _count: { select: { variants: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return products;
    }),

  secureList: ownerAdminProcedure
    .use(featureGate("products"))
    .input(productListFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const where: Prisma.ProductWhereInput = { businessId };

      // Status filter
      if (input?.status === "published") {
        where.published = true;
      } else if (input?.status === "draft") {
        where.published = false;
      }

      // Search filter — match name, slug, product sku, or any variant sku
      const searchQuery = input?.search?.trim();
      if (searchQuery) {
        where.OR = [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { slug: { contains: searchQuery, mode: "insensitive" } },
          { sku: { contains: searchQuery, mode: "insensitive" } },
          {
            variants: {
              some: { sku: { contains: searchQuery, mode: "insensitive" } },
            },
          },
        ];
      }

      // Sort
      type ProductOrderBy = Prisma.ProductOrderByWithRelationInput;
      const orderByMap: Record<string, ProductOrderBy> = {
        newest: { createdAt: "desc" },
        oldest: { createdAt: "asc" },
        "name-asc": { name: "asc" },
        "name-desc": { name: "desc" },
        "price-asc": { price: "asc" },
        "price-desc": { price: "desc" },
      };
      const orderBy: ProductOrderBy =
        (input?.sort ? orderByMap[input.sort] : undefined) ??
        orderByMap.newest!;

      // Pagination — page size tuned for large catalogs (≈300 products → 6 pages)
      const pageSize = 50;
      const page = input?.page ?? 1;
      const skip = (page - 1) * pageSize;

      const include = {
        images: { orderBy: { sortOrder: "asc" } as const, take: 1 },
        variants: { select: { price: true, compareAtPrice: true } },
        _count: { select: { variants: true } },
      };

      const [products, totalCount] = await ctx.db.$transaction([
        ctx.db.product.findMany({ where, include, orderBy, skip, take: pageSize }),
        ctx.db.product.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return { products, totalCount, page, pageSize, totalPages };
    }),

  secureGetAll: ownerAdminProcedure
    .use(featureGate("products"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      const products = await ctx.db.product.findMany({
        where: { businessId },
        include: { variants: true, images: true },
        orderBy: { name: "asc" },
      });

      return products;
    }),

  create: ownerAdminProcedure
    .use(featureGate("products"))
    .input(productCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        name,
        slug,
        description,
        price,
        compareAtPrice,
        published,
        trackInventory,
        allowBackorders,
        inventoryQty,
        lowInventoryThreshold,
        baseInventoryUnitId,
        baseUnitsConsumed,
        variants,
        additionalFields,
        metaTitle,
        metaDescription,
        metaKeywords,
        ogImage,
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
          compareAtPrice: compareAtPrice ?? null,
          published,
          // When pool is set, force trackInventory off — pool manages stock
          trackInventory: baseInventoryUnitId ? false : trackInventory,
          allowBackorders,
          inventoryQty,
          lowInventoryThreshold: lowInventoryThreshold ?? null,
          baseInventoryUnitId: baseInventoryUnitId ?? null,
          baseUnitsConsumed: baseUnitsConsumed ?? null,
          additionalFields: additionalFields
            ? (JSON.parse(
                JSON.stringify(additionalFields),
              ) as Prisma.InputJsonValue)
            : undefined,
          metaTitle: metaTitle ?? null,
          metaDescription: metaDescription ?? null,
          metaKeywords: metaKeywords ?? null,
          ogImage: ogImage ?? null,
          businessId,
          variants: {
            create: variants.map((v) => ({
              name: v.name,
              sku: v.sku,
              price: v.price,
              compareAtPrice: v.compareAtPrice ?? null,
              inventoryQty: v.inventoryQty,
              options: v.options,
              imageUrl: v.imageUrl ?? null,
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
    .use(featureGate("products"))
    .input(productUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const {
        id,
        name,
        slug,
        description,
        price,
        compareAtPrice,
        published,
        trackInventory,
        allowBackorders,
        inventoryQty,
        lowInventoryThreshold,
        baseInventoryUnitId,
        baseUnitsConsumed,
        variants,
        additionalFields,
        metaTitle,
        metaDescription,
        metaKeywords,
        ogImage,
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

      // Fetch current state to compute alert flag resets and audit history
      const currentProduct = await ctx.db.product.findUnique({
        where: { id, businessId },
        select: { inventoryQty: true, lowInventoryThreshold: true },
      });

      // Fetch existing variant quantities for audit trail
      const existingVariants = await ctx.db.productVariant.findMany({
        where: { productId: id },
        select: { id: true, inventoryQty: true },
      });
      const existingVariantQtyMap = new Map(
        existingVariants.map((v) => [v.id, v.inventoryQty]),
      );

      const prevQty = currentProduct?.inventoryQty ?? 0;
      const effectiveThreshold =
        lowInventoryThreshold ?? currentProduct?.lowInventoryThreshold ?? null;
      const inventoryIncreased =
        inventoryQty !== undefined && inventoryQty > prevQty;

      const product = await ctx.db.product.update({
        where: { id, businessId },
        data: {
          name,
          slug,
          description,
          price,
          compareAtPrice: compareAtPrice ?? null,
          published,
          // When pool is set, force trackInventory off — pool manages stock
          trackInventory: baseInventoryUnitId ? false : trackInventory,
          allowBackorders,
          inventoryQty,
          lowInventoryThreshold: lowInventoryThreshold ?? null,
          baseInventoryUnitId: baseInventoryUnitId ?? null,
          baseUnitsConsumed: baseUnitsConsumed ?? null,
          additionalFields: additionalFields
            ? (JSON.parse(
                JSON.stringify(additionalFields),
              ) as Prisma.InputJsonValue)
            : undefined,
          metaTitle: metaTitle ?? null,
          metaDescription: metaDescription ?? null,
          metaKeywords: metaKeywords ?? null,
          ogImage: ogImage ?? null,
          // Reset alert flags when inventory is manually increased above threshold/zero
          ...(inventoryIncreased && inventoryQty > 0
            ? { outOfStockAlertSent: false }
            : {}),
          ...(inventoryIncreased &&
          effectiveThreshold !== null &&
          inventoryQty > effectiveThreshold
            ? { lowInventoryAlertSent: false }
            : {}),
        },
      });

      // Write InventoryHistory for base product qty change
      if (
        trackInventory &&
        inventoryQty !== undefined &&
        inventoryQty !== prevQty
      ) {
        await ctx.db.inventoryHistory.create({
          data: {
            productId: product.id,
            businessId,
            previousQty: prevQty,
            newQty: inventoryQty,
            changeQty: inventoryQty - prevQty,
            reason: "adjustment",
            note: "Updated via product form",
            userId: ctx.session.user.id,
          },
        });
      }

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
                  compareAtPrice: v.compareAtPrice ?? null,
                  inventoryQty: v.inventoryQty,
                  options: v.options,
                  imageUrl: v.imageUrl ?? null,
                },
              });
              // Write history if qty changed
              const prevVariantQty = existingVariantQtyMap.get(v.id) ?? 0;
              if (trackInventory && v.inventoryQty !== prevVariantQty) {
                await tx.inventoryHistory.create({
                  data: {
                    variantId: v.id,
                    productId: product.id,
                    businessId,
                    previousQty: prevVariantQty,
                    newQty: v.inventoryQty,
                    changeQty: v.inventoryQty - prevVariantQty,
                    reason: "adjustment",
                    note: "Updated via product form",
                    userId: ctx.session.user.id,
                  },
                });
              }
            } else {
              const created = await tx.productVariant.create({
                data: {
                  productId: product.id,
                  name: v.name,
                  sku: v.sku ?? null,
                  price: v.price,
                  compareAtPrice: v.compareAtPrice ?? null,
                  inventoryQty: v.inventoryQty,
                  options: v.options,
                  imageUrl: v.imageUrl ?? null,
                },
              });
              // Write history for new variant with initial stock
              if (trackInventory && v.inventoryQty > 0) {
                await tx.inventoryHistory.create({
                  data: {
                    variantId: created.id,
                    productId: product.id,
                    businessId,
                    previousQty: 0,
                    newQty: v.inventoryQty,
                    changeQty: v.inventoryQty,
                    reason: "adjustment",
                    note: "Initial stock via product form",
                    userId: ctx.session.user.id,
                  },
                });
              }
            }
          }
        });
      }
      return {
        message: "Product updated successfully!",
        productId: product.id,
      };
    }),

  delete: ownerAdminProcedure
    .use(featureGate("products"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      // Fetch image URLs before the cascade removes the rows
      const product = await ctx.db.product.findUnique({
        where: { id, businessId },
        select: {
          id: true,
          ogImage: true,
          images: { select: { url: true } },
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      await ctx.db.product.delete({
        where: { id, businessId },
      });

      // Clean up S3 objects — best-effort, after the DB delete
      const urlsToDelete = [
        ...product.images.map((img) => img.url),
        product.ogImage,
      ].filter((u): u is string => !!u);

      if (urlsToDelete.length > 0) {
        await deleteStoredObjects(urlsToDelete);
      }

      return {
        message: "Product deleted successfully!",
        productId: product.id,
      };
    }),

  // Sync all images (helper for bulk update)
  syncImages: ownerAdminProcedure
    .use(featureGate("products"))
    .input(
      z.object({
        productId: z.string(),
        images: z.array(productImageSchema),
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
      const removedUrls = product.images
        .filter((img) => toDelete.includes(img.id))
        .map((img) => img.url);

      await ctx.db.image.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });

      // Clean up S3 objects — best-effort, after the DB delete
      if (removedUrls.length > 0) {
        await deleteStoredObjects(removedUrls);
      }

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

      return {
        success: true,
        productId: input.productId,
        message: "Images synced successfully",
      };
    }),

  getProductImportHistory: ownerAdminProcedure
    .use(featureGate("products"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      const importHistory = await ctx.db.productImport.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
      });
      return importHistory;
    }),
});
