import { describe, expect, it } from "vitest";

import type { CheckoutLine, StockRows } from "./customizer-checkout";
import { configKey, normalizeSelection } from "~/lib/customizer/canonical";
import {
  choiceGroup,
  definition,
  gloveDefinition,
  value,
} from "~/lib/customizer/test-fixtures";

import {
  appendHold,
  buildLineDemands,
  customizerFailureReason,
  evaluateCheckoutCustomizations,
  findOverdrawnLines,
  holdForTarget,
  readLineConfigSnapshots,
  serverLineKey,
  truncateUtf16,
} from "./customizer-checkout";

function line(overrides: Partial<CheckoutLine> = {}): CheckoutLine {
  return {
    productId: "prod-glove",
    variantId: null,
    productName: "Client name",
    variantName: null,
    quantity: 1,
    ...overrides,
  };
}

const goldBuild = {
  choices: [
    { groupId: "chain", valueIds: ["gold"] },
    { groupId: "charms", valueIds: ["bee"] },
  ],
  texts: [],
};

function rows(overrides: Partial<StockRows> = {}): StockRows {
  return {
    variants: new Map([
      [
        "var-gold",
        {
          inventoryQty: 5,
          reservedQty: 0,
          product: { trackInventory: true, allowBackorders: false },
        },
      ],
    ]),
    products: new Map([
      [
        "prod-bee",
        {
          trackInventory: true,
          allowBackorders: false,
          inventoryQty: 2,
          reservedQty: 0,
          baseInventoryUnitId: null,
          baseUnitsConsumed: null,
        },
      ],
      [
        "prod-glove",
        {
          trackInventory: false,
          allowBackorders: false,
          inventoryQty: 0,
          reservedQty: 0,
          baseInventoryUnitId: null,
          baseUnitsConsumed: null,
        },
      ],
    ]),
    pools: new Map(),
    ...overrides,
  };
}

describe("evaluateCheckoutCustomizations", () => {
  const defs = new Map([["prod-glove", gloveDefinition()]]);

  it("prices a configured line server-side and keys it by index", () => {
    const { configured, failures, unitPrices } = evaluateCheckoutCustomizations(
      {
        items: [line({ configuration: goldBuild })],
        optionsEnabled: true,
        definitions: defs,
        basePriceOf: () => 4000,
      },
    );
    expect(failures).toEqual([]);
    const priced = configured.get(0)!;
    // Gold chain 2500 + bee (override 2000, but cheapest charm included).
    expect(priced.unitPrice).toBe(4000 + 2500);
    expect(unitPrices.get(0)).toBe(6500);
    expect(priced.serverKey).toBe(
      serverLineKey(0, configKey(normalizeSelection(goldBuild))),
    );
    expect(priced.components.map((c) => c.productId)).toEqual([
      "prod-chain",
      "prod-bee",
    ]);
  });

  it("rejects a build when the flag is off or the product has no options", () => {
    const off = evaluateCheckoutCustomizations({
      items: [line({ configuration: goldBuild })],
      optionsEnabled: false,
      definitions: defs,
      basePriceOf: () => 4000,
    });
    expect(off.failures).toEqual([
      { lineIndex: 0, reason: "configuration-invalid" },
    ]);
    const noDef = evaluateCheckoutCustomizations({
      items: [line({ productId: "other", configuration: goldBuild })],
      optionsEnabled: true,
      definitions: defs,
      basePriceOf: () => 4000,
    });
    expect(noDef.failures[0]?.reason).toBe("configuration-invalid");
  });

  it("rejects a product with a required group posted without a build", () => {
    const result = evaluateCheckoutCustomizations({
      items: [line()],
      optionsEnabled: true,
      definitions: defs,
      basePriceOf: () => 4000,
    });
    expect(result.failures).toEqual([
      { lineIndex: 0, reason: "configuration-invalid" },
    ]);
  });

  it("sells an all-optional product without a build as a plain line", () => {
    const optional = definition([choiceGroup("charms", [value("heart")])]);
    const result = evaluateCheckoutCustomizations({
      items: [line()],
      optionsEnabled: true,
      definitions: new Map([["prod-glove", optional]]),
      basePriceOf: () => 4000,
    });
    expect(result.failures).toEqual([]);
    expect(result.configured.size).toBe(0);
  });

  it("maps unknown ids to configuration-invalid and sold-out picks to option-out-of-stock", () => {
    const unknown = evaluateCheckoutCustomizations({
      items: [
        line({
          configuration: {
            choices: [{ groupId: "chain", valueIds: ["foreign-id"] }],
            texts: [],
          },
        }),
      ],
      optionsEnabled: true,
      definitions: defs,
      basePriceOf: () => 4000,
    });
    expect(unknown.failures[0]?.reason).toBe("configuration-invalid");

    const soldOut = evaluateCheckoutCustomizations({
      // bee has stock 2
      items: [line({ configuration: goldBuild, quantity: 3 })],
      optionsEnabled: true,
      definitions: defs,
      basePriceOf: () => 4000,
    });
    expect(soldOut.failures[0]?.reason).toBe("option-out-of-stock");
    // Still priced for the subtotal, as if in stock.
    expect(soldOut.unitPrices.get(0)).toBe(6500);
  });

  it("skips lines the catalog check already rejected", () => {
    const result = evaluateCheckoutCustomizations({
      items: [line({ configuration: goldBuild })],
      optionsEnabled: true,
      definitions: defs,
      basePriceOf: () => null,
    });
    expect(result.failures).toEqual([]);
    expect(result.configured.size).toBe(0);
  });
});

