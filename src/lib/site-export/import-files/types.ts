/**
 * Normalized product shape shared by the four platform import-file builders.
 *
 * The loader in `index.ts` resolves everything database-specific (inherited
 * variant prices, absolute image URLs, cents, weight units) so the builders
 * stay pure functions of this type and are trivially unit-testable.
 */
import type { SiteExportNote } from "../types";

export interface ExportProductImage {
  /** Absolute, publicly reachable URL. */
  url: string;
  altText: string | null;
}

export interface ExportProductOption {
  /** Display name, e.g. "Size". */
  name: string;
  value: string;
}

export interface ExportProductVariant {
  /** Owner-facing variant name, e.g. "Small / Red". */
  name: string;
  sku: string | null;
  /** Resolved price in cents (already inherits the product price when unset). */
  priceCents: number;
  /** Original "was" price in cents when the variant is on sale. */
  compareAtCents: number | null;
  inventoryQty: number;
  /** Ordered option name/value pairs. Empty when the variant has no options. */
  options: ExportProductOption[];
  /** Absolute URL of the variant's own image, if any. */
  imageUrl: string | null;
}

export interface ExportProduct {
  id: string;
  name: string;
  /** Unique per store; used as the platform handle / URL. */
  slug: string;
  /** Description as authored (plain text, occasionally imported HTML). */
  description: string;
  metaTitle: string | null;
  metaDescription: string | null;
  /** Price in cents. */
  priceCents: number;
  /** Original "was" price in cents when on sale. */
  compareAtCents: number | null;
  costCents: number | null;
  sku: string | null;
  /** Barcode, only used where a platform has a safe column for it. */
  barcode: string | null;
  /** false = draft / hidden / scheduled. */
  published: boolean;
  trackInventory: boolean;
  inventoryQty: number;
  allowBackorders: boolean;
  weight: number | null;
  weightUnit: "lb" | "kg";
  /** Photos only, sorted by sortOrder (these platforms' CSVs take no video). */
  images: ExportProductImage[];
  /** Product videos left out of the files above (they are in the Videos folder). */
  videoCount?: number;
  /** Collection names the product belongs to. */
  collections: string[];
  /** Empty = single-variant product. */
  variants: ExportProductVariant[];
}

export interface BuilderResult {
  csv: string;
  notes: SiteExportNote[];
}

export interface ImportBuilderContext {
  /** Store name, used as Shopify "Vendor". */
  storeName: string;
}
