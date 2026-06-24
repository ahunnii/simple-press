import type { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { DbClient } from "~/server/db";
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

/**
 * Deletes the given S3 objects, but only those whose URL is no longer referenced
 * by any Image row or any Product.ogImage. Call AFTER the owning rows are removed.
 * Best-effort (deleteStoredObjects never throws).
 */
async function deleteUnreferencedImageObjects(db: DbClient, urls: string[]) {
  const unique = [...new Set(urls.filter((u): u is string => !!u))];
  if (unique.length === 0) return;
  const [imageRefs, ogRefs] = await Promise.all([
    db.image.findMany({
      where: { url: { in: unique } },
      select: { url: true },
    }),
    db.product.findMany({
      where: { ogImage: { in: unique } },
      select: { ogImage: true },
    }),
  ]);
  const referenced = new Set<string>([
    ...imageRefs.map((i) => i.url),
    ...ogRefs.map((p) => p.ogImage).filter((u): u is string => !!u),
  ]);
  const toDelete = unique.filter((u) => !referenced.has(u));
  if (toDelete.length > 0) await deleteStoredObjects(toDelete);
}

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

  getRailProducts: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("products"))
    .input(
      z
        .object({
          featuredOnly: z.boolean().default(false),
          limit: z.number().int().min(1).max(12).default(4),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const featuredOnly = input?.featuredOnly ?? false;
      const limit = input?.limit ?? 4;
      return ctx.db.product.findMany({
        where: {
          businessId,
          published: true,
          ...(featuredOnly ? { featured: true } : {}),
        },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: true,
        },
        orderBy: featuredOnly
          ? [{ sortOrder: "asc" }, { createdAt: "desc" }]
          : { createdAt: "desc" },
        take: limit,
      });
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
        ctx.db.product.findMany({
          where,
          include,
          orderBy,
          skip,
          take: pageSize,
        }),
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
        weight,
        weightUnit,
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
          weight: weight ?? null,
          weightUnit: weightUnit ?? "lb",
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
        weight,
        weightUnit,
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
          weight: weight ?? null,
          weightUnit: weightUnit ?? "lb",
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

      // Clean up S3 objects — reference-counted, best-effort, after the DB delete
      const urlsToDelete = [
        ...product.images.map((img) => img.url),
        product.ogImage,
      ].filter((u): u is string => !!u);

      await deleteUnreferencedImageObjects(ctx.db, urlsToDelete);

      return {
        message: "Product deleted successfully!",
        productId: product.id,
      };
    }),

  bulkSetPublished: ownerAdminProcedure
    .use(featureGate("products"))
    .input(
      z.object({ ids: z.array(z.string()).min(1), published: z.boolean() }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const result = await ctx.db.product.updateMany({
        where: { id: { in: input.ids }, businessId },
        data: { published: input.published },
      });

      return {
        count: result.count,
        message: `${result.count} product(s) updated`,
      };
    }),

  bulkDelete: ownerAdminProcedure
    .use(featureGate("products"))
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Fetch image URLs before cascade removes the rows (scoped to businessId)
      const products = await ctx.db.product.findMany({
        where: { id: { in: input.ids }, businessId },
        select: {
          id: true,
          ogImage: true,
          images: { select: { url: true } },
        },
      });

      const result = await ctx.db.product.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });

      // Clean up S3 objects — reference-counted, best-effort, after the DB delete
      const urlsToDelete = products
        .flatMap((p) => [...p.images.map((img) => img.url), p.ogImage])
        .filter((u): u is string => !!u);

      await deleteUnreferencedImageObjects(ctx.db, urlsToDelete);

      return {
        count: result.count,
        message: `${result.count} product(s) deleted`,
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

      // Clean up S3 objects — reference-counted, best-effort, after the DB delete
      await deleteUnreferencedImageObjects(ctx.db, removedUrls);

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

  duplicate: ownerAdminProcedure
    .use(featureGate("products"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      // 1. Fetch source product (scoped to businessId)
      const source = await ctx.db.product.findUnique({
        where: { id, businessId },
        include: {
          variants: true,
          images: true,
          collectionProducts: { select: { collectionId: true } },
        },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // 2. Compute a unique slug for this business
      const baseSlug = `${source.slug}-copy`;
      const candidateSlugs = [
        baseSlug,
        ...Array.from({ length: 49 }, (_, i) => `${baseSlug}-${i + 2}`),
      ];

      const existingSlugs = await ctx.db.product.findMany({
        where: { businessId, slug: { in: candidateSlugs } },
        select: { slug: true },
      });
      const takenSlugs = new Set(existingSlugs.map((p) => p.slug));
      const newSlug = candidateSlugs.find((s) => !takenSlugs.has(s));

      if (!newSlug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Could not generate a unique slug for the duplicated product",
        });
      }

      // 3. Create the duplicate in a transaction (shared S3 image URLs — reference-counted deletion handles safety)
      const newProduct = await ctx.db.$transaction(async (tx) => {
        return tx.product.create({
          data: {
            name: `${source.name} (Copy)`,
            slug: newSlug,
            excerpt: source.excerpt,
            description: source.description,
            price: source.price,
            compareAtPrice: source.compareAtPrice,
            cost: source.cost,
            sku: source.sku,
            barcode: source.barcode,
            trackInventory: source.trackInventory,
            inventoryQty: source.inventoryQty,
            allowBackorders: source.allowBackorders,
            lowInventoryThreshold: source.lowInventoryThreshold,
            baseInventoryUnitId: source.baseInventoryUnitId,
            baseUnitsConsumed: source.baseUnitsConsumed,
            weight: source.weight,
            weightUnit: source.weightUnit,
            metaTitle: source.metaTitle,
            metaDescription: source.metaDescription,
            metaKeywords: source.metaKeywords,
            ogImage: source.ogImage,
            additionalFields: source.additionalFields
              ? (JSON.parse(
                  JSON.stringify(source.additionalFields),
                ) as Prisma.InputJsonValue)
              : undefined,
            businessId,
            // Reset transient/computed fields
            published: false,
            featured: false,
            reservedQty: 0,
            lowInventoryAlertSent: false,
            outOfStockAlertSent: false,
            sortOrder: 0,
            variants: {
              create: source.variants.map((v) => ({
                name: v.name,
                sku: v.sku,
                barcode: v.barcode,
                price: v.price,
                compareAtPrice: v.compareAtPrice,
                inventoryQty: v.inventoryQty,
                options: JSON.parse(
                  JSON.stringify(v.options),
                ) as Prisma.InputJsonValue,
                imageUrl: v.imageUrl,
                reservedQty: 0,
              })),
            },
            images: {
              create: source.images.map((img) => ({
                url: img.url,
                altText: img.altText,
                sortOrder: img.sortOrder,
                businessId: img.businessId,
              })),
            },
            collectionProducts: {
              create: source.collectionProducts.map((cp) => ({
                collectionId: cp.collectionId,
              })),
            },
          },
        });
      });

      return { productId: newProduct.id, message: "Product duplicated" };
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

  /**
   * Public query — batch-checks cart item availability and current pricing.
   * Used by CartRevalidator to sync the localStorage cart against live DB state.
   * Returns one status object per requested item (aligned to input order).
   * Missing/deleted products come back as `available: false`.
   */
  getCartItemsStatus: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("products"))
    .input(
      z.object({
        items: z
          .array(
            z.object({
              productId: z.string(),
              variantId: z.string().nullable(),
            }),
          )
          .max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { items } = input;

      if (items.length === 0) return [];

      const productIds = [...new Set(items.map((i) => i.productId))];

      // Single batched query — no N+1
      const products = await ctx.db.product.findMany({
        where: { id: { in: productIds }, businessId },
        include: {
          variants: {
            select: {
              id: true,
              price: true,
              compareAtPrice: true,
              inventoryQty: true,
              reservedQty: true,
            },
          },
          baseInventoryUnit: {
            select: { inventoryQty: true, allowBackorders: true },
          },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      return items.map((item) => {
        const product = productMap.get(item.productId);

        // Product not found or not published
        if (!product?.published) {
          return {
            productId: item.productId,
            variantId: item.variantId,
            available: false,
            price: 0,
            compareAtPrice: null,
            maxQuantity: null,
          };
        }

        // comingSoon blocks availability even when in stock
        const additionalFields = product.additionalFields as Record<
          string,
          unknown
        > | null;
        if (additionalFields?.comingSoon === true) {
          return {
            productId: item.productId,
            variantId: item.variantId,
            available: false,
            price: 0,
            compareAtPrice: null,
            maxQuantity: null,
          };
        }

        if (item.variantId !== null) {
          // Variant item
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) {
            return {
              productId: item.productId,
              variantId: item.variantId,
              available: false,
              price: 0,
              compareAtPrice: null,
              maxQuantity: null,
            };
          }

          // Variant price: use variant price if set & non-zero, else fall back to product price
          const price =
            variant.price !== null && variant.price > 0
              ? variant.price
              : product.price;
          const compareAtPrice =
            variant.compareAtPrice ?? product.compareAtPrice ?? null;

          // Stock: variants use product-level trackInventory / allowBackorders
          let available = true;
          let maxQuantity: number | null = null;

          if (product.trackInventory && !product.allowBackorders) {
            const stock = variant.inventoryQty - variant.reservedQty;
            if (stock <= 0) {
              available = false;
            }
            maxQuantity = Math.max(0, stock);
          }

          return {
            productId: item.productId,
            variantId: item.variantId,
            available,
            price,
            compareAtPrice,
            maxQuantity,
          };
        } else {
          // No-variant (base) item
          // Pool-backed products: delegate stock check to the pool
          if (product.baseInventoryUnit) {
            const pool = product.baseInventoryUnit;
            let available = true;
            let maxQuantity: number | null = null;

            if (!pool.allowBackorders) {
              const stock = pool.inventoryQty - 0; // reservedQty not included in select; treat pool stock conservatively
              available = stock > 0;
              maxQuantity = Math.max(0, stock);
            }

            return {
              productId: item.productId,
              variantId: null,
              available,
              price: product.price,
              compareAtPrice: product.compareAtPrice ?? null,
              maxQuantity,
            };
          }

          // Standard no-variant product
          let available = true;
          let maxQuantity: number | null = null;

          if (product.trackInventory && !product.allowBackorders) {
            const stock = product.inventoryQty - product.reservedQty;
            if (stock <= 0) {
              available = false;
            }
            maxQuantity = Math.max(0, stock);
          }

          return {
            productId: item.productId,
            variantId: null,
            available,
            price: product.price,
            compareAtPrice: product.compareAtPrice ?? null,
            maxQuantity,
          };
        }
      });
    }),
});
