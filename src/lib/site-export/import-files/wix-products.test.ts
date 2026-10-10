import { describe, expect, it } from "vitest";

import { parseCsv, product, sampleCatalog, variant } from "./fixtures";
import { buildWixProductsCsv, WIX_HEADERS } from "./wix-products";

describe("buildWixProductsCsv", () => {
  it("emits the template header order", () => {
    const { headers } = parseCsv(buildWixProductsCsv(sampleCatalog()).csv);
    expect(headers).toEqual([...WIX_HEADERS]);
    expect(headers.slice(0, 6)).toEqual([
      "handleId",
      "fieldType",
      "name",
      "description",
      "productImageUrl",
      "collection",
    ]);
    expect(headers).toContain("productOptionName6");
    expect(headers).toContain("productOptionDescription6");
  });

  it("writes a simple product as one Product row", () => {
    const { rows } = parseCsv(buildWixProductsCsv([product()]).csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      handleId: "blue-mug",
      fieldType: "Product",
      name: "Blue Mug",
      price: "18.50",
      visible: "TRUE",
      inventory: "InStock",
      sku: "MUG-1",
    });
  });

  it("writes Product + Variant rows with surcharge and per-option choices", () => {
    const { rows } = parseCsv(buildWixProductsCsv([sampleCatalog()[1]!]).csv);
    expect(rows.map((r) => r.fieldType)).toEqual([
      "Product",
      "Variant",
      "Variant",
    ]);
    const [prod, v1, v2] = rows;
    expect(prod).toMatchObject({
      price: "18.50", // lowest variant price
      productOptionName1: "Size",
      productOptionType1: "DROP_DOWN",
      productOptionDescription1: "Small;Large",
      productOptionName2: "Color",
      productOptionDescription2: "Red",
      productImageUrl:
        "https://cdn.example.com/a.jpg;https://cdn.example.com/b.jpg;https://cdn.example.com/c.jpg",
      collection: "Apparel;Sale, Spring",
      inventory: "",
    });
    expect(v1).toMatchObject({
      handleId: "tee",
      name: "",
      price: "",
      surcharge: "0.00",
      productOptionDescription1: "Small",
      productOptionDescription2: "Red",
      inventory: "4",
      sku: "TEE-S-R",
    });
    expect(v2).toMatchObject({
      surcharge: "4.00",
      productOptionDescription1: "Large",
      inventory: "0",
    });
  });

  it("hides unpublished products and applies sale price as a discount", () => {
    const { rows } = parseCsv(
      buildWixProductsCsv([
        sampleCatalog()[2]!,
        product({ id: "s", slug: "sale", compareAtCents: 2500 }),
      ]).csv,
    );
    expect(rows[0]!.visible).toBe("FALSE");
    expect(rows[1]).toMatchObject({
      price: "25.00",
      discountMode: "AMOUNT",
      discountValue: "6.50",
    });
  });

  it("notes option overflow (>6), long choices and extra images", () => {
    const options = Array.from({ length: 7 }, (_, i) => ({
      name: `O${i + 1}`,
      value: i === 0 ? "A very long option choice indeed" : `v${i + 1}`,
    }));
    const { csv, notes } = buildWixProductsCsv([
      product({
        variants: [variant({ options })],
        images: Array.from({ length: 16 }, (_, i) => ({
          url: `https://x.test/${i}.jpg`,
          altText: null,
        })),
      }),
    ]);
    const { rows } = parseCsv(csv);
    expect(rows[0]!.productOptionName6).toBe("O6 / O7");
    expect(rows[1]!.productOptionDescription6).toBe("v6 / v7");
    expect(rows[0]!.productOptionDescription1).toBe("A very long option c");
    expect(rows[0]!.productImageUrl!.split(";")).toHaveLength(15);
    expect(notes.map((n) => n.message).join("\n")).toMatch(/6 product options/);
    expect(notes.map((n) => n.message).join("\n")).toMatch(/20 characters/);
    expect(notes.map((n) => n.message).join("\n")).toMatch(/15 images/);
  });
});
