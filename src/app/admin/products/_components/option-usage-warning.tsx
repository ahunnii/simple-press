"use client";

import { api } from "~/trpc/react";

/**
 * Delete-dialog warning: other products offer this product as an option
 * choice (a linked charm, say), and deleting it removes that choice.
 *
 * `usageForProduct` is intentionally ungated, so this is safe to mount with
 * the `productOptions` flag off — it just finds nothing and renders null.
 */
export function OptionUsageWarning({
  productId,
  enabled = true,
}: {
  productId: string | null | undefined;
  enabled?: boolean;
}) {
  const usage = api.productOption.usageForProduct.useQuery(
    { productId: productId ?? "" },
    { enabled: enabled && Boolean(productId) },
  );

  const data = usage.data;
  if (!data || data.valueCount === 0) return null;

  return (
    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
      {data.productCount > 0
        ? `This product is used as an option on ${data.productCount} ${
            data.productCount === 1 ? "product" : "products"
          }. Deleting it removes that option.`
        : "This product is used as a choice in one of your product options. Deleting it removes that choice."}
    </p>
  );
}
