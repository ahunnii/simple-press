import type { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { CUSTOMIZER_MAX_VALUES_PER_GROUP } from "~/lib/customizer/types";
import {
  optionGroupInputBaseSchema,
  optionValueInputBaseSchema,
  refineOptionGroup,
  refineOptionValue,
} from "~/lib/validators/product-options";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
} from "~/server/api/trpc";

/**
 * Product options (the customizer) — the owner-authored side.
 *
 * Groups are shared across the business and attached to products through
 * `ProductOptionGroupOnProduct`. Every query here is scoped by the caller's
 * `businessId`; groups, values and link targets are never addressed by id
 * alone. Money is integer cents everywhere (`Product.price` is cents too).
 *
 * The shopper-facing read side lives in `~/lib/customizer` (loaded by the
 * product / checkout paths), not here.
 */

const idSchema = z.string().min(1).max(64);

const groupSaveSchema = optionGroupInputBaseSchema
  .extend({ id: idSchema.optional() })
  .superRefine(refineOptionGroup);

const valueSaveSchema = optionValueInputBaseSchema
  .extend({
    /** Present for an existing value (kept in place); absent for a new one. */
    id: idSchema.optional(),
  })
  .superRefine(refineOptionValue);

const upsertGroupInputSchema = z.object({
  group: groupSaveSchema,
  values: z.array(valueSaveSchema).max(CUSTOMIZER_MAX_VALUES_PER_GROUP),
});

/** Price of a stocked product/variant in cents; a variant may inherit. */
function currentPriceCents(
  productPrice: number,
  variantPrice: number | null | undefined,
) {
  return Math.round(variantPrice ?? productPrice);
}

