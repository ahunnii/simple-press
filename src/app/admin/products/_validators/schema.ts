export type FormVariant = {
  id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  price?: number; // in cents
  compareAtPrice?: number; // in cents
  inventoryQty: number;
  options: Record<string, string>; // { size: "Small", color: "Red" }
  imageUrl?: string | null;
};

export type FormVariantOption = {
  name: string;
  values: string[];
};

export type FormProductImage = {
  id?: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  /** Present when this item is pending upload. `url` is a local blob: object URL. */
  file?: File;
  /** Absent = photo (rows and callers that predate videos). */
  mediaType?: "IMAGE" | "VIDEO";
  /**
   * VIDEO only: still frame shown before playback. A stored URL, or a local
   * blob: URL while `posterFile` is pending upload. Null = no poster (the
   * storefront falls back to the video's first frame).
   */
  posterUrl?: string | null;
  /** VIDEO only: poster captured in the browser, uploaded on save. */
  posterFile?: File;
  /** VIDEO only, client-side display: length in seconds when known. Never saved. */
  durationSec?: number;
};
