import type { Image, Product, ProductVariant } from "generated/prisma";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";

import { parseWooCommerceCSV } from "~/lib/woocommerce/csv-parser";

import { exportToWooCommerceCSV } from "./csv-exporter";

type ExportProduct = Parameters<typeof exportToWooCommerceCSV>[0][number];

function makeProduct(overrides: Partial<Product> = {}): ExportProduct {
  return {
    id: "prod_1",
    name: "Candle",
    sku: "CND-1",
    description: "Soy candle",
    price: 2000,
    compareAtPrice: null,
    weight: null,
    weightUnit: "lb",
    published: true,
    featured: false,
    inventoryQty: 5,
    trackInventory: true,
    allowBackorders: false,
    ...overrides,
    images: [] as Image[],
    variants: [] as ProductVariant[],
  } as ExportProduct;
}

function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: "var_1",
    name: "Large",
    sku: "CND-1-L",
    price: null,
    compareAtPrice: null,
    inventoryQty: 3,
    options: { Size: "Large" },
    imageUrl: null,
    productId: "prod_1",
    ...overrides,
  } as ProductVariant;
}

function exportRows(products: ExportProduct[]): Record<string, string>[] {
  const csv = exportToWooCommerceCSV(products);
  return Papa.parse<Record<string, string>>(csv, { header: true }).data;
}

describe("exportToWooCommerceCSV prices", () => {
  it("exports a product that is not on sale as Regular price only", () => {
    const [row] = exportRows([makeProduct({ price: 2000 })]);
    expect(row!["Regular price"]).toBe("20.00");
    expect(row!["Sale price"]).toBe("");
  });

  it("exports a product on sale as Regular = original, Sale = selling price", () => {
    const [row] = exportRows([
      makeProduct({ price: 1500, compareAtPrice: 2000 }),
    ]);
    expect(row!["Regular price"]).toBe("20.00");
    expect(row!["Sale price"]).toBe("15.00");
  });

  it("ignores a compareAtPrice that is not above the price", () => {
    const [row] = exportRows([
      makeProduct({ price: 2000, compareAtPrice: 2000 }),
    ]);
    expect(row!["Regular price"]).toBe("20.00");
    expect(row!["Sale price"]).toBe("");
  });

  it("exports a variant on sale as Regular = original, Sale = selling price", () => {
    const product = makeProduct({ price: 2000 });
    product.variants = [
      makeVariant({ price: 2500, compareAtPrice: 3000 }),
      makeVariant({
        id: "var_2",
        name: "Small",
        options: { Size: "Small" },
        price: null,
        compareAtPrice: null,
      }),
    ];
    const [, onSale, notOnSale] = exportRows([product]);
    expect(onSale!.Type).toBe("variation");
    expect(onSale!["Regular price"]).toBe("30.00");
    expect(onSale!["Sale price"]).toBe("25.00");
    // Falls back to the product price, not on sale.
    expect(notOnSale!["Regular price"]).toBe("20.00");
    expect(notOnSale!["Sale price"]).toBe("");
  });

  it("round-trips sale and regular prices through the WooCommerce importer", async () => {
    const product = makeProduct({ price: 1500, compareAtPrice: 2000 });
    const plain = makeProduct({ id: "prod_2", name: "Mug", price: 1200 });
    const parsed = await parseWooCommerceCSV(
      exportToWooCommerceCSV([product, plain]),
    );
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ price: 1500, compareAtPrice: 2000 });
    expect(parsed[1]).toMatchObject({ price: 1200, compareAtPrice: null });
  });
});

