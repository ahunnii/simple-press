/**
 * Store Transfer — export logic.
 *
 * collectStoreContent fetches all transferable store content for a given
 * businessId and maps each row into its DTO shape (stripping runtime /
 * computed / identity fields per the plan).
 *
 * This file is server-only (imports Prisma).  It carries no HTTP concerns —
 * the route handler owns auth, media bundling, and ZIP assembly.
 */

import type {
  ExportedBaseInventoryUnit,
  ExportedBusiness,
  ExportedCollection,
  ExportedCollectionProduct,
  ExportedDiscountCode,
  ExportedEvent,
  ExportedFaqItem,
  ExportedForm,
  ExportedGallery,
  ExportedGalleryImage,
  ExportedImage,
  ExportedInvoiceSettings,
  ExportedLoyaltyProgram,
  ExportedLoyaltyRewardTier,
  ExportedPage,
  ExportedProduct,
  ExportedProductReview,
  ExportedProductVariant,
  ExportedQuoteCalculator,
  ExportedService,
  ExportedServiceItem,
  ExportedShippingRate,
  ExportedShippingZone,
  ExportedSiteContent,
  ExportedTestimonial,
  ExportedVideo,
  ExportedVideoSource,
  StoreTransferContent,
} from "~/lib/store-transfer/types";
import { parseStoredPublishRules } from "~/lib/validators/videos";
import { db } from "~/server/db";

// ─── DTO Mappers ──────────────────────────────────────────────────────────────

function mapBusiness(
  b: Awaited<ReturnType<typeof fetchBusiness>>,
): ExportedBusiness {
  return {
    exportId: b.id,
    name: b.name,
    slug: b.slug,
    ownerEmail: b.ownerEmail,
    supportEmail: b.supportEmail,
    phoneNumber: b.phoneNumber,
    businessAddress: b.businessAddress,
    addressStreet: b.addressStreet,
    addressCity: b.addressCity,
    addressState: b.addressState,
    addressPostalCode: b.addressPostalCode,
    latitude: b.latitude,
    longitude: b.longitude,
    templateId: b.templateId,
    testimonialsAutoApprove: b.testimonialsAutoApprove,
    maintenanceMode: b.maintenanceMode,
    maintenanceVariant: b.maintenanceVariant,
    maintenanceMessage: b.maintenanceMessage,
    maintenanceCta: b.maintenanceCta,
    maintenanceOverline: b.maintenanceOverline,
    maintenanceHeadline: b.maintenanceHeadline,
    maintenanceImage: b.maintenanceImage,
    maintenanceLaunchAt: b.maintenanceLaunchAt?.toISOString() ?? null,
    maintenanceLaunchEndAt: b.maintenanceLaunchEndAt?.toISOString() ?? null,
    maintenanceLocation: b.maintenanceLocation,
    localPresence: b.localPresence,
    areaServed: b.areaServed,
    allowAiCrawlers: b.allowAiCrawlers,
    sendAbandonedCheckoutEmails: b.sendAbandonedCheckoutEmails,
    shippingType: b.shippingType,
    shippingFlatRate: b.shippingFlatRate,
    freeShippingThreshold: b.freeShippingThreshold,
    offersInStorePickup: b.offersInStorePickup,
    pickupLocation: b.pickupLocation,
    pickupInstructions: b.pickupInstructions,
    originState: b.originState,
    shippingWeightTiers: b.shippingWeightTiers,
    businessHours: b.businessHours,
    shippingFallbackRate: b.shippingFallbackRate,
    shippingDefaultItemWeightLb: b.shippingDefaultItemWeightLb,
    salesCountries: b.salesCountries,
    donationLabel: b.donationLabel,
    donationPresetAmounts: b.donationPresetAmounts,
    venmoHandle: b.venmoHandle,
    cashAppHandle: b.cashAppHandle,
    donationShowInHeader: b.donationShowInHeader,
    donationShowInFooter: b.donationShowInFooter,
    featureFlags: b.featureFlags,
    timeZone: b.timeZone,
  };
}

