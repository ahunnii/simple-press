/**
 * Store Transfer — shared types.
 *
 * Defines the versioned manifest format and DTO interfaces for every model
 * included in a store export ZIP.  Keep this file free of any runtime imports
 * (no Prisma, no env, no server-only code) so it can be imported on both the
 * server and in validators without side-effects.
 *
 * NOTE: Excluded fields per the plan:
 *   - inventoryQty, reservedQty, averageRating, reviewCount, usageCount
 *   - *AlertSent (lowInventoryAlertSent, outOfStockAlertSent)
 *   - Stripe/identity fields on Business (stripeAccountId, stripeAutoTaxEnabled,
 *     subdomain, customDomain, domainStatus, status, onboardingComplete,
 *     umamiWebsiteId, umamiEnabled)
 */

// ─── Format version ───────────────────────────────────────────────────────────

export const STORE_TRANSFER_FORMAT_VERSION = 1 as const;

// ─── Media kind ───────────────────────────────────────────────────────────────

/** Mirrors the kind classification in src/lib/s3/list.ts */
export type MediaKind =
  | "image"
  | "video"
  | "logo"
  | "favicon"
  | "testimonial"
  | "gallery"
  | "other";

// ─── Manifest structure ───────────────────────────────────────────────────────

export interface StoreTransferSource {
  /** formatVersion at export time — always STORE_TRANSFER_FORMAT_VERSION */
  formatVersion: number;
  /** package.json version of the app at export time (optional) */
  appVersion?: string;
  /** Source business DB id */
  businessId: string;
  /** Source business slug (human-readable provenance) */
  businessSlug: string;
  /** Source templateId — used for gallery-field remapping on import */
  templateId: string;
  /** Source STORAGE_BASE URL — used by post-import validation to detect stale references */
  storageBase: string;
}

export interface StoreTransferMediaEntry {
  /** Original public URL in the source bucket */
  originalUrl: string;
  /** Source S3 object key */
  originalKey: string;
  /** Path inside the ZIP archive (e.g. "media/0001-image-.jpg") */
  zipPath: string;
  kind: MediaKind;
  contentType?: string;
  /** File size in bytes */
  bytes: number;
  /** True when the object could not be fetched at export time */
  missing?: boolean;
}

// ─── Per-model DTOs ───────────────────────────────────────────────────────────
// Every exported row carries exportId = the source DB primary key.
// Runtime/computed fields are omitted — see file header.

export interface ExportedBusiness {
  exportId: string;
  // Identity — read-only on import (slug/subdomain/customDomain/domainStatus)
  name: string;
  slug: string;
  // Contact & Legal
  ownerEmail: string;
  supportEmail: string | null;
  phoneNumber: string | null;
  businessAddress: string | null;
  // Template — imported (the key reason to transfer)
  templateId: string;
  // Storefront toggles
  testimonialsAutoApprove: boolean;
  maintenanceMode: boolean;
  maintenanceVariant: string;
  maintenanceMessage: string | null;
  // SEO
  localBusinessEnabled: boolean;
  allowAiCrawlers: boolean;
  // Shipping
  shippingType: string;
  shippingFlatRate: number | null;
  freeShippingThreshold: number | null;
  offersInStorePickup: boolean;
  pickupLocation: string | null;
  pickupInstructions: string | null;
  originState: string | null;
  shippingWeightTiers: unknown; // WeightTier[]
  businessHours: unknown; // BusinessHoursRow[]
  shippingFallbackRate: number | null;
  shippingDefaultItemWeightLb: number | null;
  salesCountries: string[];
  // Feature flags
  featureFlags: unknown; // Record<string, boolean>
  // IANA time zone used to display Event start/end times. Added after the
  // original export format shipped — see the optional-field note on
  // storeTransferContentSchema in src/lib/validators/store-transfer.ts.
  timeZone: string;
}

export interface ExportedSiteContent {
  exportId: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  heroButtonText: string | null;
  heroButtonLink: string | null;
  aboutTitle: string | null;
  aboutText: string | null;
  aboutImageUrl: string | null;
  features: unknown; // [{ title, description, icon }]
  footerText: string | null;
  socialLinks: unknown; // { instagram, facebook, twitter }
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImage: string | null;
  faviconUrl: string | null;
  logoUrl: string | null;
  logoAltText: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  navigationItems: unknown; // [{ label, href }]
  customFields: unknown; // { key: value }
  bannerConfig: unknown; // BannerConfig
  popupConfig: unknown; // PopupConfig
  previewCustomFields: unknown;
  previewUpdatedAt: string | null; // ISO string
}

export interface ExportedBaseInventoryUnit {
  exportId: string;
  name: string;
  description: string | null;
  lowInventoryThreshold: number | null;
  allowBackorders: boolean;
  // inventoryQty / reservedQty / *AlertSent excluded
}

export interface ExportedCollection {
  exportId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  published: boolean;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImage: string | null;
}

export interface ExportedImage {
  exportId: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
}

export interface ExportedProductVariant {
  exportId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  compareAtPrice: number | null;
  options: unknown; // { size: "Small", color: "Red" }
  imageUrl: string | null;
  // inventoryQty / reservedQty excluded
}

