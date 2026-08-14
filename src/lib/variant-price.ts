/** 0 or null variant price means "inherit the product base price". */
export function resolveVariantPrice(
  variantPrice: number | null | undefined,
  productPrice: number,
): number {
  return variantPrice != null && variantPrice !== 0
    ? variantPrice
    : productPrice;
}

export function resolveVariantCompareAtPrice(
  variantPrice: number | null | undefined,
  variantCompareAtPrice: number | null | undefined,
  productCompareAtPrice: number | null | undefined,
): number | null {
  return variantPrice != null && variantPrice !== 0
    ? (variantCompareAtPrice ?? null)
    : (productCompareAtPrice ?? null);
}
