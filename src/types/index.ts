import type { RouterOutputs } from "~/trpc/react";

type ShopProduct = NonNullable<
  RouterOutputs["business"]["getWithProducts"]
>["products"][number];

/**
 * Shared product shape used by product cards, rails, and shop filter clients.
 *
 * Derived from the shop-page query (`business.getWithProducts`), which selects
 * only the fields cards actually render. Fields that are not present in every
 * product source (`business.getHomepage`, `product.getRelated`,
 * `collections.getBySlug`, ...) are optional so those outputs remain
 * assignable to `Product`.
 */
export type Product = Omit<
  ShopProduct,
  "createdAt" | "sku" | "collectionProducts" | "baseInventoryUnit" | "_count"
> & {
  createdAt?: ShopProduct["createdAt"];
  sku?: ShopProduct["sku"];
  collectionProducts?: ShopProduct["collectionProducts"];
  baseInventoryUnit?: ShopProduct["baseInventoryUnit"];
  /** `optionGroups` > 0 means the product has customizer option groups. */
  _count?: ShopProduct["_count"];
};
