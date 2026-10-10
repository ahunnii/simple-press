/**
 * Shopify product import CSV.
 *
 * Column set follows Shopify's current product CSV template (the "URL handle"
 * / "Status" / "Published on online store" generation, not the legacy
 * "Handle" / "Published" / "Variant Price" headers). Markets, metafield,
 * unit-price and Google Shopping columns are omitted: they are optional and
 * the importer matches columns by name.
 *
 * Sources (checked 2026-10-09):
 * - https://help.shopify.com/en/manual/products/import-export/using-csv/csv-columns
 * - https://help.shopify.com/csv/product_template.csv (Shopify's sample file)
 *
 * Row shape: one row per variant (the first row also carries the product
 * fields); extra images go on following rows that carry only the handle and
 * image columns. Options: up to 3 (`Option1..3 name/value`).
 */
import type { SiteExportNote } from "../types";
import type {
  BuilderResult,
  ExportProduct,
  ImportBuilderContext,
} from "./types";

import {
  descriptionToHtml,
  money,
  normalizeOptions,
  slugifyHandle,
  toCsv,
  weightGrams,
} from "./helpers";

export const SHOPIFY_MAX_OPTIONS = 3;

export const SHOPIFY_HEADERS = [
  "Title",
  "URL handle",
  "Description",
  "Vendor",
  "Product category",
  "Type",
  "Tags",
  "Published on online store",
  "Status",
  "SKU",
  "Option1 name",
  "Option1 value",
  "Option2 name",
  "Option2 value",
  "Option3 name",
  "Option3 value",
  "Price",
  "Compare-at price",
  "Cost per item",
  "Charge tax",
  "Inventory tracker",
  "Inventory quantity",
  "Continue selling when out of stock",
  "Weight value (grams)",
  "Weight unit for display",
  "Requires shipping",
  "Fulfillment service",
  "Product image URL",
  "Image position",
  "Image alt text",
  "Variant image URL",
  "Gift card",
  "SEO title",
  "SEO description",
  "Collection",
] as const;

type Row = Record<string, string | number>;

/** Shopify tags: comma-separated, so commas inside a name are dropped. */
function tagList(names: string[]): string {
  return names
    .map((n) => n.replace(/,/g, " ").trim())
    .filter(Boolean)
    .join(", ");
}

export function buildShopifyProductsCsv(
  products: ExportProduct[],
  ctx: ImportBuilderContext,
): BuilderResult {
  const rows: Row[] = [];
  const notes: SiteExportNote[] = [];
  const overflowed: string[] = [];

  for (const p of products) {
    const handle = slugifyHandle(p.slug || p.name);
    const tracked = p.trackInventory;
    const opts = normalizeOptions(p, SHOPIFY_MAX_OPTIONS);
    if (opts.overflowed) overflowed.push(p.name);

    // Variant list: single-variant products get Shopify's "Default Title".
    const variantRows = p.variants.length
      ? p.variants.map((v, i) => ({
          sku: v.sku ?? "",
          price: v.priceCents,
          compareAt: v.compareAtCents,
          qty: v.inventoryQty,
          optionNames: opts.names,
          optionValues: opts.values[i] ?? [],
          variantImage: v.imageUrl ?? "",
        }))
      : [
          {
            sku: p.sku ?? "",
            price: p.priceCents,
            compareAt: p.compareAtCents,
            qty: p.inventoryQty,
            optionNames: ["Title"],
            optionValues: ["Default Title"],
            variantImage: "",
          },
        ];

    variantRows.forEach((v, i) => {
      const first = i === 0;
      const image = p.images[i];
      const row: Row = {
        "URL handle": handle,
        SKU: v.sku,
        Price: money(v.price),
        "Compare-at price":
          v.compareAt && v.compareAt > v.price ? money(v.compareAt) : "",
        "Charge tax": "true",
        "Inventory tracker": tracked ? "shopify" : "",
        "Inventory quantity": tracked ? Math.max(0, v.qty) : "",
        "Continue selling when out of stock": p.allowBackorders
          ? "continue"
          : "deny",
        "Weight value (grams)": weightGrams(p),
        "Weight unit for display": p.weightUnit,
        "Requires shipping": "true",
        "Fulfillment service": "manual",
        "Gift card": "false",
        "Variant image URL": v.variantImage,
      };
      for (let o = 0; o < SHOPIFY_MAX_OPTIONS; o++) {
        row[`Option${o + 1} name`] = v.optionNames[o] ?? "";
        row[`Option${o + 1} value`] = v.optionValues[o] ?? "";
      }
      if (first) {
        row.Title = p.name;
        row.Description = descriptionToHtml(p.description);
        row.Vendor = ctx.storeName;
        row.Tags = tagList(p.collections);
        row["Published on online store"] = p.published ? "true" : "false";
        row.Status = p.published ? "active" : "draft";
        row["Cost per item"] = money(p.costCents);
        row["SEO title"] = p.metaTitle ?? "";
        row["SEO description"] = p.metaDescription ?? "";
        row.Collection = p.collections[0] ?? "";
      }
      if (image) {
        row["Product image URL"] = image.url;
        row["Image position"] = i + 1;
        row["Image alt text"] = image.altText ?? "";
      }
      rows.push(row);
    });

    // Images beyond the number of variant rows get their own image-only rows.
    for (let i = variantRows.length; i < p.images.length; i++) {
      const image = p.images[i]!;
      rows.push({
        "URL handle": handle,
        "Product image URL": image.url,
        "Image position": i + 1,
        "Image alt text": image.altText ?? "",
      });
    }
  }

  if (overflowed.length > 0) {
    notes.push({
      level: "warn",
      message: `Shopify allows 3 product options; ${overflowed.length} product(s) had more (${overflowed.slice(0, 5).join(", ")}${overflowed.length > 5 ? ", ..." : ""}). The extra options were merged into the third option (for example "Red / Cotton") so every variant is still distinct.`,
    });
  }

  return { csv: toCsv(SHOPIFY_HEADERS, rows), notes };
}
