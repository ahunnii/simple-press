import type {
  CustomizerDefinition,
  PublicCustomizerDefinition,
  PublicCustomizerGroup,
  PublicCustomizerValue,
} from "~/lib/customizer/types";
import {
  effectiveValuePrice,
  isValueSelectable,
  publicMaxQty,
} from "~/lib/customizer/effective-price";

/**
 * Project the full definition into what a browser may see.
 *
 * Every field is copied EXPLICITLY (never spread), so a field added to the
 * full types later cannot leak by default. Gone: the linked product/variant
 * ids, names and skus, the raw `priceDelta`/`priceOverride` pair (replaced by
 * the one effective `price`), and raw stock (replaced by a capped `maxQty`).
 *
 * Unavailable values are KEPT, flagged `available: false`, so a storefront
 * can show "sold out" rather than silently dropping a tile.
 *
 * Groups come back in attachment order and values in owner order (ties by
 * id, so the order is stable across loads).
 */
export function toPublicCustomizerDefinition(
  def: CustomizerDefinition,
): PublicCustomizerDefinition {
  return {
    productId: def.productId,
    groups: sortByOrder(def.groups).map(
      (group): PublicCustomizerGroup => ({
        id: group.id,
        name: group.name,
        helpText: group.helpText,
        kind: group.kind,
        required: group.required,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        includedCount: group.includedCount,
        display: group.display,
        maxLength: group.maxLength,
        placeholder: group.placeholder,
        textPriceCents: group.textPriceCents,
        sortOrder: group.sortOrder,
        values: sortByOrder(group.values).map(
          (value): PublicCustomizerValue => ({
            id: value.id,
            label: value.label,
            imageUrl: value.imageUrl,
            swatchColor: value.swatchColor,
            price: effectiveValuePrice(value),
            available: isValueSelectable(value),
            maxQty: publicMaxQty(value),
            sortOrder: value.sortOrder,
          }),
        ),
      }),
    ),
  };
}

export function sortByOrder<T extends { id: string; sortOrder: number }>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
