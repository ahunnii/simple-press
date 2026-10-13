import { describe, expect, it } from "vitest";

import { priceConfiguration } from "./evaluate";
import { expandOrderItemsForInventory, snapshotComponents } from "./inventory";
import { gloveDefinition } from "./test-fixtures";

function gloveSnapshot() {
  const result = priceConfiguration(
    gloveDefinition(),
    {
      choices: [
        { groupId: "chain", valueIds: ["gold"] },
        { groupId: "charms", valueIds: ["heart", "bee"] },
      ],
      texts: [],
    },
    { basePrice: 4000 },
  );
  if (!result.ok) throw new Error("fixture should price");
  return result.snapshot;
}

describe("expandOrderItemsForInventory", () => {
  it("passes plain lines through unchanged", () => {
    expect(
      expandOrderItemsForInventory([
        {
          productId: "p1",
          productVariantId: "v1",
          quantity: 2,
          productName: "Tee",
        },
        {
          productId: "p2",
          productVariantId: null,
          quantity: 1,
          productName: "Mug",
          customization: null,
        },
      ]),
    ).toEqual([
      {
        productId: "p1",
        productVariantId: "v1",
        quantity: 2,
        productName: "Tee",
        isComponent: false,
      },
      {
        productId: "p2",
        productVariantId: null,
        quantity: 1,
        productName: "Mug",
        isComponent: false,
      },
    ]);
  });

  it("follows a configured line with its linked components × quantity", () => {
    const expanded = expandOrderItemsForInventory([
      {
        productId: "prod-glove",
        productVariantId: "var-pink",
        quantity: 3,
        productName: "Glove",
        customization: gloveSnapshot(),
      },
    ]);
    expect(expanded).toEqual([
      {
        productId: "prod-glove",
        productVariantId: "var-pink",
        quantity: 3,
        productName: "Glove",
        isComponent: false,
      },
      {
        productId: "prod-chain",
        productVariantId: "var-gold",
        quantity: 3,
        productName: "Chain — Gold",
        isComponent: true,
      },
      {
        productId: "prod-bee",
        productVariantId: null,
        quantity: 3,
        productName: "Bee charm",
        isComponent: true,
      },
    ]);
  });

  it("multiplies qtyPerUnit", () => {
    const snapshot = {
      ...gloveSnapshot(),
      components: [
        { productId: "bead", variantId: null, qtyPerUnit: 4, name: "Bead" },
      ],
    };
    const expanded = expandOrderItemsForInventory([
      {
        productId: "g",
        productVariantId: null,
        quantity: 2,
        customization: snapshot,
      },
    ]);
    expect(expanded[1]).toMatchObject({ productId: "bead", quantity: 8 });
  });

  it("ignores unknown versions, malformed JSON and malformed components", () => {
    const good = gloveSnapshot();
    const items = [
      {
        productId: "a",
        productVariantId: null,
        quantity: 1,
        customization: { v: 2 },
      },
      {
        productId: "b",
        productVariantId: null,
        quantity: 1,
        customization: "nope",
      },
      {
        productId: "c",
        productVariantId: null,
        quantity: 1,
        customization: {
          ...good,
          components: [
            { productId: "", variantId: null, qtyPerUnit: 1, name: "x" },
            { productId: "ok", variantId: 7, qtyPerUnit: 1, name: "x" },
            { productId: "ok", variantId: null, qtyPerUnit: 0, name: "x" },
            { productId: "ok", variantId: null, qtyPerUnit: 1.5, name: "x" },
            null,
            { productId: "fine", variantId: null, qtyPerUnit: 1, name: "Fine" },
          ],
        },
      },
    ];
    const expanded = expandOrderItemsForInventory(items);
    expect(expanded.map((l) => l.productId)).toEqual(["a", "b", "c", "fine"]);
  });

  it("snapshotComponents is empty for null and plain values", () => {
    expect(snapshotComponents(null)).toEqual([]);
    expect(snapshotComponents(undefined)).toEqual([]);
    expect(snapshotComponents({})).toEqual([]);
    expect(snapshotComponents(gloveSnapshot())).toHaveLength(2);
  });
});
