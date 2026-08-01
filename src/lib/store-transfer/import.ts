/**
 * Store Transfer — import pipeline.
 *
 * importStoreBundle({ targetBusinessId, zipBuffer }):
 *   1. Parse the ZIP — read manifest.json, Zod-validate, assert formatVersion === 1.
 *   2. Re-host media into the target bucket — build urlMap (oldUrl → newUrl).
 *   3. Upsert content in dependency order — build oldId → newId maps.
 *   4. Post-import validation — assert no URL still points at the source storageBase.
 *
 * Transactions: media re-hosting is outside any DB tx; per-model sequential
 * awaits accumulate counts and warnings so a partial failure is retryable.
 *
 * noUncheckedIndexedAccess is ON — every map.get() result is guarded.
 */

import path from "node:path";
import JSZip from "jszip";

import { buildUsedMediaIndex } from "~/lib/media/usage";
import {
  contentAddressedKey,
  objectExists,
  putStoredObject,
} from "~/lib/s3/put";
import { keyToPublicUrl } from "~/lib/s3/url";
import {
  normalizeUrl,
  rewriteJsonValue,
  rewriteTiptapDoc,
  rewriteUrl,
} from "~/lib/store-transfer/rewrite";
import { parseManifest } from "~/lib/validators/store-transfer";
import { db } from "~/server/db";

// ─── Result type ──────────────────────────────────────────────────────────────

export interface StoreImportResult {
  createdCount: number;
  updatedCount: number;
  mediaCount: number;
  mediaSkipped: number;
  warnings: string[];
  errors: string[];
  perModel: Record<string, { created: number; updated: number }>;
}

// ─── Bounded concurrency helper ───────────────────────────────────────────────

