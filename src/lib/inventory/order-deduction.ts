import * as Sentry from "@sentry/nextjs";

import type { PoolDeductionResult } from "~/lib/inventory/pool-deduction";
import type { DbClient, TxClient } from "~/server/db";
import { getBusinessUrl } from "~/lib/business-url";
import {
  sendBackorderAlert,
  sendLowInventoryAlert,
  sendOutOfStockAlert,
  sendPoolLowInventoryAlert,
  sendPoolOutOfStockAlert,
} from "~/lib/email/templates";
import { deductPoolInventory } from "~/lib/inventory/pool-deduction";

/**
 * Inventory deduction + low-stock alerting for an order that has already been
 * paid for and created.
 *
 * This is FRESH code that deliberately MIRRORS the inline block in the Stripe
 * webhook (`src/app/api/webhooks/stripe/route.ts`, inventory ~392–736 and the
 * alert loops ~738–872) rather than replacing it. The one-time checkout path is
 * under a characterization test (`tests/integration/stripe-webhook-one-time.test.ts`)
 * and must show a zero diff while subscriptions are being built; migrating the
 * webhook (and `order.createManual`) onto this helper is explicitly deferred.
 *
 * Two behaviours are inherited from the webhook and are NOT bugs:
 *
 *  - **Oversell leaves stock untouched.** The decrement is a conditional
 *    `updateMany({ where: { inventoryQty: { gte: qty } } })`. When it matches
 *    nothing the row is left exactly as it was (not clamped to 0) and an
 *    `InventoryHistory` row with `changeQty: 0` records the discrepancy — the
 *    owner is told the truth about what is physically on the shelf, and the
 *    order still stands because the money was already taken.
 *  - **A missing product/variant is skipped, not fatal.** Products can be
 *    deleted between checkout and fulfillment; a subscription can outlive the
 *    product it was created for (`Subscription.productId` is `SetNull`).
 */

/** One line of an order, in the shape both `OrderItem` and a subscription snapshot already have. */
export type OrderDeductionItem = {
  productId: string | null;
  productVariantId: string | null;
  quantity: number;
  /** Snapshot name from the order line — used only for log/alert context when the live row is gone. */
  productName: string;
};

/**
 * A product/variant whose stock actually moved, carried out of the transaction
 * so alerting can happen afterwards (emails must never run inside a DB
 * transaction — a slow Resend call would hold the row locks open).
 */
export type LowStockCandidate = {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  newQty: number;
  previousQty: number;
  allowBackorders: boolean;
  lowInventoryThreshold: number | null;
};

export type DeductInventoryResult = {
  candidates: LowStockCandidate[];
  poolCandidates: PoolDeductionResult[];
};

/** The business shape the alert emails need (a superset is fine — this is structural). */
export type InventoryAlertBusiness = {
  id: string;
  name: string;
  ownerEmail: string;
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
  siteContent?: { logoUrl?: string | null } | null;
};

/**
 * Deduct inventory for every line of a paid order. MUST be called inside an
 * existing `db.$transaction` — pool deduction (`deductPoolInventory`) requires
 * it, and grouping several lines that draw on the same pool into one aggregate
 * update is only atomic if they share a transaction.
 *
 * Never sends email and never reads `Business` — it returns the candidates for
 * `sendLowInventoryAlerts` to act on once the transaction has committed.
 */
