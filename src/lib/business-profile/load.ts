import "server-only";

import type {
  BusinessProfileSource,
  BusinessProfileSourceProduct,
} from "./build";
import { getBusinessUrl } from "~/lib/business-url";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { routeEnabled } from "~/lib/features/route-flags";
import { PHOTO_ONLY_WHERE } from "~/lib/products/media";
import { db } from "~/server/db";

import { MAX_PRODUCTS } from "./types";

/**
 * Prisma reads for the business-profile API. Tight `select`s only: nothing
 * private (sku, barcode, cost, ownerEmail, Stripe ids, customers, orders) is
 * ever selected. Stock quantities are selected solely so the pure builder can
 * compute `inStock`; it never emits them.
 *
 * Feature gates are applied here too (skipping queries for switched-off
 * features); `buildBusinessProfile` re-applies them so the builder alone is
 * the authority on what is emitted.
 *
 * Returns null when the business no longer exists.
 */
export async function loadBusinessProfileSource(
  businessId: string,
): Promise<BusinessProfileSource | null> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      name: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      businessType: true,
      businessAddress: true,
      addressStreet: true,
      addressCity: true,
      addressState: true,
      addressPostalCode: true,
      latitude: true,
      longitude: true,
      localPresence: true,
      areaServed: true,
      businessHours: true,
      timeZone: true,
      phoneNumber: true,
      supportEmail: true,
      featureFlags: true,
      siteContent: {
        select: { aboutText: true, metaDescription: true, socialLinks: true },
      },
    },
  });
  if (!business) return null;

  const { isEnabled } = resolveFlags(business.featureFlags);
  const productsOn = routeEnabled("/shop", isEnabled);
  const collectionsOn = productsOn && routeEnabled("/collections", isEnabled);
  const servicesOn = routeEnabled("/services", isEnabled);

  const [productRows, productTotal, collectionRows, serviceRows, faqRows] =
    await Promise.all([
      productsOn
        ? db.product.findMany({
            where: { businessId, published: true },
            orderBy: [
              { featured: "desc" },
              { sortOrder: "asc" },
              { createdAt: "desc" },
            ],
            take: MAX_PRODUCTS,
            select: {
              name: true,
              slug: true,
              published: true,
              price: true,
              compareAtPrice: true,
              excerpt: true,
              description: true,
              additionalFields: true,
              averageRating: true,
              reviewCount: true,
              trackInventory: true,
              allowBackorders: true,
              inventoryQty: true,
              reservedQty: true,
              baseInventoryUnitId: true,
              baseUnitsConsumed: true,
              baseInventoryUnit: {
                select: {
                  inventoryQty: true,
                  reservedQty: true,
                  allowBackorders: true,
                },
              },
              images: {
                where: PHOTO_ONLY_WHERE,
                orderBy: { sortOrder: "asc" },
                take: 1,
                select: { url: true },
              },
              collectionProducts: {
                where: { collection: { published: true } },
                orderBy: { collection: { sortOrder: "asc" } },
                select: {
                  collection: { select: { name: true, published: true } },
                },
              },
              optionGroups: {
                orderBy: { sortOrder: "asc" },
                select: { group: { select: { name: true } } },
              },
              variants: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  name: true,
                  price: true,
                  compareAtPrice: true,
                  inventoryQty: true,
                  reservedQty: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      productsOn
        ? db.product.count({ where: { businessId, published: true } })
        : Promise.resolve(0),
      collectionsOn
        ? db.collection.findMany({
            where: { businessId, published: true },
            orderBy: { sortOrder: "asc" },
            select: {
              name: true,
              slug: true,
              description: true,
              published: true,
              _count: {
                select: {
                  // Published products only — same as `collections.getAllPublic`.
                  collectionProducts: {
                    where: { product: { published: true } },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      servicesOn
        ? db.service.findMany({
            where: { businessId, published: true },
            orderBy: { sortOrder: "asc" },
            select: {
              name: true,
              slug: true,
              description: true,
              published: true,
              items: {
                where: { published: true },
                orderBy: { sortOrder: "asc" },
                select: {
                  name: true,
                  description: true,
                  priceLabel: true,
                  durationLabel: true,
                  published: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      db.faqItem.findMany({
        where: { businessId, published: true },
        orderBy: { sortOrder: "asc" },
        select: { question: true, answer: true, published: true },
      }),
    ]);

  const products: BusinessProfileSourceProduct[] = productRows.map((p) => ({
    name: p.name,
    slug: p.slug,
    published: p.published,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    excerpt: p.excerpt,
    description: p.description,
    additionalFields: p.additionalFields,
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
    imageUrl: p.images[0]?.url ?? null,
    collections: p.collectionProducts.map((cp) => cp.collection),
    optionGroupNames: p.optionGroups.map((og) => og.group.name),
    trackInventory: p.trackInventory,
    allowBackorders: p.allowBackorders,
    inventoryQty: p.inventoryQty,
    reservedQty: p.reservedQty,
    baseInventoryUnitId: p.baseInventoryUnitId,
    baseUnitsConsumed: p.baseUnitsConsumed,
    baseInventoryUnit: p.baseInventoryUnit,
    variants: p.variants,
  }));

  return {
    baseUrl: getBusinessUrl({
      subdomain: business.subdomain,
      customDomain: business.customDomain,
      domainStatus: business.domainStatus,
    }),
    business: {
      name: business.name,
      businessType: business.businessType,
      businessAddress: business.businessAddress,
      addressStreet: business.addressStreet,
      addressCity: business.addressCity,
      addressState: business.addressState,
      addressPostalCode: business.addressPostalCode,
      latitude: business.latitude,
      longitude: business.longitude,
      localPresence: business.localPresence,
      areaServed: business.areaServed,
      businessHours: business.businessHours,
      timeZone: business.timeZone,
      phoneNumber: business.phoneNumber,
      supportEmail: business.supportEmail,
      featureFlags: business.featureFlags,
    },
    siteContent: business.siteContent,
    products,
    productTotal,
    collections: collectionRows.map((c) => ({
      name: c.name,
      slug: c.slug,
      description: c.description,
      published: c.published,
      productCount: c._count.collectionProducts,
    })),
    services: serviceRows,
    faqs: faqRows,
  };
}
