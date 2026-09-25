/**
 * Zod schema for validating a StoreTransferManifest on import.
 *
 * Follows the validator style used elsewhere in src/lib/validators/.
 * Inner content rows use permissive z.unknown() / z.record() for free-form
 * JSON columns (customFields, additionalFields, content, etc.) — exact field
 * shapes are defined in src/lib/store-transfer/types.ts and are enforced at
 * the TypeScript layer by the export DTO mappers, not at parse time.
 */

import { z } from "zod";

import type { StoreTransferManifest } from "~/lib/store-transfer/types";
import { STORE_TRANSFER_FORMAT_VERSION } from "~/lib/store-transfer/types";
import { publishRulesSchema } from "~/lib/validators/videos";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

// ─── Source ───────────────────────────────────────────────────────────────────

const storeTransferSourceSchema = z.object({
  formatVersion: z.number(),
  appVersion: z.string().optional(),
  businessId: z.string(),
  businessSlug: z.string(),
  templateId: z.string(),
  storageBase: z.string(),
});

// ─── Media entry ──────────────────────────────────────────────────────────────

const mediaKindSchema = z.enum([
  "image",
  "video",
  "logo",
  "favicon",
  "testimonial",
  "gallery",
  "other",
]);

const storeTransferMediaEntrySchema = z.object({
  originalUrl: z.string(),
  originalKey: z.string(),
  zipPath: z.string(),
  kind: mediaKindSchema,
  contentType: z.string().optional(),
  bytes: z.number(),
  missing: z.boolean().optional(),
});

// ─── Content DTOs (structural only — inner JSON fields are z.unknown()) ───────

const exportedBusinessSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  slug: z.string(),
  ownerEmail: z.string(),
  supportEmail: nullableString.optional(),
  phoneNumber: nullableString.optional(),
  businessAddress: nullableString.optional(),
  // Structured address parts. Added 2026-09-25 — absent in older manifests.
  addressStreet: nullableString.optional(),
  addressCity: nullableString.optional(),
  addressState: nullableString.optional(),
  addressPostalCode: nullableString.optional(),
  // Map pin coordinates. Added 2026-09-25 — absent in older manifests.
  latitude: nullableNumber.optional(),
  longitude: nullableNumber.optional(),
  templateId: z.string(),
  testimonialsAutoApprove: z.boolean(),
  maintenanceMode: z.boolean(),
  maintenanceVariant: z.string(),
  // A TipTap doc since the column became Json (legacy bundles carry a plain
  // string). Typed as a string here, every bundle from a store with a message
  // failed to parse; import.ts normalizes both shapes.
  maintenanceMessage: z.unknown().optional(),
  // zod v3 `z.object` strips unknown keys, so the exporter's `maintenanceCta`
  // was silently dropped before it ever reached import. Declared so it survives.
  maintenanceCta: z.unknown().optional(),
  maintenanceOverline: nullableString.optional(),
  maintenanceHeadline: nullableString.optional(),
  maintenanceImage: nullableString.optional(),
  maintenanceLaunchAt: nullableString.optional(),
  maintenanceLaunchEndAt: nullableString.optional(),
  maintenanceLocation: nullableString.optional(),
  // `localBusinessEnabled` is deprecated (superseded by `localPresence` /
  // `areaServed`) but a bundle exported before the migration only has this
  // boolean — kept optional, forever, so those ZIPs still parse.
  // `import.ts`'s `resolveImportedLocalPresence` maps `true` with no
  // `localPresence` present to `"storefront"`.
  localBusinessEnabled: z.boolean().optional(),
  // Added alongside `localBusinessEnabled`'s deprecation. Also optional: a
  // pre-migration export has neither field, and even a current export could
  // in principle omit it — the fallback lives in `import.ts`, not here.
  localPresence: z.string().optional(),
  areaServed: z.array(z.string()).optional(),
  allowAiCrawlers: z.boolean(),
  // Added 2026-09-25 — absent in older manifests.
  sendAbandonedCheckoutEmails: z.boolean().optional(),
  shippingType: z.string(),
  shippingFlatRate: nullableNumber.optional(),
  freeShippingThreshold: nullableNumber.optional(),
  offersInStorePickup: z.boolean(),
  pickupLocation: nullableString.optional(),
  pickupInstructions: nullableString.optional(),
  originState: nullableString.optional(),
  shippingWeightTiers: z.unknown(),
  businessHours: z.unknown(),
  shippingFallbackRate: nullableNumber.optional(),
  shippingDefaultItemWeightLb: nullableNumber.optional(),
  salesCountries: z.array(z.string()),
  // Donations / Tips. Added 2026-09-25 — absent in older manifests.
  donationLabel: z.string().optional(),
  donationPresetAmounts: z.unknown().optional(),
  venmoHandle: nullableString.optional(),
  cashAppHandle: nullableString.optional(),
  donationShowInHeader: z.boolean().optional(),
  donationShowInFooter: z.boolean().optional(),
  featureFlags: z.unknown(),
  // `timeZone` was added after the original export format shipped. It MUST
  // stay optional (no default here — import.ts falls back to the Business
  // model's own Prisma default) so ZIPs exported before this field existed
  // still parse instead of hard-failing. Do not make this required.
  timeZone: z.string().optional(),
});