export async function deductInventoryForOrderItems(
  tx: TxClient,
  params: {
    businessId: string;
    orderId: string;
    orderNumber: number;
    items: OrderDeductionItem[];
  },
): Promise<DeductInventoryResult> {
  const { businessId, orderId, orderNumber, items } = params;

  const candidates: LowStockCandidate[] = [];
  const poolCandidates: PoolDeductionResult[] = [];

  // Pool-backed products are accumulated and deducted once per pool, so two
  // lines drawing on the same base unit can't each read a stale quantity.
  const poolGroups = new Map<
    string,
    {
      items: { productId: string; quantity: number }[];
      unitsConsumedMap: Record<string, number>;
    }
  >();

  for (const item of items) {
    const qty = item.quantity;

    if (item.productVariantId) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.productVariantId },
        select: {
          id: true,
          name: true,
          inventoryQty: true,
          productId: true,
          product: {
            select: {
              businessId: true,
              trackInventory: true,
              allowBackorders: true,
              name: true,
              lowInventoryThreshold: true,
            },
          },
        },
      });

      if (!variant) {
        Sentry.captureMessage(
          `[Inventory] Variant ${item.productVariantId} not found — may have been deleted after purchase (${item.productName})`,
          {
            level: "warning",
            tags: { "inventory.step": "variant-not-found", businessId },
          },
        );
        continue;
      }

      if (!variant.product.trackInventory) continue;

      const previousQty = variant.inventoryQty;

      if (variant.product.allowBackorders) {
        // Backorders allowed: decrement unconditionally, straight past zero.
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { inventoryQty: { decrement: qty } },
        });
        const newQty = previousQty - qty;
        await tx.inventoryHistory.create({
          data: {
            variantId: variant.id,
            productId: variant.productId,
            businessId: variant.product.businessId,
            previousQty,
            newQty,
            changeQty: -qty,
            reason: "sale",
            note: `Order #${orderNumber}`,
            orderId,
          },
        });
        candidates.push({
          productId: variant.productId,
          productName: variant.product.name,
          variantId: variant.id,
          variantName: variant.name,
          newQty,
          previousQty,
          allowBackorders: true,
          lowInventoryThreshold: variant.product.lowInventoryThreshold,
        });
        continue;
      }

      const result = await tx.productVariant.updateMany({
        where: { id: variant.id, inventoryQty: { gte: qty } },
        data: { inventoryQty: { decrement: qty } },
      });

      if (result.count === 0) {
        Sentry.captureMessage(
          `[Inventory] Oversell for variant ${variant.id} on order #${orderNumber}`,
          {
            level: "warning",
            tags: { "inventory.step": "oversell", businessId },
          },
        );
        await tx.inventoryHistory.create({
          data: {
            variantId: variant.id,
            productId: variant.productId,
            businessId: variant.product.businessId,
            previousQty,
            newQty: previousQty,
            changeQty: 0,
            reason: "oversell",
            note: `Order #${orderNumber}: insufficient stock at fulfillment; inventory unchanged`,
            orderId,
          },
        });
        continue;
      }

      const newQty = previousQty - qty;
      await tx.inventoryHistory.create({
        data: {
          variantId: variant.id,
          productId: variant.productId,
          businessId: variant.product.businessId,
          previousQty,
          newQty,
          changeQty: -qty,
          reason: "sale",
          note: `Order #${orderNumber}`,
          orderId,
        },
      });
      candidates.push({
        productId: variant.productId,
        productName: variant.product.name,
        variantId: variant.id,
        variantName: variant.name,
        newQty,
        previousQty,
        allowBackorders: false,
        lowInventoryThreshold: variant.product.lowInventoryThreshold,
      });
      continue;
    }

    if (!item.productId) continue;

    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: {
        id: true,
        name: true,
        inventoryQty: true,
        businessId: true,
        trackInventory: true,
        allowBackorders: true,
        lowInventoryThreshold: true,
        baseInventoryUnitId: true,
        baseUnitsConsumed: true,
      },
    });

    if (!product) {
      Sentry.captureMessage(
        `[Inventory] Product ${item.productId} not found — may have been deleted after purchase (${item.productName})`,
        {
          level: "warning",
          tags: { "inventory.step": "product-not-found", businessId },
        },
      );
      continue;
    }

    // Pool-backed: this product's own `inventoryQty` is never touched, the
    // shared base unit is drawn down instead (after the loop, per pool).
    if (product.baseInventoryUnitId) {
      const poolId = product.baseInventoryUnitId;
      const group = poolGroups.get(poolId) ?? {
        items: [],
        unitsConsumedMap: {},
      };
      group.items.push({ productId: product.id, quantity: qty });
      group.unitsConsumedMap[product.id] = product.baseUnitsConsumed ?? 1;
      poolGroups.set(poolId, group);
      continue;
    }

    if (!product.trackInventory) continue;

    const previousQty = product.inventoryQty;

    if (product.allowBackorders) {
      await tx.product.update({
        where: { id: product.id },
        data: { inventoryQty: { decrement: qty } },
      });
      const newQty = previousQty - qty;
      await tx.inventoryHistory.create({
        data: {
          productId: product.id,
          businessId: product.businessId,
          previousQty,
          newQty,
          changeQty: -qty,
          reason: "sale",
          note: `Order #${orderNumber}`,
          orderId,
          variantId: null,
        },
      });
      candidates.push({
        productId: product.id,
        productName: product.name,
        newQty,
        previousQty,
        allowBackorders: true,
        lowInventoryThreshold: product.lowInventoryThreshold,
      });
      continue;
    }

    const result = await tx.product.updateMany({
      where: { id: product.id, inventoryQty: { gte: qty } },
      data: { inventoryQty: { decrement: qty } },
    });

    if (result.count === 0) {
      Sentry.captureMessage(
        `[Inventory] Oversell for product ${product.id} on order #${orderNumber}`,
        {
          level: "warning",
          tags: { "inventory.step": "oversell", businessId },
        },
      );
      await tx.inventoryHistory.create({
        data: {
          productId: product.id,
          businessId: product.businessId,
          previousQty,
          newQty: previousQty,
          changeQty: 0,
          reason: "oversell",
          note: `Order #${orderNumber}: insufficient stock at fulfillment; inventory unchanged`,
          orderId,
          variantId: null,
        },
      });
      continue;
    }

    const newQty = previousQty - qty;
    await tx.inventoryHistory.create({
      data: {
        productId: product.id,
        businessId: product.businessId,
        previousQty,
        newQty,
        changeQty: -qty,
        reason: "sale",
        note: `Order #${orderNumber}`,
        orderId,
        variantId: null,
      },
    });
    candidates.push({
      productId: product.id,
      productName: product.name,
      newQty,
      previousQty,
      allowBackorders: false,
      lowInventoryThreshold: product.lowInventoryThreshold,
    });
  }

  for (const [poolId, group] of poolGroups) {
    const result = await deductPoolInventory(tx, {
      poolId,
      items: group.items,
      unitsConsumedMap: group.unitsConsumedMap,
      orderId,
      orderNumber,
      businessId,
    });
    if (result) poolCandidates.push(result);
  }

  return { candidates, poolCandidates };
}

