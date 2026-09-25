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
import { Prisma } from "generated/prisma";
import JSZip from "jszip";

import type { LocalPresence } from "~/lib/seo/local-presence";
import type { EmbedIdMaps } from "~/lib/store-transfer/rewrite";
import type { ExportedBusiness } from "~/lib/store-transfer/types";
import {
  normalizeMaintenanceMessage,
  normalizeMaintenanceText,
} from "~/lib/maintenance-config";
import { buildUsedMediaIndex } from "~/lib/media/usage";
import {
  contentAddressedKey,
  objectExists,
  putStoredObject,
} from "~/lib/s3/put";
import { keyToPublicUrl } from "~/lib/s3/url";
import {
  normalizeAreaServed,
  parseLocalPresence,
} from "~/lib/seo/local-presence";
import { generateEventSlug } from "~/lib/slug";
import {
  normalizeUrl,
  rewriteJsonValue,
  rewriteTiptapDoc,
  rewriteUrl,
} from "~/lib/store-transfer/rewrite";
import { parseStoredFormDefinition } from "~/lib/validators/form";
import { parseStoredQuoteDefinition } from "~/lib/validators/quote-calculator";
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

// ─── Local presence back-compat ────────────────────────────────────────────────

/**
 * Resolve the imported business's local-presence mode.
 *
 * A bundle exported after `localPresence` shipped carries it directly — used
 * verbatim (defensively re-parsed in case of a hand-edited/corrupt ZIP). An
 * older bundle only has the now-deprecated `localBusinessEnabled` boolean;
 * since that switch only ever meant "yes, publish my address", `true` maps
 * to `"storefront"` and anything else (including a bundle with neither
 * field) falls back to `"none"`.
 */
