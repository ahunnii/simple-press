/**
 * Squarespace product import CSV (version 7.1 layout).
 *
 * Sources (checked 2026-10-09):
 * - https://support.squarespace.com/hc/articles/115000378108
 *   ("Importing products from a .csv": column table, first-product-row vs
 *   option-row layout, limits)
 *
 * Squarespace publishes the column order and rules but not a literal header
 * row, so headers follow the article's 7.1 import table and the exported
 * template (`Product ID [Non Editable]` first). Squarespace allows 3 option
 * name/value pairs per variant (not 6), 250 variants per product.
 *
 * Row shape: a product without variants is one row. A product with variants
 * has a first product row (product fields + the first variant) followed by
 * option rows that hold only the option pairs, price, sale price and stock.
 * Images go on the first row only, separated by spaces.
 *
 * Caveat: `Product Page` must already exist on the receiving site (the guide
 * tells owners to create a store page whose URL slug matches
 * `productPage`, default "shop"), and categories must pre-exist.
 */
import type { SiteExportNote } from "../types";
import type { BuilderResult, ExportProduct } from "./types";

import {
  descriptionToHtml,
  hasSupportedImageExtension,
  money,
  normalizeOptions,
  slugifyHandle,
  toCsv,
  truncate,
  weightPounds,
} from "./helpers";

export const SQUARESPACE_MAX_OPTIONS = 3;
export const SQUARESPACE_MAX_VARIANTS = 250;

export const SQUARESPACE_HEADERS = [
  "Product ID [Non Editable]",
  "Variant ID [Non Editable]",
  "Product Type",
  "Product Page",
  "Product URL",
  "Title",
  "Description",
  "SKU",
  "GTIN",
  "MPN",
  "Option Name 1",
  "Option Value 1",
  "Option Name 2",
  "Option Value 2",
  "Option Name 3",
  "Option Value 3",
  "Price",
  "Sale Price",
  "On Sale",
  "Stock",
  "Categories",
  "Tags",
  "Weight",
  "Length",
  "Width",
  "Height",
  "Visible",
  "Hosted Image URLs",
] as const;

export interface SquarespaceOptions {
  /** URL slug of the store page products are filed under (no leading "/"). */
  productPage?: string;
}

type Row = Record<string, string | number>;

function categorySlug(name: string): string {
  return `/${truncate(slugifyHandle(name, "category"), 24)}`;
}

export function buildSquarespaceProductsCsv(
  products: ExportProduct[],
  options: SquarespaceOptions = {},
): BuilderResult {
  const productPage = (options.productPage ?? "shop").replace(/^\/+/, "");
  const rows: Row[] = [];
  const notes: SiteExportNote[] = [];
  const overflowed: string[] = [];
  const tooManyVariants: string[] = [];
  const badImages = new Set<string>();

  for (const p of products) {
    const opts = normalizeOptions(p, SQUARESPACE_MAX_OPTIONS);
    if (opts.overflowed) overflowed.push(p.name);
    if (p.variants.length > SQUARESPACE_MAX_VARIANTS)
      tooManyVariants.push(p.name);

    const images = p.images.map((i) => i.url.replace(/ /g, "%20"));
    for (const u of images) {
      if (!hasSupportedImageExtension(u)) badImages.add(p.name);
    }

    const variantRows = p.variants.length
      ? p.variants.slice(0, SQUARESPACE_MAX_VARIANTS).map((v, i) => ({
          sku: v.sku ?? "",
          price: v.priceCents,
          compareAt: v.compareAtCents,
          qty: v.inventoryQty,
          names: opts.names,
          values: opts.values[i] ?? [],
        }))
      : [
          {
            sku: p.sku ?? "",
            price: p.priceCents,
            compareAt: p.compareAtCents,
            qty: p.inventoryQty,
            names: [] as string[],
            values: [] as string[],
          },
        ];

    variantRows.forEach((v, i) => {
      const onSale = v.compareAt !== null && v.compareAt > v.price;
      const row: Row = {
        SKU: v.sku,
        Price: money(onSale ? v.compareAt : v.price),
        "Sale Price": onSale ? money(v.price) : "",
        "On Sale": onSale ? "Yes" : "No",
        Stock: p.trackInventory ? Math.max(0, v.qty) : "unlimited",
      };
      for (let o = 0; o < SQUARESPACE_MAX_OPTIONS; o++) {
        row[`Option Name ${o + 1}`] = v.names[o] ?? "";
        row[`Option Value ${o + 1}`] = v.values[o] ?? "";
      }
      if (i === 0) {
        row["Product Type"] = "Physical";
        row["Product Page"] = productPage;
        row["Product URL"] = truncate(slugifyHandle(p.slug || p.name), 200);
        row.Title = truncate(p.name, 200);
        row.Description = descriptionToHtml(p.description);
        row.Categories = p.collections.map(categorySlug).join(",");
        row.Tags = p.collections
          .map((c) => truncate(c.replace(/,/g, " ").trim(), 80))
          .filter(Boolean)
          .join(",");
        row.Weight = weightPounds(p);
        row.Visible = p.published ? "Yes" : "No";
        row["Hosted Image URLs"] = images.join(" ");
      }
      rows.push(row);
    });
  }

  const list = (names: string[]) =>
    `${names.slice(0, 5).join(", ")}${names.length > 5 ? ", ..." : ""}`;

  if (overflowed.length > 0) {
    notes.push({
      level: "warn",
      message: `Squarespace allows 3 product options; ${overflowed.length} product(s) had more (${list(overflowed)}). The extras were merged into the third option.`,
    });
  }
  if (tooManyVariants.length > 0) {
    notes.push({
      level: "warn",
      message: `Squarespace allows 250 variants per product; the extras were left out for ${list(tooManyVariants)}.`,
    });
  }
  if (badImages.size > 0) {
    notes.push({
      level: "warn",
      message: `Squarespace only imports .jpg, .png and .gif image links; ${badImages.size} product(s) have other image types (${list([...badImages])}). Upload those photos from the Photos folder instead.`,
    });
  }
  notes.push({
    level: "info",
    message: `Squarespace does not import featured images, variant images or customers, and each product's "Product Page" must match an existing store page (this file uses "${productPage}"). Categories must exist before importing.`,
  });

  return { csv: toCsv(SQUARESPACE_HEADERS, rows), notes };
}