describe("customizerFailureReason", () => {
  it("is scarcity only when every error is a sold-out value", () => {
    expect(
      customizerFailureReason([{ code: "value-out-of-stock", message: "" }]),
    ).toBe("option-out-of-stock");
    expect(
      customizerFailureReason([
        { code: "value-out-of-stock", message: "" },
        { code: "required", message: "" },
      ]),
    ).toBe("configuration-invalid");
    expect(customizerFailureReason([])).toBe("configuration-invalid");
  });
});

describe("holdForTarget / appendHold", () => {
  it("mirrors the cart-line branches", () => {
    const r = rows({
      products: new Map([
        [
          "pooled",
          {
            trackInventory: false,
            allowBackorders: false,
            inventoryQty: 0,
            reservedQty: 0,
            baseInventoryUnitId: "pool-1",
            baseUnitsConsumed: 3,
          },
        ],
        [
          "untracked",
          {
            trackInventory: false,
            allowBackorders: false,
            inventoryQty: 0,
            reservedQty: 0,
            baseInventoryUnitId: null,
            baseUnitsConsumed: null,
          },
        ],
      ]),
      pools: new Map([
        [
          "pool-1",
          { inventoryQty: 10, reservedQty: 0, allowBackorders: false },
        ],
      ]),
    });
    expect(
      holdForTarget({ productId: "x", variantId: "var-gold" }, 2, r),
    ).toEqual({ variantId: "var-gold", qty: 2 });
    expect(
      holdForTarget({ productId: "pooled", variantId: null }, 2, r),
    ).toEqual({
      baseInventoryUnitId: "pool-1",
      qty: 6,
    });
    expect(
      holdForTarget({ productId: "untracked", variantId: null }, 2, r),
    ).toBe(null);
    expect(holdForTarget({ productId: "missing", variantId: null }, 2, r)).toBe(
      null,
    );

    const entries = [{ baseInventoryUnitId: "pool-1", qty: 1 }];
    appendHold(entries, { baseInventoryUnitId: "pool-1", qty: 6 });
    appendHold(entries, { variantId: "v", qty: 1 });
    appendHold(entries, null);
    expect(entries).toEqual([
      { baseInventoryUnitId: "pool-1", qty: 7 },
      { variantId: "v", qty: 1 },
    ]);
  });
});

