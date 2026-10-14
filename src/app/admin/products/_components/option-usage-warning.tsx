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

/**
 * The bulk-delete version: products deleted together don't count as losing
 * an option (the server leaves them out of `productCount`). Same ungated
 * read, so it renders null with the flag off. Callers keep `productIds`
 * within `ADMIN_BULK_DELETE_LIMIT` — over the cap the delete can't run anyway.
 */
export function BulkOptionUsageWarning({
  productIds,
  enabled = true,
}: {
  productIds: string[];
  enabled?: boolean;
}) {
  const usage = api.productOption.usageForProducts.useQuery(
    { productIds },
    { enabled: enabled && productIds.length > 0 },
  );

  const data = usage.data;
  if (!data || data.usedCount === 0) return null;

  const one = data.usedCount === 1;
  const subject = one
    ? "One of these products is"
    : `${data.usedCount} of these products are`;
  return (
    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
      {data.productCount > 0
        ? `${subject} used as ${one ? "an option" : "options"} on ${
            data.productCount
          } other ${data.productCount === 1 ? "product" : "products"}. Deleting ${
            one ? "it removes that option" : "them removes those options"
          }.`
        : `${subject} used as ${
            one ? "a choice" : "choices"
          } in your product options. Deleting ${
            one ? "it removes that choice" : "them removes those choices"
          }.`}
    </p>
  );
}
