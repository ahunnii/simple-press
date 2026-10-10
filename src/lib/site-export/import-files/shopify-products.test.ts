import { describe, expect, it } from "vitest";

import { parseCsv, product, sampleCatalog, variant } from "./fixtures";
import { buildShopifyProductsCsv, SHOPIFY_HEADERS } from "./shopify-products";

const ctx = { storeName: "Mug Shop" };

describe("buildShopifyProductsCsv", () => {
  it("emits the documented header order", () => {
    const { headers } = parseCsv(
      buildShopifyProductsCsv(sampleCatalog(), ctx).csv,
    );
    expect(headers).toEqual([...SHOPIFY_HEADERS]);
    expect(headers.slice(0, 3)).toEqual(["Title", "URL handle", "Description"]);
    expect(headers).toContain("Status");
  });

  it("writes a single-variant product with Shopify's Default Title option", () => {
    const { rows } = parseCsv(buildShopifyProductsCsv([product()], ctx).csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      Title: "Blue Mug",
      "URL handle": "blue-mug",
      Vendor: "Mug Shop",
      Price: "18.50",
      "Compare-at price": "",
      SKU: "MUG-1",
      "Option1 name": "Title",
      "Option1 value": "Default Title",
      Status: "active",
      "Published on online store": "true",
      "Inventory tracker": "",
      "Continue selling when out of stock": "deny",
    });
    expect(rows[0]!.Description).toBe(
      "<p>A sturdy mug.</p><p>Dishwasher safe.</p>",
    );
  });

  it("writes one row per variant with option names and prices", () => {
    const { rows } = parseCsv(
      buildShopifyProductsCsv([sampleCatalog()[1]!], ctx).csv,
    );
    // 2 variants, 3 images -> 2 variant rows + 1 image-only row
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      Title: "Tee",
      "Option1 name": "Size",
      "Option1 value": "Small",
      "Option2 name": "Color",
      "Option2 value": "Red",
      SKU: "TEE-S-R",
      "Inventory tracker": "shopify",
      "Inventory quantity": "4",
      Tags: "Apparel, Sale  Spring",
      Collection: "Apparel",
    });
    expect(rows[1]).toMatchObject({
      "URL handle": "tee",
      Title: "",
      "Option1 value": "Large",
      Price: "22.50",
      "Inventory quantity": "0",
    });
  });

  it("puts extra images on image-only rows with positions", () => {
    const { rows } = parseCsv(
      buildShopifyProductsCsv([sampleCatalog()[1]!], ctx).csv,
    );
    expect(rows.map((r) => r["Image position"])).toEqual(["1", "2", "3"]);
    expect(rows[0]!["Product image URL"]).toBe("https://cdn.example.com/a.jpg");
    expect(rows[0]!["Image alt text"]).toBe("Front");
    const imageOnly = rows[2]!;
    expect(imageOnly["URL handle"]).toBe("tee");
    expect(imageOnly["Product image URL"]).toBe(
      "https://cdn.example.com/c.jpg",
    );
    expect(imageOnly.Title).toBe("");
    expect(imageOnly.Price).toBe("");
    expect(imageOnly["Option1 name"]).toBe("");
  });

  it("marks unpublished products as draft", () => {
    const { rows } = parseCsv(
      buildShopifyProductsCsv([sampleCatalog()[2]!], ctx).csv,
    );
    expect(rows[0]).toMatchObject({
      Status: "draft",
      "Published on online store": "false",
    });
  });

  it("maps compare-at, weight and backorders", () => {
    const { rows } = parseCsv(
      buildShopifyProductsCsv(
        [
          product({
            compareAtCents: 2500,
            weight: 2,
            weightUnit: "kg",
            allowBackorders: true,
            trackInventory: true,
            inventoryQty: 7,
          }),
        ],
        ctx,
      ).csv,
    );
    expect(rows[0]).toMatchObject({
      Price: "18.50",
      "Compare-at price": "25.00",
      "Weight value (grams)": "2000",
      "Weight unit for display": "kg",
      "Continue selling when out of stock": "continue",
      "Inventory quantity": "7",
    });
  });

  it("merges options beyond 3 and notes it", () => {
    const four = variant({
      name: "x",
      options: [
        { name: "A", value: "a1" },
        { name: "B", value: "b1" },
        { name: "C", value: "c1" },
        { name: "D", value: "d1" },
      ],
    });
    const { csv, notes } = buildShopifyProductsCsv(
      [product({ variants: [four] })],
      ctx,
    );
    const { rows } = parseCsv(csv);
    expect(rows[0]).toMatchObject({
      "Option3 name": "C / D",
      "Option3 value": "c1 / d1",
    });
    expect(notes).toHaveLength(1);
    expect(notes[0]!.level).toBe("warn");
    expect(notes[0]!.message).toContain("Blue Mug");
  });

  it("never corrupts negative-looking values or URLs but neutralizes formulas", () => {
    const { rows } = parseCsv(
      buildShopifyProductsCsv(
        [
          product({
            name: "=HYPERLINK(1)",
            images: [{ url: "https://x.test/-a.jpg", altText: null }],
          }),
        ],
        ctx,
      ).csv,
    );
    expect(rows[0]!.Title).toBe("'=HYPERLINK(1)");
    expect(rows[0]!["Product image URL"]).toBe("https://x.test/-a.jpg");
    expect(rows[0]!.Price).toBe("18.50");
  });
});
