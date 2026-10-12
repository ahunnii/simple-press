import type { LowStockCardData } from "~/lib/dashboard/card-data";
import type { TxClient } from "~/server/db";

/**
 * Low-stock line when a product or inventory item has no "Low stock alert at"
 * threshold of its own. Rows with a threshold use it.
 */
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

/**
 * What is running low right now: product variants and base products (measured
 * against their product's threshold) when the `products` feature is on, and
 * inventory-item pools when `inventory` is on. An inventory-only store still
 * sees its low pools.
 *
 * - Variants go through raw SQL because the threshold lives on the parent
 *   Product and Prisma field references can't cross a relation.
 * - Pools have no lower bound, so an oversold (negative) pool is listed and
 *   rendered as out of stock. They're scoped to `itemType: "stock"`: a rental
 *   item at "2 on hand" can just mean the rest are out with customers.
 *
 * `take` bounds each list; `totalCount` is everything low before trimming.
 */
export async function lowStock(
  db: TxClient,
  businessId: string,
  opts: { includeProducts: boolean; includePools: boolean; take: number },
): Promise<LowStockCardData> {
  const { take, includeProducts, includePools } = opts;

  const baseProductWhere = {
    businessId,
    published: true,
    trackInventory: true,
    variants: { none: {} },
    OR: [
      {
        lowInventoryThreshold: null,
        inventoryQty: { lte: DEFAULT_LOW_STOCK_THRESHOLD, gte: 0 },
      },
      {
        inventoryQty: {
          lte: db.product.fields.lowInventoryThreshold,
          gte: 0,
        },
      },
    ],
  };

  const poolWhere = {
    businessId,
    itemType: "stock",
    OR: [
      {
        lowInventoryThreshold: null,
        inventoryQty: { lte: DEFAULT_LOW_STOCK_THRESHOLD },
      },
      {
        inventoryQty: {
          lte: db.baseInventoryUnit.fields.lowInventoryThreshold,
        },
      },
    ],
  };

  const [variants, variantCount, baseProducts, baseCount, pools, poolCount] =
    await Promise.all([
      includeProducts
        ? db.$queryRaw<
            Array<{
              id: string;
              name: string;
              productId: string;
              inventoryQty: number;
              productName: string;
            }>
          >`
            SELECT v.id, v.name, v."productId", v."inventoryQty", p.name AS "productName"
            FROM "ProductVariant" v
            JOIN "Product" p ON p.id = v."productId"
            WHERE p."businessId" = ${businessId}
              AND p.published = true
              AND p."trackInventory" = true
              AND v."inventoryQty" >= 0
              AND v."inventoryQty" <= COALESCE(p."lowInventoryThreshold", ${DEFAULT_LOW_STOCK_THRESHOLD})
            ORDER BY v."inventoryQty" ASC, v.id ASC
            LIMIT ${take}
          `
        : Promise.resolve([]),
      includeProducts
        ? db.$queryRaw<Array<{ count: number }>>`
            SELECT COUNT(*)::int AS count
            FROM "ProductVariant" v
            JOIN "Product" p ON p.id = v."productId"
            WHERE p."businessId" = ${businessId}
              AND p.published = true
              AND p."trackInventory" = true
              AND v."inventoryQty" >= 0
              AND v."inventoryQty" <= COALESCE(p."lowInventoryThreshold", ${DEFAULT_LOW_STOCK_THRESHOLD})
          `
        : Promise.resolve([]),
      includeProducts
        ? db.product.findMany({
            where: baseProductWhere,
            orderBy: [{ inventoryQty: "asc" }, { id: "asc" }],
            take,
            select: { id: true, name: true, inventoryQty: true },
          })
        : Promise.resolve([]),
      includeProducts
        ? db.product.count({ where: baseProductWhere })
        : Promise.resolve(0),
      includePools
        ? db.baseInventoryUnit.findMany({
            where: poolWhere,
            orderBy: [{ inventoryQty: "asc" }, { id: "asc" }],
            take,
            select: {
              id: true,
              name: true,
              inventoryQty: true,
              lowInventoryThreshold: true,
            },
          })
        : Promise.resolve([]),
      includePools
        ? db.baseInventoryUnit.count({ where: poolWhere })
        : Promise.resolve(0),
    ]);

  const variantRows = [
    ...variants.map((v) => ({
      id: v.id,
      name: v.name,
      productId: v.productId,
      productName: v.productName,
      inventoryQty: v.inventoryQty,
    })),
    // A base product without variants reads as a nameless variant of itself.
    ...baseProducts.map((p) => ({
      id: p.id,
      name: "",
      productId: p.id,
      productName: p.name,
      inventoryQty: p.inventoryQty,
    })),
  ]
    .sort((a, b) => a.inventoryQty - b.inventoryQty)
    .slice(0, take);

  return {
    kind: "lowStock",
    variants: variantRows,
    pools,
    totalCount: Number(variantCount[0]?.count ?? 0) + baseCount + poolCount,
  };
}
