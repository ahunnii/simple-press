import { describe, expect, it } from "vitest";

import type {
  RawAttachment,
  RawLinkedProduct,
  RawOptionGroup,
  RawOptionValue,
} from "~/lib/customizer/map-rows";
import { mapCustomizerRows, mapLinked } from "~/lib/customizer/map-rows";

const BIZ = "biz-1";

function product(overrides: Partial<RawLinkedProduct> = {}): RawLinkedProduct {
  return {
    id: "p-charm",
    businessId: BIZ,
    name: "Heart charm",
    sku: "CH-1",
    price: 3500,
    additionalFields: null,
    trackInventory: false,
    inventoryQty: 0,
    reservedQty: 0,
    allowBackorders: false,
    baseInventoryUnitId: null,
    baseUnitsConsumed: null,
    baseInventoryUnit: null,
    variants: [],
    ...overrides,
  };
}

function rawValue(overrides: Partial<RawOptionValue> = {}): RawOptionValue {
  return {
    id: "v1",
    label: "Heart",
    imageUrl: null,
    swatchColor: null,
    priceDelta: 0,
    priceOverride: null,
    linkedProductId: null,
    linkedVariantId: null,
    linkedProduct: null,
    available: true,
    sortOrder: 0,
    ...overrides,
  };
}

function linkedValue(
  prod: RawLinkedProduct | null,
  variantId: string | null = null,
) {
  return rawValue({
    linkedProductId: prod?.id ?? "p-gone",
    linkedVariantId: variantId,
    linkedProduct: prod,
  });
}

function group(overrides: Partial<RawOptionGroup> = {}): RawOptionGroup {
  return {
    id: "g1",
    name: "Charms",
    helpText: null,
    kind: "choice",
    required: false,
    minSelections: 0,
    maxSelections: 3,
    includedCount: 1,
    display: "tiles",
    maxLength: null,
    placeholder: null,
    textPriceCents: 0,
    values: [],
    ...overrides,
  };
}

describe("mapLinked", () => {
  it("maps a simple untracked product: price, sku, unlimited stock", () => {
    const t = mapLinked(linkedValue(product()), BIZ);
    expect(t).toMatchObject({
      productId: "p-charm",
      variantId: null,
      price: 3500,
      sku: "CH-1",
      available: true,
      stock: null,
    });
  });

  it("treats an UNPUBLISHED product as available (hidden add-on products)", () => {
    // `published` is deliberately not even selected; a product row is enough.
    expect(mapLinked(linkedValue(product()), BIZ).available).toBe(true);
  });

  it("is unavailable when the product is missing or another tenant's", () => {
    expect(mapLinked(linkedValue(null), BIZ)).toMatchObject({
      available: false,
      stock: 0,
    });
    expect(
      mapLinked(linkedValue(product({ businessId: "other" })), BIZ),
    ).toMatchObject({ available: false, stock: 0 });
  });

  it("is unavailable when the product is coming soon", () => {
    const t = mapLinked(
      linkedValue(product({ additionalFields: { comingSoon: true } })),
      BIZ,
    );
    expect(t.available).toBe(false);
  });

  it("computes tracked stock as quantity minus reserved", () => {
    const t = mapLinked(
      linkedValue(
        product({ trackInventory: true, inventoryQty: 10, reservedQty: 3 }),
      ),
      BIZ,
    );
    expect(t.stock).toBe(7);
  });

  it("floors negative tracked stock at 0 and ignores tracking with backorders", () => {
    expect(
      mapLinked(
        linkedValue(
          product({ trackInventory: true, inventoryQty: 1, reservedQty: 4 }),
        ),
        BIZ,
      ).stock,
    ).toBe(0);
    expect(
      mapLinked(
        linkedValue(
          product({
            trackInventory: true,
            allowBackorders: true,
            inventoryQty: 0,
          }),
        ),
        BIZ,
      ).stock,
    ).toBeNull();
  });

  it("uses pool stock divided by units consumed, ignoring product tracking", () => {
    const t = mapLinked(
      linkedValue(
        product({
          baseInventoryUnitId: "pool",
          baseUnitsConsumed: 3,
          trackInventory: false,
          baseInventoryUnit: {
            inventoryQty: 20,
            reservedQty: 2,
            allowBackorders: false,
          },
        }),
      ),
      BIZ,
    );
    expect(t.stock).toBe(6); // floor(18 / 3)
  });

  it("pool with backorders is unlimited; a dangling pool sells nothing", () => {
    expect(
      mapLinked(
        linkedValue(
          product({
            baseInventoryUnitId: "pool",
            baseInventoryUnit: {
              inventoryQty: 0,
              reservedQty: 0,
              allowBackorders: true,
            },
          }),
        ),
        BIZ,
      ).stock,
    ).toBeNull();
    expect(
      mapLinked(
        linkedValue(
          product({ baseInventoryUnitId: "pool", baseInventoryUnit: null }),
        ),
        BIZ,
      ).stock,
    ).toBe(0);
  });

  describe("products with variants", () => {
    const variants = [
      {
        id: "var-a",
        name: "Gold",
        sku: "CH-G",
        price: 0, // 0 = inherit the product price
        inventoryQty: 5,
        reservedQty: 1,
      },
      {
        id: "var-b",
        name: "Silver",
        sku: null,
        price: 4200,
        inventoryQty: 2,
        reservedQty: 0,
      },
    ];

    it("requires a linked variant id", () => {
      const t = mapLinked(linkedValue(product({ variants }), null), BIZ);
      expect(t.available).toBe(false);
    });

    it("is unavailable when the variant id is not one of the product's", () => {
      const t = mapLinked(linkedValue(product({ variants }), "var-zzz"), BIZ);
      expect(t.available).toBe(false);
    });

    it("resolves variant price (0 inherits), sku fallback and stock", () => {
      const prod = product({ variants, trackInventory: true });
      const a = mapLinked(linkedValue(prod, "var-a"), BIZ);
      expect(a).toMatchObject({
        variantId: "var-a",
        variantName: "Gold",
        price: 3500,
        sku: "CH-G",
        stock: 4,
        available: true,
      });
      const b = mapLinked(linkedValue(prod, "var-b"), BIZ);
      expect(b).toMatchObject({ price: 4200, sku: "CH-1", stock: 2 });
    });

    it("variant stock is unlimited when the product doesn't track inventory", () => {
      const t = mapLinked(linkedValue(product({ variants }), "var-a"), BIZ);
      expect(t.stock).toBeNull();
    });
  });

  it("rejects a stale variant id on a product that no longer has variants", () => {
    expect(mapLinked(linkedValue(product(), "var-old"), BIZ).available).toBe(
      false,
    );
  });
});

