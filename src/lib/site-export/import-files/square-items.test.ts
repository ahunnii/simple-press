import { describe, expect, it } from "vitest";

import { parseCsv, product, sampleCatalog, variant } from "./fixtures";
import { buildSquareItemsCsv, SQUARE_HEADERS } from "./square-items";

describe("buildSquareItemsCsv", () => {
  it("emits the header order with no location-specific columns", () => {
    const { headers } = parseCsv(buildSquareItemsCsv(sampleCatalog()).csv);
    expect(headers).toEqual([...SQUARE_HEADERS]);
    expect(headers.slice(0, 3)).toEqual([
      "Token",
      "Item Name",
      "Variation Name",
    ]);
    expect(headers.some((h) => /\[.*\]/.test(h))).toBe(false);
  });

  it("gives a single-variant product one Regular variation", () => {
    const { rows } = parseCsv(
      buildSquareItemsCsv([product({ description: "<p>Hi <b>there</b></p>" })])
        .csv,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      Token: "",
      "Item Name": "Blue Mug",
      "Variation Name": "Regular",
      SKU: "MUG-1",
      Description: "Hi there",
      Price: "18.50",
      "Square Online Item Visibility": "Visible",
      "Item Type": "Physical good",
      Stockable: "N",
      "Option Name 1": "",
    });
  });

  it("repeats the item per variation with option pairs and escaped categories", () => {
    const { rows } = parseCsv(buildSquareItemsCsv([sampleCatalog()[1]!]).csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      "Item Name": "Tee",
      "Variation Name": "Small / Red",
      "Option Name 1": "Size",
      "Option Value 1": "Small",
      "Option Name 2": "Color",
      "Option Value 2": "Red",
      Categories: "Apparel, Sale\\, Spring",
      "Reporting Category": "Apparel",
      Stockable: "Y",
    });
    expect(rows[1]).toMatchObject({
      "Item Name": "Tee",
      "Variation Name": "Large / Red",
      Price: "22.50",
      SKU: "TEE-L-R",
    });
  });

  it("hides unpublished products and maps sale price", () => {
    const { rows } = parseCsv(
      buildSquareItemsCsv([
        sampleCatalog()[2]!,
        product({ id: "s", slug: "sale", compareAtCents: 2500 }),
      ]).csv,
    );
    expect(rows[0]!["Square Online Item Visibility"]).toBe("Hidden");
    expect(rows[1]).toMatchObject({
      Price: "25.00",
      "Online Sale Price": "18.50",
    });
  });

  it("notes option overflow and the photo/stock limitation", () => {
    const four = variant({
      options: ["A", "B", "C", "D"].map((n) => ({
        name: n,
        value: n.toLowerCase(),
      })),
    });
    const { notes } = buildSquareItemsCsv([product({ variants: [four] })]);
    const text = notes.map((n) => n.message).join("\n");
    expect(text).toMatch(/3 options per item/);
    expect(text).toMatch(/photos or stock/);
  });
});
