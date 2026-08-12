import type { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DEFAULT_EMBED_HEIGHT, parseEmbedInput } from "~/lib/embed";
import { generateCollectionSlug } from "~/lib/slug";
import {
  serviceBulkDeleteSchema,
  serviceBulkPublishSchema,
  serviceCreateSchema,
  serviceCustomFieldsSchema,
  serviceItemCreateSchema,
  serviceItemDeleteSchema,
  serviceItemReorderSchema,
  serviceItemUpdateSchema,
  serviceUpdateSchema,
} from "~/lib/validators/services";
import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const serviceRouter = createTRPCRouter({
  // ─── Admin: read ────────────────────────────────────────────────────────────

  getAll: ownerAdminProcedure
    .use(featureGate("services"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      // `_count.items` is UNFILTERED — admin edits drafts, so it has to see
      // them. But `getAllPublic` and `getBySlug` both scope items to
      // `published: true`, so that total is NOT what a shopper sees: a published
      // service whose items are all drafts renders an empty page. Ship the
      // storefront-visible count alongside the total so admin can say both, the
      // way `collections.getAll` does with `liveProductCount`.
      //
      // Counts, not rows. The two consumers of this procedure — the services
      // table and /admin/content/navigation — need "how many" and "how many
      // live"; every other ServiceItem field (description, price, image, embed
      // config) was riding into the browser in the RSC payload for nothing.
      // groupBy rather than a second `_count` with a `where`, so the live count
      // aggregates in the DB without pulling item rows back — the same shape
      // `collections.getAll` uses.
      const [services, liveCounts] = await Promise.all([
        ctx.db.service.findMany({
          where: { businessId },
          include: { _count: { select: { items: true } } },
          orderBy: { sortOrder: "asc" },
        }),
        ctx.db.serviceItem.groupBy({
          by: ["serviceId"],
          where: { published: true, service: { businessId } },
          _count: true,
        }),
      ]);

      const liveCountByServiceId = new Map(
        liveCounts.map((row) => [row.serviceId, row._count]),
      );

      return services.map((service) => ({
        ...service,
        /** Items in this service that are actually visible on the storefront. */
        liveItemCount: liveCountByServiceId.get(service.id) ?? 0,
      }));
    }),

  getById: ownerAdminProcedure
    .use(featureGate("services"))
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      const service = await ctx.db.service.findUnique({
        where: { id, businessId },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      return service;
    }),

  // ─── Admin: write ───────────────────────────────────────────────────────────

  create: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // The slug is whatever the owner typed (the form pre-fills it from the
      // name, but it is theirs to override). Nothing is published yet and no
      // link can exist, so a collision de-duplicates silently with a `-N`
      // suffix rather than bouncing the create back at them. `update` is the
      // opposite — see the throw there.
      const baseSlug = input.slug;
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        if (counter > 1000) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not generate a unique URL slug.",
          });
        }
        const existing = await ctx.db.service.findUnique({
          where: { businessId_slug: { businessId, slug } },
        });
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Compute next sort order
      const maxSort = await ctx.db.service.findFirst({
        where: { businessId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const service = await ctx.db.service.create({
        data: {
          businessId,
          name: input.name,
          slug,
          description: input.description,
          image: input.image,
          serviceTemplateId: input.serviceTemplateId,
          published: input.published,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          metaKeywords: input.metaKeywords,
          ogImage: input.ogImage,
          sortOrder: (maxSort?.sortOrder ?? 0) + 1,
        },
      });

      return service;
    }),

  update: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, ...updates } = input;

      const existing = await ctx.db.service.findUnique({
        where: { id, businessId },
        select: { id: true, name: true, slug: true, businessId: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      // The slug is only ever what the owner sent. It used to be re-derived
      // from `name` here, so renaming a live service silently moved its public
      // URL and 404'd every existing link — there is no redirect table to
      // catch them. Same contract as `collections.update`: a taken slug is a
      // hard BAD_REQUEST, never a silent `-N` rename, and the message keeps the
      // word "slug" so the form's `applyTrpcErrorToForm` fieldMap can pin it to
      // the slug input.
      let slug = existing.slug;
      if (updates.slug !== existing.slug) {
        const conflict = await ctx.db.service.findFirst({
          where: {
            businessId: existing.businessId,
            slug: updates.slug,
            id: { not: id },
          },
        });

        if (conflict) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A service with this slug already exists",
          });
        }

        slug = updates.slug;
      }

      const updated = await ctx.db.service.update({
        where: { id },
        data: { ...updates, slug },
      });

      return updated;
    }),

  delete: ownerAdminProcedure
    .use(featureGate("services"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      const service = await ctx.db.service.findUnique({
        where: { id, businessId },
        select: { id: true },
      });

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      // NOTE: this deliberately does no S3 cleanup — `image`, `ogImage`,
      // `customFields` and every `ServiceItem.image` are URL references that
      // `duplicate` (below) and the media library hand out freely, so deleting
      // the row must not delete the bytes. If object cleanup is ever added
      // here it has to consult `buildUsedMediaIndex` (~/lib/media/usage) from
      // day one, the way `product.delete` does — `Service.customFields` is
      // already one of the surfaces that scanner walks.
      await ctx.db.service.delete({ where: { id, businessId } });
      return { success: true };
    }),

  duplicate: ownerAdminProcedure
    .use(featureGate("services"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      // Load source service with its items
      const source = await ctx.db.service.findUnique({
        where: { id, businessId },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      // Generate a unique slug for the copy (same pattern as create)
      const baseSlug =
        generateCollectionSlug(`${source.name} copy`) || "service";
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        if (counter > 1000) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not generate a unique URL slug.",
          });
        }
        const existing = await ctx.db.service.findUnique({
          where: { businessId_slug: { businessId, slug } },
        });
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Compute sort order: max existing + 1
      const maxSort = await ctx.db.service.findFirst({
        where: { businessId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      // Create the copy + item rows in a single transaction.
      //
      // Media is copied BY REFERENCE: `image`, `ogImage`, `customFields` and
      // each item's `image` carry the same S3 URL strings as the source. There
      // is no S3 copy helper in this codebase — this is the house pattern
      // (`product.duplicate`: "shared S3 image URLs — reference-counted
      // deletion handles safety"; `gallery.duplicate`: "reuse S3 urls"). Any
      // future deletion path for services must therefore be usage-index-backed
      // rather than assuming a row owns its objects (see the note on `delete`).
      const newService = await ctx.db.$transaction(async (tx) => {
        const created = await tx.service.create({
          data: {
            businessId,
            name: `Copy of ${source.name}`,
            slug,
            description: source.description,
            image: source.image,
            serviceTemplateId: source.serviceTemplateId,
            ...(source.customFields !== null
              ? { customFields: source.customFields as Prisma.InputJsonValue }
              : {}),
            metaTitle: source.metaTitle,
            metaDescription: source.metaDescription,
            metaKeywords: source.metaKeywords,
            ogImage: source.ogImage,
            published: false,
            sortOrder: (maxSort?.sortOrder ?? 0) + 1,
          },
        });

        if (source.items.length > 0) {
          await tx.serviceItem.createMany({
            data: source.items.map((item) => ({
              serviceId: created.id,
              businessId,
              name: item.name,
              description: item.description,
              image: item.image,
              priceLabel: item.priceLabel,
              durationLabel: item.durationLabel,
              compareAtPriceLabel: item.compareAtPriceLabel,
              priceTiers: (item.priceTiers ?? []) as Prisma.InputJsonValue,
              addOns: (item.addOns ?? []) as Prisma.InputJsonValue,
              bookingEmbedSrc: item.bookingEmbedSrc,
              bookingEmbedHeight: item.bookingEmbedHeight,
              category: item.category,
              isSignature: item.isSignature,
              // Per-item published state is preserved verbatim: the parent copy
              // is a draft, and both `getAllPublic` and `getBySlug` gate on the
              // service being published, so nothing here is storefront-visible
              // until the owner publishes the copy itself.
              published: item.published,
              sortOrder: item.sortOrder,
            })),
          });
        }

        return created;
      });

      return newService;
    }),

  bulkSetPublished: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceBulkPublishSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // `changedIds` is the rows this call will actually FLIP, captured before
      // the write, and it is what the table's Undo re-sends. Re-sending the
      // whole selection with the opposite `published` is not an inverse: a
      // selection containing already-published services publishes all of them,
      // then "Undo" unpublishes all of them — including the ones the user never
      // touched. The client can't narrow it either (a selection spans pages,
      // and off-page rows' `published` state never reaches the browser).
      //
      // One transaction so nothing can change between the read and the update.
      const { changedIds, count } = await ctx.db.$transaction(async (tx) => {
        const changed = await tx.service.findMany({
          where: {
            id: { in: input.ids },
            businessId,
            published: { not: input.published },
          },
          select: { id: true },
        });

        const result = await tx.service.updateMany({
          where: { id: { in: input.ids }, businessId },
          data: { published: input.published },
        });

        return { changedIds: changed.map((s) => s.id), count: result.count };
      });

      return { count, changedIds };
    }),

  // OWNER only, unlike bulkSetPublished next door — see the note on
  // collections.bulkDelete. Deleting a service cascades to every ServiceItem
  // it owns, so the loss is larger than the row count suggests.
  bulkDelete: ownerOnlyProcedure
    .use(featureGate("services"))
    .input(serviceBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.service.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });
      return { count: result.count };
    }),

  updateCustomFields: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceCustomFieldsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, customFields } = input;

      const service = await ctx.db.service.findUnique({
        where: { id, businessId },
        select: { id: true },
      });

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      const updated = await ctx.db.service.update({
        where: { id },
        data: { customFields },
      });

      return updated;
    }),

  // ─── Admin: item ops ────────────────────────────────────────────────────────

  addItem: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceItemCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const {
        serviceId,
        bookingEmbedSrc,
        bookingEmbedHeight,
        priceTiers,
        addOns,
        ...rest
      } = input;

      // Re-validate parent service ownership
      const service = await ctx.db.service.findUnique({
        where: { id: serviceId, businessId },
        select: { id: true },
      });

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      // Sanitize booking embed
      let safeSrc: string | null = null;
      let safeHeight: number | null = bookingEmbedHeight ?? null;

      if (bookingEmbedSrc?.trim()) {
        const parsed = parseEmbedInput(bookingEmbedSrc.trim());
        if (!parsed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Booking embed URL must be a valid HTTPS URL.",
          });
        }
        safeSrc = parsed.src;
        if (parsed.height !== undefined) {
          safeHeight = parsed.height;
        }
        safeHeight ??= DEFAULT_EMBED_HEIGHT;
      }

      // Compute next sort order within the service
      const maxSort = await ctx.db.serviceItem.findFirst({
        where: { serviceId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const item = await ctx.db.serviceItem.create({
        data: {
          ...rest,
          serviceId,
          businessId,
          bookingEmbedSrc: safeSrc,
          bookingEmbedHeight: safeHeight,
          priceTiers: (priceTiers ?? []) as Prisma.InputJsonValue,
          addOns: (addOns ?? []) as Prisma.InputJsonValue,
          sortOrder: (maxSort?.sortOrder ?? 0) + 1,
        },
      });

      return item;
    }),

  updateItem: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceItemUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const {
        id,
        bookingEmbedSrc,
        bookingEmbedHeight,
        priceTiers,
        addOns,
        ...rest
      } = input;

      // Re-validate item ownership via parent service
      const item = await ctx.db.serviceItem.findUnique({
        where: { id },
        select: { id: true, serviceId: true, businessId: true },
      });

      if (item?.businessId !== businessId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service item not found",
        });
      }

      // Sanitize booking embed
      let safeSrc: string | null | undefined = undefined; // undefined = no change
      let safeHeight: number | null | undefined = bookingEmbedHeight;

      if (bookingEmbedSrc !== undefined) {
        if (!bookingEmbedSrc?.trim()) {
          safeSrc = null;
          safeHeight = null;
        } else {
          const parsed = parseEmbedInput(bookingEmbedSrc.trim());
          if (!parsed) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Booking embed URL must be a valid HTTPS URL.",
            });
          }
          safeSrc = parsed.src;
          if (parsed.height !== undefined) {
            safeHeight = parsed.height;
          }
          safeHeight ??= DEFAULT_EMBED_HEIGHT;
        }
      }

      const updated = await ctx.db.serviceItem.update({
        where: { id },
        data: {
          ...rest,
          priceTiers: (priceTiers ?? []) as Prisma.InputJsonValue,
          addOns: (addOns ?? []) as Prisma.InputJsonValue,
          ...(safeSrc !== undefined ? { bookingEmbedSrc: safeSrc } : {}),
          ...(safeHeight !== undefined
            ? { bookingEmbedHeight: safeHeight }
            : {}),
        },
      });

      return updated;
    }),

  deleteItem: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceItemDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id } = input;

      // Validate ownership via denormalized businessId
      const item = await ctx.db.serviceItem.findUnique({
        where: { id },
        select: { id: true, businessId: true },
      });

      if (item?.businessId !== businessId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service item not found",
        });
      }

      await ctx.db.serviceItem.delete({ where: { id } });
      return { success: true };
    }),

  reorderItems: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceItemReorderSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { serviceId, ids } = input;

      // Validate parent service ownership
      const service = await ctx.db.service.findUnique({
        where: { id: serviceId, businessId },
        select: { id: true },
      });

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      await ctx.db.$transaction(
        ids.map((id, index) =>
          ctx.db.serviceItem.update({
            where: { id, businessId },
            data: { sortOrder: index },
          }),
        ),
      );

      return { success: true };
    }),

  // ─── Public: storefront reads ────────────────────────────────────────────────

  getAllPublic: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("services"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      const services = await ctx.db.service.findMany({
        where: { businessId, published: true },
        include: {
          items: {
            where: { published: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });
      return services;
    }),

  getBySlug: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("services"))
    .input(z.string())
    .query(async ({ ctx, input: slug }) => {
      const { businessId } = ctx;
      const service = await ctx.db.service.findUnique({
        where: {
          businessId_slug: { businessId, slug },
          published: true,
        },
        include: {
          items: {
            where: { published: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      return service;
    }),
});
