/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Papa from "papaparse";

export type WooCommerceProduct = {
  ID: string;
  Type: string;
  SKU: string;
  Name: string;
  Published: string;
  "Is featured?": string;
  Description: string;
  "Short description": string;
  "Regular price": string;
  "Sale price": string;
  Categories: string;
  Tags: string;
  "In stock?": string;
  Stock: string;
  "Weight (g)": string;
  Images: string;
  Parent: string;

  // Attributes (up to 4)
  "Attribute 1 name": string;
  "Attribute 1 value(s)": string;
  "Attribute 2 name": string;
  "Attribute 2 value(s)": string;
  "Attribute 3 name": string;
  "Attribute 3 value(s)": string;
  "Attribute 4 name": string;
  "Attribute 4 value(s)": string;
};

export type ParsedProduct = {
  wooId: string;
  type: "simple" | "variable" | "variation";

  name: string;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;

  price: number;
  compareAtPrice: number | null;

  trackInventory: boolean;
  inventoryQty: number;

  published: boolean;
  featured: boolean;

  categories: string[];
  tags: string[];

  weight: number | null;
  images: string[];

  // For variations
  parentId: string | null;
  variantName: string | null;
  attributes: Record<string, string>; // { Color: "Black", Size: "M" }

  isValid: boolean;
  errors: string[];
  warnings: string[];
};

export async function parseWooCommerceCSV(
  fileContent: string,
): Promise<ParsedProduct[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<WooCommerceProduct>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Remove BOM and whitespace
      complete: (results) => {
        const parsed = results.data
          .filter((row) => row.ID && row.Type) // Skip empty rows
          .map(mapWooCommerceProduct);
        resolve(parsed);
      },
      error: (error: unknown) => {
        reject(error instanceof Error ? error : new Error("Unknown error"));
      },
    });
  });
}

function mapWooCommerceProduct(row: WooCommerceProduct): ParsedProduct {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse price (convert dollars to cents)
  const regularPrice = parseFloat(row["Regular price"] || "0");
  const salePrice = parseFloat(row["Sale price"] || "0");

  const price = Math.round((salePrice || regularPrice) * 100);
  const compareAtPrice =
    salePrice && regularPrice > salePrice
      ? Math.round(regularPrice * 100)
      : null;

  // Validate
  if (!row.Name || row.Name.trim() === "") {
    errors.push("Product name is required");
  }

  if (price <= 0 && row.Type !== "variable") {
    errors.push("Price must be greater than 0");
  }

  // Parse stock
  const stock = parseInt(row.Stock || "0");
  const inStock = row["In stock?"] === "1";

  if (row.Stock && isNaN(stock)) {
    warnings.push("Invalid stock quantity, defaulting to 0");
  }

  // Parse weight (convert grams to kg)
  const weightGrams = parseFloat(row["Weight (g)"] || "0");
  const weight = weightGrams > 0 ? weightGrams / 1000 : null;

  // Parse images (comma-separated with possible spaces)
  const images = row.Images
    ? row.Images.split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    : [];

  if (images.length === 0 && row.Type === "simple") {
    warnings.push("No images found");
  }

  // Parse categories (split by >, then by comma)
  const categories = row.Categories
    ? row.Categories.split(/[>,]/)
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  // Parse tags
  const tags = row.Tags
    ? row.Tags.split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Parse parent ID (format: "id:3205" → "3205")
  const parentId = row.Parent?.startsWith("id:")
    ? row.Parent.replace("id:", "")
    : row.Parent || null;

  // Parse attributes for variations
  const attributes: Record<string, string> = {};

  // Handle up to 4 attributes
  for (let i = 1; i <= 4; i++) {
    const attrName = row[`Attribute ${i} name` as keyof WooCommerceProduct];
    const attrValue =
      row[`Attribute ${i} value(s)` as keyof WooCommerceProduct];

    if (attrName && attrValue) {
      attributes[attrName.trim()] = attrValue.trim();
    }
  }

  // Generate variant name from attributes
  let variantName: string | null = null;
  if (row.Type === "variation" && Object.keys(attributes).length > 0) {
    variantName = Object.entries(attributes)
      .map(([key, value]) => `${value}`)
      .join(" / ");
  }

  // Featured flag
  const featured = row["Is featured?"] === "1";

  return {
    wooId: row.ID,
    type: row.Type as any,

    name: row.Name?.trim() || "",
    description: row.Description?.trim() || null,
    shortDescription: row["Short description"]?.trim() || null,
    sku: row.SKU?.trim() || null,

    price,
    compareAtPrice,

    trackInventory: !!row.Stock,
    inventoryQty: inStock ? stock : 0,

    published: row.Published === "1",
    featured,

    categories,
    tags,

    weight,
    images,

    parentId,
    variantName,
    attributes,

    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
