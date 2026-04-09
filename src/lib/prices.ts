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
  format: string,
): string {
  if (format === "false") {
    return `Save ${formatPrice(compareAtPrice - price)}`;
  }
  const pct = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  return `Save ${pct}%`;
}