const exportedSiteContentSchema = z.object({
  exportId: z.string(),
  heroTitle: nullableString.optional(),
  heroSubtitle: nullableString.optional(),
  heroImageUrl: nullableString.optional(),
  heroButtonText: nullableString.optional(),
  heroButtonLink: nullableString.optional(),
  aboutTitle: nullableString.optional(),
  aboutText: nullableString.optional(),
  aboutImageUrl: nullableString.optional(),
  features: z.unknown(),
  footerText: nullableString.optional(),
  socialLinks: z.unknown(),
  metaTitle: nullableString.optional(),
  metaDescription: nullableString.optional(),
  metaKeywords: nullableString.optional(),
  ogImage: nullableString.optional(),
  faviconUrl: nullableString.optional(),
  // Added 2026-09-25 — absent in older manifests.
  seoBrandName: nullableString.optional(),
  logoUrl: nullableString.optional(),
  logoAltText: nullableString.optional(),
  primaryColor: nullableString.optional(),
  secondaryColor: nullableString.optional(),
  accentColor: nullableString.optional(),
  navigationItems: z.unknown(),
  customFields: z.unknown(),
  bannerConfig: z.unknown(),
  popupConfig: z.unknown(),
  // Added 2026-09-25 — absent in older manifests.
  pageMeta: z.unknown().optional(),
  emailOverrides: z.unknown().optional(),
  previewCustomFields: z.unknown(),
  previewUpdatedAt: nullableString.optional(),
});

const exportedBaseInventoryUnitSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  description: nullableString.optional(),
  lowInventoryThreshold: nullableNumber.optional(),
  allowBackorders: z.boolean(),
  itemType: z.enum(["stock", "rental"]).optional(),
  sku: nullableString.optional(),
  category: nullableString.optional(),
  storageLocation: nullableString.optional(),
  unitCostCents: nullableNumber
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0), {
      message: "unitCostCents must be a non-negative integer",
    })
    .optional(),
});

const exportedCollectionSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: nullableString.optional(),
  imageUrl: nullableString.optional(),
  published: z.boolean(),
  sortOrder: z.number(),
  metaTitle: nullableString.optional(),
  metaDescription: nullableString.optional(),
  metaKeywords: nullableString.optional(),
  ogImage: nullableString.optional(),
});

const exportedImageSchema = z.object({
  exportId: z.string(),
  url: z.string(),
  altText: nullableString.optional(),
  width: nullableNumber.optional(),
  height: nullableNumber.optional(),
  sortOrder: z.number(),
});

const exportedProductVariantSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  sku: nullableString.optional(),
  barcode: nullableString.optional(),
  price: nullableNumber.optional(),
  compareAtPrice: nullableNumber.optional(),
  options: z.unknown(),
  imageUrl: nullableString.optional(),
});

const exportedProductReviewSchema = z.object({
  exportId: z.string(),
  source: z.string(),
  rating: z.number(),
  title: nullableString.optional(),
  comment: z.string(),
  images: z.array(z.string()),
  videoUrl: nullableString.optional(),
  verifiedPurchase: z.boolean(),
  isApproved: z.boolean(),
  isHidden: z.boolean(),
  customerName: z.string(),
  customerEmail: nullableString.optional(),
  customerTitle: nullableString.optional(),
  reviewDate: z.string(),
});

const exportedProductSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  slug: z.string(),
  excerpt: nullableString.optional(),
  description: nullableString.optional(),
  price: z.number(),
  compareAtPrice: nullableNumber.optional(),
  cost: nullableNumber.optional(),
  // "Subscribe & save". Added 2026-09-25 — absent in older manifests.
  subscriptionEnabled: z.boolean().optional(),
  subscriptionIntervals: z.unknown().optional(),
  subscriptionDiscountPercent: z.number().optional(),
  sku: nullableString.optional(),
  barcode: nullableString.optional(),
  trackInventory: z.boolean(),
  allowBackorders: z.boolean(),
  lowInventoryThreshold: nullableNumber.optional(),
  exportBaseInventoryUnitId: nullableString.optional(),
  baseUnitsConsumed: nullableNumber.optional(),
  weight: nullableNumber.optional(),
  weightUnit: nullableString.optional(),
  published: z.boolean(),
  featured: z.boolean(),
  // Added 2026-09-25 — absent in older manifests.
  scheduledPublishAt: nullableString.optional(),
  sortOrder: z.number(),
  metaTitle: nullableString.optional(),
  metaDescription: nullableString.optional(),
  metaKeywords: nullableString.optional(),
  ogImage: nullableString.optional(),
  additionalFields: z.unknown(),
  images: z.array(exportedImageSchema),
  variants: z.array(exportedProductVariantSchema),
  ownerReviews: z.array(exportedProductReviewSchema),
});

const exportedCollectionProductSchema = z.object({
  exportCollectionId: z.string(),
  exportProductId: z.string(),
  sortOrder: z.number(),
});

const exportedServiceItemSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  description: nullableString.optional(),
  image: nullableString.optional(),
  priceLabel: nullableString.optional(),
  durationLabel: nullableString.optional(),
  // Added 2026-09-25 — absent in older manifests.
  compareAtPriceLabel: nullableString.optional(),
  priceTiers: z.unknown().optional(),
  addOns: z.unknown().optional(),
  category: nullableString.optional(),
  isSignature: z.boolean().optional(),
  bookingEmbedSrc: nullableString.optional(),
  bookingEmbedHeight: nullableNumber.optional(),
  published: z.boolean(),
  sortOrder: z.number(),
});

const exportedServiceSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: nullableString.optional(),
  image: nullableString.optional(),
  serviceTemplateId: z.string(),
  customFields: z.unknown(),
  published: z.boolean(),
  sortOrder: z.number(),
  metaTitle: nullableString.optional(),
  metaDescription: nullableString.optional(),
  // Added 2026-09-25 — absent in older manifests.
  metaKeywords: nullableString.optional(),
  ogImage: nullableString.optional(),
  items: z.array(exportedServiceItemSchema),
});

const exportedPageSchema = z.object({
  exportId: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.unknown(),
  excerpt: nullableString.optional(),
  image: nullableString.optional(),
  metaTitle: nullableString.optional(),
  metaDescription: nullableString.optional(),
  metaKeywords: nullableString.optional(),
  ogImage: nullableString.optional(),
  published: z.boolean(),
  sortOrder: z.number(),
  // Added 2026-09-25 — absent in older manifests.
  scheduledPublishAt: nullableString.optional(),
  previewDraft: z.unknown().optional(),
  previewDraftUpdatedAt: nullableString.optional(),
  type: z.string(),
  template: z.string(),
});

const exportedGalleryImageSchema = z.object({
  exportId: z.string(),
  url: z.string(),
  altText: nullableString.optional(),
  caption: nullableString.optional(),
  width: nullableNumber.optional(),
  height: nullableNumber.optional(),
  sortOrder: z.number(),
});

const exportedGallerySchema = z.object({
  exportId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: nullableString.optional(),
  layout: z.string(),
  columns: z.number(),
  gap: z.number(),
  aspectRatio: nullableString.optional(),
  captionStyle: nullableString.optional(),
  showCaptions: z.boolean(),
  enableLightbox: z.boolean(),
  images: z.array(exportedGalleryImageSchema),
});

