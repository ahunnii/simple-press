import type { CustomizationComponent } from "~/lib/customizer/types";
import { readCustomizationSnapshot } from "~/lib/customizer/display";

/**
 * Inventory expansion for configured order lines.
 *
 * A configured line (a glove with a chain and two charms) is ONE `OrderItem`,
 * but it consumes stock from several products: the glove's own
 * product/variant, plus every linked option value (`snapshot.components`).
 * Every place that deducts or restocks an order iterates
 * `expandOrderItemsForInventory(order.items)` instead of `order.items`, so the
 * linked charm moves exactly when the glove does — same oversell guard, same
 * pool grouping, same history rows — and nothing else has to know options
 * exist.
 *
 * Works from the order alone (the snapshot frozen at purchase), so a restock
 * months later still returns the right charms even if the owner has since
 * edited or deleted the option.
 *
 * Reservations follow the same model as plain lines: checkout holds
 * `reservedQty` for each component (a reservation entry per component), the
 * webhook deducts `inventoryQty` from this expansion and then consumes the
 * reservation (drops `reservedQty`). Deduction never reads the reservation,
 * so a component can't be taken twice.
 *
 * Pure: no I/O.
 */

/** The fields every deduction/restock loop reads off an order line. */
export type InventoryLine = {
  productId: string | null;
  productVariantId: string | null;
  quantity: number;
  productName: string;
};

export type ExpandedInventoryLine = InventoryLine & {
  /** True for a linked option value, false for the order line itself. */
  isComponent: boolean;
};

type ExpandableItem = {
  productId: string | null;
  productVariantId: string | null;
  quantity: number;
  productName?: string | null;
  /** `OrderItem.customization` (any JSON; only a v1 snapshot is expanded). */
  customization?: unknown;
};

/**
 * Each item followed by its linked components, quantity =
 * `qtyPerUnit × item.quantity`. Items without a readable snapshot (plain
 * lines, unknown versions, hand-edited JSON) pass through alone. Malformed
 * component entries are skipped rather than guessed at.
 */
export function expandOrderItemsForInventory(
  items: readonly ExpandableItem[],
): ExpandedInventoryLine[] {
  const out: ExpandedInventoryLine[] = [];
  for (const item of items) {
    out.push({
      productId: item.productId,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      productName: item.productName ?? "",
      isComponent: false,
    });
    for (const component of snapshotComponents(item.customization)) {
      const quantity = component.qtyPerUnit * item.quantity;
      if (quantity <= 0) continue;
      out.push({
        productId: component.productId,
        productVariantId: component.variantId,
        quantity,
        productName: component.name,
        isComponent: true,
      });
    }
  }
  return out;
}

/** The well-formed components of a stored snapshot (empty when none). */
export function snapshotComponents(
  customization: unknown,
): CustomizationComponent[] {
  if (customization == null) return [];
  const snapshot = readCustomizationSnapshot(customization);
  if (!snapshot) return [];
  return (snapshot.components as unknown[]).filter(isComponent);
}

function isComponent(value: unknown): value is CustomizationComponent {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.productId === "string" &&
    c.productId.length > 0 &&
    (c.variantId === null ||
      (typeof c.variantId === "string" && c.variantId.length > 0)) &&
    typeof c.qtyPerUnit === "number" &&
    Number.isInteger(c.qtyPerUnit) &&
    c.qtyPerUnit > 0 &&
    typeof c.name === "string"
  );
}
