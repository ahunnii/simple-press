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
 *   - SiteContent.siteVerification (domain-bound search-console tokens;
 *     importing would clobber the target's own verification)
 *   - DiscountCode rows with source "loyalty" (single-use, customer-bound
 *     codes minted by rewards redemptions — never exported)
 *   - Form/QuoteCalculator submissions, loyalty accounts + points ledger,
 *     invoices (customer/transaction data — only the config is transferred)
 *   - InvoiceSettings.paymentMethods (may hold bank account numbers /
 *     payment handles; the export ZIP is plaintext, unlike the encrypted
 *     column), lastDigestWeekKey / lastDigestSentAt (digest bookkeeping)
 */

import type { PublishRules } from "~/lib/youtube/publish-rules";

// ─── Format version ───────────────────────────────────────────────────────────

export const STORE_TRANSFER_FORMAT_VERSION = 2 as const;

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
  // Structured address parts, feeding LocalBusiness JSON-LD. Added 2026-09-25
  // — absent in older manifests.
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  // Map pin coordinates. Added 2026-09-25 — absent in older manifests.
  latitude?: number | null;
  longitude?: number | null;
  // Template — imported (the key reason to transfer)
  templateId: string;
  // Storefront toggles
  testimonialsAutoApprove: boolean;
  maintenanceMode: boolean;
  maintenanceVariant: string;
  maintenanceMessage: unknown; // TipTap JSON doc
  maintenanceCta: unknown; // MaintenanceCta JSON
  maintenanceOverline: string | null;
  maintenanceHeadline: string | null;
  maintenanceImage: string | null;
  maintenanceLaunchAt: string | null; // ISO instant
  maintenanceLaunchEndAt: string | null;
  maintenanceLocation: string | null;
  // SEO
  // `localBusinessEnabled` is deprecated (superseded by `localPresence` /
  // `areaServed`) but stays in this DTO, optional, so an older export ZIP
  // that only has the boolean still round-trips — `importStoreContent` maps
  // `localBusinessEnabled: true` with no `localPresence` to `"storefront"`.
  localBusinessEnabled?: boolean;
  /** `"none" | "service_area" | "storefront"` — see `~/lib/seo/local-presence`. */
  localPresence?: string;
  areaServed?: string[];
  allowAiCrawlers: boolean;
  // Abandoned-checkout recovery email. Added 2026-09-25 — absent in older
  // manifests.
  sendAbandonedCheckoutEmails?: boolean;
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
  // Donations / Tips. Added 2026-09-25 — absent in older manifests.
  donationLabel?: string;
  donationPresetAmounts?: unknown; // number[] of cents
  venmoHandle?: string | null;
  cashAppHandle?: string | null;
  donationShowInHeader?: boolean;
  donationShowInFooter?: boolean;
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
  // Short brand used as the " | Brand" suffix on every page title. Added
  // 2026-09-25 — absent in older manifests.
  seoBrandName?: string | null;
  logoUrl: string | null;
  logoAltText: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  navigationItems: unknown; // [{ label, href }]
  customFields: unknown; // { key: value }
  bannerConfig: unknown; // BannerConfig
  popupConfig: unknown; // PopupConfig
  // Per-route meta overrides: { [route]: { title, description, ogImage } }.
  // Added 2026-09-25 — absent in older manifests.
  pageMeta?: unknown;
  // Per-email-template copy overrides. Added 2026-09-25 — absent in older
  // manifests.
  emailOverrides?: unknown;
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
  /** Optional: absent in files exported before this field existed. */
  itemType?: "stock" | "rental";
  sku?: string | null;
  category?: string | null;
  storageLocation?: string | null;
  unitCostCents?: number | null;
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
  // "Subscribe & save" (Stripe Billing on the connected account). Added
  // 2026-09-25 — absent in older manifests.
  subscriptionEnabled?: boolean;
  subscriptionIntervals?: unknown; // string[] of interval keys
  subscriptionDiscountPercent?: number;
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
  // When set and in the future, the cron publish job flips published=true
  // at/after this time. Added 2026-09-25 — absent in older manifests.
  scheduledPublishAt?: string | null; // ISO string
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
  // Display-only "was" price + alternate/extra pricing rows. Added
  // 2026-09-25 — absent in older manifests.
  compareAtPriceLabel?: string | null;
  priceTiers?: unknown; // [{ label, priceLabel, compareAtPriceLabel? }]
  addOns?: unknown; // [{ name, priceLabel?, description? }]
  // Section assignment key for category-aware templates (vii-collection).
  // Added 2026-09-25 — absent in older manifests.
  category?: string | null;
  isSignature?: boolean;
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
  // Added 2026-09-25 — absent in older manifests.
  metaKeywords?: string | null;
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
  // When set and in the future, the cron publish job flips published=true
  // at/after this time. Added 2026-09-25 — absent in older manifests.
  scheduledPublishAt?: string | null; // ISO string
  // Visual-editor draft: { title, excerpt, content } — null = no draft.
  // Added 2026-09-25 — absent in older manifests.
  previewDraft?: unknown;
  previewDraftUpdatedAt?: string | null; // ISO string
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
  // Enforced by counting the customer's prior orders using this code. Added
  // 2026-09-25 — absent in older manifests.
  perCustomerLimit?: number | null;
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
  /** Added after events shipped in the original format — nullable so older manifests still parse. */
  slug: string | null;
  blurb: string | null;
  coverImage: string | null;
  coverVideo: string | null;
  startAt: string; // ISO string
  endAt: string | null; // ISO string
  allDay: boolean;
  location: string | null;
  externalUrl: string | null;
  externalUrlLabel: string | null;
  /** Added 2026-09-14 — manifests exported before then lack it; the validator defaults it to false. */
  linkQrEnabled: boolean;
  priceLabel: string | null;
  published: boolean;
  sortOrder: number;
  isArchived: boolean;
}

