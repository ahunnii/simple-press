/**
 * `simplepress.business-profile/v1` — the wire contract served by
 * `GET /api/v1/business-profile` and parsed by ProfitMax. Change this ONLY
 * together with the ProfitMax parser (a breaking change needs a v2 schema id).
 *
 * PUBLIC DATA ONLY: no database ids, sku, barcode, inventory quantities, cost,
 * Stripe ids, customer or order data. Money is integer cents + a preformatted
 * USD string.
 */

export const BUSINESS_PROFILE_SCHEMA = "simplepress.business-profile/v1";

/** Products past this many are dropped and `truncated` is set. */
export const MAX_PRODUCTS = 500;

/** Plain-text caps (characters). */
export const ABOUT_MAX_CHARS = 2000;
export const DESCRIPTION_MAX_CHARS = 600;

export type BusinessProfileDay =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export type BusinessProfileV1 = {
  schema: typeof BUSINESS_PROFILE_SCHEMA;
  generatedAt: string;
  truncated: boolean;
  business: {
    name: string;
    about: string | null;
    url: string;
    businessType:
      | "products"
      | "services"
      | "informational"
      | "donations"
      | null;
    address: {
      street: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: "US";
      display: string | null;
    } | null;
    geo: { lat: number; lng: number } | null;
    localPresence: "none" | "service_area" | "storefront";
    areaServed: string[];
    hours: Array<{
      days: BusinessProfileDay[];
      closed: boolean;
      open: string | null;
      close: string | null;
    }>;
    timeZone: string;
    phone: string | null;
    email: string | null;
    socialLinks: Record<string, string>;
  };
  products: Array<{
    name: string;
    url: string;
    price: number;
    priceFormatted: string;
    compareAtPrice: number | null;
    currency: "USD";
    description: string | null;
    imageUrl: string | null;
    collections: string[];
    options: string[];
    variants: Array<{
      name: string;
      price: number;
      priceFormatted: string;
      inStock: boolean;
    }>;
    inStock: boolean;
    averageRating: number | null;
    reviewCount: number;
  }>;
  collections: Array<{
    name: string;
    description: string | null;
    url: string;
    productCount: number;
  }>;
  services: Array<{
    name: string;
    category: string | null;
    priceLabel: string | null;
    durationLabel: string | null;
    description: string | null;
    url: string | null;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  counts: {
    products: number;
    collections: number;
    services: number;
    faqs: number;
  };
};
