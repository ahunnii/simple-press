import "server-only";

import type { CustomizerDefinition } from "~/lib/customizer/types";
import type { TxClient } from "~/server/db";
import { mapCustomizerRows } from "~/lib/customizer/map-rows";
import { isFeatureEnabledForBusiness } from "~/lib/features/check-flag";

/**
 * DB loader for the product customizer. Server-only: the result carries link
 * ids, skus and raw stock, so it must go through `toPublicCustomizerDefinition`
 * before it reaches a browser.
 */

type LoaderDb = Pick<TxClient, "productOptionGroupOnProduct">;

/** Same key everywhere the customizer is gated. */
export const PRODUCT_OPTIONS_FEATURE_KEY = "productOptions";

/** Is the `productOptions` flag effectively on (dependency cascade included)? */
export function isProductOptionsEnabled(businessId: string): Promise<boolean> {
  return isFeatureEnabledForBusiness(businessId, PRODUCT_OPTIONS_FEATURE_KEY);
}

/**
 * Definitions for many products in ONE query. Products with no attached
 * groups are absent from the map. Everything is scoped to `businessId`: the
 * attached product, the group, and (in the mapper) every linked product.
 * Callers are responsible for the feature-flag check.
 */
export async function loadCustomizerDefinitions(
  db: LoaderDb,
  businessId: string,
  productIds: readonly string[],
): Promise<Map<string, CustomizerDefinition>> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return new Map();

  const rows = await db.productOptionGroupOnProduct.findMany({
    where: {
      productId: { in: ids },
      product: { businessId },
      group: { businessId },
    },
    select: {
      productId: true,
      sortOrder: true,
      group: {
        select: {
          id: true,
          name: true,
          helpText: true,
          kind: true,
          required: true,
          minSelections: true,
          maxSelections: true,
          includedCount: true,
          display: true,
          maxLength: true,
          placeholder: true,
          textPriceCents: true,
          values: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            select: {
              id: true,
              label: true,
              imageUrl: true,
              swatchColor: true,
              priceDelta: true,
              priceOverride: true,
              linkedProductId: true,
              linkedVariantId: true,
              available: true,
              sortOrder: true,
              linkedProduct: {
                select: {
                  id: true,
                  businessId: true,
                  name: true,
                  sku: true,
                  price: true,
                  additionalFields: true,
                  trackInventory: true,
                  inventoryQty: true,
                  reservedQty: true,
                  allowBackorders: true,
                  baseInventoryUnitId: true,
                  baseUnitsConsumed: true,
                  baseInventoryUnit: {
                    select: {
                      inventoryQty: true,
                      reservedQty: true,
                      allowBackorders: true,
                    },
                  },
                  variants: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                      price: true,
                      inventoryQty: true,
                      reservedQty: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return mapCustomizerRows(rows, businessId);
}

/** Single-product convenience; `null` when the product has no groups. */
export async function loadCustomizerDefinition(
  db: LoaderDb,
  businessId: string,
  productId: string,
): Promise<CustomizerDefinition | null> {
  const map = await loadCustomizerDefinitions(db, businessId, [productId]);
  return map.get(productId) ?? null;
}