describe("findOverdrawnLines", () => {
  const defs = new Map([["prod-glove", gloveDefinition()]]);

  function assess(items: CheckoutLine[], stock = rows()) {
    const { configured } = evaluateCheckoutCustomizations({
      items,
      optionsEnabled: true,
      definitions: defs,
      basePriceOf: () => 4000,
    });
    return findOverdrawnLines(
      buildLineDemands({ items, configured, rows: stock }),
      stock,
    );
  }

  it("lets two lines share a component while the total fits", () => {
    expect(
      assess([
        line({ configuration: goldBuild }),
        line({ configuration: goldBuild }),
      ]),
    ).toEqual([]);
  });

  it("rejects the later line that takes a component past its stock", () => {
    // Bee stock 2: lines of 1 + 2 overdraw; the first line keeps its charm.
    expect(
      assess([
        line({ configuration: goldBuild }),
        line({ configuration: goldBuild, quantity: 2 }),
      ]),
    ).toEqual([{ lineIndex: 1, reason: "option-out-of-stock" }]);
  });

  it("counts a plain line of the component first and blames the build", () => {
    const stock = rows();
    const items = [
      line({ configuration: goldBuild, quantity: 1 }),
      line({ productId: "prod-bee", quantity: 2 }),
    ];
    expect(assess(items, stock)).toEqual([
      { lineIndex: 0, reason: "option-out-of-stock" },
    ]);
  });

  it("sums the line's own product across lines (two builds, one variant)", () => {
    const stock = rows({
      variants: new Map([
        [
          "var-pink",
          {
            inventoryQty: 1,
            reservedQty: 0,
            product: { trackInventory: true, allowBackorders: false },
          },
        ],
        [
          "var-gold",
          {
            inventoryQty: 5,
            reservedQty: 0,
            product: { trackInventory: true, allowBackorders: false },
          },
        ],
      ]),
    });
    const silver = {
      choices: [{ groupId: "chain", valueIds: ["silver"] }],
      texts: [],
    };
    expect(
      assess(
        [
          line({ variantId: "var-pink", configuration: silver }),
          line({ variantId: "var-pink", configuration: goldBuild }),
        ],
        stock,
      ),
    ).toEqual([{ lineIndex: 1, reason: "out-of-stock" }]);
  });

  describe("line-level admission", () => {
    const tracked = (inventoryQty: number) => ({
      trackInventory: true,
      allowBackorders: false,
      inventoryQty,
      reservedQty: 0,
      baseInventoryUnitId: null,
      baseUnitsConsumed: null,
    });
    const stock: StockRows = {
      variants: new Map(),
      products: new Map([
        ["prod-bee", tracked(1)],
        ["prod-star", tracked(1)],
      ]),
      pools: new Map(),
    };
    const bee = (lineIndex: number, component: boolean) => ({
      lineIndex,
      hold: { productId: "prod-bee", qty: 1 },
      component,
    });
    const star = (lineIndex: number) => ({
      lineIndex,
      hold: { productId: "prod-star", qty: 1 },
      component: true,
    });

    it("a line rejected on one row uses no stock on its other rows", () => {
      // Plain Bee, a glove with Bee + Star, a glove with Star: the middle
      // glove loses the Bee, so its Star is free for the last glove.
      expect(
        findOverdrawnLines(
          [bee(0, false), bee(1, true), star(1), star(2)],
          stock,
        ),
      ).toEqual([{ lineIndex: 1, reason: "option-out-of-stock" }]);
    });

    it("rejects the second build wanting the last charm", () => {
      expect(findOverdrawnLines([bee(0, true), bee(1, true)], stock)).toEqual([
        { lineIndex: 1, reason: "option-out-of-stock" },
      ]);
    });

    it("a plain line beats an earlier build for the same stock", () => {
      expect(findOverdrawnLines([bee(0, true), bee(1, false)], stock)).toEqual([
        { lineIndex: 0, reason: "option-out-of-stock" },
      ]);
    });

    it("blames the line's own product when that overdraws", () => {
      expect(
        findOverdrawnLines([bee(0, false), bee(1, false), star(1)], stock),
      ).toEqual([{ lineIndex: 1, reason: "out-of-stock" }]);
    });

    it("treats rows with no known limit as unlimited", () => {
      expect(
        findOverdrawnLines(
          [
            {
              lineIndex: 0,
              hold: { productId: "unknown", qty: 99 },
              component: true,
            },
            bee(0, true),
          ],
          stock,
        ),
      ).toEqual([]);
    });
  });
});

describe("readLineConfigSnapshots", () => {
  it("keeps valid snapshots and drops junk", () => {
    const { configured } = evaluateCheckoutCustomizations({
      items: [line({ configuration: goldBuild })],
      optionsEnabled: true,
      definitions: new Map([["prod-glove", gloveDefinition()]]),
      basePriceOf: () => 4000,
    });
    const priced = configured.get(0)!;
    const map = readLineConfigSnapshots({
      [priced.serverKey]: {
        selection: priced.selection,
        snapshot: priced.snapshot,
      },
      bad: { selection: {}, snapshot: { v: 7 } },
      worse: "nope",
    });
    expect([...map.keys()]).toEqual([priced.serverKey]);
    expect(readLineConfigSnapshots(null).size).toBe(0);
    expect(readLineConfigSnapshots([]).size).toBe(0);
  });
});

describe("truncateUtf16", () => {
  it("caps UTF-16 length without splitting surrogate pairs", () => {
    expect(truncateUtf16("short", 10)).toBe("short");
    const emoji = "😀".repeat(10); // 20 code units
    const cut = truncateUtf16(emoji, 6);
    expect(cut.length).toBeLessThanOrEqual(6);
    expect(cut).toBe("😀😀…");
  });
});