export const productOptionRouter = createTRPCRouter({
  // ─── Reads ──────────────────────────────────────────────────────────────

  /** Every group in the business, with value + attached-product counts. */
  listGroups: ownerAdminProcedure
    .use(featureGate("productOptions"))
    .query(async ({ ctx }) => {
      const groups = await ctx.db.productOptionGroup.findMany({
        where: { businessId: ctx.businessId },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          adminLabel: true,
          kind: true,
          required: true,
          display: true,
          _count: { select: { values: true, products: true } },
        },
      });
      return groups.map(({ _count, ...group }) => ({
        ...group,
        valueCount: _count.values,
        productCount: _count.products,
      }));
    }),

  /** One group with its values in order, plus what each value links to. */
  getGroup: ownerAdminProcedure
    .use(featureGate("productOptions"))
    .input(z.object({ id: idSchema }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.productOptionGroup.findFirst({
        where: { id: input.id, businessId: ctx.businessId },
        include: {
          _count: { select: { products: true } },
          values: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              linkedProduct: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  published: true,
                  variants: {
                    orderBy: { name: "asc" },
                    select: { id: true, name: true, price: true },
                  },
                },
              },
              linkedVariant: {
                select: { id: true, name: true, price: true },
              },
            },
          },
        },
      });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });

      const { values, _count, ...rest } = group;
      return {
        ...rest,
        productCount: _count.products,
        values: values.map((value) => {
          const { linkedProduct, linkedVariant, ...v } = value;
          return {
            ...v,
            linked: linkedProduct
              ? {
                  productId: linkedProduct.id,
                  productName: linkedProduct.name,
                  published: linkedProduct.published,
                  productPriceCents: Math.round(linkedProduct.price),
                  variants: linkedProduct.variants.map((variant) => ({
                    id: variant.id,
                    name: variant.name,
                    priceCents: currentPriceCents(
                      linkedProduct.price,
                      variant.price,
                    ),
                  })),
                  variantId: linkedVariant?.id ?? null,
                  variantName: linkedVariant?.name ?? null,
                  priceCents: currentPriceCents(
                    linkedProduct.price,
                    linkedVariant?.price,
                  ),
                }
              : null,
          };
        }),
      };
    }),

  /** The groups attached to one product, in the order shoppers see them. */
  listForProduct: ownerAdminProcedure
    .use(featureGate("productOptions"))
    .input(z.object({ productId: idSchema }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: { id: input.productId, businessId: ctx.businessId },
        select: { id: true },
      });
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });

      const rows = await ctx.db.productOptionGroupOnProduct.findMany({
        where: {
          productId: input.productId,
          group: { businessId: ctx.businessId },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          group: {
            select: {
              id: true,
              name: true,
              adminLabel: true,
              kind: true,
              required: true,
              display: true,
              _count: { select: { values: true, products: true } },
            },
          },
        },
      });
      return rows.map(({ group }) => {
        const { _count, ...rest } = group;
        return {
          ...rest,
          valueCount: _count.values,
          productCount: _count.products,
        };
      });
    }),

  /**
   * Products (published or not) that a value can be linked to, with their
   * variants so the owner can pick the exact stocked one.
   */
  searchLinkTargets: ownerAdminProcedure
    .use(featureGate("productOptions"))
    .input(z.object({ query: z.string().trim().max(100).default("") }))
    .query(async ({ ctx, input }) => {
      const products = await ctx.db.product.findMany({
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
        orderBy: { name: "asc" },
        take: 20,
        select: {
          id: true,
          name: true,
          price: true,
          published: true,
          variants: {
            orderBy: { name: "asc" },
            select: { id: true, name: true, price: true },
          },
        },
      });
      return products.map((product) => ({
        id: product.id,
        name: product.name,
        published: product.published,
        priceCents: Math.round(product.price),
        variants: product.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          priceCents: currentPriceCents(product.price, variant.price),
        })),
      }));
    }),

  /**
   * How many option values use this product as their linked target, and on
   * how many products those options appear — for the delete warning.
   *
   * Deliberately NOT behind the `productOptions` gate: the product list's
   * delete dialog asks regardless of the flag, and with the flag off (or never
   * on) there is simply nothing to find, so it answers zero.
   */
  usageForProduct: ownerAdminProcedure
    .input(z.object({ productId: idSchema }))
    .query(async ({ ctx, input }) => {
      const values = await ctx.db.productOptionValue.findMany({
        where: {
          linkedProductId: input.productId,
          group: { businessId: ctx.businessId },
        },
        select: { groupId: true },
      });
      if (values.length === 0) {
        return { valueCount: 0, groupCount: 0, productCount: 0 };
      }
      const groupIds = [...new Set(values.map((value) => value.groupId))];
      const attached = await ctx.db.productOptionGroupOnProduct.findMany({
        where: {
          groupId: { in: groupIds },
          productId: { not: input.productId },
          product: { businessId: ctx.businessId },
        },
        select: { productId: true },
        distinct: ["productId"],
      });
      return {
        valueCount: values.length,
        groupCount: groupIds.length,
        productCount: attached.length,
      };
    }),

  // ─── Group writes ───────────────────────────────────────────────────────

  /**
   * Create or update a group and its values in one transaction. Existing
   * value ids are kept (updated in place, so carts and order history that
   * point at them stay valid), new ones are created, omitted ones deleted.
   */
  upsertGroup: ownerAdminProcedure
    .use(featureGate("productOptions"))
    .input(upsertGroupInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { group, values } = input;
      const isText = group.kind === "text";

      if (isText && values.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A text option doesn't have choices.",
        });
      }
      if (!isText && values.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add at least one choice.",
        });
      }
      if (!isText && group.minSelections > values.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Minimum picks can't be more than the number of choices.",
        });
      }

      // Tenant check on the linked targets: every product id must be one of
      // this business's, a variant must belong to its product, and a product
      // with variants must name one (a bare product link would have no
      // stock/price to resolve).
      const linkedProductIds = [
        ...new Set(
          values.flatMap((value) =>
            value.linkedProductId ? [value.linkedProductId] : [],
          ),
        ),
      ];
      if (linkedProductIds.length > 0) {
        const targets = await ctx.db.product.findMany({
          where: { id: { in: linkedProductIds }, businessId },
          select: { id: true, name: true, variants: { select: { id: true } } },
        });
        const byId = new Map(targets.map((target) => [target.id, target]));
        for (const value of values) {
          if (!value.linkedProductId) continue;
          const target = byId.get(value.linkedProductId);
          if (!target) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `“${value.label}” is linked to a product that doesn't exist.`,
            });
          }
          const hasVariants = target.variants.length > 0;
          if (value.linkedVariantId) {
            if (!target.variants.some((v) => v.id === value.linkedVariantId)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `“${value.label}” is linked to a variant that isn't part of ${target.name}.`,
              });
            }
          } else if (hasVariants) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `${target.name} has variants. Choose which one “${value.label}” uses.`,
            });
          }
        }
      }

      const groupData = {
        name: group.name,
        adminLabel: group.adminLabel ?? null,
        helpText: group.helpText ?? null,
        kind: group.kind,
        required: group.required,
        // Fields of the other kind are reset so a switched group carries no
        // stale settings.
        minSelections: isText ? 0 : group.minSelections,
        maxSelections: isText ? 1 : group.maxSelections,
        includedCount: isText ? 0 : group.includedCount,
        display: group.display,
        maxLength: isText ? (group.maxLength ?? null) : null,
        placeholder: isText ? (group.placeholder ?? null) : null,
        textPriceCents: isText ? group.textPriceCents : 0,
      } satisfies Prisma.ProductOptionGroupUncheckedUpdateInput;

      return ctx.db.$transaction(async (tx) => {
        let groupId: string;
        let existingValueIds = new Set<string>();

        if (group.id) {
          const existing = await tx.productOptionGroup.findFirst({
            where: { id: group.id, businessId },
            select: { id: true, values: { select: { id: true } } },
          });
          if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
          groupId = existing.id;
          existingValueIds = new Set(existing.values.map((v) => v.id));
          await tx.productOptionGroup.update({
            where: { id: groupId },
            data: groupData,
          });
        } else {
          const created = await tx.productOptionGroup.create({
            data: { ...groupData, businessId },
            select: { id: true },
          });
          groupId = created.id;
        }

        const keptIds = new Set<string>();
        for (const value of values) {
          if (value.id) {
            if (!existingValueIds.has(value.id)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "A choice no longer belongs to this option. Reload.",
              });
            }
            if (keptIds.has(value.id)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "A choice was listed twice.",
              });
            }
            keptIds.add(value.id);
          }
        }

        const removed = [...existingValueIds].filter((id) => !keptIds.has(id));
        if (removed.length > 0) {
          await tx.productOptionValue.deleteMany({
            where: { groupId, id: { in: removed } },
          });
        }

        for (const [index, value] of values.entries()) {
          const linked = Boolean(value.linkedProductId);
          const data = {
            label: value.label,
            imageUrl: value.imageUrl ?? null,
            swatchColor: value.swatchColor ?? null,
            // A linked value takes its price from the product; a stray
            // add-on price would be ignored, so don't store one.
            priceDelta: linked ? 0 : value.priceDelta,
            priceOverride: linked ? (value.priceOverride ?? null) : null,
            linkedProductId: value.linkedProductId ?? null,
            linkedVariantId: linked ? (value.linkedVariantId ?? null) : null,
            available: value.available,
            sortOrder: index,
          };
          if (value.id) {
            await tx.productOptionValue.update({
              where: { id: value.id },
              data,
            });
          } else {
            await tx.productOptionValue.create({ data: { ...data, groupId } });
          }
        }

        return { id: groupId };
      });
    }),

  deleteGroup: ownerAdminProcedure
    .use(featureGate("productOptions"))
    .input(z.object({ id: idSchema }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.productOptionGroup.deleteMany({
        where: { id: input.id, businessId: ctx.businessId },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  // ─── Attachments ────────────────────────────────────────────────────────

  attach: ownerAdminProcedure
    .use(featureGate("productOptions"))
    .input(z.object({ productId: idSchema, groupId: idSchema }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const [product, group] = await Promise.all([
        ctx.db.product.findFirst({
          where: { id: input.productId, businessId },
          select: { id: true },
        }),
        ctx.db.productOptionGroup.findFirst({
          where: { id: input.groupId, businessId },
          select: { id: true },
        }),
      ]);
      if (!product || !group) throw new TRPCError({ code: "NOT_FOUND" });

      const last = await ctx.db.productOptionGroupOnProduct.aggregate({
        where: { productId: product.id },
        _max: { sortOrder: true },
      });
      // Idempotent: attaching twice keeps the existing position.
      await ctx.db.productOptionGroupOnProduct.upsert({
        where: {
          productId_groupId: { productId: product.id, groupId: group.id },
        },
        create: {
          productId: product.id,
          groupId: group.id,
          sortOrder: (last._max.sortOrder ?? -1) + 1,
        },
        update: {},
      });
      return { success: true };
    }),

  detach: ownerAdminProcedure
    .use(featureGate("productOptions"))
    .input(z.object({ productId: idSchema, groupId: idSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.productOptionGroupOnProduct.deleteMany({
        where: {
          productId: input.productId,
          groupId: input.groupId,
          product: { businessId: ctx.businessId },
          group: { businessId: ctx.businessId },
        },
      });
      return { success: true };
    }),

  /** `groupIds` must be exactly the product's attached groups, in the new order. */
  reorder: ownerAdminProcedure
    .use(featureGate("productOptions"))
    .input(
      z.object({
        productId: idSchema,
        groupIds: z.array(idSchema).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const product = await ctx.db.product.findFirst({
        where: { id: input.productId, businessId },
        select: { id: true },
      });
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });

      const attached = await ctx.db.productOptionGroupOnProduct.findMany({
        where: { productId: product.id, group: { businessId } },
        select: { groupId: true },
      });
      const attachedIds = new Set(attached.map((row) => row.groupId));
      const requested = new Set(input.groupIds);
      if (
        requested.size !== input.groupIds.length ||
        requested.size !== attachedIds.size ||
        input.groupIds.some((id) => !attachedIds.has(id))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The option list changed. Reload and try again.",
        });
      }

      await ctx.db.$transaction(
        input.groupIds.map((groupId, index) =>
          ctx.db.productOptionGroupOnProduct.update({
            where: {
              productId_groupId: { productId: product.id, groupId },
            },
            data: { sortOrder: index },
          }),
        ),
      );
      return { success: true };
    }),
});