const exportedDiscountCodeSchema = z.object({
  exportId: z.string(),
  code: z.string(),
  type: z.string(),
  value: z.number(),
  active: z.boolean(),
  usageLimit: nullableNumber.optional(),
  // Added 2026-09-25 — absent in older manifests.
  perCustomerLimit: nullableNumber.optional(),
  startsAt: nullableString.optional(),
  expiresAt: nullableString.optional(),
  minPurchase: nullableNumber.optional(),
  maxDiscount: nullableNumber.optional(),
});

const exportedTestimonialSchema = z.object({
  exportId: z.string(),
  source: z.string(),
  title: nullableString.optional(),
  text: z.string(),
  photoUrls: z.array(z.string()),
  isApproved: z.boolean(),
  isHidden: z.boolean(),
  customerName: z.string(),
  customerEmail: nullableString.optional(),
  customerTitle: nullableString.optional(),
  customerCompany: nullableString.optional(),
  testimonialDate: z.string(),
});

const exportedFaqItemSchema = z.object({
  exportId: z.string(),
  question: z.string(),
  answer: z.string(),
  sortOrder: z.number(),
  published: z.boolean(),
});

const exportedShippingRateSchema = z.object({
  exportId: z.string(),
  tierIndex: z.number(),
  priceCents: z.number(),
});

const exportedShippingZoneSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  states: z.array(z.string()),
  sortOrder: z.number(),
  rates: z.array(exportedShippingRateSchema),
});

const exportedEventSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  // Added after events shipped in the original format — MUST stay optional
  // with a default so manifests exported before Event.slug existed still
  // parse instead of hard-failing. See the `events` field comment below.
  slug: z.string().nullable().optional().default(null),
  blurb: nullableString.optional(),
  coverImage: nullableString.optional(),
  coverVideo: nullableString.optional(),
  startAt: z.string(),
  endAt: nullableString.optional(),
  allDay: z.boolean(),
  location: nullableString.optional(),
  externalUrl: nullableString.optional(),
  externalUrlLabel: nullableString.optional(),
  // Added 2026-09-14 — optional with a default so manifests exported before
  // the event link-QR flag existed still parse. Same rule as `slug` above.
  linkQrEnabled: z.boolean().optional().default(false),
  priceLabel: nullableString.optional(),
  published: z.boolean(),
  sortOrder: z.number(),
  isArchived: z.boolean(),
});

const exportedVideoSourceSchema = z.object({
  exportId: z.string(),
  kind: z.string(),
  externalId: z.string(),
  label: nullableString.optional(),
  enabled: z.boolean(),
  autoPublish: z.boolean(),
  publishRules: publishRulesSchema.nullable().optional().default(null),
});

const exportedVideoSchema = z.object({
  exportId: z.string(),
  youtubeId: z.string(),
  title: z.string(),
  description: nullableString.optional(),
  thumbnailUrl: nullableString.optional(),
  channelTitle: nullableString.optional(),
  publishedAt: z.string(),
  titleOverride: nullableString.optional(),
  descriptionOverride: nullableString.optional(),
  thumbnailOverride: nullableString.optional(),
  published: z.boolean(),
  sortOrder: z.number(),
  exportSourceId: nullableString.optional(),
  hiddenByRule: z.boolean().optional().default(false),
});

// Form / QuoteCalculator definitions stay z.unknown() here — import.ts
// validates each one with the owning feature's stored-definition parser and
// skips (with a warning) any row that fails, rather than rejecting the ZIP.
const exportedFormSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  definition: z.unknown(),
  published: z.boolean(),
});

const exportedQuoteCalculatorSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  definition: z.unknown(),
  published: z.boolean(),
});

const exportedLoyaltyRewardTierSchema = z.object({
  exportId: z.string(),
  label: z.string(),
  pointsCost: z.number().int(),
  type: z.string(),
  value: z.number().int(),
  minPurchase: nullableNumber.optional().default(null),
  sortOrder: z.number().int(),
  active: z.boolean(),
});

