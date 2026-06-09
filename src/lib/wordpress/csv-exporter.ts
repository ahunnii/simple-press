import type { Image, Product, ProductVariant } from "generated/prisma";
import Papa from "papaparse";

type ProductWithRelations = Product & {
  images: Image[];
  variants: ProductVariant[];
};

type WooCommerceExportRow = {
  ID: string;
  Type: string;
  SKU: string;
  Name: string;
  Published: string;
  "Is featured?": string;
  "Visibility in catalog": string;
  "Short description": string;
  Description: string;
  "Date sale price starts": string;
  "Date sale price ends": string;
  "Tax status": string;
  "Tax class": string;
  "In stock?": string;
  Stock: string;
  "Low stock amount": string;
  "Backorders allowed?": string;
  "Sold individually?": string;
  "Weight (g)": string;
  "Length (in)": string;
  "Width (in)": string;
  "Height (in)": string;
  "Allow customer reviews?": string;
  "Purchase note": string;
  "Sale price": string;
  "Regular price": string;
  Categories: string;
  Tags: string;
  "Shipping class": string;
  Images: string;
  "Download limit": string;
  "Download expiry days": string;
  Parent: string;
  "Grouped products": string;
  Upsells: string;
  "Cross-sells": string;
  "External URL": string;
  "Button text": string;
  Position: string;

  // Attributes (support up to 3 for simplicity)
  "Attribute 1 name": string;
  "Attribute 1 value(s)": string;
  "Attribute 1 visible": string;
  "Attribute 1 global": string;
  "Attribute 2 name": string;
  "Attribute 2 value(s)": string;
  "Attribute 2 visible": string;
  "Attribute 2 global": string;
  "Attribute 3 name": string;
  "Attribute 3 value(s)": string;
  "Attribute 3 visible": string;
  "Attribute 3 global": string;
};

export function exportToWooCommerceCSV(
  products: ProductWithRelations[],
): string {
  const rows: WooCommerceExportRow[] = [];

  for (const product of products) {
    if (product.variants.length === 0) {
      // Simple product
      rows.push(createSimpleProductRow(product));
    } else {
      // Variable product + variations
      rows.push(createVariableProductRow(product));

      // Add each variation
      product.variants.forEach((variant, index) => {
        rows.push(createVariationRow(product, variant, index));
      });
    }
  }

  // Convert to CSV
  const csv = Papa.unparse(rows, {
    quotes: true,
    header: true,
  });

  return csv;
}

function createSimpleProductRow(
  product: ProductWithRelations,
): WooCommerceExportRow {
  // Convert price from cents to dollars
  const regularPrice = (product.price / 100).toFixed(2);
  const salePrice = product.compareAtPrice
    ? (product.price / 100).toFixed(2)
    : "";
  const comparePrice = product.compareAtPrice
    ? (product.compareAtPrice / 100).toFixed(2)
    : regularPrice;

  // Convert weight from kg to grams
  const weightGrams = product.weight
    ? Math.round(product.weight * 1000).toString()
    : "";

  // Join images with comma
  const images = product.images
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => img.url)
    .join(", ");

  return {
    ID: "", // WooCommerce will auto-generate
    Type: "simple",
    SKU: product.sku ?? "",
    Name: product.name,
    Published: product.published ? "1" : "-1",
    "Is featured?": product.featured ? "1" : "0",
    "Visibility in catalog": "visible",
    "Short description": "",
    Description: product.description ?? "",
    "Date sale price starts": "",
    "Date sale price ends": "",
    "Tax status": "taxable",
    "Tax class": "",
    "In stock?": product.inventoryQty > 0 ? "1" : "0",
    Stock: product.trackInventory ? product.inventoryQty.toString() : "",
    "Low stock amount": "",
    "Backorders allowed?": product.allowBackorders ? "1" : "0",
    "Sold individually?": "0",
    "Weight (g)": weightGrams,
    "Length (in)": "",
    "Width (in)": "",
    "Height (in)": "",
    "Allow customer reviews?": "1",
    "Purchase note": "",
    "Sale price": salePrice,
    "Regular price": salePrice || comparePrice,
    Categories: "", // Could map from collections
    Tags: "",
    "Shipping class": "",
    Images: images,
    "Download limit": "",
    "Download expiry days": "",
    Parent: "",
    "Grouped products": "",
    Upsells: "",
    "Cross-sells": "",
    "External URL": "",
    "Button text": "",
    Position: "0",
    "Attribute 1 name": "",
    "Attribute 1 value(s)": "",
    "Attribute 1 visible": "",
    "Attribute 1 global": "",
    "Attribute 2 name": "",
    "Attribute 2 value(s)": "",
    "Attribute 2 visible": "",
    "Attribute 2 global": "",
    "Attribute 3 name": "",
    "Attribute 3 value(s)": "",
    "Attribute 3 visible": "",
    "Attribute 3 global": "",
  };
}