function mapSiteContent(
  sc: Awaited<ReturnType<typeof fetchSiteContent>>,
): ExportedSiteContent | null {
  if (!sc) return null;
  return {
    exportId: sc.id,
    heroTitle: sc.heroTitle,
    heroSubtitle: sc.heroSubtitle,
    heroImageUrl: sc.heroImageUrl,
    heroButtonText: sc.heroButtonText,
    heroButtonLink: sc.heroButtonLink,
    aboutTitle: sc.aboutTitle,
    aboutText: sc.aboutText,
    aboutImageUrl: sc.aboutImageUrl,
    features: sc.features,
    footerText: sc.footerText,
    socialLinks: sc.socialLinks,
    metaTitle: sc.metaTitle,
    metaDescription: sc.metaDescription,
    metaKeywords: sc.metaKeywords,
    ogImage: sc.ogImage,
    faviconUrl: sc.faviconUrl,
    seoBrandName: sc.seoBrandName,
    logoUrl: sc.logoUrl,
    logoAltText: sc.logoAltText,
    primaryColor: sc.primaryColor,
    secondaryColor: sc.secondaryColor,
    accentColor: sc.accentColor,
    navigationItems: sc.navigationItems,
    customFields: sc.customFields,
    bannerConfig: sc.bannerConfig,
    popupConfig: sc.popupConfig,
    pageMeta: sc.pageMeta,
    emailOverrides: sc.emailOverrides,
    previewCustomFields: sc.previewCustomFields,
    previewUpdatedAt: sc.previewUpdatedAt?.toISOString() ?? null,
  };
}

function mapBaseInventoryUnit(
  u: Awaited<ReturnType<typeof fetchBaseInventoryUnits>>[number],
): ExportedBaseInventoryUnit {
  return {
    exportId: u.id,
    name: u.name,
    description: u.description,
    lowInventoryThreshold: u.lowInventoryThreshold,
    allowBackorders: u.allowBackorders,
    itemType: u.itemType === "rental" ? "rental" : "stock",
    sku: u.sku,
    category: u.category,
    storageLocation: u.storageLocation,
    unitCostCents: u.unitCostCents,
  };
}

function mapCollection(
  c: Awaited<ReturnType<typeof fetchCollections>>[number],
): ExportedCollection {
  return {
    exportId: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    published: c.published,
    sortOrder: c.sortOrder,
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    metaKeywords: c.metaKeywords,
    ogImage: c.ogImage,
  };
}

function mapImage(
  img: Awaited<ReturnType<typeof fetchProducts>>[number]["images"][number],
): ExportedImage {
  return {
    exportId: img.id,
    url: img.url,
    altText: img.altText,
    width: img.width,
    height: img.height,
    sortOrder: img.sortOrder,
  };
}

function mapVariant(
  v: Awaited<ReturnType<typeof fetchProducts>>[number]["variants"][number],
): ExportedProductVariant {
  return {
    exportId: v.id,
    name: v.name,
    sku: v.sku,
    barcode: v.barcode,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    options: v.options,
    imageUrl: v.imageUrl,
  };
}

function mapReview(
  r: Awaited<ReturnType<typeof fetchProducts>>[number]["reviews"][number],
): ExportedProductReview {
  return {
    exportId: r.id,
    source: r.source,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    images: r.images,
    videoUrl: r.videoUrl,
    verifiedPurchase: r.verifiedPurchase,
    isApproved: r.isApproved,
    isHidden: r.isHidden,
    customerName: r.customerName,
    customerEmail: r.customerEmail,
    customerTitle: r.customerTitle,
    reviewDate: r.reviewDate.toISOString(),
  };
}

function mapProduct(
  p: Awaited<ReturnType<typeof fetchProducts>>[number],
): ExportedProduct {
  return {
    exportId: p.id,
    name: p.name,
    slug: p.slug,
    excerpt: p.excerpt,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    cost: p.cost,
    subscriptionEnabled: p.subscriptionEnabled,
    subscriptionIntervals: p.subscriptionIntervals,
    subscriptionDiscountPercent: p.subscriptionDiscountPercent,
    sku: p.sku,
    barcode: p.barcode,
    trackInventory: p.trackInventory,
    allowBackorders: p.allowBackorders,
    lowInventoryThreshold: p.lowInventoryThreshold,
    exportBaseInventoryUnitId: p.baseInventoryUnitId,
    baseUnitsConsumed: p.baseUnitsConsumed,
    weight: p.weight,
    weightUnit: p.weightUnit,
    published: p.published,
    featured: p.featured,
    scheduledPublishAt: p.scheduledPublishAt?.toISOString() ?? null,
    sortOrder: p.sortOrder,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    metaKeywords: p.metaKeywords,
    ogImage: p.ogImage,
    additionalFields: p.additionalFields,
    images: p.images.map(mapImage),
    variants: p.variants.map(mapVariant),
    ownerReviews: p.reviews.filter((r) => r.source === "owner").map(mapReview),
  };
}

