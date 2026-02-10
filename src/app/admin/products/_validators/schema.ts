export type FormVariant = {
  id?: string;
  name: string;
  sku?: string;
  price?: number; // in cents
  inventoryQty: number;
  options: Record<string, string>; // { size: "Small", color: "Red" }
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
};