function createVariableProductRow(
  product: ProductWithRelations,
): WooCommerceExportRow {
  // Variable product uses lowest variant price
  const lowestPrice = Math.min(
    ...product.variants.map((v) => v.price ?? product.price),
  );
  const regularPrice = (lowestPrice / 100).toFixed(2);

  // Gather all unique attributes from variants
  const allAttributes = new Map<string, Set<string>>();

  product.variants.forEach((variant) => {
    const options = variant.options as Record<string, string>;
    Object.entries(options).forEach(([key, value]) => {
      if (!allAttributes.has(key)) {
        allAttributes.set(key, new Set());
      }
      allAttributes.get(key)!.add(value);
    });
  });

  // Convert to WooCommerce attribute format
  const attributes = Array.from(allAttributes.entries()).slice(0, 3); // Max 3 attributes

  const images = product.images
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => img.url)
    .join(", ");

  return {
    ID: product.id, // Used as parent reference
    Type: "variable",
    SKU: product.sku ?? "",
    Name: product.name,
    Published: product.published ? "1" : "-1",
    "Is featured?": product.featured ? "1" : "0",
    "Visibility in catalog": "visible",
    "Short description": "",
    Description: product.description ?? "",
    "Date sale price starts": "",
    "Date sale price ends": "",
    "Tax status": "taxable",
    "Tax class": "",
    "In stock?": "1",
    Stock: "",
    "Low stock amount": "",
    "Backorders allowed?": "0",
    "Sold individually?": "0",
    "Weight (g)": "",
    "Length (in)": "",
    "Width (in)": "",
    "Height (in)": "",
    "Allow customer reviews?": "1",
    "Purchase note": "",
    "Sale price": "",
    "Regular price": regularPrice,
    Categories: "",
    Tags: "",
    "Shipping class": "",
    Images: images,
    "Download limit": "",
    "Download expiry days": "",
    Parent: "",
    "Grouped products": "",
    Upsells: "",
    "Cross-sells": "",
    "External URL": "",
    "Button text": "",
    Position: "0",
    "Attribute 1 name": attributes[0]?.[0] ?? "",
    "Attribute 1 value(s)": attributes[0]
      ? Array.from(attributes[0][1]).join(", ")
      : "",
    "Attribute 1 visible": "1",
    "Attribute 1 global": "0",
    "Attribute 2 name": attributes[1]?.[0] ?? "",
    "Attribute 2 value(s)": attributes[1]
      ? Array.from(attributes[1][1]).join(", ")
      : "",
    "Attribute 2 visible": "1",
    "Attribute 2 global": "0",
    "Attribute 3 name": attributes[2]?.[0] ?? "",
    "Attribute 3 value(s)": attributes[2]
      ? Array.from(attributes[2][1]).join(", ")
      : "",
    "Attribute 3 visible": "1",
    "Attribute 3 global": "0",
  };
}

function createVariationRow(
  product: ProductWithRelations,
  variant: ProductVariant,
  index: number,
): WooCommerceExportRow {
  const regularPrice = ((variant.price ?? product.price) / 100).toFixed(2);
  const salePrice = variant.compareAtPrice
    ? ((variant.price ?? product.price) / 100).toFixed(2)
    : "";
  const comparePrice = variant.compareAtPrice
    ? (variant.compareAtPrice / 100).toFixed(2)
    : regularPrice;

  // Get attributes from variant options
  const options = variant.options as Record<string, string>;
  const attributes = Object.entries(options).slice(0, 3);

  return {
    ID: "", // WooCommerce auto-generates
    Type: "variation",
    SKU: variant.sku ?? "",
    Name: `${product.name} - ${variant.name}`,
    Published: "1",
    "Is featured?": "0",
    "Visibility in catalog": "visible",
    "Short description": "",
    Description: "",
    "Date sale price starts": "",
    "Date sale price ends": "",
    "Tax status": "taxable",
    "Tax class": "parent",
    "In stock?": variant.inventoryQty > 0 ? "1" : "0",
    Stock: variant.inventoryQty.toString(),
    "Low stock amount": "",
    "Backorders allowed?": "0",
    "Sold individually?": "0",
    "Weight (g)": "",
    "Length (in)": "",
    "Width (in)": "",
    "Height (in)": "",
    "Allow customer reviews?": "0",
    "Purchase note": "",
    "Sale price": salePrice,
    "Regular price": salePrice || comparePrice,
    Categories: "",
    Tags: "",
    "Shipping class": "",
    Images: variant.imageUrl ?? "",
    "Download limit": "",
    "Download expiry days": "",
    Parent: `id:${product.id}`,
    "Grouped products": "",
    Upsells: "",
    "Cross-sells": "",
    "External URL": "",
    "Button text": "",
    Position: index.toString(),
    "Attribute 1 name": attributes[0]?.[0] ?? "",
    "Attribute 1 value(s)": attributes[0]?.[1] ?? "",
    "Attribute 1 visible": "",
    "Attribute 1 global": "0",
    "Attribute 2 name": attributes[1]?.[0] ?? "",
    "Attribute 2 value(s)": attributes[1]?.[1] ?? "",
    "Attribute 2 visible": "",
    "Attribute 2 global": "0",
    "Attribute 3 name": attributes[2]?.[0] ?? "",
    "Attribute 3 value(s)": attributes[2]?.[1] ?? "",
    "Attribute 3 visible": "",
    "Attribute 3 global": "0",
  };
}

/**
 * Generate filename for export
 */
export function generateExportFilename(businessName: string): string {
  const date = new Date().toISOString().split("T")[0];
  const slug = businessName.toLowerCase().replace(/\s+/g, "-");
  return `woocommerce-export-${slug}-${date}.csv`;
}