function mapCollectionProduct(
  cp: Awaited<ReturnType<typeof fetchCollectionProducts>>[number],
): ExportedCollectionProduct {
  return {
    exportCollectionId: cp.collectionId,
    exportProductId: cp.productId,
    sortOrder: cp.sortOrder,
  };
}

function mapServiceItem(
  item: Awaited<ReturnType<typeof fetchServices>>[number]["items"][number],
): ExportedServiceItem {
  return {
    exportId: item.id,
    name: item.name,
    description: item.description,
    image: item.image,
    priceLabel: item.priceLabel,
    durationLabel: item.durationLabel,
    compareAtPriceLabel: item.compareAtPriceLabel,
    priceTiers: item.priceTiers,
    addOns: item.addOns,
    category: item.category,
    isSignature: item.isSignature,
    bookingEmbedSrc: item.bookingEmbedSrc,
    bookingEmbedHeight: item.bookingEmbedHeight,
    published: item.published,
    sortOrder: item.sortOrder,
  };
}

function mapService(
  s: Awaited<ReturnType<typeof fetchServices>>[number],
): ExportedService {
  return {
    exportId: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    image: s.image,
    serviceTemplateId: s.serviceTemplateId,
    customFields: s.customFields,
    published: s.published,
    sortOrder: s.sortOrder,
    metaTitle: s.metaTitle,
    metaDescription: s.metaDescription,
    metaKeywords: s.metaKeywords,
    ogImage: s.ogImage,
    items: s.items.map(mapServiceItem),
  };
}

function mapPage(
  p: Awaited<ReturnType<typeof fetchPages>>[number],
): ExportedPage {
  return {
    exportId: p.id,
    title: p.title,
    slug: p.slug,
    content: p.content,
    excerpt: p.excerpt,
    image: p.image,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    metaKeywords: p.metaKeywords,
    ogImage: p.ogImage,
    published: p.published,
    sortOrder: p.sortOrder,
    scheduledPublishAt: p.scheduledPublishAt?.toISOString() ?? null,
    previewDraft: p.previewDraft,
    previewDraftUpdatedAt: p.previewDraftUpdatedAt?.toISOString() ?? null,
    type: p.type,
    template: p.template,
  };
}

function mapGalleryImage(
  img: Awaited<ReturnType<typeof fetchGalleries>>[number]["images"][number],
): ExportedGalleryImage {
  return {
    exportId: img.id,
    url: img.url,
    altText: img.altText,
    caption: img.caption,
    width: img.width,
    height: img.height,
    sortOrder: img.sortOrder,
  };
}

function mapGallery(
  g: Awaited<ReturnType<typeof fetchGalleries>>[number],
): ExportedGallery {
  return {
    exportId: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
    layout: g.layout,
    columns: g.columns,
    gap: g.gap,
    aspectRatio: g.aspectRatio,
    captionStyle: g.captionStyle,
    showCaptions: g.showCaptions,
    enableLightbox: g.enableLightbox,
    images: g.images.map(mapGalleryImage),
  };
}

function mapDiscountCode(
  d: Awaited<ReturnType<typeof fetchDiscountCodes>>[number],
): ExportedDiscountCode {
  return {
    exportId: d.id,
    code: d.code,
    type: d.type,
    value: d.value,
    active: d.active,
    usageLimit: d.usageLimit,
    perCustomerLimit: d.perCustomerLimit,
    startsAt: d.startsAt?.toISOString() ?? null,
    expiresAt: d.expiresAt?.toISOString() ?? null,
    minPurchase: d.minPurchase,
    maxDiscount: d.maxDiscount,
  };
}

function mapTestimonial(
  t: Awaited<ReturnType<typeof fetchTestimonials>>[number],
): ExportedTestimonial {
  return {
    exportId: t.id,
    source: t.source,
    title: t.title,
    text: t.text,
    photoUrls: t.photoUrls,
    isApproved: t.isApproved,
    isHidden: t.isHidden,
    customerName: t.customerName,
    customerEmail: t.customerEmail,
    customerTitle: t.customerTitle,
    customerCompany: t.customerCompany,
    testimonialDate: t.testimonialDate.toISOString(),
  };
}

