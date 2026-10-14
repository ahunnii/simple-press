import type {
  CustomizerDefinition,
  CustomizerGroupDef,
  CustomizerLinkedTarget,
  CustomizerValueDef,
} from "~/lib/customizer/types";

/** Test-only builders for customizer definitions (not exported by the barrel). */

export function value(
  id: string,
  overrides: Partial<CustomizerValueDef> = {},
): CustomizerValueDef {
  return {
    id,
    label: id[0]!.toUpperCase() + id.slice(1),
    imageUrl: null,
    swatchColor: null,
    priceDelta: 0,
    priceOverride: null,
    linked: null,
    available: true,
    sortOrder: 0,
    ...overrides,
  };
}

export function linked(
  overrides: Partial<CustomizerLinkedTarget> = {},
): CustomizerLinkedTarget {
  return {
    productId: "prod-linked",
    variantId: null,
    productName: "Linked",
    variantName: null,
    sku: null,
    price: 1000,
    available: true,
    stock: null,
    ...overrides,
  };
}

export function choiceGroup(
  id: string,
  values: CustomizerValueDef[],
  overrides: Partial<CustomizerGroupDef> = {},
): CustomizerGroupDef {
  return {
    id,
    name: id[0]!.toUpperCase() + id.slice(1),
    helpText: null,
    kind: "choice",
    required: false,
    minSelections: 0,
    maxSelections: values.length || 1,
    includedCount: 0,
    display: "tiles",
    maxLength: null,
    placeholder: null,
    textPriceCents: 0,
    sortOrder: 0,
    values: values.map((v, i) => ({ ...v, sortOrder: v.sortOrder || i })),
    ...overrides,
  };
}

export function textGroup(
  id: string,
  overrides: Partial<CustomizerGroupDef> = {},
): CustomizerGroupDef {
  return {
    ...choiceGroup(id, []),
    kind: "text",
    maxSelections: 1,
    ...overrides,
  };
}

export function definition(groups: CustomizerGroupDef[]): CustomizerDefinition {
  return {
    productId: "prod-glove",
    groups: groups.map((g, i) => ({ ...g, sortOrder: g.sortOrder || i })),
  };
}

/**
 * The glove: a required single chain, up to 3 charms with the cheapest one
 * included, and an optional $5 engraving of up to 12 characters.
 */
export function gloveDefinition(): CustomizerDefinition {
  return definition([
    choiceGroup(
      "chain",
      [
        value("silver", { priceDelta: 1500 }),
        value("gold", {
          linked: linked({
            productId: "prod-chain",
            variantId: "var-gold",
            productName: "Chain",
            variantName: "Gold",
            sku: "CH-G",
            price: 2500,
            stock: 5,
          }),
        }),
      ],
      { required: true, minSelections: 1, maxSelections: 1 },
    ),
    choiceGroup(
      "charms",
      [
        value("heart", { priceDelta: 800 }),
        value("star", { priceDelta: 800 }),
        value("moon", { priceDelta: 1200 }),
        value("bee", {
          linked: linked({
            productId: "prod-bee",
            productName: "Bee charm",
            sku: "BEE",
            price: 3500,
            stock: 2,
          }),
          priceOverride: 2000,
        }),
      ],
      { maxSelections: 3, includedCount: 1 },
    ),
    textGroup("engraving", { maxLength: 12, textPriceCents: 500 }),
  ]);
}
