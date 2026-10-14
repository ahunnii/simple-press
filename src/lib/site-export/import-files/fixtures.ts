/** Shared test fixtures for the import-file builders. */
import Papa from "papaparse";

import type { ExportProduct, ExportProductVariant } from "./types";

export function product(overrides: Partial<ExportProduct> = {}): ExportProduct {
  return {
    id: "p1",
    name: "Blue Mug",
    slug: "blue-mug",
    description: "A sturdy mug.\n\nDishwasher safe.",
    metaTitle: null,
    metaDescription: null,
    priceCents: 1850,
    compareAtCents: null,
    costCents: null,
    sku: "MUG-1",
    barcode: null,
    published: true,
    trackInventory: false,
    inventoryQty: 0,
    allowBackorders: false,
    weight: null,
    weightUnit: "lb",
    images: [],
    collections: [],
    variants: [],
    ...overrides,
  };
}

export function variant(
  overrides: Partial<ExportProductVariant> = {},
): ExportProductVariant {
  return {
    name: "Small / Red",
    sku: null,
    priceCents: 1850,
    compareAtCents: null,
    inventoryQty: 0,
    options: [
      { name: "Size", value: "Small" },
      { name: "Color", value: "Red" },
    ],
    imageUrl: null,
    ...overrides,
  };
}

/** The 3 sample products most tests share: simple, multi-option, hidden. */
export function sampleCatalog(): ExportProduct[] {
  return [
    product(),
    product({
      id: "p2",
      name: "Tee",
      slug: "tee",
      sku: null,
      priceCents: 2000,
      images: [
        { url: "https://cdn.example.com/a.jpg", altText: "Front" },
        { url: "https://cdn.example.com/b.jpg", altText: null },
        { url: "https://cdn.example.com/c.jpg", altText: null },
      ],
      collections: ["Apparel", "Sale, Spring"],
      trackInventory: true,
      variants: [
        variant({ name: "Small / Red", sku: "TEE-S-R", inventoryQty: 4 }),
        variant({
          name: "Large / Red",
          sku: "TEE-L-R",
          priceCents: 2250,
          inventoryQty: 0,
          options: [
            { name: "Size", value: "Large" },
            { name: "Color", value: "Red" },
          ],
        }),
      ],
    }),
    product({
      id: "p3",
      name: "Hidden Hat",
      slug: "hidden-hat",
      published: false,
    }),
  ];
}

export function parseCsv(csv: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return { headers: parsed.meta.fields ?? [], rows: parsed.data };
}