export interface ExportedProductReview {
  exportId: string;
  source: string;
  rating: number;
  title: string | null;
  comment: string;
  images: string[];
  videoUrl: string | null;
  verifiedPurchase: boolean;
  isApproved: boolean;
  isHidden: boolean;
  customerName: string;
  customerEmail: string | null;
  customerTitle: string | null;
  reviewDate: string; // ISO string
  // helpfulCount / notHelpfulCount excluded (runtime votes)
  // customerId / orderId excluded (no customer/order data transferred)
}

export interface ExportedProduct {
  exportId: string;
  name: string;
  slug: string;
  excerpt: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  sku: string | null;
  barcode: string | null;
  trackInventory: boolean;
  allowBackorders: boolean;
  lowInventoryThreshold: number | null;
  /** exportId of the source BaseInventoryUnit, or null */
  exportBaseInventoryUnitId: string | null;
  baseUnitsConsumed: number | null;
  weight: number | null;
  weightUnit: string | null;
  published: boolean;
  featured: boolean;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImage: string | null;
  additionalFields: unknown;
  images: ExportedImage[];
  variants: ExportedProductVariant[];
  /** Only source === "owner" reviews */
  ownerReviews: ExportedProductReview[];
  // averageRating / reviewCount excluded
}

export interface ExportedCollectionProduct {
  exportCollectionId: string;
  exportProductId: string;
  sortOrder: number;
}

export interface ExportedServiceItem {
  exportId: string;
  name: string;
  description: string | null;
  image: string | null;
  priceLabel: string | null;
  durationLabel: string | null;
  bookingEmbedSrc: string | null;
  bookingEmbedHeight: number | null;
  published: boolean;
  sortOrder: number;
}

export interface ExportedService {
  exportId: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  serviceTemplateId: string;
  customFields: unknown;
  published: boolean;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  items: ExportedServiceItem[];
}

export interface ExportedPage {
  exportId: string;
  title: string;
  slug: string;
  content: unknown; // TipTap JSON doc
  excerpt: string | null;
  image: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImage: string | null;
  published: boolean;
  sortOrder: number;
  type: string;
  template: string;
}

export interface ExportedGalleryImage {
  exportId: string;
  url: string;
  altText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
}

export interface ExportedGallery {
  exportId: string;
  name: string;
  slug: string;
  description: string | null;
  layout: string;
  columns: number;
  gap: number;
  aspectRatio: string | null;
  captionStyle: string | null;
  showCaptions: boolean;
  enableLightbox: boolean;
  images: ExportedGalleryImage[];
}

export interface ExportedDiscountCode {
  exportId: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
  usageLimit: number | null;
  // usageCount excluded (runtime counter)
  startsAt: string | null; // ISO string
  expiresAt: string | null; // ISO string
  minPurchase: number | null;
  maxDiscount: number | null;
}

export interface ExportedTestimonial {
  exportId: string;
  source: string;
  title: string | null;
  text: string;
  photoUrls: string[];
  isApproved: boolean;
  isHidden: boolean;
  customerName: string;
  customerEmail: string | null;
  customerTitle: string | null;
  customerCompany: string | null;
  testimonialDate: string; // ISO string
  // customerId excluded (no customer data transferred)
}

export interface ExportedFaqItem {
  exportId: string;
  question: string;
  answer: string;
  sortOrder: number;
  published: boolean;
}

export interface ExportedEvent {
  exportId: string;
  name: string;
  blurb: string | null;
  coverImage: string | null;
  startAt: string; // ISO string
  endAt: string | null; // ISO string
  allDay: boolean;
  location: string | null;
  externalUrl: string | null;
  externalUrlLabel: string | null;
  priceLabel: string | null;
  published: boolean;
  sortOrder: number;
  isArchived: boolean;
}

export interface ExportedShippingRate {
  exportId: string;
  tierIndex: number;
  priceCents: number;
}

export interface ExportedShippingZone {
  exportId: string;
  name: string;
  states: string[];
  sortOrder: number;
  rates: ExportedShippingRate[];
}

// ─── Manifest content block ───────────────────────────────────────────────────

export interface StoreTransferContent {
  business: ExportedBusiness;
  siteContent: ExportedSiteContent | null;
  baseInventoryUnits: ExportedBaseInventoryUnit[];
  collections: ExportedCollection[];
  products: ExportedProduct[];
  collectionProducts: ExportedCollectionProduct[];
  services: ExportedService[];
  pages: ExportedPage[];
  galleries: ExportedGallery[];
  discountCodes: ExportedDiscountCode[];
  testimonials: ExportedTestimonial[];
  faqItems: ExportedFaqItem[];
  events: ExportedEvent[];
  shippingZones: ExportedShippingZone[];
}

// ─── Top-level manifest ───────────────────────────────────────────────────────

export interface StoreTransferManifest {
  formatVersion: typeof STORE_TRANSFER_FORMAT_VERSION;
  exportedAt: string; // ISO datetime string
  source: StoreTransferSource;
  media: StoreTransferMediaEntry[];
  content: StoreTransferContent;
}
