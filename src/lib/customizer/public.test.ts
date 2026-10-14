import { describe, expect, it } from "vitest";

import { toPublicCustomizerDefinition } from "./public";
import {
  choiceGroup,
  definition,
  gloveDefinition,
  linked,
  value,
} from "./test-fixtures";

describe("toPublicCustomizerDefinition", () => {
  it("hides link ids, names, skus, raw prices and raw stock", () => {
    const pub = toPublicCustomizerDefinition(gloveDefinition());
    const json = JSON.stringify(pub);
    for (const secret of [
      "prod-chain",
      "var-gold",
      "prod-bee",
      "CH-G",
      "BEE",
      "Bee charm",
      "linked",
      "priceDelta",
      "priceOverride",
      "stock",
    ]) {
      expect(json).not.toContain(secret);
    }
    expect(Object.keys(pub.groups[0]!.values[1]!).sort()).toEqual(
      [
        "available",
        "id",
        "imageUrl",
        "label",
        "maxQty",
        "price",
        "sortOrder",
        "swatchColor",
      ].sort(),
    );
  });

  it("exposes the effective price: override, inherited, or standalone delta", () => {
    const pub = toPublicCustomizerDefinition(gloveDefinition());
    const price = (g: number, v: string) =>
      pub.groups[g]!.values.find((x) => x.id === v)!.price;
    expect(price(0, "silver")).toBe(1500);
    expect(price(0, "gold")).toBe(2500); // inherited from target
    expect(price(1, "bee")).toBe(2000); // override beats target 3500
  });

  it("caps maxQty and folds sold-out into available", () => {
    const def = definition([
      choiceGroup("x", [
        value("many", { linked: linked({ stock: 5000 }) }),
        value("few", { linked: linked({ stock: 3 }) }),
        value("none", { linked: linked({ stock: 0 }) }),
        value("untracked", { linked: linked({ stock: null }) }),
        value("standalone"),
        value("off", { available: false }),
        value("dead", { linked: linked({ available: false, stock: 10 }) }),
      ]),
    ]);
    const values = toPublicCustomizerDefinition(def).groups[0]!.values;
    const by = (id: string) => values.find((v) => v.id === id)!;
    expect(by("many").maxQty).toBe(99);
    expect(by("few").maxQty).toBe(3);
    expect(by("none")).toMatchObject({ maxQty: 0, available: false });
    expect(by("untracked")).toMatchObject({ maxQty: null, available: true });
    expect(by("standalone")).toMatchObject({ maxQty: null, available: true });
    expect(by("off").available).toBe(false);
    expect(by("dead").available).toBe(false);
  });

  it("sorts groups by attachment order and values by owner order", () => {
    const def = definition([
      choiceGroup(
        "second",
        [value("b", { sortOrder: 2 }), value("a", { sortOrder: 1 })],
        { sortOrder: 2 },
      ),
      choiceGroup(
        "first",
        [value("z", { sortOrder: 1 }), value("y", { sortOrder: 1 })],
        { sortOrder: 1 },
      ),
    ]);
    const pub = toPublicCustomizerDefinition(def);
    expect(pub.groups.map((g) => g.id)).toEqual(["first", "second"]);
    expect(pub.groups[0]!.values.map((v) => v.id)).toEqual(["y", "z"]); // tie → id
    expect(pub.groups[1]!.values.map((v) => v.id)).toEqual(["a", "b"]);
  });
});
