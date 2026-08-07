import { Prisma } from "generated/prisma";
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
  serviceReorderSchema,
  serviceUpdateSchema,
} from "~/lib/validators/services";
import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/** Reuse the generic slug generator (same algorithm as collections). */
function generateServiceSlug(name: string): string {
  return generateCollectionSlug(name);
}

export const serviceRouter = createTRPCRouter({
  // ─── Admin: read ────────────────────────────────────────────────────────────

  getAll: ownerAdminProcedure
    .use(featureGate("services"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      // `items` stays UNFILTERED — admin edits drafts, so it has to see them, and
      // /admin/content/navigation reads this same output. But `getAllPublic` and
      // `getBySlug` both scope items to `published: true`, so `items.length` is
      // NOT what a shopper sees: a published service whose items are all drafts
      // renders an empty page. Ship the storefront-visible count alongside the
      // total so admin can say both, the way `collections.getAll` does with
      // `liveProductCount`.
      //
      // Derived in JS rather than with a groupBy: the join rows are already here
      // with their `published` flag, so a second query would buy nothing.
      const services = await ctx.db.service.findMany({
        where: { businessId },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      // Additive only — nothing above is removed or renamed, so every existing
      // consumer (the services list, /admin/content/navigation) is unaffected.
      return services.map((service) => ({
        ...service,
        /** Items in this service that are actually visible on the storefront. */
        liveItemCount: service.items.filter((item) => item.published).length,
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

      // Generate slug from name
      const baseSlug = generateServiceSlug(input.name) || "service";
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

      // Re-generate slug only when name changed
      let slug = existing.slug;
      if (updates.name && updates.name !== existing.name) {
        const baseSlug = generateServiceSlug(updates.name) || "service";
        slug = baseSlug;
        let counter = 1;
        while (true) {
          if (counter > 1000) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not generate a unique URL slug.",
            });
          }
          const conflict = await ctx.db.service.findUnique({
            where: {
              businessId_slug: { businessId: existing.businessId, slug },
            },
          });
          if (!conflict || conflict.id === id) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
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

      await ctx.db.service.delete({ where: { id, businessId } });
      return { success: true };
    }),

  bulkSetPublished: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceBulkPublishSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.service.updateMany({
        where: { id: { in: input.ids }, businessId },
        data: { published: input.published },
      });
      return { count: result.count };
    }),

  bulkDelete: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.service.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });
      return { count: result.count };
    }),

  reorder: ownerAdminProcedure
    .use(featureGate("services"))
    .input(serviceReorderSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // The UI contract is "the complete ordered list of every service for
      // this business" — a subset would leave the rows NOT in the list with
      // stale sortOrder values, silently interleaving them with the
      // reordered ones. Compare against the actual owned id set (not just a
      // count) so duplicate ids or a foreign id substituted in for a real
      // one are also caught, not just a short/long list.
      const existing = await ctx.db.service.findMany({
        where: { businessId },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((s) => s.id));

      // The duplicate check is load-bearing, not belt-and-braces: without it
      // `[A, A]` against owned `{A, B}` passes both other conditions (length 2
      // === size 2, and every entry IS owned), then the UPDATE matches A twice
      // with conflicting positions while B silently keeps its stale sortOrder.
      if (
        input.ids.length !== existingIds.size ||
        new Set(input.ids).size !== input.ids.length ||
        input.ids.some((id) => !existingIds.has(id))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "That list of services doesn't match what's on file. Refresh and try again.",
        });
      }

      // A single set-based UPDATE ... FROM (VALUES ...) rather than N
      // individual UPDATEs (previously issued as one $transaction([...])
      // batch — the array form of $transaction has no `timeout` option, it's
      // just N statements sent back to back, so this was N round trips no
      // matter what). The reorder UI is unpaginated and always submits the
      // full list, up to serviceReorderSchema's cap of 500, so this is the
      // normal case rather than an edge case. Every value is bound as a
      // parameter (never interpolated into the SQL string) and the WHERE
      // clause scopes to businessId, so this can only touch rows this
      // business owns even if an id snuck past the completeness check above.
      const rows = input.ids.map(
        (id, index) => Prisma.sql`(${id}::text, ${index}::int)`,
      );

      await ctx.db.$executeRaw`
        UPDATE "Service" AS s
        SET "sortOrder" = v.pos
        FROM (VALUES ${Prisma.join(rows)}) AS v(id, pos)
        WHERE s.id = v.id AND s."businessId" = ${businessId}
      `;

      return { success: true };
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