function mapFaqItem(
  f: Awaited<ReturnType<typeof fetchFaqItems>>[number],
): ExportedFaqItem {
  return {
    exportId: f.id,
    question: f.question,
    answer: f.answer,
    sortOrder: f.sortOrder,
    published: f.published,
  };
}

function mapEvent(
  e: Awaited<ReturnType<typeof fetchEvents>>[number],
): ExportedEvent {
  return {
    exportId: e.id,
    name: e.name,
    slug: e.slug,
    blurb: e.blurb,
    coverImage: e.coverImage,
    coverVideo: e.coverVideo,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt?.toISOString() ?? null,
    allDay: e.allDay,
    location: e.location,
    externalUrl: e.externalUrl,
    externalUrlLabel: e.externalUrlLabel,
    linkQrEnabled: e.linkQrEnabled,
    priceLabel: e.priceLabel,
    published: e.published,
    sortOrder: e.sortOrder,
    isArchived: e.isArchived,
  };
}

function mapVideoSource(
  s: Awaited<ReturnType<typeof fetchVideoSources>>[number],
): ExportedVideoSource {
  const stored = parseStoredPublishRules(s.publishRules);
  return {
    exportId: s.id,
    kind: s.kind,
    externalId: s.externalId,
    label: s.label,
    enabled: s.enabled,
    autoPublish: s.autoPublish,
    publishRules: stored.kind === "rules" ? stored.rules : null,
  };
}

function mapVideo(
  v: Awaited<ReturnType<typeof fetchVideos>>[number],
): ExportedVideo {
  return {
    exportId: v.id,
    youtubeId: v.youtubeId,
    title: v.title,
    description: v.description,
    thumbnailUrl: v.thumbnailUrl,
    channelTitle: v.channelTitle,
    publishedAt: v.publishedAt.toISOString(),
    titleOverride: v.titleOverride,
    descriptionOverride: v.descriptionOverride,
    thumbnailOverride: v.thumbnailOverride,
    published: v.published,
    sortOrder: v.sortOrder,
    exportSourceId: v.sourceId,
    hiddenByRule: v.hiddenByRule,
  };
}

function mapShippingRate(
  r: Awaited<ReturnType<typeof fetchShippingZones>>[number]["rates"][number],
): ExportedShippingRate {
  return {
    exportId: r.id,
    tierIndex: r.tierIndex,
    priceCents: r.priceCents,
  };
}

function mapShippingZone(
  z: Awaited<ReturnType<typeof fetchShippingZones>>[number],
): ExportedShippingZone {
  return {
    exportId: z.id,
    name: z.name,
    states: z.states,
    sortOrder: z.sortOrder,
    rates: z.rates.map(mapShippingRate),
  };
}

function mapForm(
  f: Awaited<ReturnType<typeof fetchForms>>[number],
): ExportedForm {
  return {
    exportId: f.id,
    name: f.name,
    definition: f.definition,
    published: f.published,
  };
}

function mapQuoteCalculator(
  c: Awaited<ReturnType<typeof fetchQuoteCalculators>>[number],
): ExportedQuoteCalculator {
  return {
    exportId: c.id,
    name: c.name,
    definition: c.definition,
    published: c.published,
  };
}

function mapLoyaltyRewardTier(
  t: NonNullable<
    Awaited<ReturnType<typeof fetchLoyaltyProgram>>
  >["tiers"][number],
): ExportedLoyaltyRewardTier {
  return {
    exportId: t.id,
    label: t.label,
    pointsCost: t.pointsCost,
    type: t.type,
    value: t.value,
    minPurchase: t.minPurchase,
    sortOrder: t.sortOrder,
    active: t.active,
  };
}

function mapLoyaltyProgram(
  p: Awaited<ReturnType<typeof fetchLoyaltyProgram>>,
): ExportedLoyaltyProgram | null {
  if (!p) return null;
  return {
    earnOnOrders: p.earnOnOrders,
    pointsPerDollar: p.pointsPerDollar,
    signupEnabled: p.signupEnabled,
    signupBonus: p.signupBonus,
    firstOrderEnabled: p.firstOrderEnabled,
    firstOrderBonus: p.firstOrderBonus,
    birthdayEnabled: p.birthdayEnabled,
    birthdayBonus: p.birthdayBonus,
    socialEnabled: p.socialEnabled,
    socialFollowBonus: p.socialFollowBonus,
    rewardCodeExpiryDays: p.rewardCodeExpiryDays,
    tiers: p.tiers.map(mapLoyaltyRewardTier),
  };
}

