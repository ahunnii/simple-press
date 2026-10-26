/**
 * Plain, DB-free input shapes for the readable-document renderers.
 *
 * `fetch.ts` maps Prisma rows onto these; every `render*` function takes them,
 * so the renderers are unit-testable without a database (and without Prisma
 * enums/Decimal leaking into the HTML layer).
 */
import type { GalleryMap } from "~/lib/wordpress/tiptap-to-html";
import type { MediaIndex, SiteExportBusiness } from "../types";

/** Lookup tables used to turn record ids stored inside template fields into names/links. */
export interface ReadableRefs {
  /** gallery id → name + (when the gallery gets its own doc) its zip path */
  galleries: Map<string, { name: string; path?: string }>;
  /** collection id → name + zip path of the anchor target */
  collections: Map<string, { name: string; path?: string }>;
  /** FAQ item id → question */
  faqs: Map<string, { question: string }>;
  /** form id → name + its picture-choice field labels (field id → label), for `formpicture` fields */
  forms?: Map<string, { name: string; fields: Map<string, string> }>;
}

export interface RenderCtx {
  business: SiteExportBusiness;
  media: Pick<MediaIndex, "byUrl">;
  /** Saved galleries, for `gallery` nodes inside rich text. */
  galleryMap?: GalleryMap;
  refs?: ReadableRefs;
  /** IANA zone used to format dates (defaults to UTC). */
  timeZone?: string;
  /** Called for each non-fatal rich-text serialization warning. */
  onWarning?: (docPath: string, message: string) => void;
}

export interface ImageRef {
  url: string;
  /** Absent = photo. Product galleries may hold videos. */
  mediaType?: "IMAGE" | "VIDEO" | null;
  alt?: string | null;
  caption?: string | null;
}

export interface PageInput {
  id: string;
  title: string;
  slug: string;
  /** page | policy | blog | custom */
  type: string;
  published: boolean;
  /** TipTap JSON. */
  content: unknown;
  excerpt: string | null;
  image: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImage: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  scheduledPublishAt?: Date | null;
}

export interface ProductVariantInput {
  name: string;
  sku: string | null;
  barcode?: string | null;
  /** cents; null = same as product */
  price: number | null;
  compareAtPrice: number | null;
  inventoryQty: number;
  /** { size: "Small", color: "Red" } */
  options: unknown;
  imageUrl: string | null;
}

export interface ProductInput {
  name: string;
  slug: string;
  excerpt: string | null;
  description: string | null;
  /** cents */
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  barcode?: string | null;
  trackInventory: boolean;
  inventoryQty: number;
  allowBackorders?: boolean;
  weight?: number | null;
  weightUnit?: string | null;
  published: boolean;
  featured?: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImage: string | null;
  images: ImageRef[];
  variants: ProductVariantInput[];
  /** collection names */
  collections: string[];
  subscriptionEnabled?: boolean;
  subscriptionDiscountPercent?: number;
  /** { key: value } template-specific extras */
  additionalFields?: unknown;
}

export interface CollectionInput {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  published: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  /** products in the collection, in display order */
  products: Array<{ name: string; slug: string }>;
}

export interface ServiceItemInput {
  name: string;
  description: string | null;
  image: string | null;
  priceLabel: string | null;
  durationLabel: string | null;
  compareAtPriceLabel?: string | null;
  priceTiers?: unknown;
  addOns?: unknown;
  bookingEmbedSrc?: string | null;
  category?: string | null;
  isSignature?: boolean;
  published: boolean;
}

export interface ServiceInput {
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  serviceTemplateId: string;
  /** Service-page template fields. */
  customFields: unknown;
  published: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImage: string | null;
  items: ServiceItemInput[];
}

export interface EventInput {
  name: string;
  slug: string;
  blurb: string | null;
  coverImage: string | null;
  coverVideo: string | null;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  location: string | null;
  externalUrl: string | null;
  externalUrlLabel: string | null;
  priceLabel: string | null;
  published: boolean;
  isArchived: boolean;
}

export interface GalleryInput {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  layout?: string;
  images: ImageRef[];
}

export interface FaqInput {
  id: string;
  question: string;
  answer: string;
  published: boolean;
}

export interface TestimonialInput {
  customerName: string;
  customerTitle: string | null;
  customerCompany: string | null;
  title: string | null;
  text: string;
  photoUrls: string[];
  testimonialDate: Date;
  /** PENDING | PUBLISHED | HIDDEN */
  status: "PENDING" | "PUBLISHED" | "HIDDEN";
}

/**
 * Structural subset of `TemplateField` — only what the readable renderer
 * needs, so tests can pass tiny literals and the real registry still fits.
 */
export interface FieldDef {
  key: string;
  label: string;
  type: string;
  page?: string;
  group?: string;
  itemSchema?: Array<{ key: string; label: string; type: string }>;
}

export interface FieldRegistry {
  templateId: string;
  /** Human template name (e.g. "Dream"). */
  templateLabel: string;
  fields: FieldDef[];
  /** group id → title */
  groupTitles: Record<string, string>;
  /** page key → title (e.g. homepage → "Homepage") */
  pageTitles: Record<string, string>;
  /** false when the template id isn't in the registry (fallback grouping used). */
  resolved: boolean;
  /** Keys no template declares anymore; their saved values are not on the site, so they are skipped. */
  retiredKeys?: ReadonlySet<string>;
}

export interface SiteDetailsInput {
  name: string;
  subdomain: string;
  customDomain: string | null;
  domainStatus: string | null;
  templateId: string;
  templateLabel: string;
  supportEmail: string | null;
  ownerEmail: string | null;
  phoneNumber: string | null;
  businessAddress: string | null;
  timeZone: string;
  latitude: number | null;
  longitude: number | null;
  areaServed: string[];
  businessHours: unknown;
  offersInStorePickup: boolean;
  pickupLocation: string | null;
  pickupInstructions: string | null;
  siteContent: {
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroImageUrl: string | null;
    heroButtonText: string | null;
    heroButtonLink: string | null;
    aboutTitle: string | null;
    aboutText: string | null;
    aboutImageUrl: string | null;
    features: unknown;
    footerText: string | null;
    socialLinks: unknown;
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    ogImage: string | null;
    faviconUrl: string | null;
    seoBrandName: string | null;
    pageMeta: unknown;
    logoUrl: string | null;
    logoAltText: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    navigationItems: unknown;
    footerNavigationItems: unknown;
    bannerConfig: unknown;
    popupConfig: unknown;
    customFields: unknown;
  } | null;
  /** Selected palette/fonts from `customFields._sp.theme`, resolved to labels. */
  theme: {
    paletteLabel: string | null;
    paletteColors: string[];
    fontsLabel: string | null;
    fontVars: Record<string, string>;
  };
}
