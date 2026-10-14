/**
 * Square item library import CSV.
 *
 * Sources (checked 2026-10-09):
 * - https://squareup.com/help/us/en/article/5153-import-items-online
 *   (required columns Token / Item Name / Variation Name / Description / SKU,
 *   category syntax, Item Type values, "don't reorder or delete columns")
 * - https://squareup.com/help/us/en/article/6172-import-item-library-troubleshooting
 * - Square Dashboard > Items > Actions > Import Library (template download);
 *   Square documents Square Online Item Visibility = Visible | Hidden |
 *   Unavailable and Option Name/Value pairs per variation.
 *
 * Square does not publish a literal header row, so this is the subset of the
 * Dashboard template's item-level columns that SimplePress has data for.
 * Location-specific columns (`Enabled [Location]`, `Current Quantity
 * [Location]`, `New Quantity [Location]`, `Price [Location]`, taxes) are
 * omitted on purpose: their headers embed the seller's location name.
 *
 * Row shape: one row per variation (Item Name repeated). Items without
 * variants get one "Regular" variation. Descriptions are plain text; the CSV
 * cannot carry images (Square images are uploaded separately).
 */
import type { SiteExportNote } from "../types";
import type { BuilderResult, ExportProduct } from "./types";

import {
  descriptionToText,
  money,
  normalizeOptions,
  slugifyHandle,
  toCsv,
  truncate,
  weightPounds,
} from "./helpers";

export const SQUARE_MAX_OPTIONS = 3;

export const SQUARE_HEADERS = [
  "Token",
  "Item Name",
  "Variation Name",
  "SKU",
  "Description",
  "Categories",
  "Reporting Category",
  "SEO Title",
  "SEO Description",
  "Permalink",
  "GTIN",
  "Square Online Item Visibility",
  "Item Type",
  "Weight (lb)",
  "Price",
  "Online Sale Price",
  "Archived",
  "Sellable",
  "Stockable",
  "Option Name 1",
  "Option Value 1",
  "Option Name 2",
  "Option Value 2",
  "Option Name 3",
  "Option Value 3",
  "Default Unit Cost",
] as const;

type Row = Record<string, string | number>;

/** Square category syntax: "," separates categories, ">" nests; escape both. */
function escapeCategory(name: string): string {
  return name.replace(/([,>\\])/g, "\\$1").trim();
}

/** GTIN must be 8, 12, 13 or 14 digits or Square rejects the row. */
function validGtin(code: string | null): string {
  if (!code) return "";
  const digits = code.trim();
  return /^(\d{8}|\d{12,14})$/.test(digits) ? digits : "";
}

export function buildSquareItemsCsv(products: ExportProduct[]): BuilderResult {
  const rows: Row[] = [];
  const notes: SiteExportNote[] = [];
  const overflowed: string[] = [];

  for (const p of products) {
    const opts = normalizeOptions(p, SQUARE_MAX_OPTIONS);
    if (opts.overflowed) overflowed.push(p.name);

    const variations = p.variants.length
      ? p.variants.map((v, i) => ({
          name: v.name.trim() || `Variation ${i + 1}`,
          sku: v.sku ?? "",
          price: v.priceCents,
          compareAt: v.compareAtCents,
          names: opts.names,
          values: opts.values[i] ?? [],
        }))
      : [
          {
            name: "Regular",
            sku: p.sku ?? "",
            price: p.priceCents,
            compareAt: p.compareAtCents,
            names: [] as string[],
            values: [] as string[],
          },
        ];

    const categories = p.collections.map(escapeCategory).filter(Boolean);

    for (const v of variations) {
      const onSale = v.compareAt !== null && v.compareAt > v.price;
      const row: Row = {
        Token: "",
        "Item Name": truncate(p.name, 128),
        "Variation Name": truncate(v.name, 128),
        SKU: v.sku,
        Description: descriptionToText(p.description),
        Categories: categories.join(", "),
        "Reporting Category": categories[0] ?? "",
        "SEO Title": p.metaTitle ?? "",
        "SEO Description": p.metaDescription ?? "",
        Permalink: slugifyHandle(p.slug || p.name),
        GTIN: p.variants.length ? "" : validGtin(p.barcode),
        "Square Online Item Visibility": p.published ? "Visible" : "Hidden",
        "Item Type": "Physical good",
        "Weight (lb)": weightPounds(p),
        Price: money(onSale ? v.compareAt : v.price),
        "Online Sale Price": onSale ? money(v.price) : "",
        Archived: "N",
        Sellable: "Y",
        Stockable: p.trackInventory ? "Y" : "N",
        "Default Unit Cost": money(p.costCents),
      };
      for (let o = 0; o < SQUARE_MAX_OPTIONS; o++) {
        row[`Option Name ${o + 1}`] = truncate(v.names[o] ?? "", 128);
        row[`Option Value ${o + 1}`] = truncate(v.values[o] ?? "", 128);
      }
      rows.push(row);
    }
  }

  if (overflowed.length > 0) {
    notes.push({
      level: "warn",
      message: `Square's import file holds 3 options per item; ${overflowed.length} product(s) had more (${overflowed.slice(0, 5).join(", ")}${overflowed.length > 5 ? ", ..." : ""}). The extras were merged into the third option.`,
    });
  }
  notes.push({
    level: "info",
    message:
      "Square's item import does not carry photos or stock counts: upload photos from the Photos folder and set quantities in Square after importing.",
  });

  return { csv: toCsv(SQUARE_HEADERS, rows), notes };
}