export interface ExportedVideoSource {
  exportId: string;
  kind: string; // "channel" | "playlist"
  externalId: string;
  label: string | null;
  enabled: boolean;
  autoPublish: boolean;
  /** Added 2026-09-18 — manifests exported before then lack it; the validator defaults it to null. */
  publishRules: PublishRules | null;
  // lastSyncedAt / lastSyncError excluded — sync bookkeeping, not content.
}

export interface ExportedVideo {
  exportId: string;
  youtubeId: string;
  // Sync-owned — carried across so an imported video renders correctly
  // before the next sync run overwrites these.
  title: string;
  description: string | null;
  /** Remote YouTube CDN URL (*.ytimg.com) — never rewritten on import. */
  thumbnailUrl: string | null;
  channelTitle: string | null;
  publishedAt: string; // ISO string
  // Owner-owned overrides
  titleOverride: string | null;
  descriptionOverride: string | null;
  /** S3-hosted — rewritten on import, unlike thumbnailUrl above. */
  thumbnailOverride: string | null;
  published: boolean;
  sortOrder: number;
  /** exportId of the source ExportedVideoSource, or null for a manual add. */
  exportSourceId: string | null;
  /** Added 2026-09-18 — defaults to false on older manifests. */
  hiddenByRule: boolean;
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

export interface ExportedForm {
  exportId: string;
  name: string;
  /** Versioned definition blob — `formDefinitionSchema` in src/lib/validators/form.ts */
  definition: unknown;
  published: boolean;
}

export interface ExportedQuoteCalculator {
  exportId: string;
  name: string;
  /** Versioned definition blob — `quoteCalculatorDefinitionSchema` in src/lib/validators/quote-calculator.ts */
  definition: unknown;
  published: boolean;
}

export interface ExportedLoyaltyRewardTier {
  exportId: string;
  label: string;
  pointsCost: number;
  type: string; // "percentage" | "fixed"
  value: number; // percent, or cents
  minPurchase: number | null; // cents
  sortOrder: number;
  active: boolean;
}

/** Program config only — member accounts and the points ledger are excluded. */
export interface ExportedLoyaltyProgram {
  earnOnOrders: boolean;
  pointsPerDollar: number;
  signupEnabled: boolean;
  signupBonus: number;
  firstOrderEnabled: boolean;
  firstOrderBonus: number;
  birthdayEnabled: boolean;
  birthdayBonus: number;
  socialEnabled: boolean;
  socialFollowBonus: number;
  rewardCodeExpiryDays: number;
  tiers: ExportedLoyaltyRewardTier[];
}

/**
 * Invoice numbering/defaults. `paymentMethods`, `lastDigestWeekKey` and
 * `lastDigestSentAt` are excluded — see file header.
 */
export interface ExportedInvoiceSettings {
  numberPrefix: string;
  numberPadding: number;
  startingNumber: number;
  defaultDueTerms: string;
  defaultTaxRateBps: number;
  defaultNotes: string | null;
  defaultTerms: string | null;
  overdueAlertsEnabled: boolean;
  weeklyDigestEnabled: boolean;
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
  videoSources: ExportedVideoSource[];
  videos: ExportedVideo[];
  shippingZones: ExportedShippingZone[];
  // Added 2026-09-25 — absent in older manifests; the validator defaults the
  // arrays to [] and the 1:1 blocks to null (null = leave the target as-is).
  forms: ExportedForm[];
  quoteCalculators: ExportedQuoteCalculator[];
  loyaltyProgram: ExportedLoyaltyProgram | null;
  invoiceSettings: ExportedInvoiceSettings | null;
}

// ─── Top-level manifest ───────────────────────────────────────────────────────

export interface StoreTransferManifest {
  formatVersion: typeof STORE_TRANSFER_FORMAT_VERSION;
  exportedAt: string; // ISO datetime string
  source: StoreTransferSource;
  media: StoreTransferMediaEntry[];
  content: StoreTransferContent;
}