describe("mapCustomizerRows", () => {
  it("returns an empty map for no rows", () => {
    expect(mapCustomizerRows([], BIZ).size).toBe(0);
  });

  it("groups by product and orders groups by attachment sortOrder", () => {
    const rows: RawAttachment[] = [
      { productId: "p1", sortOrder: 2, group: group({ id: "g-late" }) },
      { productId: "p1", sortOrder: 1, group: group({ id: "g-early" }) },
      { productId: "p2", sortOrder: 0, group: group({ id: "g-other" }) },
    ];
    const map = mapCustomizerRows(rows, BIZ);
    expect(map.get("p1")!.groups.map((g) => [g.id, g.sortOrder])).toEqual([
      ["g-early", 1],
      ["g-late", 2],
    ]);
    expect(map.get("p2")!.groups).toHaveLength(1);
    expect(map.has("p3")).toBe(false);
  });

  it("orders values, lower-cases swatches and maps standalone + linked values", () => {
    const rows: RawAttachment[] = [
      {
        productId: "p1",
        sortOrder: 0,
        group: group({
          values: [
            rawValue({ id: "b", sortOrder: 2, swatchColor: "#AABBCC" }),
            { ...linkedValue(product()), id: "c", sortOrder: 0 },
            rawValue({ id: "a", sortOrder: 1, priceDelta: 500 }),
          ],
        }),
      },
    ];
    const g = mapCustomizerRows(rows, BIZ).get("p1")!.groups[0]!;
    expect(g.values.map((v) => v.id)).toEqual(["c", "a", "b"]);
    expect(g.values[0]!.linked?.price).toBe(3500);
    expect(g.values[1]).toMatchObject({ priceDelta: 500, linked: null });
    expect(g.values[2]!.swatchColor).toBe("#aabbcc");
  });

  it("normalizes unknown kind/display, and empties a text group's values", () => {
    const rows: RawAttachment[] = [
      {
        productId: "p1",
        sortOrder: 0,
        group: group({
          id: "t",
          kind: "text",
          display: "bogus",
          values: [rawValue()],
        }),
      },
      {
        productId: "p1",
        sortOrder: 1,
        group: group({ id: "c", kind: "weird", display: "swatches" }),
      },
    ];
    const [t, c] = mapCustomizerRows(rows, BIZ).get("p1")!.groups;
    expect(t).toMatchObject({ kind: "text", display: "tiles", values: [] });
    expect(c).toMatchObject({ kind: "choice", display: "swatches" });
  });
});
