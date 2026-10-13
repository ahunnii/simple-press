import { describe, expect, it } from "vitest";

import type { CustomizerError, CustomizerSelection } from "./types";

import {
  buildSummary,
  evaluateSelection,
  includedValueIds,
  priceConfiguration,
} from "./evaluate";
import { toPublicCustomizerDefinition } from "./public";
import {
  choiceGroup,
  definition,
  gloveDefinition,
  linked,
  textGroup,
  value,
} from "./test-fixtures";

const BASE = 4000;

function sel(
  choices: Record<string, string[]> = {},
  texts: Record<string, string> = {},
): CustomizerSelection {
  return {
    choices: Object.entries(choices).map(([groupId, valueIds]) => ({
      groupId,
      valueIds,
    })),
    texts: Object.entries(texts).map(([groupId, text]) => ({ groupId, text })),
  };
}

function codes(result: { ok: boolean; errors?: CustomizerError[] }) {
  return result.ok ? [] : (result.errors ?? []).map((e) => e.code);
}

function okConfig(
  ...args: Parameters<typeof priceConfiguration>
): Extract<ReturnType<typeof priceConfiguration>, { ok: true }> {
  const result = priceConfiguration(...args);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

describe("priceConfiguration — pricing", () => {
  it("adds standalone, linked and text prices to the base", () => {
    const r = okConfig(
      gloveDefinition(),
      sel({ chain: ["silver"], charms: ["moon"] }, { engraving: "Amy" }),
      { basePrice: BASE },
    );
    // Moon is the only charm → included (free). Silver 1500 + engraving 500.
    expect(r.addOnTotal).toBe(2000);
    expect(r.unitPrice).toBe(BASE + 2000);
  });

  it("waives the cheapest N picks, whatever order they were sent in", () => {
    const def = gloveDefinition();
    const a = okConfig(
      def,
      sel({ chain: ["silver"], charms: ["moon", "heart", "bee"] }),
      {
        basePrice: BASE,
      },
    );
    const b = okConfig(
      def,
      sel({ chain: ["silver"], charms: ["bee", "moon", "heart"] }),
      {
        basePrice: BASE,
      },
    );
    // heart 800 waived; moon 1200 + bee override 2000 charged.
    expect(a.addOnTotal).toBe(1500 + 1200 + 2000);
    expect(b.addOnTotal).toBe(a.addOnTotal);
    const charms = a.snapshot.groups.find((g) => g.groupId === "charms")!;
    expect(
      charms.selections!.map((s) => [s.valueId, s.included, s.price]),
    ).toEqual([
      ["heart", true, 0],
      ["moon", false, 1200],
      ["bee", false, 2000],
    ]);
  });

  it("breaks price ties by owner order", () => {
    const r = okConfig(
      gloveDefinition(),
      sel({ chain: ["silver"], charms: ["star", "heart"] }),
      {
        basePrice: BASE,
      },
    );
    const charms = r.snapshot.groups.find((g) => g.groupId === "charms")!;
    expect(
      charms.selections!.find((s) => s.valueId === "heart")!.included,
    ).toBe(true);
    expect(charms.selections!.find((s) => s.valueId === "star")!.included).toBe(
      false,
    );
    expect(r.addOnTotal).toBe(1500 + 800);
  });

  it("includes everything when includedCount exceeds the picks", () => {
    const def = definition([
      choiceGroup(
        "charms",
        [value("a", { priceDelta: 300 }), value("b", { priceDelta: 700 })],
        {
          maxSelections: 2,
          includedCount: 5,
        },
      ),
    ]);
    const r = okConfig(def, sel({ charms: ["a", "b"] }), { basePrice: BASE });
    expect(r.addOnTotal).toBe(0);
    expect(r.snapshot.groups[0]!.selections!.every((s) => s.included)).toBe(
      true,
    );
  });

  it("uses a linked value's override, else its target's price", () => {
    const def = definition([
      choiceGroup(
        "charms",
        [
          value("inherit", { priceDelta: 99, linked: linked({ price: 3500 }) }),
          value("override", {
            linked: linked({ productId: "p2", price: 3500 }),
            priceOverride: 1000,
          }),
        ],
        { maxSelections: 2 },
      ),
    ]);
    expect(
      okConfig(def, sel({ charms: ["inherit"] }), { basePrice: 0 }).addOnTotal,
    ).toBe(3500);
    expect(
      okConfig(def, sel({ charms: ["override"] }), { basePrice: 0 }).addOnTotal,
    ).toBe(1000);
  });

  it("never returns a negative unit price or charges a negative add-on", () => {
    const def = definition([
      choiceGroup("x", [value("a", { priceDelta: -5000 })]),
    ]);
    const r = okConfig(def, sel({ x: ["a"] }), { basePrice: 1000 });
    expect(r.addOnTotal).toBe(0);
    expect(r.unitPrice).toBe(1000);
    expect(okConfig(def, sel(), { basePrice: -50 }).unitPrice).toBe(0);
  });

  it("prices an empty selection on an all-optional definition at base", () => {
    const def = definition([
      choiceGroup("x", [value("a", { priceDelta: 100 })]),
    ]);
    const r = okConfig(def, undefined, { basePrice: 1234 });
    expect(r.unitPrice).toBe(1234);
    expect(r.snapshot.groups).toEqual([]);
    expect(r.components).toEqual([]);
    expect(r.snapshot.summary).toBe("");
  });
});

describe("priceConfiguration — counts and ids", () => {
  it("fires required on a group the selection never mentions", () => {
    const r = priceConfiguration(
      gloveDefinition(),
      sel({ charms: ["heart"] }),
      { basePrice: BASE },
    );
    expect(codes(r)).toEqual(["required"]);
    expect(r.ok ? null : r.errors[0]).toMatchObject({
      groupId: "chain",
      message: "Choose your chain",
    });
  });

  it("enforces the maximum with a shopper message", () => {
    const r = priceConfiguration(
      gloveDefinition(),
      sel({ chain: ["silver"], charms: ["heart", "star", "moon", "bee"] }),
      { basePrice: BASE },
    );
    expect(r.ok ? [] : r.errors).toEqual([
      { code: "too-many", groupId: "charms", message: "Choose up to 3 charms" },
    ]);
    const one = priceConfiguration(
      gloveDefinition(),
      sel({ chain: ["silver", "gold"] }),
      {
        basePrice: BASE,
      },
    );
    expect(one.ok ? [] : one.errors.map((e) => e.message)).toEqual([
      "Choose just one chain",
    ]);
  });

  it("applies the minimum to an optional group only once something is picked", () => {
    const def = definition([
      choiceGroup("charms", [value("a"), value("b"), value("c")], {
        minSelections: 2,
        maxSelections: 3,
      }),
    ]);
    expect(priceConfiguration(def, sel(), { basePrice: 0 }).ok).toBe(true);
    const r = priceConfiguration(def, sel({ charms: ["a"] }), { basePrice: 0 });
    expect(r.ok ? [] : r.errors.map((e) => [e.code, e.message])).toEqual([
      ["too-few", "Choose at least 2 charms"],
    ]);
    const required = definition([
      choiceGroup("charms", [value("a"), value("b"), value("c")], {
        required: true,
        minSelections: 2,
        maxSelections: 3,
      }),
    ]);
    expect(
      codes(priceConfiguration(required, sel(), { basePrice: 0 })),
    ).toEqual(["required"]);
    expect(
      codes(
        priceConfiguration(required, sel({ charms: ["a"] }), { basePrice: 0 }),
      ),
    ).toEqual(["too-few"]);
  });

  it("treats required with minSelections 0 as at least one", () => {
    const def = definition([
      choiceGroup("x", [value("a")], { required: true, minSelections: 0 }),
    ]);
    expect(
      codes(priceConfiguration(def, sel({ x: [] }), { basePrice: 0 })),
    ).toEqual(["required"]);
  });

  it("rejects repeated value ids", () => {
    const r = priceConfiguration(
      gloveDefinition(),
      sel({ chain: ["silver"], charms: ["heart", "heart"] }),
      {
        basePrice: BASE,
      },
    );
    expect(codes(r)).toEqual(["duplicate-value"]);
  });

  it("rejects unknown groups and values, including values from another group", () => {
    const r = priceConfiguration(
      gloveDefinition(),
      sel({ chain: ["silver"], nope: ["x"], charms: ["silver", "zzz"] }),
      { basePrice: BASE },
    );
    expect(
      r.ok ? [] : r.errors.map((e) => [e.code, e.groupId, e.valueId]),
    ).toEqual([
      ["unknown-group", "nope", undefined],
      ["unknown-value", "charms", "silver"],
      ["unknown-value", "charms", "zzz"],
    ]);
  });

  it("rejects text for a choice group and choices for a text group", () => {
    const r = priceConfiguration(
      gloveDefinition(),
      sel({ chain: ["silver"], engraving: ["heart"] }, { charms: "hi" }),
      { basePrice: BASE },
    );
    expect(codes(r)).toEqual(["invalid-selection", "invalid-selection"]);
  });

  it("rejects a group listed twice", () => {
    const r = priceConfiguration(
      gloveDefinition(),
      {
        choices: [
          { groupId: "chain", valueIds: ["silver"] },
          { groupId: "chain", valueIds: ["gold"] },
        ],
        texts: [],
      },
      { basePrice: BASE },
    );
    expect(codes(r)).toEqual(["invalid-selection"]);
  });
});

describe("priceConfiguration — availability and stock", () => {
  it("rejects a value the owner switched off", () => {
    const def = gloveDefinition();
    def.groups[1]!.values[0]!.available = false;
    const r = priceConfiguration(
      def,
      sel({ chain: ["silver"], charms: ["heart"] }),
      { basePrice: BASE },
    );
    expect(r.ok ? [] : r.errors).toEqual([
      {
        code: "value-unavailable",
        groupId: "charms",
        valueId: "heart",
        message: "Heart isn't available right now",
      },
    ]);
  });

  it("rejects a value whose linked target is unavailable", () => {
    const def = gloveDefinition();
    def.groups[0]!.values[1]!.linked!.available = false;
    expect(
      codes(
        priceConfiguration(def, sel({ chain: ["gold"] }), { basePrice: BASE }),
      ),
    ).toEqual(["value-unavailable"]);
  });

  it("checks linked stock against the line quantity", () => {
    const def = gloveDefinition(); // gold chain stock 5
    expect(
      priceConfiguration(def, sel({ chain: ["gold"] }), {
        basePrice: BASE,
        lineQty: 5,
      }).ok,
    ).toBe(true);
    const r = priceConfiguration(def, sel({ chain: ["gold"] }), {
      basePrice: BASE,
      lineQty: 6,
    });
    expect(r.ok ? [] : r.errors).toEqual([
      {
        code: "value-out-of-stock",
        groupId: "chain",
        valueId: "gold",
        message: "Only 5 left of Gold",
      },
    ]);
  });

  it("consumes stock for an included (free) linked pick too", () => {
    const def = gloveDefinition(); // bee stock 2, cheapest-1 included
    const r = priceConfiguration(
      def,
      sel({ chain: ["silver"], charms: ["bee"] }),
      {
        basePrice: BASE,
        lineQty: 3,
      },
    );
    expect(codes(r)).toEqual(["value-out-of-stock"]);
  });

  it("reports sold out at zero stock", () => {
    const def = gloveDefinition();
    def.groups[0]!.values[1]!.linked!.stock = 0;
    const r = priceConfiguration(def, sel({ chain: ["gold"] }), {
      basePrice: BASE,
    });
    expect(r.ok ? [] : r.errors.map((e) => e.message)).toEqual([
      "Gold is sold out",
    ]);
  });

  it("pools stock for two values linked to the same target", () => {
    const target = () => linked({ productId: "p", variantId: "v", stock: 3 });
    const def = definition([
      choiceGroup("front", [value("a", { linked: target() })]),
      choiceGroup("back", [value("b", { linked: target() })]),
    ]);
    expect(
      priceConfiguration(def, sel({ front: ["a"], back: ["b"] }), {
        basePrice: 0,
        lineQty: 1,
      }).ok,
    ).toBe(true);
    const r = priceConfiguration(def, sel({ front: ["a"], back: ["b"] }), {
      basePrice: 0,
      lineQty: 2,
    });
    expect(
      r.ok ? [] : r.errors.map((e) => [e.code, e.groupId, e.valueId]),
    ).toEqual([
      ["value-out-of-stock", "front", "a"],
      ["value-out-of-stock", "back", "b"],
    ]);
  });

  it("treats untracked linked stock as unlimited", () => {
    const def = definition([
      choiceGroup("x", [value("a", { linked: linked({ stock: null }) })]),
    ]);
    expect(
      priceConfiguration(def, sel({ x: ["a"] }), { basePrice: 0, lineQty: 500 })
        .ok,
    ).toBe(true);
  });
});

describe("priceConfiguration — text", () => {
  it("cleans control characters and keeps emoji", () => {
    const r = okConfig(
      gloveDefinition(),
      sel({ chain: ["silver"] }, { engraving: "  A\u0000m\u202ey\n👩‍👩‍👧 " }),
      {
        basePrice: BASE,
      },
    );
    expect(r.snapshot.groups.find((g) => g.kind === "text")!.text).toBe(
      "Amy 👩‍👩‍👧",
    );
  });

  it("charges the text price only when filled", () => {
    const def = gloveDefinition();
    const blank = okConfig(
      def,
      sel({ chain: ["silver"] }, { engraving: "   " }),
      { basePrice: BASE },
    );
    expect(blank.addOnTotal).toBe(1500);
    expect(blank.snapshot.groups.some((g) => g.kind === "text")).toBe(false);
    const filled = okConfig(
      def,
      sel({ chain: ["silver"] }, { engraving: "Amy" }),
      { basePrice: BASE },
    );
    expect(filled.addOnTotal).toBe(2000);
    expect(filled.snapshot.groups.find((g) => g.kind === "text")).toMatchObject(
      { text: "Amy", price: 500 },
    );
  });

  it("enforces the owner's max length in code points", () => {
    const def = gloveDefinition(); // maxLength 12
    expect(
      priceConfiguration(
        def,
        sel({ chain: ["silver"] }, { engraving: "😀".repeat(12) }),
        { basePrice: 0 },
      ).ok,
    ).toBe(true);
    const r = priceConfiguration(
      def,
      sel({ chain: ["silver"] }, { engraving: "x".repeat(13) }),
      { basePrice: 0 },
    );
    expect(r.ok ? [] : r.errors.map((e) => [e.code, e.message])).toEqual([
      ["text-too-long", "Engraving can be up to 12 characters"],
    ]);
  });

  it("caps the owner's max length at 500", () => {
    const def = definition([textGroup("note", { maxLength: 5000 })]);
    expect(
      priceConfiguration(def, sel({}, { note: "x".repeat(500) }), {
        basePrice: 0,
      }).ok,
    ).toBe(true);
    expect(
      codes(
        priceConfiguration(def, sel({}, { note: "x".repeat(501) }), {
          basePrice: 0,
        }),
      ),
    ).toEqual(["text-too-long"]);
    const unset = definition([textGroup("note", { maxLength: null })]);
    expect(
      codes(
        priceConfiguration(unset, sel({}, { note: "x".repeat(501) }), {
          basePrice: 0,
        }),
      ),
    ).toEqual(["text-too-long"]);
  });

  it("requires non-empty text after cleaning", () => {
    const def = definition([textGroup("engraving", { required: true })]);
    const r = priceConfiguration(def, sel({}, { engraving: " \u0000 " }), {
      basePrice: 0,
    });
    expect(r.ok ? [] : r.errors.map((e) => [e.code, e.message])).toEqual([
      ["required", "Enter your engraving"],
    ]);
  });
});

describe("priceConfiguration — snapshot", () => {
  it("records groups in attachment order, selections in owner order, and components", () => {
    const r = okConfig(
      gloveDefinition(),
      sel({ charms: ["bee", "heart"], chain: ["gold"] }, { engraving: "Amy" }),
      { basePrice: BASE },
    );
    expect(r.snapshot.v).toBe(1);
    expect(r.snapshot.basePrice).toBe(BASE);
    expect(r.snapshot.groups.map((g) => g.groupId)).toEqual([
      "chain",
      "charms",
      "engraving",
    ]);
    expect(r.snapshot.groups[0]!.selections![0]).toEqual({
      valueId: "gold",
      label: "Gold",
      imageUrl: null,
      swatchColor: null,
      price: 2500,
      included: false,
      linkedProductId: "prod-chain",
      linkedVariantId: "var-gold",
      sku: "CH-G",
    });
    expect(r.components).toEqual([
      {
        productId: "prod-chain",
        variantId: "var-gold",
        qtyPerUnit: 1,
        name: "Chain — Gold",
      },
      {
        productId: "prod-bee",
        variantId: null,
        qtyPerUnit: 1,
        name: "Bee charm",
      },
    ]);
    expect(r.snapshot.components).toEqual(r.components);
    expect(r.snapshot.summary).toBe(
      "Chain: Gold · Charms: Heart, Bee · Engraving: “Amy”",
    );
  });

  it("truncates the summary to 480 characters with an ellipsis", () => {
    const long = "L".repeat(300);
    const summary = buildSummary([
      { groupId: "a", name: "A", kind: "text", text: long },
      { groupId: "b", name: "B", kind: "text", text: long },
    ]);
    expect(Array.from(summary)).toHaveLength(480);
    expect(summary.endsWith("…")).toBe(true);
  });
});

describe("evaluateSelection (client, public definition)", () => {
  it("matches the server's price", () => {
    const def = gloveDefinition();
    const selection = sel(
      { chain: ["gold"], charms: ["moon", "heart", "bee"] },
      { engraving: "Amy" },
    );
    const server = okConfig(def, selection, { basePrice: BASE });
    const client = evaluateSelection(
      toPublicCustomizerDefinition(def),
      selection,
      { basePrice: BASE },
    );
    expect(client).toEqual({
      ok: true,
      unitPrice: server.unitPrice,
      addOnTotal: server.addOnTotal,
    });
  });

  it("flags a sold-out value as unavailable and low stock as out of stock", () => {
    const def = gloveDefinition();
    const pub = toPublicCustomizerDefinition(def);
    expect(
      codes(
        evaluateSelection(pub, sel({ chain: ["gold"] }), {
          basePrice: 0,
          lineQty: 6,
        }),
      ),
    ).toEqual(["value-out-of-stock"]);
    def.groups[0]!.values[1]!.linked!.stock = 0;
    expect(
      codes(
        evaluateSelection(
          toPublicCustomizerDefinition(def),
          sel({ chain: ["gold"] }),
          { basePrice: 0 },
        ),
      ),
    ).toEqual(["value-unavailable"]);
  });

  it("does not claim a shortage when stock is above the public cap", () => {
    const def = definition([
      choiceGroup("x", [value("a", { linked: linked({ stock: 150 }) })]),
    ]);
    const pub = toPublicCustomizerDefinition(def);
    expect(
      evaluateSelection(pub, sel({ x: ["a"] }), { basePrice: 0, lineQty: 120 })
        .ok,
    ).toBe(true);
    expect(
      priceConfiguration(def, sel({ x: ["a"] }), { basePrice: 0, lineQty: 120 })
        .ok,
    ).toBe(true);
    expect(
      priceConfiguration(def, sel({ x: ["a"] }), { basePrice: 0, lineQty: 151 })
        .ok,
    ).toBe(false);
  });
});

describe("includedValueIds", () => {
  const group = toPublicCustomizerDefinition(
    definition([
      choiceGroup(
        "charms",
        [
          value("star", { priceDelta: 500 }),
          value("heart", { priceDelta: 300 }),
          value("moon", { priceDelta: 300 }),
        ],
        { includedCount: 1, maxSelections: 3 },
      ),
    ]),
  ).groups[0]!;

  it("marks the cheapest pick (ties by owner order) — the evaluator's rule", () => {
    expect([...includedValueIds(group, ["star", "moon", "heart"])]).toEqual([
      "heart",
    ]);
    const priced = evaluateSelection(
      { productId: "p", groups: [group] },
      sel({ charms: ["star", "moon", "heart"] }),
      { basePrice: BASE },
    );
    expect(priced).toMatchObject({ ok: true, addOnTotal: 800 });
  });

  it("ignores unknown ids and repeats", () => {
    expect([...includedValueIds(group, ["nope", "star", "star"])]).toEqual([
      "star",
    ]);
  });
});
