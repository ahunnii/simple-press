import type { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ProductSortValue } from "~/lib/validators/product";
import {
  buildUsedMediaIndex,
  isAlwaysInUseKey,
  normalizeUrl,
} from "~/lib/media/usage";
import { deleteStoredObjects } from "~/lib/s3/delete";
import { publicUrlToKey } from "~/lib/s3/url";
import {
  ADMIN_BULK_SELECTION_LIMIT,
  MAX_REQUESTED_PAGE,
} from "~/lib/validators/admin-table";
import {
  productBulkDeleteSchema,
  productBulkPublishSchema,
  productCreateSchema,
  productImageSchema,
  productListFiltersSchema,
  productUpdateSchema,
} from "~/lib/validators/product";
import { resolveVariantPrice } from "~/lib/variant-price";
import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/**
 * Deletes the given S3 objects, but only those that NOTHING in the business
 * still references. Call AFTER the owning rows are removed — the index is built
 * fresh here, so the caller's just-deleted rows are already absent from it while
 * every surviving reference still shows up. That ordering is what makes this
 * correct; do not hoist the scan above the delete.
 *
 * This used to check `Image.url` and `Product.ogImage` only, which covered the
 * case it was written for (`product.duplicate` copies image URLs BY REFERENCE,
 * so deleting a duplicate must not destroy the original's files) but missed the
 * larger one: the same S3 object can be attached to a collection, a service, a
 * page, a variant, a template field, a testimonial or a review. Two paths reach
 * that today — `MediaPickerDialog` hands back an existing object's URL, and
 * store-transfer import content-addresses by SHA-256 so identical bytes collapse
 * onto one shared key. Deleting a product could therefore destroy a file a
 * collection was still displaying. `buildUsedMediaIndex` is the platform's one
 * authority on "who references this object" (it is what gates the Media
 * Library's own delete), so this defers to it rather than growing a second,
 * always-behind copy of that knowledge.
 *
 * Deliberately STRICTER than the Media Library's delete gate in three ways:
 *
 *  1. `inactiveTemplate` usages count as references here. The Media Library
 *     treats a file whose only referents are leftovers from a template the
 *     owner switched away from as deletable — but it scrubs those field values
 *     out of SiteContent in the same mutation. This path has no such scrub, so
 *     honouring the flag would leave the old template pointing at a 404 the
 *     moment the owner switches back.
 *  2. Objects outside `{businessId}/` are never touched. The index is
 *     business-scoped, so a foreign tenant's object would look unreferenced
 *     here while that tenant is still using it.
 *  3. Logo/favicon fixed-key objects are never touched (`isAlwaysInUseKey`),
 *     matching the media router's hard protection.
 *
 * Non-storage URLs are skipped rather than handed to `deleteStoredObjects`,
 * which would only log an "unrecognised URL shape" error to Sentry.
 *
 * Best-effort (`deleteStoredObjects` never throws).
 */
async function deleteUnreferencedImageObjects(
  businessId: string,
  urls: string[],
) {
  const unique = [
    ...new Set(urls.filter((u): u is string => !!u).map(normalizeUrl)),
  ];
  if (unique.length === 0) return;

  // One scan for the whole batch — callers must pass every candidate URL in a
  // single call rather than looping (this scan touches a dozen tables).
  //
  // If the scan itself fails we do NOT fall back to deleting: without the index
  // there is no evidence the objects are unreferenced, and an orphaned file is
  // recoverable (the Media Library lists and deletes it) while a wrongly deleted
  // one is not. Swallowing also keeps a storage-side problem from surfacing as
  // "delete failed" on a product row that is already gone.
  let usageIndex;
  try {
    usageIndex = await buildUsedMediaIndex(businessId);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "s3", operation: "delete-unreferenced" },
      extra: { businessId, urlCount: unique.length },
    });
    return;
  }

  const toDelete = unique.filter((url) => {
    const key = publicUrlToKey(url);
    if (!key) return false; // external URL — not ours to delete
    if (!key.startsWith(`${businessId}/`)) return false; // another tenant's object
    if (isAlwaysInUseKey(key)) return false; // logo / favicon
    return (usageIndex.get(url) ?? []).length === 0;
  });

  if (toDelete.length > 0) await deleteStoredObjects(toDelete);
}

