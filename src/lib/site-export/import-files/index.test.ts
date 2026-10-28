import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseCsv } from "./fixtures";
import { absoluteUrl, buildImportFiles } from "./index";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("~/server/db", () => ({ db: { product: { findMany } } }));

const business = {
  id: "b1",
  name: "Mug Shop",
  slug: "mug-shop",
  templateId: "default",
  siteUrl: "https://mugs.example.com",
  supportEmail: null,
  customDomain: null,
  exportedAt: new Date("2026-10-09T00:00:00Z"),
};

function dbProduct(over: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "Tee",
    slug: "tee",
    excerpt: null,
    description: "Soft tee",
    metaTitle: null,
    metaDescription: null,
    price: 2000,
    compareAtPrice: null,
    cost: null,
    sku: null,
    barcode: null,
    published: true,
    trackInventory: false,
    inventoryQty: 0,
    allowBackorders: false,
    weight: null,
    weightUnit: "lb",
    images: [{ url: "/images/tee.jpg", altText: null }],
    collectionProducts: [{ collection: { name: "Apparel" } }],
    variants: [
      {
        name: "Small",
        sku: "T-S",
        price: 0,
        compareAtPrice: null,
        inventoryQty: 3,
        options: { size: "Small" },
        imageUrl: null,
      },
      {
        name: "Large",
        sku: "T-L",
        price: 2400,
        compareAtPrice: null,
        inventoryQty: 1,
        options: { size: "Large" },
        imageUrl: null,
      },
    ],
    ...over,
  };
}

describe("absoluteUrl", () => {
  it("leaves absolute URLs and resolves relative ones", () => {
    expect(absoluteUrl("https://a.test/x.jpg", "https://s.test")).toBe(
      "https://a.test/x.jpg",
    );
    expect(absoluteUrl("/images/x.jpg", "https://s.test/")).toBe(
      "https://s.test/images/x.jpg",
    );
    expect(absoluteUrl("//a.test/x.jpg", "https://s.test")).toBe(
      "https://a.test/x.jpg",
    );
  });
});

describe("buildImportFiles", () => {
  beforeEach(() => findMany.mockReset());

  it("skips all files with an info note when there are no products", async () => {
    findMany.mockResolvedValue([]);
    const out = await buildImportFiles("b1", business);
    expect(out.files).toEqual([]);
    expect(out.notes).toHaveLength(1);
    expect(out.notes[0]!.level).toBe("info");
  });

  it("builds the four files and inherits variant prices", async () => {
    findMany.mockResolvedValue([dbProduct()]);
    const out = await buildImportFiles("b1", business);
    expect(out.files.map((f) => f.path)).toEqual([
      "Import files/Shopify/products.csv",
      "Import files/Wix/products.csv",
      "Import files/Squarespace/products.csv",
      "Import files/Square/items.csv",
    ]);
    const shopify = parseCsv(String(out.files[0]!.contents)).rows;
    expect(shopify[0]).toMatchObject({
      Vendor: "Mug Shop",
      Price: "20.00", // variant price 0 inherits the product price
      "Option1 name": "Size",
      "Product image URL": "https://mugs.example.com/images/tee.jpg",
    });
    expect(shopify[1]!.Price).toBe("24.00");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: "b1" } }),
    );
  });

  it("leaves product videos out of the files and adds a note", async () => {
    findMany.mockResolvedValue([
      dbProduct({
        images: [
          { url: "/images/tee.jpg", altText: null, mediaType: "IMAGE" },
          { url: "/images/tee.mp4", altText: null, mediaType: "VIDEO" },
        ],
      }),
    ]);
    const out = await buildImportFiles("b1", business);
    for (const f of out.files) {
      expect(String(f.contents)).not.toContain("tee.mp4");
    }
    expect(out.files.some((f) => String(f.contents).includes("tee.jpg"))).toBe(
      true,
    );
    expect(out.notes.some((n) => /videos/i.test(n.message))).toBe(true);
  });
});