function resolveImportedLocalPresence(biz: ExportedBusiness): LocalPresence {
  if (biz.localPresence !== undefined) {
    return parseLocalPresence(biz.localPresence);
  }
  return biz.localBusinessEnabled === true ? "storefront" : "none";
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

  // ISO instant string → Date; anything else (missing key, garbage) → null.
  function toDateOrNull(value: unknown): Date | null {
    if (typeof value === "string") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  // Optional-DateTime back-compat (fields added 2026-09-25 and later): a
  // missing key must leave the target column untouched (undefined); an
  // explicit null clears it; an ISO string is parsed to a Date.
  function toDateOrUndefined(
    value: string | null | undefined,
  ): Date | null | undefined {
    if (value === undefined) return undefined;
    return value === null ? null : new Date(value);
  }

  // Json column back-compat (fields added 2026-09-25 and later): a missing
  // key must leave the target column untouched (undefined); an explicit
  // null clears it (Prisma.DbNull); anything else is passed through for
  // Prisma to cast as InputJsonValue.
  function toJsonOrUndefined(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
    if (value === undefined) return undefined;
    return (value as Prisma.InputJsonValue | null) ?? Prisma.DbNull;
  }

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
        // Structured address parts — absent in pre-2026-09-25 bundles, so a
        // missing key leaves the target's existing value untouched.
        addressStreet: biz.addressStreet,
        addressCity: biz.addressCity,
        addressState: biz.addressState,
        addressPostalCode: biz.addressPostalCode,
        // Map pin coordinates — absent in pre-2026-09-25 bundles, so a
        // missing key leaves the target's existing value untouched.
        latitude: biz.latitude,
        longitude: biz.longitude,
        templateId: biz.templateId,
        testimonialsAutoApprove: biz.testimonialsAutoApprove,
        maintenanceMode: biz.maintenanceMode,
        maintenanceVariant: biz.maintenanceVariant,
        // Image URLs in the message are rewritten like Page.content. This runs
        // before galleries/forms are imported (3b/3b2), so their id maps are
        // empty here — fine, the maintenance editor doesn't enable those embeds.
        maintenanceMessage:
          (rewriteTiptapDoc(
            normalizeMaintenanceMessage(biz.maintenanceMessage),
            urlMap,
            new Map(),
          ) as Prisma.InputJsonValue | null) ?? Prisma.DbNull,
        // v1 exports predate maintenanceCta; ?? clears the column for both
        // null and absent values, matching the DbNull convention the
        // updateMaintenanceMode mutation uses for these columns.
        maintenanceCta:
          (biz.maintenanceCta as Prisma.InputJsonValue | null | undefined) ??
          Prisma.DbNull,
        // Plain String?/DateTime? columns take `null`, not `Prisma.DbNull`
        // (that sentinel is for Json columns only). v1 bundles predate these
        // fields, so every value is normalized from `unknown` and a missing
        // key clears the column — the bundle is authoritative.
        maintenanceOverline: normalizeMaintenanceText(biz.maintenanceOverline),
        maintenanceHeadline: normalizeMaintenanceText(biz.maintenanceHeadline),
        maintenanceImage: (() => {
          const img = normalizeMaintenanceText(biz.maintenanceImage);
          return img ? rewriteUrl(img, urlMap) : null;
        })(),
        maintenanceLaunchAt: toDateOrNull(biz.maintenanceLaunchAt),
        maintenanceLaunchEndAt: toDateOrNull(biz.maintenanceLaunchEndAt),
        maintenanceLocation: normalizeMaintenanceText(biz.maintenanceLocation),
        // `localPresence` was added after the original export format shipped
        // (which only had the now-deprecated `localBusinessEnabled`
        // boolean). A bundle carrying the new field wins outright; one that
        // predates it but has `localBusinessEnabled: true` maps to
        // "storefront" (the boolean only ever meant "yes, show my address"),
        // and anything else falls back to "none" — see
        // `resolveImportedLocalPresence` below.
        localPresence: resolveImportedLocalPresence(biz),
        areaServed: normalizeAreaServed(biz.areaServed ?? []),
        allowAiCrawlers: biz.allowAiCrawlers,
        // Absent in bundles exported before 2026-09-25 — a missing key
        // leaves the target's current value untouched.
        sendAbandonedCheckoutEmails: biz.sendAbandonedCheckoutEmails,
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
        // Donations / Tips — absent in bundles exported before 2026-09-25.
        donationLabel: biz.donationLabel,
        donationPresetAmounts: toJsonOrUndefined(biz.donationPresetAmounts),
        venmoHandle: biz.venmoHandle,
        cashAppHandle: biz.cashAppHandle,
        donationShowInHeader: biz.donationShowInHeader,
        donationShowInFooter: biz.donationShowInFooter,
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

  // ── 3b2. Forms + QuoteCalculators — BEFORE SiteContent/Products/Services/
  // Pages, so formIdMap / quoteCalculatorIdMap exist before any TipTap or
  // custom-field rewriting embeds them. Neither model has a natural unique
  // key, so rows match on (businessId, name) with findFirst — same approach
  // as BaseInventoryUnit (3d). Each definition is re-validated with the
  // feature's own stored-definition parser (the read schema: it migrates
  // older blob versions and tolerates a since-tightened owner rule, exactly
  // like the admin/storefront read paths) and its normalized output is what
  // gets written. A row that fails is skipped with a warning and gets no map
  // entry, so embeds pointing at it keep their (dangling) source id.
  const formIdMap = new Map<string, string>(); // exportId → newId
  const quoteCalculatorIdMap = new Map<string, string>(); // exportId → newId

  for (const form of content.forms) {
    try {
      const parsed = parseStoredFormDefinition(form.definition);
      if (!parsed.success) {
        result.warnings.push(
          `Form "${form.name}" skipped — invalid definition: ${parsed.error.issues[0]?.message ?? "unknown error"}`,
        );
        continue;
      }
      const definition = parsed.data as Prisma.InputJsonValue;
      const existing = await db.form.findFirst({
        where: { businessId: targetBusinessId, name: form.name },
        select: { id: true },
      });
      let newId: string;
      if (existing) {
        await db.form.update({
          where: { id: existing.id },
          data: { definition, published: form.published },
        });
        newId = existing.id;
        track("Form", false);
      } else {
        const created = await db.form.create({
          data: {
            businessId: targetBusinessId,
            name: form.name,
            definition,
            published: form.published,
          },
        });
        newId = created.id;
        track("Form", true);
      }
      formIdMap.set(form.exportId, newId);
    } catch (err) {
      result.warnings.push(`Form "${form.name}" failed: ${String(err)}`);
    }
  }

  for (const calc of content.quoteCalculators) {
    try {
      const parsed = parseStoredQuoteDefinition(calc.definition);
      if (!parsed.success) {
        result.warnings.push(
          `QuoteCalculator "${calc.name}" skipped — invalid definition: ${parsed.error.issues[0]?.message ?? "unknown error"}`,
        );
        continue;
      }
      const definition = parsed.data as Prisma.InputJsonValue;
      const existing = await db.quoteCalculator.findFirst({
        where: { businessId: targetBusinessId, name: calc.name },
        select: { id: true },
      });
      let newId: string;
      if (existing) {
        await db.quoteCalculator.update({
          where: { id: existing.id },
          data: { definition, published: calc.published },
        });
        newId = existing.id;
        track("QuoteCalculator", false);
      } else {
        const created = await db.quoteCalculator.create({
          data: {
            businessId: targetBusinessId,
            name: calc.name,
            definition,
            published: calc.published,
          },
        });
        newId = created.id;
        track("QuoteCalculator", true);
      }
      quoteCalculatorIdMap.set(calc.exportId, newId);
    } catch (err) {
      result.warnings.push(
        `QuoteCalculator "${calc.name}" failed: ${String(err)}`,
      );
    }
  }

  // Passed to EVERY rewriteJsonValue / rewriteTiptapDoc call below so form
  // and quote-calculator embeds point at the target's rows.
  const embedIdMaps: EmbedIdMaps = {
    form: formIdMap,
    quoteCalculator: quoteCalculatorIdMap,
  };

  // ── 3c. SiteContent upsert
  if (content.siteContent) {
    const sc = content.siteContent;
    try {
      const rewrittenCustomFields = rewriteJsonValue(
        sc.customFields,
        urlMap,
        galleryIdMap,
        { templateId },
        embedIdMaps,
      );
      const rewrittenPreviewCustomFields = rewriteJsonValue(
        sc.previewCustomFields,
        urlMap,
        galleryIdMap,
        { templateId },
        embedIdMaps,
      );
      const rewrittenFeatures = rewriteJsonValue(
        sc.features,
        urlMap,
        galleryIdMap,
        undefined,
        embedIdMaps,
      );
      const rewrittenBannerConfig = rewriteJsonValue(
        sc.bannerConfig,
        urlMap,
        galleryIdMap,
        undefined,
        embedIdMaps,
      );
      const rewrittenPopupConfig = rewriteJsonValue(
        sc.popupConfig,
        urlMap,
        galleryIdMap,
        undefined,
        embedIdMaps,
      );
      // pageMeta's `ogImage` sub-values are storage URLs — rewrite them, but
      // WITHOUT templateId opts (pageMeta isn't a template-fields object, so
      // gallery-field detection doesn't apply here).
      const rewrittenPageMeta = toJsonOrUndefined(
        rewriteJsonValue(
          sc.pageMeta,
          urlMap,
          galleryIdMap,
          undefined,
          embedIdMaps,
        ),
      );
      // emailOverrides holds copy text only (subject/introText) — no URLs to
      // rewrite.
      const rewrittenEmailOverrides = toJsonOrUndefined(sc.emailOverrides);

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
          seoBrandName: sc.seoBrandName,
          logoUrl: sc.logoUrl ? rewriteUrl(sc.logoUrl, urlMap) : null,
          logoAltText: sc.logoAltText ?? null,
          primaryColor: sc.primaryColor ?? null,
          secondaryColor: sc.secondaryColor ?? null,
          accentColor: sc.accentColor ?? null,
          navigationItems: sc.navigationItems ?? undefined,
          customFields: rewrittenCustomFields ?? undefined,
          bannerConfig: rewrittenBannerConfig ?? undefined,
          popupConfig: rewrittenPopupConfig ?? undefined,
          pageMeta: rewrittenPageMeta,
          emailOverrides: rewrittenEmailOverrides,
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
          seoBrandName: sc.seoBrandName,
          logoUrl: sc.logoUrl ? rewriteUrl(sc.logoUrl, urlMap) : null,
          logoAltText: sc.logoAltText ?? null,
          primaryColor: sc.primaryColor ?? null,
          secondaryColor: sc.secondaryColor ?? null,
          accentColor: sc.accentColor ?? null,
          navigationItems: sc.navigationItems ?? undefined,
          customFields: rewrittenCustomFields ?? undefined,
          bannerConfig: rewrittenBannerConfig ?? undefined,
          popupConfig: rewrittenPopupConfig ?? undefined,
          pageMeta: rewrittenPageMeta,
          emailOverrides: rewrittenEmailOverrides,
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

  // Resolves the sku to write for a pool: drops it (with a warning) instead
  // of failing the import when another pool in the target business already
  // has that sku (case-insensitive). `currentPoolId` excludes the pool being
  // updated from its own collision check.
  async function resolvePoolSku(
    unitName: string,
    sku: string | null | undefined,
    currentPoolId: string | null,
  ): Promise<string | null> {
    const trimmed = sku?.trim();
    if (!trimmed) return null;
    const collision = await db.baseInventoryUnit.findFirst({
      where: {
        businessId: targetBusinessId,
        sku: { equals: trimmed, mode: "insensitive" },
        ...(currentPoolId ? { id: { not: currentPoolId } } : {}),
      },
      select: { id: true },
    });
    if (collision) {
      result.warnings.push(
        `BaseInventoryUnit "${unitName}": sku "${trimmed}" already in use in target business — dropped`,
      );
      return null;
    }
    return trimmed;
  }

  for (const unit of content.baseInventoryUnits) {
    try {
      const existing = await db.baseInventoryUnit.findFirst({
        where: { businessId: targetBusinessId, name: unit.name },
        select: { id: true },
      });
      let newId: string;
      if (existing) {
        const resolvedSku =
          unit.sku !== undefined
            ? await resolvePoolSku(unit.name, unit.sku, existing.id)
            : undefined;
        await db.baseInventoryUnit.update({
          where: { id: existing.id },
          data: {
            description: unit.description ?? null,
            lowInventoryThreshold: unit.lowInventoryThreshold ?? null,
            allowBackorders: unit.allowBackorders,
            ...(unit.itemType !== undefined && { itemType: unit.itemType }),
            ...(resolvedSku !== undefined && { sku: resolvedSku }),
            ...(unit.category !== undefined && {
              category: unit.category ?? null,
            }),
            ...(unit.storageLocation !== undefined && {
              storageLocation: unit.storageLocation ?? null,
            }),
            ...(unit.unitCostCents !== undefined && {
              unitCostCents: unit.unitCostCents ?? null,
            }),
          },
        });
        newId = existing.id;
        track("BaseInventoryUnit", false);
      } else {
        const resolvedSku =
          unit.sku !== undefined
            ? await resolvePoolSku(unit.name, unit.sku, null)
            : null;
        const created = await db.baseInventoryUnit.create({
          data: {
            businessId: targetBusinessId,
            name: unit.name,
            description: unit.description ?? null,
            lowInventoryThreshold: unit.lowInventoryThreshold ?? null,
            allowBackorders: unit.allowBackorders,
            ...(unit.itemType !== undefined && { itemType: unit.itemType }),
            sku: resolvedSku,
            category: unit.category ?? null,
            storageLocation: unit.storageLocation ?? null,
            unitCostCents: unit.unitCostCents ?? null,
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
        embedIdMaps,
      );
      // Absent in bundles exported before 2026-09-25.
      const subscriptionIntervals = toJsonOrUndefined(
        prod.subscriptionIntervals,
      );
      const scheduledPublishAt = toDateOrUndefined(prod.scheduledPublishAt);

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
            subscriptionEnabled: prod.subscriptionEnabled,
            subscriptionIntervals,
            subscriptionDiscountPercent: prod.subscriptionDiscountPercent,
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
            scheduledPublishAt,
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
            subscriptionEnabled: prod.subscriptionEnabled,
            subscriptionIntervals,
            subscriptionDiscountPercent: prod.subscriptionDiscountPercent,
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
            scheduledPublishAt,
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
        embedIdMaps,
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
            metaKeywords: svc.metaKeywords,
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
            metaKeywords: svc.metaKeywords,
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
                // Absent in bundles exported before 2026-09-25.
                compareAtPriceLabel: item.compareAtPriceLabel,
                priceTiers: toJsonOrUndefined(item.priceTiers),
                addOns: toJsonOrUndefined(item.addOns),
                category: item.category,
                isSignature: item.isSignature,
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
                compareAtPriceLabel: item.compareAtPriceLabel,
                priceTiers: toJsonOrUndefined(item.priceTiers),
                addOns: toJsonOrUndefined(item.addOns),
                category: item.category,
                isSignature: item.isSignature,
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
        embedIdMaps,
      );

      // previewDraft is { title, excerpt, content } — only its `content` key
      // gets the same TipTap URL/gallery/embed rewrite as the live `content`
      // above; other keys are copied as-is. Absent in bundles exported
      // before 2026-09-25.
      let rewrittenPreviewDraft:
        | Prisma.InputJsonValue
        | typeof Prisma.DbNull
        | undefined;
      if (page.previewDraft === undefined) {
        rewrittenPreviewDraft = undefined;
      } else if (page.previewDraft === null) {
        rewrittenPreviewDraft = Prisma.DbNull;
      } else if (
        typeof page.previewDraft === "object" &&
        !Array.isArray(page.previewDraft) &&
        "content" in page.previewDraft
      ) {
        const draft = page.previewDraft as Record<string, unknown>;
        rewrittenPreviewDraft = {
          ...draft,
          content: rewriteTiptapDoc(
            draft.content,
            urlMap,
            galleryIdMap,
            embedIdMaps,
          ),
        } as Prisma.InputJsonValue;
      } else {
        rewrittenPreviewDraft = page.previewDraft as Prisma.InputJsonValue;
      }
      const scheduledPublishAt = toDateOrUndefined(page.scheduledPublishAt);
      const previewDraftUpdatedAt = toDateOrUndefined(
        page.previewDraftUpdatedAt,
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
            scheduledPublishAt,
            previewDraft: rewrittenPreviewDraft,
            previewDraftUpdatedAt,
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
            scheduledPublishAt,
            previewDraft: rewrittenPreviewDraft,
            previewDraftUpdatedAt,
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
            // "loyalty" codes are never exported (see fetchDiscountCodes) —
            // set explicitly on import too, so a hand-edited manifest can't
            // sneak a loyalty-sourced code past the export-side filter.
            source: "manual",
            usageLimit: dc.usageLimit ?? null,
            // Absent in bundles exported before 2026-09-25.
            perCustomerLimit: dc.perCustomerLimit,
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
            source: "manual",
            usageLimit: dc.usageLimit ?? null,
            perCustomerLimit: dc.perCustomerLimit ?? null,
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

  // ── 3j2. LoyaltyProgram + LoyaltyRewardTiers. A null/absent block (older
  // bundle, or a source with no program) leaves the target's program alone.
  // Config only — member accounts and the points ledger never transfer.
  if (content.loyaltyProgram) {
    const lp = content.loyaltyProgram;
    try {
      const programData = {
        earnOnOrders: lp.earnOnOrders,
        pointsPerDollar: lp.pointsPerDollar,
        signupEnabled: lp.signupEnabled,
        signupBonus: lp.signupBonus,
        firstOrderEnabled: lp.firstOrderEnabled,
        firstOrderBonus: lp.firstOrderBonus,
        birthdayEnabled: lp.birthdayEnabled,
        birthdayBonus: lp.birthdayBonus,
        socialEnabled: lp.socialEnabled,
        socialFollowBonus: lp.socialFollowBonus,
        rewardCodeExpiryDays: lp.rewardCodeExpiryDays,
      };
      const existingProgram = await db.loyaltyProgram.findUnique({
        where: { businessId: targetBusinessId },
        select: { id: true },
      });
      const program = await db.loyaltyProgram.upsert({
        where: { businessId: targetBusinessId },
        update: programData,
        create: { businessId: targetBusinessId, ...programData },
        select: { id: true },
      });
      track("LoyaltyProgram", !existingProgram);

      // Tiers match on (programId, label): update if found, else create.
      // Tiers present in the target but absent from the bundle are NOT
      // deleted — the loyalty ledger's metadata.tierId references them, and
      // removing one would orphan redemption history. The owner can
      // deactivate/delete leftovers in admin.
      for (const tier of lp.tiers) {
        try {
          const tierData = {
            pointsCost: tier.pointsCost,
            type: tier.type,
            value: tier.value,
            minPurchase: tier.minPurchase ?? null,
            sortOrder: tier.sortOrder,
            active: tier.active,
          };
          const existingTier = await db.loyaltyRewardTier.findFirst({
            where: { programId: program.id, label: tier.label },
            select: { id: true },
          });
          if (existingTier) {
            await db.loyaltyRewardTier.update({
              where: { id: existingTier.id },
              data: tierData,
            });
            track("LoyaltyRewardTier", false);
          } else {
            await db.loyaltyRewardTier.create({
              data: {
                programId: program.id,
                // Denormalized for tenant-scoped redeem lookups.
                businessId: targetBusinessId,
                label: tier.label,
                ...tierData,
              },
            });
            track("LoyaltyRewardTier", true);
          }
        } catch (err) {
          result.warnings.push(
            `LoyaltyRewardTier "${tier.label}" failed: ${String(err)}`,
          );
        }
      }
    } catch (err) {
      result.warnings.push(`LoyaltyProgram upsert failed: ${String(err)}`);
    }
  }

  // ── 3j3. InvoiceSettings — upsert on businessId. A null/absent block
  // leaves the target's settings alone. `paymentMethods` is never exported
  // (see types.ts header) and never written here, so the target keeps its
  // own. defaultNotes/defaultTerms are @encrypted columns — the
  // prisma-field-encryption extension on `db` encrypts them transparently.
  if (content.invoiceSettings) {
    const inv = content.invoiceSettings;
    try {
      const settingsData = {
        numberPrefix: inv.numberPrefix,
        numberPadding: inv.numberPadding,
        startingNumber: inv.startingNumber,
        defaultDueTerms: inv.defaultDueTerms,
        defaultTaxRateBps: inv.defaultTaxRateBps,
        defaultNotes: inv.defaultNotes ?? null,
        defaultTerms: inv.defaultTerms ?? null,
        overdueAlertsEnabled: inv.overdueAlertsEnabled,
        weeklyDigestEnabled: inv.weeklyDigestEnabled,
      };
      const existingSettings = await db.invoiceSettings.findUnique({
        where: { businessId: targetBusinessId },
        select: { id: true },
      });
      await db.invoiceSettings.upsert({
        where: { businessId: targetBusinessId },
        update: settingsData,
        create: { businessId: targetBusinessId, ...settingsData },
      });
      track("InvoiceSettings", !existingSettings);
    } catch (err) {
      result.warnings.push(`InvoiceSettings upsert failed: ${String(err)}`);
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

  // ── 3l2. Events — matched on (businessId, name, startAt) rather than
  // slug, for manifest back-compat: manifests exported before Event.slug
  // existed carry no slug at all, so it can't serve as the dedupe key.
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
        coverVideo: event.coverVideo
          ? rewriteUrl(event.coverVideo, urlMap)
          : null,
        startAt,
        endAt: event.endAt ? new Date(event.endAt) : null,
        allDay: event.allDay,
        location: event.location ?? null,
        externalUrl: event.externalUrl ?? null,
        externalUrlLabel: event.externalUrlLabel ?? null,
        linkQrEnabled: event.linkQrEnabled ?? false,
        priceLabel: event.priceLabel ?? null,
        published: event.published,
        sortOrder: event.sortOrder,
        isArchived: event.isArchived,
      };
      if (existing) {
        // slug is immutable after creation (see events router `create`) —
        // omitted from the update so re-imports never disturb a slug that
        // the target site may already have links pointing at.
        await db.event.update({ where: { id: existing.id }, data });
        track("Event", false);
      } else {
        // Uniquify the slug against the target business, same counter-loop
        // approach as the events router's `create` (src/server/api/routers/events.ts).
        const baseSlug = event.slug ?? generateEventSlug(event.name);
        let slug = baseSlug;
        let counter = 1;
        while (
          await db.event.findUnique({
            where: {
              businessId_slug: { businessId: targetBusinessId, slug },
            },
            select: { id: true },
          })
        ) {
          if (counter > 1000) {
            throw new Error("Could not generate a unique event slug.");
          }
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        await db.event.create({
          data: { businessId: targetBusinessId, slug, ...data },
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
            publishRules: source.publishRules ?? Prisma.DbNull,
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
            publishRules: source.publishRules ?? Prisma.DbNull,
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
        hiddenByRule: video.hiddenByRule,
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
      result.warnings.push(`Video "${video.youtubeId}" failed: ${String(err)}`);
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