export const productRouter = createTRPCRouter({
  getFeatured: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("products"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      // `published: true` is REQUIRED — same reasoning as `getRelated` below.
      // This feeds the dark-trend homepage's featured grid, so without it a
      // draft product renders a card linking to a 404.
      const products = await ctx.db.product.findMany({
        where: { businessId, published: true },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: true,
        },
        omit: { cost: true },
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
        omit: { cost: true },
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

      // `published: true` is REQUIRED here. This is a public procedure feeding
      // the storefront's related-products grids, so without it every template
      // that calls getRelated renders the business's unpublished/draft products
      // — and those cards link to a 404, because `product.get` (correctly) only
      // resolves published rows. Found on the pink review, 2026-07-29; the leak
      // affected all nine templates that call this.
      const products = await ctx.db.product.findMany({
        where: { businessId, published: true, id: { not: product.id } },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 4 },
          variants: true,
        },
        omit: { cost: true },
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
          businessId,
          published: true,
          OR: [{ slug }, { id: slug }],
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
        omit: { cost: true },
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

  // Cheap existence check for the admin empty state — distinguishes "no
  // products at all" (offer Add Your First Product) from "no matches for the
  // current filters" (offer Clear filters). A single COUNT(*), unlike
  // `secureList({})`, which was being called a second time just to read
  // `totalCount` and paid for a findMany with `include: {images, variants,
  // _count}` plus the matching-ids query for one boolean.
  hasAny: ownerAdminProcedure
    .use(featureGate("products"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      const count = await ctx.db.product.count({ where: { businessId } });
      return { hasAny: count > 0 };
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

      // Search filter — match name, slug, product sku, or any variant sku.
      // Tokenized: each whitespace-separated word of the query has to match
      // SOME field (AND of ORs), not the query as a whole in one field — see
      // customer.list's identical tokenization for the failure mode this
      // avoids.
      const searchQuery = input?.search?.trim();
      const searchTokens = searchQuery
        ? searchQuery.split(/\s+/).filter(Boolean)
        : [];
      if (searchTokens.length > 0) {
        where.AND = searchTokens.map((token) => ({
          OR: [
            { name: { contains: token, mode: "insensitive" } },
            { slug: { contains: token, mode: "insensitive" } },
            { sku: { contains: token, mode: "insensitive" } },
            {
              variants: {
                some: { sku: { contains: token, mode: "insensitive" } },
              },
            },
          ],
        }));
      }

      // Sort. Each entry is the PRIMARY ordering only — `id` is appended below
      // as a mandatory tie-break, mirroring what `buildTablePage` guarantees for
      // the in-memory admin tables (~/app/admin/_lib/table-query). Without it,
      // two products sharing a `price` or a `createdAt` have no defined relative
      // order, Postgres is free to return them differently between executions,
      // and with pagination that renders one product on two pages and another on
      // none. `price-asc` on a catalog with repeated prices is the live case.
      //
      // `satisfies Record<ProductSortValue, …>` rather than
      // `Record<string, …>`: the keys ARE the sort vocabulary (one `as const`
      // tuple in ~/lib/validators/product, shared with the page's filter
      // options and the router's own `z.enum`), so a value added there without
      // a branch here is a compile error instead of a silent fall-through to
      // `newest` — which would leave the admin's sort control appearing to do
      // nothing.
      type ProductOrderBy = Prisma.ProductOrderByWithRelationInput;
      const orderByMap = {
        newest: { createdAt: "desc" },
        oldest: { createdAt: "asc" },
        "name-asc": { name: "asc" },
        "name-desc": { name: "desc" },
        "price-asc": { price: "asc" },
        "price-desc": { price: "desc" },
      } satisfies Record<ProductSortValue, ProductOrderBy>;
      const orderBy: ProductOrderBy[] = [
        input?.sort ? orderByMap[input.sort] : orderByMap.newest,
        { id: "asc" },
      ];

      // Pagination — 25, the density every admin table uses (see PAGE_SIZE in
      // the Collections/Services/Inventory pages). The stores on this platform
      // run to a few hundred products, not tens of thousands, so a page that
      // fits on one screen beats a long scroll.
      const pageSize = 25;
      // Bounded BEFORE it becomes an offset. The clamp further down handles
      // "past the end", but it needs `totalCount` first, so the opening query
      // still runs with whatever `skip` this produces — and an unbounded page
      // number overflows Postgres' OFFSET rather than paging past the end. See
      // MAX_REQUESTED_PAGE.
      const page = Math.min(input?.page ?? 1, MAX_REQUESTED_PAGE);
      const skip = (page - 1) * pageSize;

      const include = {
        images: { orderBy: { sortOrder: "asc" } as const, take: 1 },
        variants: { select: { price: true, compareAtPrice: true } },
        _count: { select: { variants: true } },
      };

      const [firstPassProducts, totalCount, matchingIdRows] =
        await ctx.db.$transaction([
          ctx.db.product.findMany({
            where,
            include,
            orderBy,
            skip,
            take: pageSize,
          }),
          ctx.db.product.count({ where }),
          // Every id matching the current filters, in the current sort order,
          // ignoring pagination — powers the admin table's "select all N
          // matching" bulk-bar escalation. Included in the same $transaction
          // as the count so the two stay consistent with each other.
          //
          // `take` is LIMIT + 1, not unbounded. Without it, a 100k-product
          // catalog reads 100k rows out of Postgres and into Node on EVERY
          // list load, inside a transaction holding a connection — only to
          // discard them below because the set is too large to escalate. The
          // largest catalogs, the ones the null-return exists to protect,
          // would pay the full cost anyway. One extra row is all it takes to
          // distinguish "at the cap" from "over it".
          ctx.db.product.findMany({
            where,
            orderBy,
            select: { id: true },
            take: ADMIN_BULK_SELECTION_LIMIT + 1,
          }),
        ]);

      // `Math.max(1, …)` so an empty result set reports one page rather than
      // zero, matching `buildTablePage` in ~/app/admin/_lib/table-query.
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      // Clamp an out-of-range page HERE rather than leaving it to callers. An
      // unclamped `?page=900` against a 3-page catalog echoes `page: 900` back
      // with an empty slice, and a paginator faithfully renders "Showing
      // 44,951–150 of 150" above a no-matches empty state. The re-query only
      // fires on that path — in-app navigation never produces it — so the
      // common case stays a single round trip, and every consumer gets the
      // guarantee that the returned `page` is always within range.
      const clampedPage = Math.min(page, totalPages);
      const products =
        clampedPage === page
          ? firstPassProducts
          : await ctx.db.product.findMany({
              where,
              include,
              orderBy,
              skip: (clampedPage - 1) * pageSize,
              take: pageSize,
            });

      // Size decision: a 5,000-product catalog is ~5,000 cuids (~125KB) that
      // would otherwise ride along in the RSC payload on every load of the
      // products list, whether or not anyone triggers the escalation. Rather
      // than pay that cost unconditionally, only materialize `matchingIds`
      // when the result set is small enough that "select all" could actually
      // run — the bulk validators cap `ids` at ADMIN_BULK_SELECTION_LIMIT, so a
      // larger selection would be rejected
      // anyway. Above the limit, `matchingIds` is `null` — distinct from `[]`
      // (no matches) — so the UI can tell "not offered" apart from "nothing
      // matched" and hide the escalation, which is the honest outcome.
      //
      // Decided from the row count, not `totalCount`: the query above is
      // capped at LIMIT + 1, so overflow is exactly "we read one more than we
      // can use". Reading it off the same result that produced the ids means
      // the two can't disagree.
      const matchingIds: string[] | null =
        matchingIdRows.length > ADMIN_BULK_SELECTION_LIMIT
          ? null
          : matchingIdRows.map((p) => p.id);

      return {
        products,
        totalCount,
        page: clampedPage,
        pageSize,
        totalPages,
        matchingIds,
      };
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

  searchForPicker: ownerAdminProcedure
    .use(featureGate("products"))
    .input(
      z.object({
        query: z.string().trim().max(100).default(""),
        limit: z.number().int().min(1).max(25).default(10),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.db.product.findMany({
        where: {
          businessId: ctx.businessId,
          ...(input.query && {
            OR: [
              { name: { contains: input.query, mode: "insensitive" } },
              { sku: { contains: input.query, mode: "insensitive" } },
              { slug: { contains: input.query, mode: "insensitive" } },
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          price: true,
          published: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
        orderBy: { name: "asc" },
        take: input.limit,
      }),
    ),

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
        scheduledPublishAt,
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
        cost,
        sku,
        featured,
        subscriptionEnabled,
        subscriptionIntervals,
        subscriptionDiscountPercent,
      } = input;

      const { businessId } = ctx;

      // Same rule `update` enforces below: a product can't be switched on for
      // subscriptions with no cadence a customer could actually pick.
      if (subscriptionEnabled && subscriptionIntervals.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose at least one subscription cadence",
        });
      }

      // Verify a client-supplied inventory pool belongs to THIS business before
      // linking it — otherwise a product could be tied to (and later deduct
      // from) another tenant's pool.
      if (baseInventoryUnitId) {
        const pool = await ctx.db.baseInventoryUnit.findFirst({
          where: { id: baseInventoryUnitId, businessId },
          select: { id: true },
        });
        if (!pool) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid inventory pool",
          });
        }
      }

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
          // A schedule only makes sense for unpublished products.
          scheduledPublishAt: published ? null : (scheduledPublishAt ?? null),
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
          cost: cost ?? null,
          sku: sku ?? null,
          featured,
          subscriptionEnabled,
          // Written explicitly — the column has no `@default` (unlike
          // `subscriptionEnabled`/`subscriptionDiscountPercent`), so omitting
          // this would store `null` instead of `[]`.
          subscriptionIntervals: subscriptionIntervals as Prisma.InputJsonValue,
          subscriptionDiscountPercent,
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
        scheduledPublishAt,
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
        cost,
        sku,
        featured,
        subscriptionEnabled,
        subscriptionIntervals,
        subscriptionDiscountPercent,
      } = input;

      // A product can't be switched on for subscriptions with no cadence a
      // customer could actually pick. Checked before any write so a rejected
      // update never partially applies.
      if (subscriptionEnabled && subscriptionIntervals.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose at least one subscription cadence",
        });
      }

      // Verify a client-supplied inventory pool belongs to THIS business before
      // linking it — otherwise a product could be tied to (and later deduct
      // from) another tenant's pool.
      if (baseInventoryUnitId) {
        const pool = await ctx.db.baseInventoryUnit.findFirst({
          where: { id: baseInventoryUnitId, businessId },
          select: { id: true },
        });
        if (!pool) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid inventory pool",
          });
        }
      }

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

      // The fetch above is already scoped to this tenant, so a null result
      // means the id belongs to another business (or nothing at all). Without
      // this guard the `update` below still refuses to touch the row — the
      // compound `where` sees zero matches — but it throws a raw Prisma P2025,
      // which tRPC converts to INTERNAL_SERVER_ERROR. That is wrong twice: the
      // caller gets a 500 for what is really a 404, and the tRPC error handler
      // (src/app/api/trpc/[trpc]/route.ts) reports every one of them to Sentry
      // as a server bug. Same shape as the P2025 handling in faq.ts.
      if (!currentProduct) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

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
          // A schedule only makes sense for unpublished products.
          scheduledPublishAt: published ? null : (scheduledPublishAt ?? null),
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
          cost: cost ?? null,
          sku: sku ?? null,
          featured,
          subscriptionEnabled,
          subscriptionIntervals: subscriptionIntervals as Prisma.InputJsonValue,
          subscriptionDiscountPercent,
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

      await deleteUnreferencedImageObjects(businessId, urlsToDelete);

      return {
        message: "Product deleted successfully!",
        productId: product.id,
      };
    }),

  bulkSetPublished: ownerAdminProcedure
    .use(featureGate("products"))
    .input(productBulkPublishSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // The rows this call will actually FLIP, captured before the write.
      //
      // The admin table's Undo used to re-send the whole selection with the
      // opposite `published`, which is not an inverse: a selection of 50 that
      // contained 20 already-published products publishes all 50, then "Undo"
      // unpublishes all 50 — including the 20 the user never touched. The
      // client can't compute the difference either (a selection spans pages,
      // and off-page rows' `published` state was never sent to the browser), so
      // the correct undo set is returned from here.
      //
      // Same transaction as the update so nothing can change between the two.
      const { changedIds, count } = await ctx.db.$transaction(async (tx) => {
        const changed = await tx.product.findMany({
          where: {
            id: { in: input.ids },
            businessId,
            published: { not: input.published },
          },
          select: { id: true },
        });

        const result = await tx.product.updateMany({
          where: { id: { in: input.ids }, businessId },
          data: { published: input.published },
        });

        return { changedIds: changed.map((p) => p.id), count: result.count };
      });

      return {
        count,
        /** Only the rows whose state actually changed — the exact undo set. */
        changedIds,
        message: `${count} product(s) updated`,
      };
    }),

  // OWNER only, unlike bulkSetPublished next door — see the note on
  // collections.bulkDelete. This one is the strongest case of the three: it
  // cascades to variants, images and collection joins, then calls
  // `deleteUnreferencedImageObjects`, destroying S3 objects that live OUTSIDE
  // the database. A database restore does not bring those back.
  bulkDelete: ownerOnlyProcedure
    .use(featureGate("products"))
    .input(productBulkDeleteSchema)
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

      // Clean up S3 objects — reference-counted, best-effort, after the DB
      // delete. ONE call for the whole batch: the guard builds a full media
      // usage index (a dozen queries across the tenant), so calling it per
      // product would multiply that by the selection size (up to 1,000).
      const urlsToDelete = products
        .flatMap((p) => [...p.images.map((img) => img.url), p.ogImage])
        .filter((u): u is string => !!u);

      await deleteUnreferencedImageObjects(businessId, urlsToDelete);

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

      // A URL the incoming payload still lists is NOT a removal, even when the
      // row currently carrying it is being dropped: a client can legitimately
      // drop a row and re-add the same file as a new (id-less) entry in one
      // call. The S3 cleanup below runs before those creates land, so a fresh
      // usage index would not yet see them and the object would be destroyed
      // out from under the row about to reference it.
      const keptUrls = new Set(input.images.map((img) => img.url));
      const removedUrls = product.images
        .filter((img) => toDelete.includes(img.id) && !keptUrls.has(img.url))
        .map((img) => img.url);

      await ctx.db.image.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });

      // Clean up S3 objects — reference-counted, best-effort, after the DB delete
      await deleteUnreferencedImageObjects(businessId, removedUrls);

      // Update or create images
      await Promise.all(
        input.images.map(async (image) => {
          if (image.id) {
            // Update existing — scope to THIS product (already verified to
            // belong to businessId above) so a client-supplied image id
            // belonging to another product/tenant can't be written. updateMany
            // no-ops (count 0) rather than touching a foreign row.
            await ctx.db.image.updateMany({
              where: { id: image.id, productId: input.productId },
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
          collectionProducts: {
            select: { collectionId: true, sortOrder: true },
          },
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
            // Never copy identifiers verbatim: a duplicate SKU/barcode
            // pollutes SKU search (secureList matches on it) and collides on
            // WooCommerce export keying. The owner assigns real codes when
            // readying the duplicate for publish.
            sku: null,
            barcode: null,
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
                // Same rationale as the product-level sku/barcode above —
                // never copy identifiers verbatim.
                sku: null,
                barcode: null,
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
                sortOrder: cp.sortOrder,
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
            slug: product?.slug ?? null,
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
            slug: product.slug,
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
              slug: product.slug,
            };
          }

          // Variant price: use variant price if set & non-zero, else fall back to product price
          const price = resolveVariantPrice(variant.price, product.price);
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
            slug: product.slug,
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
              slug: product.slug,
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
            slug: product.slug,
          };
        }
      });
    }),
});
