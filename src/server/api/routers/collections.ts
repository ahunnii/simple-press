import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { generateCollectionSlug } from "~/lib/slug";
import {
  collectionBulkDeleteSchema,
  collectionBulkPublishSchema,
  collectionCreateSchema,
  collectionModifyProductSchema,
  collectionSetProductsSchema,
  collectionUpdateSchema,
} from "~/lib/validators/collections";
import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const collectionsRouter = createTRPCRouter({
  getAll: ownerAdminProcedure
    .use(featureGate("collections"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;

      // `_count.collectionProducts` counts every join row, drafts included.
      // `getAllPublic` (below) deliberately counts only published products,
      // because that number is what a shopper can actually see. Admin needs
      // both: the total it already shows, plus the storefront-visible count,
      // so an owner can tell when a published collection would render empty.
      //
      // groupBy rather than a second `_count` with a `where`, so we aggregate
      // in the DB without pulling join rows back.
      const [collections, liveCounts] = await Promise.all([
        ctx.db.collection.findMany({
          where: { businessId },
          include: { _count: { select: { collectionProducts: true } } },
          orderBy: { sortOrder: "asc" },
        }),
        ctx.db.collectionProduct.groupBy({
          by: ["collectionId"],
          where: { product: { published: true }, collection: { businessId } },
          _count: true,
        }),
      ]);

      const liveCountByCollectionId = new Map(
        liveCounts.map((row) => [row.collectionId, row._count]),
      );

      // Additive only — three other call sites read this procedure's output
      // (products/new, products/[id], the template field widgets), so nothing
      // above may be removed or renamed.
      return collections.map((collection) => ({
        ...collection,
        /** Products in this collection that are actually visible on the storefront. */
        liveProductCount: liveCountByCollectionId.get(collection.id) ?? 0,
      }));
    }),

  getById: ownerAdminProcedure
    .use(featureGate("collections"))
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

  getAllPublic: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("collections"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      const collections = await ctx.db.collection.findMany({
        where: { businessId, published: true },
        include: {
          // Count only published products — this renders as the "N items" label
          // on the storefront, and drafts would inflate it past what a shopper
          // can actually see in the collection.
          _count: {
            select: {
              collectionProducts: { where: { product: { published: true } } },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      return collections;
    }),

  getBySlug: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("collections"))
    .input(z.string())
    .query(async ({ ctx, input: slug }) => {
      const { businessId } = ctx;
      const collection = await ctx.db.collection.findUnique({
        where: {
          businessId_slug: {
            businessId,
            slug,
          },
          // Public route: never leak unpublished collections.
          published: true,
        },
        include: {
          collectionProducts: {
            // Gating the collection above is not enough: without this the
            // relation returns the collection's unpublished products too, and
            // every template's CollectionPage renders them as cards linking to
            // a 404. It also feeds `buildCollectionSchema`, which would emit
            // those dead URLs into the page's schema.org ItemList.
            where: { product: { published: true } },
            include: {
              product: {
                include: {
                  images: { orderBy: { sortOrder: "asc" }, take: 1 },
                  variants: true,
                  baseInventoryUnit: {
                    select: { inventoryQty: true, allowBackorders: true },
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
    .use(featureGate("collections"))
    .input(collectionCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Generate slug
      const baseSlug = generateCollectionSlug(input.name) || "collection";
      let slug = baseSlug;

      // Ensure unique slug
      let counter = 1;
      while (true) {
        if (counter > 1000) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not generate a unique URL slug.",
          });
        }
        const existing = await ctx.db.collection.findUnique({
          where: {
            businessId_slug: {
              businessId,
              slug,
            },
          },
        });

        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Validate product ownership before writing
      const productIds = input.productIds;
      if (productIds.length > 0) {
        const owned = await ctx.db.product.findMany({
          where: { id: { in: productIds }, businessId },
          select: { id: true },
        });
        const ownedSet = new Set(owned.map((p) => p.id));
        if (productIds.some((id) => !ownedSet.has(id))) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more products were not found in your store.",
          });
        }
      }

      // Get max sort order
      const maxSort = await ctx.db.collection.findFirst({
        where: { businessId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const collection = await ctx.db.$transaction(async (tx) => {
        const created = await tx.collection.create({
          data: {
            businessId,
            name: input.name,
            slug,
            description: input.description,
            imageUrl: input.imageUrl,
            published: input.published,
            metaTitle: input.metaTitle,
            metaDescription: input.metaDescription,
            metaKeywords: input.metaKeywords,
            ogImage: input.ogImage,
            sortOrder: (maxSort?.sortOrder ?? 0) + 1,
          },
        });

        if (productIds.length > 0) {
          await tx.collectionProduct.createMany({
            data: productIds.map((productId, i) => ({
              collectionId: created.id,
              productId,
              sortOrder: i,
            })),
          });
        }

        return created;
      });

      return collection;
    }),

  update: ownerAdminProcedure
    .use(featureGate("collections"))
    .input(collectionUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const { id, productIds, ...updates } = input;

      // Get collection with business
      const collection = await ctx.db.collection.findUnique({
        where: { id, businessId },
        select: {
          businessId: true,
          name: true,
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
      if (updates.name && updates.name !== collection.name) {
        const baseSlug = generateCollectionSlug(updates.name) || "collection";
        slug = baseSlug;

        // Ensure unique
        let counter = 1;
        while (true) {
          if (counter > 1000) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not generate a unique URL slug.",
            });
          }
          const existing = await ctx.db.collection.findUnique({
            where: {
              businessId_slug: {
                businessId: collection.businessId,
                slug,
              },
            },
          });

          if (!existing || existing.id === id) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      // Validate product ownership before writing
      if (productIds.length > 0) {
        const owned = await ctx.db.product.findMany({
          where: { id: { in: productIds }, businessId },
          select: { id: true },
        });
        const ownedSet = new Set(owned.map((p) => p.id));
        if (productIds.some((pid) => !ownedSet.has(pid))) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more products were not found in your store.",
          });
        }
      }

      const existing = await ctx.db.collectionProduct.findMany({
        where: { collectionId: id },
        select: { productId: true },
      });

      const currentIds = new Set(existing.map((cp) => cp.productId));
      const inputIdSet = new Set(productIds);
      const toRemove = [...currentIds].filter((pid) => !inputIdSet.has(pid));

      const updated = await ctx.db.$transaction(async (tx) => {
        const result = await tx.collection.update({
          where: { id },
          data: {
            ...updates,
            slug,
          },
        });

        if (toRemove.length > 0) {
          await tx.collectionProduct.deleteMany({
            where: { collectionId: id, productId: { in: toRemove } },
          });
        }

        for (let i = 0; i < productIds.length; i++) {
          const productId = productIds[i]!;
          await tx.collectionProduct.upsert({
            where: { collectionId_productId: { collectionId: id, productId } },
            create: { collectionId: id, productId, sortOrder: i },
            update: { sortOrder: i },
          });
        }

        return result;
      });

      return updated;
    }),

  delete: ownerAdminProcedure
    .use(featureGate("collections"))
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
    .use(featureGate("collections"))
    .input(collectionModifyProductSchema)
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

      // Validate product belongs to this business
      const ownedProduct = await ctx.db.product.findFirst({
        where: { id: input.productId, businessId },
        select: { id: true },
      });
      if (!ownedProduct) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found in your store.",
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
    .use(featureGate("collections"))
    .input(collectionModifyProductSchema)
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

  setProducts: ownerAdminProcedure
    .use(featureGate("collections"))
    .input(collectionSetProductsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { collectionId, productIds } = input;

      const collection = await ctx.db.collection.findUnique({
        where: { id: collectionId, businessId },
        select: { id: true },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // Validate product ownership before writing
      if (productIds.length > 0) {
        const owned = await ctx.db.product.findMany({
          where: { id: { in: productIds }, businessId },
          select: { id: true },
        });
        const ownedSet = new Set(owned.map((p) => p.id));
        if (productIds.some((id) => !ownedSet.has(id))) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more products were not found in your store.",
          });
        }
      }

      const existing = await ctx.db.collectionProduct.findMany({
        where: { collectionId },
        select: { productId: true },
      });

      const currentIds = new Set(existing.map((cp) => cp.productId));
      const inputIdSet = new Set(productIds);

      const toRemove = [...currentIds].filter((id) => !inputIdSet.has(id));

      await ctx.db.$transaction(async (tx) => {
        if (toRemove.length > 0) {
          await tx.collectionProduct.deleteMany({
            where: { collectionId, productId: { in: toRemove } },
          });
        }
        // Upsert every product in the desired order — creates new rows and
        // updates sortOrder for products already in the collection.
        for (let i = 0; i < productIds.length; i++) {
          const productId = productIds[i]!;
          await tx.collectionProduct.upsert({
            where: { collectionId_productId: { collectionId, productId } },
            create: { collectionId, productId, sortOrder: i },
            update: { sortOrder: i },
          });
        }
      });

      return { success: true };
    }),

  duplicate: ownerAdminProcedure
    .use(featureGate("collections"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      // Load source collection with its products
      const source = await ctx.db.collection.findUnique({
        where: { id, businessId },
        include: {
          collectionProducts: {
            select: { productId: true, sortOrder: true },
          },
        },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // Generate a unique slug for the copy (same pattern as create)
      const baseSlug =
        generateCollectionSlug(`${source.name} copy`) || "collection";
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        if (counter > 1000) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not generate a unique URL slug.",
          });
        }
        const existing = await ctx.db.collection.findUnique({
          where: { businessId_slug: { businessId, slug } },
        });
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Compute sort order: max existing + 1
      const maxSort = await ctx.db.collection.findFirst({
        where: { businessId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      // Create the copy + product rows in a single transaction
      const newCollection = await ctx.db.$transaction(async (tx) => {
        const created = await tx.collection.create({
          data: {
            businessId,
            name: `Copy of ${source.name}`,
            slug,
            description: source.description,
            imageUrl: source.imageUrl,
            metaTitle: source.metaTitle,
            metaDescription: source.metaDescription,
            metaKeywords: source.metaKeywords,
            ogImage: source.ogImage,
            published: false,
            sortOrder: (maxSort?.sortOrder ?? 0) + 1,
          },
        });

        if (source.collectionProducts.length > 0) {
          await tx.collectionProduct.createMany({
            data: source.collectionProducts.map((cp) => ({
              collectionId: created.id,
              productId: cp.productId,
              sortOrder: cp.sortOrder,
            })),
          });
        }

        return created;
      });

      return newCollection;
    }),

  bulkSetPublished: ownerAdminProcedure
    .use(featureGate("collections"))
    .input(collectionBulkPublishSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // `changedIds` is the rows this call will actually FLIP, captured before
      // the write, and it is what the table's Undo re-sends. Re-sending the
      // whole selection with the opposite `published` is not an inverse: a
      // selection containing already-published collections publishes all of
      // them, then "Undo" unpublishes all of them — including the ones the user
      // never touched. The client can't narrow it either (a selection spans
      // pages, and off-page rows' `published` state never reaches the browser).
      //
      // One transaction so nothing can change between the read and the update.
      const { changedIds, count } = await ctx.db.$transaction(async (tx) => {
        const changed = await tx.collection.findMany({
          where: {
            id: { in: input.ids },
            businessId,
            published: { not: input.published },
          },
          select: { id: true },
        });

        const result = await tx.collection.updateMany({
          where: { id: { in: input.ids }, businessId },
          data: { published: input.published },
        });

        return { changedIds: changed.map((c) => c.id), count: result.count };
      });

      return { count, changedIds };
    }),

  // OWNER only, unlike bulkSetPublished next door. Not a statement about
  // trusting managers — it's blast radius. Publish/unpublish is reversible in
  // one click; deleting N collections at once is not, and an escalated
  // "select all N matching" selection makes a single mis-click unrecoverable
  // without a database restore. Same reason the schema's delete cap
  // (ADMIN_BULK_DELETE_LIMIT) sits far below the selection cap.
  bulkDelete: ownerOnlyProcedure
    .use(featureGate("collections"))
    .input(collectionBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.collection.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });
      return { count: result.count };
    }),

  getProductsByCollectionId: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("collections"))
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      const collection = await ctx.db.collection.findUnique({
        where: { id, businessId, published: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          collectionProducts: {
            // Public homepage/service rails read this — never surface drafts.
            where: { product: { published: true } },
            include: {
              product: {
                include: {
                  images: { orderBy: { sortOrder: "asc" }, take: 1 },
                  variants: true,
                  baseInventoryUnit: {
                    select: { inventoryQty: true, allowBackorders: true },
                  },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
      if (!collection) return null;
      return {
        collection: {
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          description: collection.description,
        },
        products: collection.collectionProducts.map((cp) => cp.product),
      };
    }),
});
