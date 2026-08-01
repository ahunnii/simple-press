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
  templateId: z.string(),
  testimonialsAutoApprove: z.boolean(),
  maintenanceMode: z.boolean(),
  maintenanceVariant: z.string(),
  maintenanceMessage: nullableString.optional(),
  localBusinessEnabled: z.boolean(),
  allowAiCrawlers: z.boolean(),
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
  logoUrl: nullableString.optional(),
  logoAltText: nullableString.optional(),
  primaryColor: nullableString.optional(),
  secondaryColor: nullableString.optional(),
  accentColor: nullableString.optional(),
  navigationItems: z.unknown(),
  customFields: z.unknown(),
  bannerConfig: z.unknown(),
  popupConfig: z.unknown(),
  previewCustomFields: z.unknown(),
  previewUpdatedAt: nullableString.optional(),
});

const exportedBaseInventoryUnitSchema = z.object({
  exportId: z.string(),
  name: z.string(),
  description: nullableString.optional(),
  lowInventoryThreshold: nullableNumber.optional(),
  allowBackorders: z.boolean(),
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
  blurb: nullableString.optional(),
  coverImage: nullableString.optional(),
  startAt: z.string(),
  endAt: nullableString.optional(),
  allDay: z.boolean(),
  location: nullableString.optional(),
  externalUrl: nullableString.optional(),
  externalUrlLabel: nullableString.optional(),
  priceLabel: nullableString.optional(),
  published: z.boolean(),
  sortOrder: z.number(),
  isArchived: z.boolean(),
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
  shippingZones: z.array(exportedShippingZoneSchema),
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
