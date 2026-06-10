export type FormVariant = {
  id?: string;
  name: string;
  sku?: string;
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
  /** Present when this image is pending upload. `url` is a local blob: object URL. */
  file?: File;
};
