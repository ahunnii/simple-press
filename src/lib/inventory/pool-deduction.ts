import type { PrismaClient } from "generated/prisma";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type PoolDeductionItem = {
  productId: string;
  quantity: number;
};

export type PoolDeductionResult = {
  poolId: string;
  poolName: string;
  previousQty: number;
  newQty: number;
  totalBaseUnitsDeducted: number;
  wasOversell: boolean;
  allowBackorders: boolean;
  lowInventoryThreshold: number | null;
};

/**
 * Deduct base units from a pool for a set of order items that all draw from the same pool.
 * Must be called inside an existing db.$transaction.
 */
export async function deductPoolInventory(
  tx: Tx,
  params: {
    poolId: string;
    items: PoolDeductionItem[];
    unitsConsumedMap: Record<string, number>;
    orderId: string;
    orderNumber: number;
    businessId: string;
  },
): Promise<PoolDeductionResult | null> {
  const { poolId, items, unitsConsumedMap, orderId, orderNumber, businessId } =
    params;

  const pool = await tx.baseInventoryUnit.findUnique({
    where: { id: poolId },
    select: {
      id: true,
      inventoryQty: true,
      allowBackorders: true,
      lowInventoryThreshold: true,
      name: true,
    },
  });

  if (!pool) return null;

  const totalUnits = items.reduce(
    (sum, item) =>
      sum + item.quantity * (unitsConsumedMap[item.productId] ?? 1),
    0,
  );

  const previousQty = pool.inventoryQty;
  const representativeProductId = items[0]?.productId ?? null;

  if (pool.allowBackorders) {
    await tx.baseInventoryUnit.update({
      where: { id: poolId },
      data: { inventoryQty: { decrement: totalUnits } },
    });
    const newQty = previousQty - totalUnits;
    await tx.inventoryHistory.create({
      data: {
        baseInventoryUnitId: poolId,
        productId: representativeProductId,
        businessId,
        previousQty,
        newQty,
        changeQty: -totalUnits,
        reason: "sale",
        note: `Order #${orderNumber}`,
        orderId,
      },
    });
    return {
      poolId,
      poolName: pool.name,
      previousQty,
      newQty,
      totalBaseUnitsDeducted: totalUnits,
      wasOversell: false,
      allowBackorders: true,
      lowInventoryThreshold: pool.lowInventoryThreshold,
    };
  }

  const result = await tx.baseInventoryUnit.updateMany({
    where: { id: poolId, inventoryQty: { gte: totalUnits } },
    data: { inventoryQty: { decrement: totalUnits } },
  });

  if (result.count === 0) {
    await tx.inventoryHistory.create({
      data: {
        baseInventoryUnitId: poolId,
        productId: representativeProductId,
        businessId,
        previousQty,
        newQty: previousQty,
        changeQty: 0,
        reason: "oversell",
        note: `Order #${orderNumber}: pool insufficient at fulfillment; inventory unchanged`,
        orderId,
      },
    });
    return {
      poolId,
      poolName: pool.name,
      previousQty,
      newQty: previousQty,
      totalBaseUnitsDeducted: 0,
      wasOversell: true,
      allowBackorders: false,
      lowInventoryThreshold: pool.lowInventoryThreshold,
    };
  }

  const newQty = previousQty - totalUnits;
  await tx.inventoryHistory.create({
    data: {
      baseInventoryUnitId: poolId,
      productId: representativeProductId,
      businessId,
      previousQty,
      newQty,
      changeQty: -totalUnits,
      reason: "sale",
      note: `Order #${orderNumber}`,
      orderId,
    },
  });

  return {
    poolId,
    poolName: pool.name,
    previousQty,
    newQty,
    totalBaseUnitsDeducted: totalUnits,
    wasOversell: false,
    allowBackorders: false,
    lowInventoryThreshold: pool.lowInventoryThreshold,
  };
}

/**
 * Restore base units to a pool on refund or cancellation.
 * Must be called inside an existing db.$transaction.
 */
export async function restorePoolInventory(
  tx: Tx,
  params: {
    poolId: string;
    items: PoolDeductionItem[];
    unitsConsumedMap: Record<string, number>;
    orderId: string;
    orderNumber: number;
    businessId: string;
  },
): Promise<{ previousQty: number; newQty: number } | null> {
  const { poolId, items, unitsConsumedMap, orderId, orderNumber, businessId } =
    params;

  const pool = await tx.baseInventoryUnit.findUnique({
    where: { id: poolId },
    select: { id: true, inventoryQty: true },
  });

  if (!pool) return null;

  const totalUnits = items.reduce(
    (sum, item) =>
      sum + item.quantity * (unitsConsumedMap[item.productId] ?? 1),
    0,
  );

  const previousQty = pool.inventoryQty;
  const newQty = previousQty + totalUnits;
  const representativeProductId = items[0]?.productId ?? null;

  await tx.baseInventoryUnit.update({
    where: { id: poolId },
    data: { inventoryQty: { increment: totalUnits } },
  });

  await tx.inventoryHistory.create({
    data: {
      baseInventoryUnitId: poolId,
      productId: representativeProductId,
      businessId,
      previousQty,
      newQty,
      changeQty: totalUnits,
      reason: "return",
      note: `Order #${orderNumber}`,
      orderId,
    },
  });

  if (newQty > 0) {
    await tx.baseInventoryUnit.updateMany({
      where: { id: poolId, outOfStockAlertSent: true },
      data: { outOfStockAlertSent: false, lowInventoryAlertSent: false },
    });
  }

  return { previousQty, newQty };
}
