import type { RouterOutputs } from "~/trpc/react";

export const formatPrice = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export function dollarsToCents(d: string): number {
  const n = Number.parseFloat(d);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function centsToDollarsString(c: number | null): string {
  if (c == null) return "";
  return (c / 100).toFixed(2);
}

/**
 * Returns the sale badge label (e.g. "Save 20%" or "Save $5.00").
 * format: "true" = percentage, "false" = dollar amount.
 */
export function computeSavingsLabel(
  price: number,
  compareAtPrice: number,
  format = "true",
): string {
  if (format === "false") {
    return `Save ${formatPrice(compareAtPrice - price)}`;
  }
  const pct = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  return `Save ${pct}%`;
}

type Product = {
  variants: {
    price: number | null;
    compareAtPrice: number | null;
  }[];
  price: number;
  compareAtPrice: number | null;
};

export function getEffectivePrice(product: Product): number {
  return product.variants.length > 0
    ? (product.variants[0]?.price ?? product.price)
    : product.price;
}

export function getEffectiveCompareAtPrice(product: Product): number | null {
  if (product.variants.length > 0) {
    return (
      product.variants[0]?.compareAtPrice ?? product.compareAtPrice ?? null
    );
  }
  return product.compareAtPrice ?? null;
}