describe("exportToWooCommerceCSV weights", () => {
  it("converts kg to grams", () => {
    const [row] = exportRows([makeProduct({ weight: 1.25, weightUnit: "kg" })]);
    expect(row!["Weight (g)"]).toBe("1250");
  });

  it("converts lb to grams", () => {
    const [row] = exportRows([makeProduct({ weight: 2, weightUnit: "lb" })]);
    expect(row!["Weight (g)"]).toBe("907");
  });

  it("treats a missing unit as lb", () => {
    const [row] = exportRows([makeProduct({ weight: 1, weightUnit: null })]);
    expect(row!["Weight (g)"]).toBe("454");
  });

  it("leaves the column blank when there is no weight", () => {
    const [row] = exportRows([makeProduct({ weight: null })]);
    expect(row!["Weight (g)"]).toBe("");
  });

  it("puts the product weight on the variable parent row", () => {
    const product = makeProduct({ weight: 1, weightUnit: "kg" });
    product.variants = [makeVariant()];
    const [parent] = exportRows([product]);
    expect(parent!.Type).toBe("variable");
    expect(parent!["Weight (g)"]).toBe("1000");
  });

  it("round-trips an lb weight through the importer as kg", async () => {
    const [parsed] = await parseWooCommerceCSV(
      exportToWooCommerceCSV([makeProduct({ weight: 2, weightUnit: "lb" })]),
    );
    // Importer stores kg; 2 lb ≈ 0.907 kg.
    expect(parsed!.weight).toBeCloseTo(0.907, 3);
  });
});

describe("export → import round trip", () => {
  it("keeps simple products and variations, whose ID column is blank", async () => {
    const simple = makeProduct({ id: "prod_s", name: "Mug", sku: "MUG" });
    const variable = makeProduct({ id: "prod_v", name: "Shirt", sku: "SH" });
    variable.variants = [
      makeVariant({ id: "v1", sku: "SH-S", options: { Size: "S" } }),
      makeVariant({
        id: "v2",
        sku: "SH-M",
        options: { Size: "M" },
        price: 1800,
        compareAtPrice: 2400,
      }),
    ];

    const parsed = await parseWooCommerceCSV(
      exportToWooCommerceCSV([simple, variable]),
    );

    expect(parsed.map((p) => [p.type, p.name])).toEqual([
      ["simple", "Mug"],
      ["variable", "Shirt"],
      ["variation", "Shirt - Large"],
      ["variation", "Shirt - Large"],
    ]);
    // Blank IDs get unique placeholders; variations still find their parent.
    const ids = parsed.map((p) => p.wooId);
    expect(new Set(ids).size).toBe(ids.length);
    const parent = parsed[1]!;
    expect(parent.wooId).toBe("prod_v");
    expect(parsed.slice(2).every((v) => v.parentId === parent.wooId)).toBe(
      true,
    );
    expect(parsed[3]).toMatchObject({
      sku: "SH-M",
      price: 1800,
      compareAtPrice: 2400,
      attributes: { Size: "M" },
    });
  });
});

describe("exportToWooCommerceCSV product videos", () => {
  const image = (
    id: string,
    url: string,
    sortOrder: number,
    mediaType: "IMAGE" | "VIDEO",
  ) => ({ id, url, sortOrder, mediaType, posterUrl: null }) as unknown as Image;

  it("lists photos only in the Images column (simple and variable)", () => {
    const simple = makeProduct();
    simple.images = [
      image("i2", "https://s.test/video-b.mp4", 1, "VIDEO"),
      image("i1", "https://s.test/image-a.jpg", 0, "IMAGE"),
      image("i3", "https://s.test/image-c.jpg", 2, "IMAGE"),
    ];
    const variable = makeProduct({ id: "prod_v", name: "Shirt" });
    variable.images = [
      image("i4", "https://s.test/image-d.jpg", 0, "IMAGE"),
      image("i5", "https://s.test/video-e.mp4", 1, "VIDEO"),
    ];
    variable.variants = [makeVariant({ productId: "prod_v" })];

    const rows = exportRows([simple, variable]);
    expect(rows[0]!.Images).toBe(
      "https://s.test/image-a.jpg, https://s.test/image-c.jpg",
    );
    expect(rows[1]!.Images).toBe("https://s.test/image-d.jpg");
  });
});