async function pool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const item = items[idx++];
      if (item !== undefined) await fn(item);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function importStoreBundle(args: {
  targetBusinessId: string;
  zipBuffer: ArrayBuffer | Buffer;
}): Promise<StoreImportResult> {
  const { targetBusinessId, zipBuffer } = args;

  const result: StoreImportResult = {
    createdCount: 0,
    updatedCount: 0,
    mediaCount: 0,
    mediaSkipped: 0,
    warnings: [],
    errors: [],
    perModel: {},
  };

  function track(model: string, created: boolean) {
    const rec = (result.perModel[model] ??= { created: 0, updated: 0 });
    if (created) {
      rec.created++;
      result.createdCount++;
    } else {
      rec.updated++;
      result.updatedCount++;
    }
  }

  // ── Step 1: Parse ───────────────────────────────────────────────────────────

  const zip = await JSZip.loadAsync(zipBuffer);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error("Invalid store transfer ZIP: missing manifest.json");
  }
  const manifestText = await manifestFile.async("text");
  const rawManifest: unknown = JSON.parse(manifestText) as unknown;

  // parseManifest throws a descriptive Error if validation fails or formatVersion is wrong
  const manifest = parseManifest(rawManifest);

  const { source, media, content } = manifest;
  const templateId = source.templateId;

  // Capture the target's ORIGINAL templateId before 3a overwrites it, so the
  // template-mismatch notice at the end can compare against the real prior value.
  const targetBizBefore = await db.business
    .findUnique({
      where: { id: targetBusinessId },
      select: { templateId: true },
    })
    .catch(() => null);
  const originalTemplateId = targetBizBefore?.templateId ?? null;

  // ── Step 2: Re-host media → build urlMap ────────────────────────────────────

  const urlMap = new Map<string, string>(); // normalizedOldUrl → newUrl

  const nonMissingMedia = media.filter((entry) => !entry.missing);

  await pool(nonMissingMedia, 5, async (entry) => {
    const zipFile = zip.file(entry.zipPath);
    if (!zipFile) {
      result.warnings.push(
        `Media missing from ZIP: ${entry.zipPath} (originalUrl: ${entry.originalUrl})`,
      );
      return;
    }

    let bytes: Buffer;
    try {
      bytes = await zipFile.async("nodebuffer");
    } catch (err) {
      result.warnings.push(
        `Failed to read ZIP entry ${entry.zipPath}: ${String(err)}`,
      );
      return;
    }

    const ext =
      path.extname(entry.zipPath) || path.extname(entry.originalKey) || "";
    const key = contentAddressedKey(targetBusinessId, entry.kind, bytes, ext);

    try {
      const exists = await objectExists(key);
      if (exists) {
        result.mediaSkipped++;
      } else {
        await putStoredObject({
          key,
          body: bytes,
          contentType: entry.contentType,
        });
        result.mediaCount++;
      }
      const newUrl = keyToPublicUrl(key);
      urlMap.set(normalizeUrl(entry.originalUrl), newUrl);
    } catch (err) {
      result.warnings.push(
        `S3 PUT failed for ${entry.zipPath}: ${String(err)} — URL left un-rewritten`,
      );
    }
  });

  // ── Step 3: Upsert content in dependency order ──────────────────────────────

  // ── 3a. Business config UPDATE only (never touch identity/stripe/domain fields)
  try {
    const biz = content.business;
    await db.business.update({
      where: { id: targetBusinessId },
      data: {
        name: biz.name,
        ownerEmail: biz.ownerEmail,
        supportEmail: biz.supportEmail ?? null,
        phoneNumber: biz.phoneNumber ?? null,
        businessAddress: biz.businessAddress ?? null,
        templateId: biz.templateId,
        testimonialsAutoApprove: biz.testimonialsAutoApprove,
        maintenanceMode: biz.maintenanceMode,
        maintenanceVariant: biz.maintenanceVariant,
        maintenanceMessage: biz.maintenanceMessage ?? null,
        localBusinessEnabled: biz.localBusinessEnabled,
        allowAiCrawlers: biz.allowAiCrawlers,
        shippingType: biz.shippingType,
        shippingFlatRate: biz.shippingFlatRate ?? null,
        freeShippingThreshold: biz.freeShippingThreshold ?? null,
        offersInStorePickup: biz.offersInStorePickup,
        pickupLocation: biz.pickupLocation ?? null,
        pickupInstructions: biz.pickupInstructions ?? null,
        originState: biz.originState ?? null,
        shippingWeightTiers: biz.shippingWeightTiers ?? undefined,
        businessHours: biz.businessHours ?? undefined,
        shippingFallbackRate: biz.shippingFallbackRate ?? null,
        shippingDefaultItemWeightLb: biz.shippingDefaultItemWeightLb ?? null,
        salesCountries: biz.salesCountries,
        featureFlags: biz.featureFlags ?? undefined,
        // `timeZone` is optional in the schema (backward-compat with ZIPs
        // exported before the field existed) — fall back to the Business
        // model's own Prisma default rather than leaving it unset.
        timeZone: biz.timeZone ?? "America/Detroit",
      },
    });
  } catch (err) {
    result.warnings.push(`Business config update failed: ${String(err)}`);
  }

  // ── 3b. Galleries FIRST — build galleryIdMap (exportId → newId)
  const galleryIdMap = new Map<string, string>(); // oldGalleryId → newGalleryId

  for (const gallery of content.galleries) {
    try {
      const existing = await db.gallery.findUnique({
        where: {
          businessId_slug: { businessId: targetBusinessId, slug: gallery.slug },
        },
        select: { id: true },
      });
      let newId: string;
      if (existing) {
        await db.gallery.update({
          where: { id: existing.id },
          data: {
            name: gallery.name,
            description: gallery.description ?? null,
            layout: gallery.layout,
            columns: gallery.columns,
            gap: gallery.gap,
            aspectRatio: gallery.aspectRatio ?? null,
            captionStyle: gallery.captionStyle ?? null,
            showCaptions: gallery.showCaptions,
            enableLightbox: gallery.enableLightbox,
          },
        });
        newId = existing.id;
        track("Gallery", false);
      } else {
        const created = await db.gallery.create({
          data: {
            businessId: targetBusinessId,
            slug: gallery.slug,
            name: gallery.name,
            description: gallery.description ?? null,
            layout: gallery.layout,
            columns: gallery.columns,
            gap: gallery.gap,
            aspectRatio: gallery.aspectRatio ?? null,
            captionStyle: gallery.captionStyle ?? null,
            showCaptions: gallery.showCaptions,
            enableLightbox: gallery.enableLightbox,
          },
        });
        newId = created.id;
        track("Gallery", true);
      }
      galleryIdMap.set(gallery.exportId, newId);
    } catch (err) {
      result.warnings.push(`Gallery "${gallery.slug}" failed: ${String(err)}`);
    }
  }

  // GalleryImage: delete-and-recreate per gallery (rewrite url)
  for (const gallery of content.galleries) {
    const newGalleryId = galleryIdMap.get(gallery.exportId);
    if (!newGalleryId) continue;
    try {
      await db.galleryImage.deleteMany({ where: { galleryId: newGalleryId } });
      for (const img of gallery.images) {
        await db.galleryImage.create({
          data: {
            galleryId: newGalleryId,
            url: rewriteUrl(img.url, urlMap),
            altText: img.altText ?? null,
            caption: img.caption ?? null,
            width: img.width ?? null,
            height: img.height ?? null,
            sortOrder: img.sortOrder,
          },
        });
      }
    } catch (err) {
      result.warnings.push(
        `GalleryImage recreate for gallery "${gallery.slug}" failed: ${String(err)}`,
      );
    }
  }

  // ── 3c. SiteContent upsert
  if (content.siteContent) {
    const sc = content.siteContent;
    try {
      const rewrittenCustomFields = rewriteJsonValue(
        sc.customFields,
        urlMap,
        galleryIdMap,
        { templateId },
      );
      const rewrittenPreviewCustomFields = rewriteJsonValue(
        sc.previewCustomFields,
        urlMap,
        galleryIdMap,
        { templateId },
      );
      const rewrittenFeatures = rewriteJsonValue(
        sc.features,
        urlMap,
        galleryIdMap,
      );
      const rewrittenBannerConfig = rewriteJsonValue(
        sc.bannerConfig,
        urlMap,
        galleryIdMap,
      );
      const rewrittenPopupConfig = rewriteJsonValue(
        sc.popupConfig,
        urlMap,
        galleryIdMap,
      );

      await db.siteContent.upsert({
        where: { businessId: targetBusinessId },
        update: {
          heroTitle: sc.heroTitle ?? null,
          heroSubtitle: sc.heroSubtitle ?? null,
          heroImageUrl: sc.heroImageUrl
            ? rewriteUrl(sc.heroImageUrl, urlMap)
            : null,
          heroButtonText: sc.heroButtonText ?? null,
          heroButtonLink: sc.heroButtonLink ?? null,
          aboutTitle: sc.aboutTitle ?? null,
          aboutText: sc.aboutText ?? null,
          aboutImageUrl: sc.aboutImageUrl
            ? rewriteUrl(sc.aboutImageUrl, urlMap)
            : null,
          features: rewrittenFeatures ?? undefined,
          footerText: sc.footerText ?? null,
          socialLinks: sc.socialLinks ?? undefined,
          metaTitle: sc.metaTitle ?? null,
          metaDescription: sc.metaDescription ?? null,
          metaKeywords: sc.metaKeywords ?? null,
          ogImage: sc.ogImage ? rewriteUrl(sc.ogImage, urlMap) : null,
          faviconUrl: sc.faviconUrl ? rewriteUrl(sc.faviconUrl, urlMap) : null,
          logoUrl: sc.logoUrl ? rewriteUrl(sc.logoUrl, urlMap) : null,
          logoAltText: sc.logoAltText ?? null,
          primaryColor: sc.primaryColor ?? null,
          secondaryColor: sc.secondaryColor ?? null,
          accentColor: sc.accentColor ?? null,
          navigationItems: sc.navigationItems ?? undefined,
          customFields: rewrittenCustomFields ?? undefined,
          bannerConfig: rewrittenBannerConfig ?? undefined,
          popupConfig: rewrittenPopupConfig ?? undefined,
          previewCustomFields: rewrittenPreviewCustomFields ?? undefined,
          previewUpdatedAt: sc.previewUpdatedAt
            ? new Date(sc.previewUpdatedAt)
            : null,
        },
        create: {
          businessId: targetBusinessId,
          heroTitle: sc.heroTitle ?? null,
          heroSubtitle: sc.heroSubtitle ?? null,
          heroImageUrl: sc.heroImageUrl
            ? rewriteUrl(sc.heroImageUrl, urlMap)
            : null,
          heroButtonText: sc.heroButtonText ?? null,
          heroButtonLink: sc.heroButtonLink ?? null,
          aboutTitle: sc.aboutTitle ?? null,
          aboutText: sc.aboutText ?? null,
          aboutImageUrl: sc.aboutImageUrl
            ? rewriteUrl(sc.aboutImageUrl, urlMap)
            : null,
          features: rewrittenFeatures ?? undefined,
          footerText: sc.footerText ?? null,
          socialLinks: sc.socialLinks ?? undefined,
          metaTitle: sc.metaTitle ?? null,
          metaDescription: sc.metaDescription ?? null,
          metaKeywords: sc.metaKeywords ?? null,
          ogImage: sc.ogImage ? rewriteUrl(sc.ogImage, urlMap) : null,
          faviconUrl: sc.faviconUrl ? rewriteUrl(sc.faviconUrl, urlMap) : null,
          logoUrl: sc.logoUrl ? rewriteUrl(sc.logoUrl, urlMap) : null,
          logoAltText: sc.logoAltText ?? null,
          primaryColor: sc.primaryColor ?? null,
          secondaryColor: sc.secondaryColor ?? null,
          accentColor: sc.accentColor ?? null,
          navigationItems: sc.navigationItems ?? undefined,
          customFields: rewrittenCustomFields ?? undefined,
          bannerConfig: rewrittenBannerConfig ?? undefined,
          popupConfig: rewrittenPopupConfig ?? undefined,
          previewCustomFields: rewrittenPreviewCustomFields ?? undefined,
          previewUpdatedAt: sc.previewUpdatedAt
            ? new Date(sc.previewUpdatedAt)
            : null,
        },
      });
    } catch (err) {
      result.warnings.push(`SiteContent upsert failed: ${String(err)}`);
    }
  }

  // ── 3d. BaseInventoryUnit — match by (businessId, name) → baseUnitMap
  const baseUnitMap = new Map<string, string>(); // exportId → newId

  for (const unit of content.baseInventoryUnits) {
    try {
      const existing = await db.baseInventoryUnit.findFirst({
        where: { businessId: targetBusinessId, name: unit.name },
        select: { id: true },
      });
      let newId: string;
      if (existing) {
        await db.baseInventoryUnit.update({
          where: { id: existing.id },
          data: {
            description: unit.description ?? null,
            lowInventoryThreshold: unit.lowInventoryThreshold ?? null,
            allowBackorders: unit.allowBackorders,
          },
        });
        newId = existing.id;
        track("BaseInventoryUnit", false);
      } else {
        const created = await db.baseInventoryUnit.create({
          data: {
            businessId: targetBusinessId,
            name: unit.name,
            description: unit.description ?? null,
            lowInventoryThreshold: unit.lowInventoryThreshold ?? null,
            allowBackorders: unit.allowBackorders,
          },
        });
        newId = created.id;
        track("BaseInventoryUnit", true);
      }
      baseUnitMap.set(unit.exportId, newId);
    } catch (err) {
      result.warnings.push(
        `BaseInventoryUnit "${unit.name}" failed: ${String(err)}`,
      );
    }
  }

  // ── 3e. Collections — upsert [businessId, slug] → collectionMap
  const collectionMap = new Map<string, string>(); // exportId → newId

  for (const col of content.collections) {
    try {
      const existing = await db.collection.findUnique({
        where: {
          businessId_slug: { businessId: targetBusinessId, slug: col.slug },
        },
        select: { id: true },
      });
      let newId: string;
      if (existing) {
        await db.collection.update({
          where: { id: existing.id },
          data: {
            name: col.name,
            description: col.description ?? null,
            imageUrl: col.imageUrl ? rewriteUrl(col.imageUrl, urlMap) : null,
            published: col.published,
            sortOrder: col.sortOrder,
            metaTitle: col.metaTitle ?? null,
            metaDescription: col.metaDescription ?? null,
            metaKeywords: col.metaKeywords ?? null,
            ogImage: col.ogImage ? rewriteUrl(col.ogImage, urlMap) : null,
          },
        });
        newId = existing.id;
        track("Collection", false);
      } else {
        const created = await db.collection.create({
          data: {
            businessId: targetBusinessId,
            slug: col.slug,
            name: col.name,
            description: col.description ?? null,
            imageUrl: col.imageUrl ? rewriteUrl(col.imageUrl, urlMap) : null,
            published: col.published,
            sortOrder: col.sortOrder,
            metaTitle: col.metaTitle ?? null,
            metaDescription: col.metaDescription ?? null,
            metaKeywords: col.metaKeywords ?? null,
            ogImage: col.ogImage ? rewriteUrl(col.ogImage, urlMap) : null,
          },
        });
        newId = created.id;
        track("Collection", true);
      }
      collectionMap.set(col.exportId, newId);
    } catch (err) {
      result.warnings.push(`Collection "${col.slug}" failed: ${String(err)}`);
    }
  }

  // ── 3f. Products — upsert [businessId, slug] → productMap
  const productMap = new Map<string, string>(); // exportId → newId

  for (const prod of content.products) {
    try {
      const resolvedBaseUnitId =
        prod.exportBaseInventoryUnitId != null
          ? (baseUnitMap.get(prod.exportBaseInventoryUnitId) ?? null)
          : null;

      const rewrittenAdditionalFields = rewriteJsonValue(
        prod.additionalFields,
        urlMap,
        galleryIdMap,
        { templateId },
      );

      const existing = await db.product.findUnique({
        where: {
          businessId_slug: { businessId: targetBusinessId, slug: prod.slug },
        },
        select: { id: true },
      });

      let newId: string;
      if (existing) {
        await db.product.update({
          where: { id: existing.id },
          data: {
            name: prod.name,
            excerpt: prod.excerpt ?? null,
            description: prod.description ?? null,
            price: prod.price,
            compareAtPrice: prod.compareAtPrice ?? null,
            cost: prod.cost ?? null,
            sku: prod.sku ?? null,
            barcode: prod.barcode ?? null,
            trackInventory: prod.trackInventory,
            allowBackorders: prod.allowBackorders,
            lowInventoryThreshold: prod.lowInventoryThreshold ?? null,
            baseInventoryUnitId: resolvedBaseUnitId,
            baseUnitsConsumed: prod.baseUnitsConsumed ?? null,
            weight: prod.weight ?? null,
            weightUnit: prod.weightUnit ?? null,
            published: prod.published,
            featured: prod.featured,
            sortOrder: prod.sortOrder,
            metaTitle: prod.metaTitle ?? null,
            metaDescription: prod.metaDescription ?? null,
            metaKeywords: prod.metaKeywords ?? null,
            ogImage: prod.ogImage ? rewriteUrl(prod.ogImage, urlMap) : null,
            additionalFields: rewrittenAdditionalFields ?? undefined,
            // Reset runtime fields to safe defaults
            inventoryQty: 0,
            reservedQty: 0,
            averageRating: null,
            reviewCount: 0,
            lowInventoryAlertSent: false,
            outOfStockAlertSent: false,
          },
        });
        newId = existing.id;
        track("Product", false);
      } else {
        const created = await db.product.create({
          data: {
            businessId: targetBusinessId,
            slug: prod.slug,
            name: prod.name,
            excerpt: prod.excerpt ?? null,
            description: prod.description ?? null,
            price: prod.price,
            compareAtPrice: prod.compareAtPrice ?? null,
            cost: prod.cost ?? null,
            sku: prod.sku ?? null,
            barcode: prod.barcode ?? null,
            trackInventory: prod.trackInventory,
            allowBackorders: prod.allowBackorders,
            lowInventoryThreshold: prod.lowInventoryThreshold ?? null,
            baseInventoryUnitId: resolvedBaseUnitId,
            baseUnitsConsumed: prod.baseUnitsConsumed ?? null,
            weight: prod.weight ?? null,
            weightUnit: prod.weightUnit ?? null,
            published: prod.published,
            featured: prod.featured,
            sortOrder: prod.sortOrder,
            metaTitle: prod.metaTitle ?? null,
            metaDescription: prod.metaDescription ?? null,
            metaKeywords: prod.metaKeywords ?? null,
            ogImage: prod.ogImage ? rewriteUrl(prod.ogImage, urlMap) : null,
            additionalFields: rewrittenAdditionalFields ?? undefined,
            inventoryQty: 0,
            reservedQty: 0,
            averageRating: null,
            reviewCount: 0,
            lowInventoryAlertSent: false,
            outOfStockAlertSent: false,
          },
        });
        newId = created.id;
        track("Product", true);
      }
      productMap.set(prod.exportId, newId);

      // Product images: delete-and-recreate
      try {
        await db.image.deleteMany({ where: { productId: newId } });
        for (const img of prod.images) {
          await db.image.create({
            data: {
              productId: newId,
              businessId: targetBusinessId,
              url: rewriteUrl(img.url, urlMap),
              altText: img.altText ?? null,
              width: img.width ?? null,
              height: img.height ?? null,
              sortOrder: img.sortOrder,
            },
          });
        }
      } catch (err) {
        result.warnings.push(
          `Product images for "${prod.slug}" failed: ${String(err)}`,
        );
      }

      // ProductVariants: match by name within product, update-else-create
      try {
        const existingVariants = await db.productVariant.findMany({
          where: { productId: newId },
          select: { id: true, name: true },
        });
        const variantByName = new Map(
          existingVariants.map((v) => [v.name, v.id]),
        );

        for (const variant of prod.variants) {
          const existingVariantId = variantByName.get(variant.name);
          if (existingVariantId) {
            await db.productVariant.update({
              where: { id: existingVariantId },
              data: {
                sku: variant.sku ?? null,
                barcode: variant.barcode ?? null,
                price: variant.price ?? null,
                compareAtPrice: variant.compareAtPrice ?? null,
                options: variant.options ?? {},
                imageUrl: variant.imageUrl
                  ? rewriteUrl(variant.imageUrl, urlMap)
                  : null,
                inventoryQty: 0,
                reservedQty: 0,
              },
            });
          } else {
            await db.productVariant.create({
              data: {
                productId: newId,
                name: variant.name,
                sku: variant.sku ?? null,
                barcode: variant.barcode ?? null,
                price: variant.price ?? null,
                compareAtPrice: variant.compareAtPrice ?? null,
                options: variant.options ?? {},
                imageUrl: variant.imageUrl
                  ? rewriteUrl(variant.imageUrl, urlMap)
                  : null,
                inventoryQty: 0,
                reservedQty: 0,
              },
            });
          }
        }
      } catch (err) {
        result.warnings.push(
          `ProductVariants for "${prod.slug}" failed: ${String(err)}`,
        );
      }

      // Owner ProductReviews: delete-and-recreate (null customerId/orderId)
      try {
        await db.productReview.deleteMany({
          where: { productId: newId, source: "owner" },
        });
        for (const review of prod.ownerReviews) {
          const rewrittenImages = review.images.map((url) =>
            rewriteUrl(url, urlMap),
          );
          const rewrittenVideoUrl = review.videoUrl
            ? rewriteUrl(review.videoUrl, urlMap)
            : null;
          await db.productReview.create({
            data: {
              productId: newId,
              source: "owner",
              rating: review.rating,
              title: review.title ?? null,
              comment: review.comment,
              images: rewrittenImages,
              videoUrl: rewrittenVideoUrl,
              verifiedPurchase: review.verifiedPurchase,
              isApproved: review.isApproved,
              isHidden: review.isHidden,
              customerName: review.customerName,
              customerEmail: review.customerEmail ?? null,
              customerTitle: review.customerTitle ?? null,
              reviewDate: new Date(review.reviewDate),
              customerId: null,
              orderId: null,
            },
          });
        }
      } catch (err) {
        result.warnings.push(
          `Owner reviews for "${prod.slug}" failed: ${String(err)}`,
        );
      }
    } catch (err) {
      result.warnings.push(`Product "${prod.slug}" failed: ${String(err)}`);
    }
  }

  // ── 3g. CollectionProduct joins
  for (const cp of content.collectionProducts) {
    const newCollectionId = collectionMap.get(cp.exportCollectionId);
    const newProductId = productMap.get(cp.exportProductId);
    if (!newCollectionId || !newProductId) {
      result.warnings.push(
        `CollectionProduct join skipped — dangling ref (exportCollectionId: ${cp.exportCollectionId}, exportProductId: ${cp.exportProductId})`,
      );
      continue;
    }
    try {
      const existing = await db.collectionProduct.findUnique({
        where: {
          collectionId_productId: {
            collectionId: newCollectionId,
            productId: newProductId,
          },
        },
        select: { id: true },
      });
      if (existing) {
        await db.collectionProduct.update({
          where: { id: existing.id },
          data: { sortOrder: cp.sortOrder },
        });
        track("CollectionProduct", false);
      } else {
        await db.collectionProduct.create({
          data: {
            collectionId: newCollectionId,
            productId: newProductId,
            sortOrder: cp.sortOrder,
          },
        });
        track("CollectionProduct", true);
      }
    } catch (err) {
      result.warnings.push(`CollectionProduct join failed: ${String(err)}`);
    }
  }

  // ── 3h. Services + ServiceItems
  for (const svc of content.services) {
    try {
      const rewrittenCustomFields = rewriteJsonValue(
        svc.customFields,
        urlMap,
        galleryIdMap,
        { templateId },
      );

      const existing = await db.service.findUnique({
        where: {
          businessId_slug: { businessId: targetBusinessId, slug: svc.slug },
        },
        select: { id: true },
      });

      let newId: string;
      if (existing) {
        await db.service.update({
          where: { id: existing.id },
          data: {
            name: svc.name,
            description: svc.description ?? null,
            image: svc.image ? rewriteUrl(svc.image, urlMap) : null,
            serviceTemplateId: svc.serviceTemplateId,
            customFields: rewrittenCustomFields ?? undefined,
            published: svc.published,
            sortOrder: svc.sortOrder,
            metaTitle: svc.metaTitle ?? null,
            metaDescription: svc.metaDescription ?? null,
            ogImage: svc.ogImage ? rewriteUrl(svc.ogImage, urlMap) : null,
          },
        });
        newId = existing.id;
        track("Service", false);
      } else {
        const created = await db.service.create({
          data: {
            businessId: targetBusinessId,
            slug: svc.slug,
            name: svc.name,
            description: svc.description ?? null,
            image: svc.image ? rewriteUrl(svc.image, urlMap) : null,
            serviceTemplateId: svc.serviceTemplateId,
            customFields: rewrittenCustomFields ?? undefined,
            published: svc.published,
            sortOrder: svc.sortOrder,
            metaTitle: svc.metaTitle ?? null,
            metaDescription: svc.metaDescription ?? null,
            ogImage: svc.ogImage ? rewriteUrl(svc.ogImage, urlMap) : null,
          },
        });
        newId = created.id;
        track("Service", true);
      }

      // ServiceItems: match by name within service
      try {
        const existingItems = await db.serviceItem.findMany({
          where: { serviceId: newId },
          select: { id: true, name: true },
        });
        const itemByName = new Map(existingItems.map((i) => [i.name, i.id]));

        for (const item of svc.items) {
          const existingItemId = itemByName.get(item.name);
          if (existingItemId) {
            await db.serviceItem.update({
              where: { id: existingItemId },
              data: {
                description: item.description ?? null,
                image: item.image ? rewriteUrl(item.image, urlMap) : null,
                priceLabel: item.priceLabel ?? null,
                durationLabel: item.durationLabel ?? null,
                bookingEmbedSrc: item.bookingEmbedSrc ?? null,
                bookingEmbedHeight: item.bookingEmbedHeight ?? null,
                published: item.published,
                sortOrder: item.sortOrder,
              },
            });
          } else {
            await db.serviceItem.create({
              data: {
                serviceId: newId,
                businessId: targetBusinessId,
                name: item.name,
                description: item.description ?? null,
                image: item.image ? rewriteUrl(item.image, urlMap) : null,
                priceLabel: item.priceLabel ?? null,
                durationLabel: item.durationLabel ?? null,
                bookingEmbedSrc: item.bookingEmbedSrc ?? null,
                bookingEmbedHeight: item.bookingEmbedHeight ?? null,
                published: item.published,
                sortOrder: item.sortOrder,
              },
            });
          }
        }
      } catch (err) {
        result.warnings.push(
          `ServiceItems for "${svc.slug}" failed: ${String(err)}`,
        );
      }
    } catch (err) {
      result.warnings.push(`Service "${svc.slug}" failed: ${String(err)}`);
    }
  }

  // ── 3i. Pages
  for (const page of content.pages) {
    try {
      const rewrittenContent = rewriteTiptapDoc(
        page.content,
        urlMap,
        galleryIdMap,
      );

      const existing = await db.page.findUnique({
        where: {
          businessId_slug: { businessId: targetBusinessId, slug: page.slug },
        },
        select: { id: true },
      });

      if (existing) {
        await db.page.update({
          where: { id: existing.id },
          data: {
            title: page.title,
            content: rewrittenContent ?? {},
            excerpt: page.excerpt ?? null,
            image: page.image ? rewriteUrl(page.image, urlMap) : null,
            metaTitle: page.metaTitle ?? null,
            metaDescription: page.metaDescription ?? null,
            metaKeywords: page.metaKeywords ?? null,
            ogImage: page.ogImage ? rewriteUrl(page.ogImage, urlMap) : null,
            published: page.published,
            sortOrder: page.sortOrder,
            type: page.type,
            template: page.template,
          },
        });
        track("Page", false);
      } else {
        await db.page.create({
          data: {
            businessId: targetBusinessId,
            slug: page.slug,
            title: page.title,
            content: rewrittenContent ?? {},
            excerpt: page.excerpt ?? null,
            image: page.image ? rewriteUrl(page.image, urlMap) : null,
            metaTitle: page.metaTitle ?? null,
            metaDescription: page.metaDescription ?? null,
            metaKeywords: page.metaKeywords ?? null,
            ogImage: page.ogImage ? rewriteUrl(page.ogImage, urlMap) : null,
            published: page.published,
            sortOrder: page.sortOrder,
            type: page.type,
            template: page.template,
          },
        });
        track("Page", true);
      }
    } catch (err) {
      result.warnings.push(`Page "${page.slug}" failed: ${String(err)}`);
    }
  }

  // ── 3j. DiscountCodes — upsert [businessId, code], reset usageCount
  for (const dc of content.discountCodes) {
    try {
      const existing = await db.discountCode.findUnique({
        where: {
          businessId_code: { businessId: targetBusinessId, code: dc.code },
        },
        select: { id: true },
      });
      if (existing) {
        await db.discountCode.update({
          where: { id: existing.id },
          data: {
            type: dc.type,
            value: dc.value,
            active: dc.active,
            usageLimit: dc.usageLimit ?? null,
            usageCount: 0,
            startsAt: dc.startsAt ? new Date(dc.startsAt) : null,
            expiresAt: dc.expiresAt ? new Date(dc.expiresAt) : null,
            minPurchase: dc.minPurchase ?? null,
            maxDiscount: dc.maxDiscount ?? null,
          },
        });
        track("DiscountCode", false);
      } else {
        await db.discountCode.create({
          data: {
            businessId: targetBusinessId,
            code: dc.code,
            type: dc.type,
            value: dc.value,
            active: dc.active,
            usageLimit: dc.usageLimit ?? null,
            usageCount: 0,
            startsAt: dc.startsAt ? new Date(dc.startsAt) : null,
            expiresAt: dc.expiresAt ? new Date(dc.expiresAt) : null,
            minPurchase: dc.minPurchase ?? null,
            maxDiscount: dc.maxDiscount ?? null,
          },
        });
        track("DiscountCode", true);
      }
    } catch (err) {
      result.warnings.push(`DiscountCode "${dc.code}" failed: ${String(err)}`);
    }
  }

  // ── 3k. Testimonials — heuristic match (businessId, source:"owner", customerName, date)
  const ownerTestimonials = content.testimonials.filter(
    (t) => t.source === "owner",
  );
  for (const testimonial of ownerTestimonials) {
    try {
      const rewrittenPhotoUrls = testimonial.photoUrls.map((url) =>
        rewriteUrl(url, urlMap),
      );
      const testimonialDate = new Date(testimonial.testimonialDate);

      const existing = await db.testimonial.findFirst({
        where: {
          businessId: targetBusinessId,
          source: "owner",
          customerName: testimonial.customerName,
          testimonialDate,
        },
        select: { id: true },
      });

      if (existing) {
        await db.testimonial.update({
          where: { id: existing.id },
          data: {
            title: testimonial.title ?? null,
            text: testimonial.text,
            photoUrls: rewrittenPhotoUrls,
            isApproved: testimonial.isApproved,
            isHidden: testimonial.isHidden,
            customerEmail: testimonial.customerEmail ?? null,
            customerTitle: testimonial.customerTitle ?? null,
            customerCompany: testimonial.customerCompany ?? null,
            customerId: null,
          },
        });
        track("Testimonial", false);
      } else {
        await db.testimonial.create({
          data: {
            businessId: targetBusinessId,
            source: "owner",
            title: testimonial.title ?? null,
            text: testimonial.text,
            photoUrls: rewrittenPhotoUrls,
            isApproved: testimonial.isApproved,
            isHidden: testimonial.isHidden,
            customerName: testimonial.customerName,
            customerEmail: testimonial.customerEmail ?? null,
            customerTitle: testimonial.customerTitle ?? null,
            customerCompany: testimonial.customerCompany ?? null,
            testimonialDate,
            customerId: null,
          },
        });
        track("Testimonial", true);
      }
    } catch (err) {
      result.warnings.push(
        `Testimonial "${testimonial.customerName}" failed: ${String(err)}`,
      );
    }
  }

  // ── 3l. FaqItems — match by (businessId, question)
  for (const faq of content.faqItems) {
    try {
      const existing = await db.faqItem.findFirst({
        where: { businessId: targetBusinessId, question: faq.question },
        select: { id: true },
      });
      if (existing) {
        await db.faqItem.update({
          where: { id: existing.id },
          data: {
            answer: faq.answer,
            sortOrder: faq.sortOrder,
            published: faq.published,
          },
        });
        track("FaqItem", false);
      } else {
        await db.faqItem.create({
          data: {
            businessId: targetBusinessId,
            question: faq.question,
            answer: faq.answer,
            sortOrder: faq.sortOrder,
            published: faq.published,
          },
        });
        track("FaqItem", true);
      }
    } catch (err) {
      result.warnings.push(`FaqItem failed: ${String(err)}`);
    }
  }

  // ── 3l2. Events — no natural key on Event (no slug, no unique constraint),
  // so match on (businessId, name, startAt) for idempotency.
  for (const event of content.events) {
    try {
      const startAt = new Date(event.startAt);
      const existing = await db.event.findFirst({
        where: { businessId: targetBusinessId, name: event.name, startAt },
        select: { id: true },
      });
      const data = {
        name: event.name,
        blurb: event.blurb ?? null,
        coverImage: event.coverImage
          ? rewriteUrl(event.coverImage, urlMap)
          : null,
        startAt,
        endAt: event.endAt ? new Date(event.endAt) : null,
        allDay: event.allDay,
        location: event.location ?? null,
        externalUrl: event.externalUrl ?? null,
        externalUrlLabel: event.externalUrlLabel ?? null,
        priceLabel: event.priceLabel ?? null,
        published: event.published,
        sortOrder: event.sortOrder,
        isArchived: event.isArchived,
      };
      if (existing) {
        await db.event.update({ where: { id: existing.id }, data });
        track("Event", false);
      } else {
        await db.event.create({
          data: { businessId: targetBusinessId, ...data },
        });
        track("Event", true);
      }
    } catch (err) {
      result.warnings.push(`Event "${event.name}" failed: ${String(err)}`);
    }
  }

  // ── 3l3. VideoSources — upsert (businessId, kind, externalId), the same
  // tuple the DB's own unique constraint dedupes on → videoSourceMap
  const videoSourceMap = new Map<string, string>(); // exportId → newId

  for (const source of content.videoSources) {
    try {
      const existing = await db.videoSource.findUnique({
        where: {
          businessId_kind_externalId: {
            businessId: targetBusinessId,
            kind: source.kind,
            externalId: source.externalId,
          },
        },
        select: { id: true },
      });
      let newId: string;
      if (existing) {
        await db.videoSource.update({
          where: { id: existing.id },
          data: {
            label: source.label ?? null,
            enabled: source.enabled,
            autoPublish: source.autoPublish,
          },
        });
        newId = existing.id;
        track("VideoSource", false);
      } else {
        const created = await db.videoSource.create({
          data: {
            businessId: targetBusinessId,
            kind: source.kind,
            externalId: source.externalId,
            label: source.label ?? null,
            enabled: source.enabled,
            autoPublish: source.autoPublish,
          },
        });
        newId = created.id;
        track("VideoSource", true);
      }
      videoSourceMap.set(source.exportId, newId);
    } catch (err) {
      result.warnings.push(
        `VideoSource "${source.kind}:${source.externalId}" failed: ${String(err)}`,
      );
    }
  }

  // ── 3l4. Videos — upsert (businessId, youtubeId), matching the DB's own
  // unique constraint. The video→source relationship is preserved via
  // videoSourceMap (built just above, same pattern as
  // exportBaseInventoryUnitId → baseUnitMap for Products): a video whose
  // exportSourceId resolves to a source that was itself imported gets
  // re-linked to the NEW source row. `thumbnailUrl` is a remote YouTube CDN
  // URL and is carried across verbatim (never rewritten) — only
  // `thumbnailOverride` is S3-hosted and goes through rewriteUrl. See the
  // matching comment on ExportedVideo in types.ts.
  for (const video of content.videos) {
    try {
      const resolvedSourceId =
        video.exportSourceId != null
          ? (videoSourceMap.get(video.exportSourceId) ?? null)
          : null;

      const existing = await db.video.findUnique({
        where: {
          businessId_youtubeId: {
            businessId: targetBusinessId,
            youtubeId: video.youtubeId,
          },
        },
        select: { id: true },
      });

      const data = {
        title: video.title,
        description: video.description ?? null,
        thumbnailUrl: video.thumbnailUrl ?? null,
        channelTitle: video.channelTitle ?? null,
        publishedAt: new Date(video.publishedAt),
        titleOverride: video.titleOverride ?? null,
        descriptionOverride: video.descriptionOverride ?? null,
        thumbnailOverride: video.thumbnailOverride
          ? rewriteUrl(video.thumbnailOverride, urlMap)
          : null,
        published: video.published,
        sortOrder: video.sortOrder,
        sourceId: resolvedSourceId,
      };

      if (existing) {
        await db.video.update({ where: { id: existing.id }, data });
        track("Video", false);
      } else {
        await db.video.create({
          data: {
            businessId: targetBusinessId,
            youtubeId: video.youtubeId,
            ...data,
          },
        });
        track("Video", true);
      }
    } catch (err) {
      result.warnings.push(
        `Video "${video.youtubeId}" failed: ${String(err)}`,
      );
    }
  }

  // ── 3m. ShippingZones + ShippingRates
  const zoneMap = new Map<string, string>(); // exportId → newId

  for (const zone of content.shippingZones) {
    try {
      const existing = await db.shippingZone.findUnique({
        where: {
          businessId_name: { businessId: targetBusinessId, name: zone.name },
        },
        select: { id: true },
      });

      let newZoneId: string;
      if (existing) {
        await db.shippingZone.update({
          where: { id: existing.id },
          data: { states: zone.states, sortOrder: zone.sortOrder },
        });
        newZoneId = existing.id;
        track("ShippingZone", false);
      } else {
        const created = await db.shippingZone.create({
          data: {
            businessId: targetBusinessId,
            name: zone.name,
            states: zone.states,
            sortOrder: zone.sortOrder,
          },
        });
        newZoneId = created.id;
        track("ShippingZone", true);
      }
      zoneMap.set(zone.exportId, newZoneId);

      // ShippingRates — upsert [zoneId, tierIndex]
      for (const rate of zone.rates) {
        try {
          const existingRate = await db.shippingRate.findUnique({
            where: {
              zoneId_tierIndex: {
                zoneId: newZoneId,
                tierIndex: rate.tierIndex,
              },
            },
            select: { id: true },
          });
          if (existingRate) {
            await db.shippingRate.update({
              where: { id: existingRate.id },
              data: { priceCents: rate.priceCents },
            });
            track("ShippingRate", false);
          } else {
            await db.shippingRate.create({
              data: {
                zoneId: newZoneId,
                tierIndex: rate.tierIndex,
                priceCents: rate.priceCents,
              },
            });
            track("ShippingRate", true);
          }
        } catch (err) {
          result.warnings.push(
            `ShippingRate tierIndex=${rate.tierIndex} in zone "${zone.name}" failed: ${String(err)}`,
          );
        }
      }
    } catch (err) {
      result.warnings.push(
        `ShippingZone "${zone.name}" failed: ${String(err)}`,
      );
    }
  }

  // ── Step 4: Post-import validation ─────────────────────────────────────────

  try {
    const usageIndex = await buildUsedMediaIndex(targetBusinessId);
    // A rewrite "miss" = the DB still holds an ORIGINAL source URL that we have a
    // remap for (urlMap key) but didn't apply. Checking urlMap membership is robust
    // whether or not source and target share a storage host — unlike a sourceBase
    // prefix check, which false-positives when both environments use the same bucket.
    for (const [url, usages] of usageIndex) {
      if (urlMap.has(url)) {
        for (const usage of usages) {
          result.warnings.push(
            `[POST-IMPORT] Source URL not rewritten: ${url} — found in ${usage.entityType} · ${usage.location}`,
          );
        }
      }
    }
  } catch (err) {
    result.warnings.push(`Post-import validation failed: ${String(err)}`);
  }

  // Notice if the import changed the target's template (informational — content
  // fields were authored for the source template).
  if (originalTemplateId && originalTemplateId !== source.templateId) {
    result.warnings.push(
      `Template changed from "${originalTemplateId}" to "${source.templateId}". Verify storefront rendering.`,
    );
  }

  return result;
}