function mapInvoiceSettings(
  s: Awaited<ReturnType<typeof fetchInvoiceSettings>>,
): ExportedInvoiceSettings | null {
  if (!s) return null;
  return {
    numberPrefix: s.numberPrefix,
    numberPadding: s.numberPadding,
    startingNumber: s.startingNumber,
    defaultDueTerms: s.defaultDueTerms,
    defaultTaxRateBps: s.defaultTaxRateBps,
    defaultNotes: s.defaultNotes,
    defaultTerms: s.defaultTerms,
    overdueAlertsEnabled: s.overdueAlertsEnabled,
    weeklyDigestEnabled: s.weeklyDigestEnabled,
  };
}

// ─── Prisma fetchers ──────────────────────────────────────────────────────────

async function fetchBusiness(businessId: string) {
  const b = await db.business.findUniqueOrThrow({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      ownerEmail: true,
      supportEmail: true,
      phoneNumber: true,
      businessAddress: true,
      addressStreet: true,
      addressCity: true,
      addressState: true,
      addressPostalCode: true,
      latitude: true,
      longitude: true,
      templateId: true,
      testimonialsAutoApprove: true,
      maintenanceMode: true,
      maintenanceVariant: true,
      maintenanceMessage: true,
      maintenanceCta: true,
      maintenanceOverline: true,
      maintenanceHeadline: true,
      maintenanceImage: true,
      maintenanceLaunchAt: true,
      maintenanceLaunchEndAt: true,
      maintenanceLocation: true,
      localPresence: true,
      areaServed: true,
      allowAiCrawlers: true,
      sendAbandonedCheckoutEmails: true,
      shippingType: true,
      shippingFlatRate: true,
      freeShippingThreshold: true,
      offersInStorePickup: true,
      pickupLocation: true,
      pickupInstructions: true,
      originState: true,
      shippingWeightTiers: true,
      businessHours: true,
      shippingFallbackRate: true,
      shippingDefaultItemWeightLb: true,
      salesCountries: true,
      donationLabel: true,
      donationPresetAmounts: true,
      venmoHandle: true,
      cashAppHandle: true,
      donationShowInHeader: true,
      donationShowInFooter: true,
      featureFlags: true,
      timeZone: true,
    },
  });
  return b;
}

async function fetchSiteContent(businessId: string) {
  return db.siteContent.findUnique({
    where: { businessId },
    select: {
      id: true,
      heroTitle: true,
      heroSubtitle: true,
      heroImageUrl: true,
      heroButtonText: true,
      heroButtonLink: true,
      aboutTitle: true,
      aboutText: true,
      aboutImageUrl: true,
      features: true,
      footerText: true,
      socialLinks: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      ogImage: true,
      faviconUrl: true,
      seoBrandName: true,
      logoUrl: true,
      logoAltText: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      navigationItems: true,
      customFields: true,
      bannerConfig: true,
      popupConfig: true,
      pageMeta: true,
      emailOverrides: true,
      previewCustomFields: true,
      previewUpdatedAt: true,
    },
  });
}