/**
 * Email the owner about anything that just went out of stock, went on
 * backorder, or crossed its low-inventory threshold.
 *
 * **Never throws** — it runs after the order is already committed, so a Resend
 * outage or a deleted product must not turn a successful sale into a 500.
 *
 * Alerts are latched with a conditional `updateMany` on the
 * `outOfStockAlertSent` / `lowInventoryAlertSent` flags: `count > 0` means this
 * process won the race and owns the send, so two concurrent orders emptying the
 * same product produce exactly one email. Only the *crossing* of a low
 * threshold alerts (`previousQty > threshold >= newQty`), not every sale below
 * it, and at most one email per product per call even when several of its
 * variants moved.
 */
export async function sendLowInventoryAlerts(
  db: DbClient,
  params: {
    business: InventoryAlertBusiness;
    candidates: LowStockCandidate[];
    poolCandidates: PoolDeductionResult[];
  },
): Promise<void> {
  const { business, candidates, poolCandidates } = params;

  if (candidates.length > 0) {
    try {
      const businessUrl = getBusinessUrl(business);
      const alertedProductIds = new Set<string>();

      for (const candidate of candidates) {
        const {
          productId,
          productName,
          variantName,
          newQty,
          previousQty,
          allowBackorders,
          lowInventoryThreshold,
        } = candidate;

        // One alert per product per order — skip further variants of it.
        if (alertedProductIds.has(productId)) continue;

        const adminProductUrl = `${businessUrl}/admin/products/${productId}`;

        if (newQty <= 0) {
          const flagged = await db.product.updateMany({
            where: { id: productId, outOfStockAlertSent: false },
            data: { outOfStockAlertSent: true, lowInventoryAlertSent: true },
          });
          if (flagged.count > 0) {
            alertedProductIds.add(productId);
            if (allowBackorders) {
              await sendBackorderAlert({
                productName,
                variantName,
                adminProductUrl,
                business,
              });
            } else {
              await sendOutOfStockAlert({
                productName,
                variantName,
                adminProductUrl,
                business,
              });
            }
          }
        } else if (
          lowInventoryThreshold !== null &&
          newQty <= lowInventoryThreshold &&
          previousQty > lowInventoryThreshold
        ) {
          const flagged = await db.product.updateMany({
            where: { id: productId, lowInventoryAlertSent: false },
            data: { lowInventoryAlertSent: true },
          });
          if (flagged.count > 0) {
            alertedProductIds.add(productId);
            await sendLowInventoryAlert({
              productName,
              variantName,
              currentQty: newQty,
              threshold: lowInventoryThreshold,
              adminProductUrl,
              business,
            });
          }
        }
      }
    } catch (notifyError) {
      Sentry.withScope((scope) => {
        scope.setTag("inventory.step", "alert-notification");
        scope.setTag("businessId", business.id);
        Sentry.captureException(notifyError);
      });
    }
  }

  if (poolCandidates.length > 0) {
    try {
      const businessUrl = getBusinessUrl(business);
      const adminInventoryUrl = `${businessUrl}/admin/inventory`;
      const alertedPoolIds = new Set<string>();

      for (const candidate of poolCandidates) {
        // An oversell moved nothing, so there is no threshold crossing to
        // report — the oversell itself is already recorded in InventoryHistory
        // and reported to Sentry.
        if (candidate.wasOversell) continue;
        if (alertedPoolIds.has(candidate.poolId)) continue;

        if (candidate.newQty <= 0) {
          const flagged = await db.baseInventoryUnit.updateMany({
            where: { id: candidate.poolId, outOfStockAlertSent: false },
            data: { outOfStockAlertSent: true, lowInventoryAlertSent: true },
          });
          if (flagged.count > 0) {
            alertedPoolIds.add(candidate.poolId);
            await sendPoolOutOfStockAlert({
              poolName: candidate.poolName,
              adminUrl: adminInventoryUrl,
              business,
            });
          }
        } else if (
          candidate.lowInventoryThreshold !== null &&
          candidate.newQty <= candidate.lowInventoryThreshold &&
          candidate.previousQty > candidate.lowInventoryThreshold
        ) {
          const flagged = await db.baseInventoryUnit.updateMany({
            where: { id: candidate.poolId, lowInventoryAlertSent: false },
            data: { lowInventoryAlertSent: true },
          });
          if (flagged.count > 0) {
            alertedPoolIds.add(candidate.poolId);
            await sendPoolLowInventoryAlert({
              poolName: candidate.poolName,
              currentQty: candidate.newQty,
              threshold: candidate.lowInventoryThreshold,
              adminUrl: adminInventoryUrl,
              business,
            });
          }
        }
      }
    } catch (poolNotifyError) {
      Sentry.withScope((scope) => {
        scope.setTag("inventory.step", "pool-alert-notification");
        scope.setTag("businessId", business.id);
        Sentry.captureException(poolNotifyError);
      });
    }
  }
}
