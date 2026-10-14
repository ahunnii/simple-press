import { describe, expect, it } from "vitest";

import { parseCsv, product, sampleCatalog, variant } from "./fixtures";
import {
  buildSquarespaceProductsCsv,
  SQUARESPACE_HEADERS,
} from "./squarespace-products";

describe("buildSquarespaceProductsCsv", () => {
  it("emits the documented header order", () => {
    const { headers } = parseCsv(
      buildSquarespaceProductsCsv(sampleCatalog()).csv,
    );
    expect(headers).toEqual([...SQUARESPACE_HEADERS]);
    expect(headers[0]).toBe("Product ID [Non Editable]");
    expect(headers.at(-1)).toBe("Hosted Image URLs");
  });

  it("writes a single-variant product on one row", () => {
    const { rows } = parseCsv(
      buildSquarespaceProductsCsv([
        product({ images: [{ url: "https://x.test/a b.jpg", altText: null }] }),
      ]).csv,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      "Product ID [Non Editable]": "",
      "Product Type": "Physical",
      "Product Page": "shop",
      "Product URL": "blue-mug",
      Title: "Blue Mug",
      SKU: "MUG-1",
      Price: "18.50",
      "On Sale": "No",
      Stock: "unlimited",
      Visible: "Yes",
      "Option Name 1": "",
      "Hosted Image URLs": "https://x.test/a%20b.jpg",
    });
  });

  it("puts product fields on the first row and option rows after it", () => {
    const { rows } = parseCsv(
      buildSquarespaceProductsCsv([sampleCatalog()[1]!], {
        productPage: "/store",
      }).csv,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      Title: "Tee",
      "Product Page": "store",
      "Option Name 1": "Size",
      "Option Value 1": "Small",
      "Option Name 2": "Color",
      "Option Value 2": "Red",
      Stock: "4",
      Categories: "/apparel,/sale-spring",
      Tags: "Apparel,Sale  Spring",
    });
    expect(rows[1]).toMatchObject({
      Title: "",
      "Product URL": "",
      Visible: "",
      "Hosted Image URLs": "",
      "Option Value 1": "Large",
      Price: "22.50",
      SKU: "TEE-L-R",
    });
  });

  it("marks hidden products and sale prices", () => {
    const { rows } = parseCsv(
      buildSquarespaceProductsCsv([
        sampleCatalog()[2]!,
        product({ id: "s", slug: "sale", compareAtCents: 2500 }),
      ]).csv,
    );
    expect(rows[0]!.Visible).toBe("No");
    expect(rows[1]).toMatchObject({
      Price: "25.00",
      "Sale Price": "18.50",
      "On Sale": "Yes",
    });
  });

  it("notes option overflow and unsupported image types", () => {
    const four = variant({
      options: ["A", "B", "C", "D"].map((n) => ({
        name: n,
        value: n.toLowerCase(),
      })),
    });
    const { csv, notes } = buildSquarespaceProductsCsv([
      product({
        variants: [four],
        images: [{ url: "https://x.test/a.webp", altText: null }],
      }),
    ]);
    const { rows } = parseCsv(csv);
    expect(rows[0]!["Option Name 3"]).toBe("C / D");
    const text = notes.map((n) => n.message).join("\n");
    expect(text).toMatch(/3 product options/);
    expect(text).toMatch(/\.jpg, \.png and \.gif/);
  });
});
