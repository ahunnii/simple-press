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
