import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { generateCollectionSlug } from "~/lib/slug";
import {
  collectionBulkDeleteSchema,
  collectionBulkDuplicateSchema,
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
      const result = await ctx.db.collection.updateMany({
        where: { id: { in: input.ids }, businessId },
        data: { published: input.published },
      });
      return { count: result.count };
    }),

  bulkDelete: ownerAdminProcedure
    .use(featureGate("collections"))
    .input(collectionBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.collection.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });
      return { count: result.count };
    }),

  bulkDuplicate: ownerAdminProcedure
    .use(featureGate("collections"))
    .input(collectionBulkDuplicateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Load every requested source collection that actually belongs to
      // this business, silently ignoring ids that don't exist or aren't
      // owned — same "filter, don't throw" behavior as bulkDelete /
      // bulkSetPublished above.
      const sources = await ctx.db.collection.findMany({
        where: { id: { in: input.ids }, businessId },
        include: {
          collectionProducts: {
            select: { productId: true, sortOrder: true },
          },
        },
        // Deterministic: without it, which copy receives which sequential
        // sortOrder is left to whatever order Postgres returns.
        orderBy: { sortOrder: "asc" },
      });

      if (sources.length === 0) {
        return { count: 0 };
      }

      // Load every slug already in use for this business once, then grow
      // this set in memory as we mint a slug for each copy. `duplicate`
      // (single-item, above) re-queries the DB per candidate slug because
      // it only ever needs to check one collision at a time. A batch also
      // has to catch collisions *within itself* — duplicating the same
      // collection twice, or two sources whose "copy" slugs happen to
      // coincide — so this in-memory set does double duty as both the
      // DB-collision check and the intra-batch check.
      const existingSlugs = await ctx.db.collection.findMany({
        where: { businessId },
        select: { slug: true },
      });
      const claimedSlugs = new Set(existingSlugs.map((c) => c.slug));

      // Sort order: max existing + 1, +2, ... so N copies land on N
      // distinct, sequential sort orders instead of all piling onto
      // maxSort + 1.
      const maxSort = await ctx.db.collection.findFirst({
        where: { businessId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      let nextSortOrder = (maxSort?.sortOrder ?? 0) + 1;

      const plannedCopies = sources.map((source) => {
        const baseSlug =
          generateCollectionSlug(`${source.name} copy`) || "collection";
        let slug = baseSlug;
        let counter = 1;
        while (claimedSlugs.has(slug)) {
          if (counter > 1000) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not generate a unique URL slug.",
            });
          }
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        claimedSlugs.add(slug);

        return { source, slug, sortOrder: nextSortOrder++ };
      });

      // One transaction for the whole batch rather than one per source (as
      // `duplicate` uses for its single item): the claimedSlugs set above
      // is only valid as a uniqueness guarantee if nothing else can create
      // a colliding slug between planning and writing, and an all-or-
      // nothing bulk duplicate (matching bulkDelete/bulkSetPublished's
      // single-statement atomicity) is easier to reason about than partial
      // success with per-item rollback/retry bookkeeping.
      // Prisma's interactive-transaction defaults (maxWait 2s, timeout 5s) are
      // sized for a couple of statements, not for N sequential creates against a
      // remote DB. At ~2 round trips per source that budget is gone well before
      // the schema's 100-source cap, and P2028 would roll back the whole batch.
      // `claimedSlugs` is planned outside the transaction, so a concurrent create
      // in the same business can steal one of these slugs in between and trip
      // @@unique([businessId, slug]). Narrow that to a retryable CONFLICT rather
      // than letting a P2002 surface as an opaque 500.
      const runBatch = () =>
        ctx.db.$transaction(
          async (tx) => {
            const results = [];
            for (const { source, slug, sortOrder } of plannedCopies) {
              const newCollection = await tx.collection.create({
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
                  sortOrder,
                },
              });

              if (source.collectionProducts.length > 0) {
                await tx.collectionProduct.createMany({
                  data: source.collectionProducts.map((cp) => ({
                    collectionId: newCollection.id,
                    productId: cp.productId,
                    sortOrder: cp.sortOrder,
                  })),
                });
              }

              results.push(newCollection);
            }
            return results;
          },
          { timeout: 60_000, maxWait: 15_000 },
        );

      let created;
      try {
        created = await runBatch();
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Another change claimed one of these URL slugs. Please try duplicating again.",
          });
        }
        throw err;
      }

      return { count: created.length };
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