const exportedLoyaltyProgramSchema = z.object({
  earnOnOrders: z.boolean(),
  pointsPerDollar: z.number().int(),
  signupEnabled: z.boolean(),
  signupBonus: z.number().int(),
  firstOrderEnabled: z.boolean(),
  firstOrderBonus: z.number().int(),
  birthdayEnabled: z.boolean(),
  birthdayBonus: z.number().int(),
  socialEnabled: z.boolean(),
  socialFollowBonus: z.number().int(),
  rewardCodeExpiryDays: z.number().int(),
  tiers: z.array(exportedLoyaltyRewardTierSchema),
});

// `paymentMethods` is deliberately absent (never exported — see types.ts
// header); zod strips it if a hand-edited manifest carries one anyway.
const exportedInvoiceSettingsSchema = z.object({
  numberPrefix: z.string(),
  numberPadding: z.number().int(),
  startingNumber: z.number().int(),
  defaultDueTerms: z.string(),
  defaultTaxRateBps: z.number().int(),
  defaultNotes: nullableString.optional().default(null),
  defaultTerms: nullableString.optional().default(null),
  overdueAlertsEnabled: z.boolean(),
  weeklyDigestEnabled: z.boolean(),
});

// ─── Content block ────────────────────────────────────────────────────────────

const storeTransferContentSchema = z.object({
  business: exportedBusinessSchema,
  siteContent: exportedSiteContentSchema.nullable(),
  baseInventoryUnits: z.array(exportedBaseInventoryUnitSchema),
  collections: z.array(exportedCollectionSchema),
  products: z.array(exportedProductSchema),
  collectionProducts: z.array(exportedCollectionProductSchema),
  services: z.array(exportedServiceSchema),
  pages: z.array(exportedPageSchema),
  galleries: z.array(exportedGallerySchema),
  discountCodes: z.array(exportedDiscountCodeSchema),
  testimonials: z.array(exportedTestimonialSchema),
  faqItems: z.array(exportedFaqItemSchema),
  // `events` was added after the original export format shipped. It MUST stay
  // optional with a default (not required, and not solved by bumping
  // STORE_TRANSFER_FORMAT_VERSION — that would hard-reject every ZIP exported
  // before this field existed). Do not "tidy" this into a required array.
  events: z.array(exportedEventSchema).optional().default([]),
  // `videoSources`/`videos` were added after the original export format
  // shipped, same as `events` above — MUST stay optional with a default so
  // ZIPs exported before this field existed still parse instead of
  // hard-failing. Do not make these required.
  videoSources: z.array(exportedVideoSourceSchema).optional().default([]),
  videos: z.array(exportedVideoSchema).optional().default([]),
  shippingZones: z.array(exportedShippingZoneSchema),
  // Forms, quote calculators, loyalty program config and invoice settings
  // were added 2026-09-25 — same rule as `events` above: optional with a
  // default, NOT a STORE_TRANSFER_FORMAT_VERSION bump, so ZIPs exported
  // before these keys existed still parse. A null 1:1 block means "leave the
  // target's own config untouched" on import. Do not make these required.
  forms: z.array(exportedFormSchema).optional().default([]),
  quoteCalculators: z
    .array(exportedQuoteCalculatorSchema)
    .optional()
    .default([]),
  loyaltyProgram: exportedLoyaltyProgramSchema
    .nullable()
    .optional()
    .default(null),
  invoiceSettings: exportedInvoiceSettingsSchema
    .nullable()
    .optional()
    .default(null),
});

// ─── Top-level manifest schema ────────────────────────────────────────────────

export const storeTransferManifestSchema = z.object({
  formatVersion: z
    .number()
    .int()
    .refine((v) => v === STORE_TRANSFER_FORMAT_VERSION, {
      message: `Unsupported format version. Expected ${STORE_TRANSFER_FORMAT_VERSION}.`,
    }),
  exportedAt: z.string(),
  source: storeTransferSourceSchema,
  media: z.array(storeTransferMediaEntrySchema),
  content: storeTransferContentSchema,
});

// ─── Parse helper ─────────────────────────────────────────────────────────────

/**
 * Validate and parse a raw JSON value as a StoreTransferManifest.
 * Throws a descriptive Error if validation fails.
 */
export function parseManifest(json: unknown): StoreTransferManifest {
  const result = storeTransferManifestSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid store transfer manifest:\n${issues}`);
  }
  return result.data as StoreTransferManifest;
}