async function fetchBaseInventoryUnits(businessId: string) {
  return db.baseInventoryUnit.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      description: true,
      lowInventoryThreshold: true,
      allowBackorders: true,
      itemType: true,
      sku: true,
      category: true,
      storageLocation: true,
      unitCostCents: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchCollections(businessId: string) {
  return db.collection.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      published: true,
      sortOrder: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      ogImage: true,
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchProducts(businessId: string) {
  return db.product.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      excerpt: true,
      description: true,
      price: true,
      compareAtPrice: true,
      cost: true,
      subscriptionEnabled: true,
      subscriptionIntervals: true,
      subscriptionDiscountPercent: true,
      sku: true,
      barcode: true,
      trackInventory: true,
      allowBackorders: true,
      lowInventoryThreshold: true,
      baseInventoryUnitId: true,
      baseUnitsConsumed: true,
      weight: true,
      weightUnit: true,
      published: true,
      featured: true,
      scheduledPublishAt: true,
      sortOrder: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      ogImage: true,
      additionalFields: true,
      images: {
        select: {
          id: true,
          url: true,
          altText: true,
          width: true,
          height: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      variants: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          price: true,
          compareAtPrice: true,
          options: true,
          imageUrl: true,
        },
        orderBy: { createdAt: "asc" },
      },
      reviews: {
        where: { source: "owner" },
        select: {
          id: true,
          source: true,
          rating: true,
          title: true,
          comment: true,
          images: true,
          videoUrl: true,
          verifiedPurchase: true,
          isApproved: true,
          isHidden: true,
          customerName: true,
          customerEmail: true,
          customerTitle: true,
          reviewDate: true,
        },
        orderBy: { reviewDate: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchCollectionProducts(businessId: string) {
  return db.collectionProduct.findMany({
    where: { collection: { businessId } },
    select: {
      collectionId: true,
      productId: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchServices(businessId: string) {
  return db.service.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      serviceTemplateId: true,
      customFields: true,
      published: true,
      sortOrder: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      ogImage: true,
      items: {
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          priceLabel: true,
          durationLabel: true,
          compareAtPriceLabel: true,
          priceTiers: true,
          addOns: true,
          category: true,
          isSignature: true,
          bookingEmbedSrc: true,
          bookingEmbedHeight: true,
          published: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchPages(businessId: string) {
  return db.page.findMany({
    where: { businessId },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      image: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      ogImage: true,
      published: true,
      sortOrder: true,
      scheduledPublishAt: true,
      previewDraft: true,
      previewDraftUpdatedAt: true,
      type: true,
      template: true,
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchGalleries(businessId: string) {
  return db.gallery.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      layout: true,
      columns: true,
      gap: true,
      aspectRatio: true,
      captionStyle: true,
      showCaptions: true,
      enableLightbox: true,
      images: {
        select: {
          id: true,
          url: true,
          altText: true,
          caption: true,
          width: true,
          height: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchDiscountCodes(businessId: string) {
  return db.discountCode.findMany({
    // "loyalty" codes are single-use, customer-bound rewards redemptions —
    // never exported. See the excluded-fields note in types.ts.
    where: { businessId, source: "manual" },
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
      active: true,
      usageLimit: true,
      perCustomerLimit: true,
      startsAt: true,
      expiresAt: true,
      minPurchase: true,
      maxDiscount: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchTestimonials(businessId: string) {
  return db.testimonial.findMany({
    where: { businessId, source: "owner" },
    select: {
      id: true,
      source: true,
      title: true,
      text: true,
      photoUrls: true,
      isApproved: true,
      isHidden: true,
      customerName: true,
      customerEmail: true,
      customerTitle: true,
      customerCompany: true,
      testimonialDate: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchFaqItems(businessId: string) {
  return db.faqItem.findMany({
    where: { businessId },
    select: {
      id: true,
      question: true,
      answer: true,
      sortOrder: true,
      published: true,
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchEvents(businessId: string) {
  return db.event.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      blurb: true,
      coverImage: true,
      coverVideo: true,
      startAt: true,
      endAt: true,
      allDay: true,
      location: true,
      externalUrl: true,
      externalUrlLabel: true,
      linkQrEnabled: true,
      priceLabel: true,
      published: true,
      sortOrder: true,
      isArchived: true,
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchVideoSources(businessId: string) {
  return db.videoSource.findMany({
    where: { businessId },
    select: {
      id: true,
      kind: true,
      externalId: true,
      label: true,
      enabled: true,
      autoPublish: true,
      publishRules: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchVideos(businessId: string) {
  return db.video.findMany({
    where: { businessId },
    select: {
      id: true,
      youtubeId: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      channelTitle: true,
      publishedAt: true,
      titleOverride: true,
      descriptionOverride: true,
      thumbnailOverride: true,
      published: true,
      sortOrder: true,
      sourceId: true,
      hiddenByRule: true,
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchShippingZones(businessId: string) {
  return db.shippingZone.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      states: true,
      sortOrder: true,
      rates: {
        select: {
          id: true,
          tierIndex: true,
          priceCents: true,
        },
        orderBy: { tierIndex: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchForms(businessId: string) {
  return db.form.findMany({
    where: { businessId },
    select: { id: true, name: true, definition: true, published: true },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchQuoteCalculators(businessId: string) {
  return db.quoteCalculator.findMany({
    where: { businessId },
    select: { id: true, name: true, definition: true, published: true },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchLoyaltyProgram(businessId: string) {
  // Program config + reward tiers only — member accounts and the points
  // ledger are customer data and never exported.
  return db.loyaltyProgram.findUnique({
    where: { businessId },
    select: {
      earnOnOrders: true,
      pointsPerDollar: true,
      signupEnabled: true,
      signupBonus: true,
      firstOrderEnabled: true,
      firstOrderBonus: true,
      birthdayEnabled: true,
      birthdayBonus: true,
      socialEnabled: true,
      socialFollowBonus: true,
      rewardCodeExpiryDays: true,
      tiers: {
        select: {
          id: true,
          label: true,
          pointsCost: true,
          type: true,
          value: true,
          minPurchase: true,
          sortOrder: true,
          active: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

async function fetchInvoiceSettings(businessId: string) {
  // `paymentMethods` is deliberately NOT selected — it may hold account
  // numbers and the ZIP is plaintext. `defaultNotes`/`defaultTerms` are
  // @encrypted columns; the prisma-field-encryption extension on `db`
  // decrypts them transparently on read.
  return db.invoiceSettings.findUnique({
    where: { businessId },
    select: {
      numberPrefix: true,
      numberPadding: true,
      startingNumber: true,
      defaultDueTerms: true,
      defaultTaxRateBps: true,
      defaultNotes: true,
      defaultTerms: true,
      overdueAlertsEnabled: true,
      weeklyDigestEnabled: true,
    },
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch and map all transferable store content for the given business.
 *
 * Returns the fully-typed content block (ready for manifest.json), plus the
 * business's templateId and slug (needed by the route handler for the manifest
 * source block and the ZIP filename).
 */
export async function collectStoreContent(businessId: string): Promise<{
  manifestContent: StoreTransferContent;
  templateId: string;
  businessSlug: string;
}> {
  // Run all fetches in parallel — independent of each other
  const [
    businessRaw,
    siteContentRaw,
    baseInventoryUnitsRaw,
    collectionsRaw,
    productsRaw,
    collectionProductsRaw,
    servicesRaw,
    pagesRaw,
    galleriesRaw,
    discountCodesRaw,
    testimonialsRaw,
    faqItemsRaw,
    eventsRaw,
    videoSourcesRaw,
    videosRaw,
    shippingZonesRaw,
    formsRaw,
    quoteCalculatorsRaw,
    loyaltyProgramRaw,
    invoiceSettingsRaw,
  ] = await Promise.all([
    fetchBusiness(businessId),
    fetchSiteContent(businessId),
    fetchBaseInventoryUnits(businessId),
    fetchCollections(businessId),
    fetchProducts(businessId),
    fetchCollectionProducts(businessId),
    fetchServices(businessId),
    fetchPages(businessId),
    fetchGalleries(businessId),
    fetchDiscountCodes(businessId),
    fetchTestimonials(businessId),
    fetchFaqItems(businessId),
    fetchEvents(businessId),
    fetchVideoSources(businessId),
    fetchVideos(businessId),
    fetchShippingZones(businessId),
    fetchForms(businessId),
    fetchQuoteCalculators(businessId),
    fetchLoyaltyProgram(businessId),
    fetchInvoiceSettings(businessId),
  ]);

  const manifestContent: StoreTransferContent = {
    business: mapBusiness(businessRaw),
    siteContent: mapSiteContent(siteContentRaw),
    baseInventoryUnits: baseInventoryUnitsRaw.map(mapBaseInventoryUnit),
    collections: collectionsRaw.map(mapCollection),
    products: productsRaw.map(mapProduct),
    collectionProducts: collectionProductsRaw.map(mapCollectionProduct),
    services: servicesRaw.map(mapService),
    pages: pagesRaw.map(mapPage),
    galleries: galleriesRaw.map(mapGallery),
    discountCodes: discountCodesRaw.map(mapDiscountCode),
    testimonials: testimonialsRaw.map(mapTestimonial),
    faqItems: faqItemsRaw.map(mapFaqItem),
    events: eventsRaw.map(mapEvent),
    videoSources: videoSourcesRaw.map(mapVideoSource),
    videos: videosRaw.map(mapVideo),
    shippingZones: shippingZonesRaw.map(mapShippingZone),
    forms: formsRaw.map(mapForm),
    quoteCalculators: quoteCalculatorsRaw.map(mapQuoteCalculator),
    loyaltyProgram: mapLoyaltyProgram(loyaltyProgramRaw),
    invoiceSettings: mapInvoiceSettings(invoiceSettingsRaw),
  };

  return {
    manifestContent,
    templateId: businessRaw.templateId,
    businessSlug: businessRaw.slug,
  };
}
