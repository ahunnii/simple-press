import type {
  CustomizerDefinition,
  CustomizerGroupDef,
  CustomizerLinkedTarget,
  CustomizerValueDef,
} from "~/lib/customizer/types";
import { parseCardAdditionalFields } from "~/lib/products";
import { resolveVariantPrice } from "~/lib/variant-price";

/**
 * Pure mapping from the loader's Prisma rows into `CustomizerDefinition`.
 * Split from `load.ts` (which talks to the database) so the rules below are
 * unit-testable without a client. No I/O, no server-only imports.
 *
 * The row types are hand-written structural types (the same convention as
 * `PoolLedgerGroupRow` in `inventory/pool-sales.ts`): the Prisma `select` in
 * `load.ts` must produce something assignable to them.
 */

export type RawLinkedVariant = {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  inventoryQty: number;
  reservedQty: number;
};

export type RawLinkedProduct = {
  id: string;
  businessId: string;
  name: string;
  sku: string | null;
  price: number;
  additionalFields: unknown;
  trackInventory: boolean;
  inventoryQty: number;
  reservedQty: number;
  allowBackorders: boolean;
  baseInventoryUnitId: string | null;
  baseUnitsConsumed: number | null;
  baseInventoryUnit: {
    inventoryQty: number;
    reservedQty: number;
    allowBackorders: boolean;
  } | null;
  variants: RawLinkedVariant[];
};

export type RawOptionValue = {
  id: string;
  label: string;
  imageUrl: string | null;
  swatchColor: string | null;
  priceDelta: number;
  priceOverride: number | null;
  linkedProductId: string | null;
  linkedVariantId: string | null;
  linkedProduct: RawLinkedProduct | null;
  available: boolean;
  sortOrder: number;
};

export type RawOptionGroup = {
  id: string;
  name: string;
  helpText: string | null;
  kind: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  includedCount: number;
  display: string;
  maxLength: number | null;
  placeholder: string | null;
  textPriceCents: number;
  values: RawOptionValue[];
};

/** One `ProductOptionGroupOnProduct` row with its group (+ values) loaded. */
export type RawAttachment = {
  productId: string;
  sortOrder: number;
  group: RawOptionGroup;
};

/**
 * Group the attachment rows by product. A product with no attachments is
 * ABSENT from the map (callers treat that as "no customizer").
 */
export function mapCustomizerRows(
  rows: readonly RawAttachment[],
  businessId: string,
): Map<string, CustomizerDefinition> {
  const out = new Map<string, CustomizerDefinition>();
  for (const row of rows) {
    const def = out.get(row.productId) ?? {
      productId: row.productId,
      groups: [],
    };
    def.groups.push(mapGroup(row.group, row.sortOrder, businessId));
    out.set(row.productId, def);
  }
  for (const def of out.values()) {
    def.groups.sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  }
  return out;
}

function mapGroup(
  group: RawOptionGroup,
  sortOrder: number,
  businessId: string,
): CustomizerGroupDef {
  const kind = group.kind === "text" ? "text" : "choice";
  const display =
    group.display === "swatches" || group.display === "list"
      ? group.display
      : "tiles";
  return {
    id: group.id,
    name: group.name,
    helpText: group.helpText,
    kind,
    required: group.required,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    includedCount: group.includedCount,
    display,
    maxLength: group.maxLength,
    placeholder: group.placeholder,
    textPriceCents: group.textPriceCents,
    sortOrder,
    // A text group has no values, whatever the table holds.
    values:
      kind === "text"
        ? []
        : [...group.values]
            .sort(
              (a, b) =>
                a.sortOrder - b.sortOrder ||
                (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
            )
            .map((value) => mapValue(value, businessId)),
  };
}

function mapValue(
  value: RawOptionValue,
  businessId: string,
): CustomizerValueDef {
  return {
    id: value.id,
    label: value.label,
    imageUrl: value.imageUrl,
    swatchColor: value.swatchColor ? value.swatchColor.toLowerCase() : null,
    priceDelta: value.priceDelta,
    priceOverride: value.priceOverride,
    linked: value.linkedProductId ? mapLinked(value, businessId) : null,
    available: value.available,
    sortOrder: value.sortOrder,
  };
}

/**
 * Resolve a linked target. A value that IS linked always yields a target (never
 * `null`): a vanished/foreign/coming-soon product maps to `available: false`
 * so the value is shown as unavailable rather than silently becoming a free
 * standalone value.
 *
 * Unpublished targets are deliberately AVAILABLE — an owner can track stock
 * on an option without listing it in the shop.
 */
export function mapLinked(
  value: Pick<
    RawOptionValue,
    "linkedProductId" | "linkedVariantId" | "linkedProduct"
  >,
  businessId: string,
): CustomizerLinkedTarget {
  const product = value.linkedProduct;
  const dead = (productName = ""): CustomizerLinkedTarget => ({
    productId: value.linkedProductId ?? "",
    variantId: value.linkedVariantId,
    productName,
    variantName: null,
    sku: null,
    price: 0,
    available: false,
    stock: 0,
  });

  // Missing, or another tenant's product (never trust the FK alone).
  if (product?.businessId !== businessId) return dead();

  const comingSoon =
    parseCardAdditionalFields(product.additionalFields).comingSoon === true;
  const hasVariants = product.variants.length > 0;

  if (hasVariants) {
    // A variant product is only linkable at a specific, existing variant.
    const variant = value.linkedVariantId
      ? product.variants.find((v) => v.id === value.linkedVariantId)
      : undefined;
    if (!variant) return dead(product.name);
    return {
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku ?? product.sku,
      price: resolveVariantPrice(variant.price, product.price),
      available: !comingSoon,
      stock:
        product.trackInventory && !product.allowBackorders
          ? Math.max(0, variant.inventoryQty - variant.reservedQty)
          : null,
    };
  }

  // A stale variant id on a now-variantless product cannot be honoured.
  if (value.linkedVariantId) return dead(product.name);

  return {
    productId: product.id,
    variantId: null,
    productName: product.name,
    variantName: null,
    sku: product.sku,
    price: product.price,
    available: !comingSoon,
    stock: simpleProductStock(product),
  };
}

/**
 * Units of a variantless product that can still be sold. Pool first (the
 * pool forces the product's own tracking off — see `isInStock`): pool units
 * available ÷ units consumed per sale, `null` when the pool allows
 * backorders. A dangling pool id (`baseInventoryUnitId` set, row gone) sells
 * nothing, matching `checkCartAvailability`'s "pool-missing".
 */
function simpleProductStock(product: RawLinkedProduct): number | null {
  if (product.baseInventoryUnitId) {
    const pool = product.baseInventoryUnit;
    if (!pool) return 0;
    if (pool.allowBackorders) return null;
    const per = Math.max(1, product.baseUnitsConsumed ?? 1);
    return Math.max(
      0,
      Math.floor((pool.inventoryQty - pool.reservedQty) / per),
    );
  }
  if (product.trackInventory && !product.allowBackorders) {
    return Math.max(0, product.inventoryQty - product.reservedQty);
  }
  return null;
}
