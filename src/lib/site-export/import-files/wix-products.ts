/**
 * Wix Stores product import CSV.
 *
 * Column set and order follow the Wix Stores CSV template (Store Products >
 * More Actions > Import). Wix says not to add, delete or rename columns, so
 * every template column is emitted even when empty.
 *
 * Sources (checked 2026-10-09):
 * - https://support.wix.com/en/article/importing-products-to-wix-stores
 * - https://www.nxdigital.co.uk/post/the-complete-csv-guide-for-wix-stores-master-product-import-uploads
 *   (variant-row layout example)
 *
 * Row shape: one `Product` row (price = lowest variant price when variants
 * exist), then one `Variant` row per variant. Variant rows leave `name` and
 * `price` blank, carry a `surcharge` (variant price - product price) and put
 * that variant's choice for option N in `productOptionDescriptionN`.
 * Limits applied: name 80 chars, description 8000, 15 images, 6 options,
 * option names 50 chars, drop-down choices 20 chars.
 */
import type { SiteExportNote } from "../types";
import type { BuilderResult, ExportProduct } from "./types";

import {
  descriptionToHtml,
  money,
  normalizeOptions,
  slugifyHandle,
  toCsv,
  truncate,
  weightPounds,
} from "./helpers";

export const WIX_MAX_OPTIONS = 6;
export const WIX_MAX_IMAGES = 15;
export const WIX_MAX_NAME = 80;
export const WIX_MAX_DESCRIPTION = 8000;
export const WIX_MAX_CHOICE = 20;
export const WIX_MAX_OPTION_NAME = 50;

function optionColumns(): string[] {
  const cols: string[] = [];
  for (let i = 1; i <= WIX_MAX_OPTIONS; i++) {
    cols.push(
      `productOptionName${i}`,
      `productOptionType${i}`,
      `productOptionDescription${i}`,
    );
  }
  return cols;
}

function additionalInfoColumns(): string[] {
  const cols: string[] = [];
  for (let i = 1; i <= 6; i++) {
    cols.push(`additionalInfoTitle${i}`, `additionalInfoDescription${i}`);
  }
  return cols;
}

function customTextColumns(): string[] {
  const cols: string[] = [];
  for (let i = 1; i <= 2; i++) {
    cols.push(
      `customTextField${i}`,
      `customTextCharLimit${i}`,
      `customTextMandatory${i}`,
    );
  }
  return cols;
}

export const WIX_HEADERS = [
  "handleId",
  "fieldType",
  "name",
  "description",
  "productImageUrl",
  "collection",
  "sku",
  "ribbon",
  "price",
  "surcharge",
  "visible",
  "discountMode",
  "discountValue",
  "inventory",
  "weight",
  "cost",
  ...optionColumns(),
  ...additionalInfoColumns(),
  ...customTextColumns(),
  "brand",
] as const;

type Row = Record<string, string | number>;

export function buildWixProductsCsv(products: ExportProduct[]): BuilderResult {
  const rows: Row[] = [];
  const notes: SiteExportNote[] = [];
  const overflowed: string[] = [];
  const truncatedChoices: string[] = [];
  const tooManyImages: string[] = [];
  const longDescriptions: string[] = [];
  const variantSales: string[] = [];

  for (const p of products) {
    const handleId = slugifyHandle(p.slug || p.name);
    const opts = normalizeOptions(p, WIX_MAX_OPTIONS);
    if (opts.overflowed) overflowed.push(p.name);

    // Wix drop-down choices are limited to 20 characters.
    let choiceTruncated = false;
    const values = opts.values.map((row) =>
      row.map((v) => {
        if (v.length > WIX_MAX_CHOICE) choiceTruncated = true;
        return truncate(v, WIX_MAX_CHOICE);
      }),
    );
    if (choiceTruncated) truncatedChoices.push(p.name);

    let description = descriptionToHtml(p.description);
    if (description.length > WIX_MAX_DESCRIPTION) {
      longDescriptions.push(p.name);
      description = truncate(description, WIX_MAX_DESCRIPTION);
    }

    let images = p.images.map((i) => i.url);
    if (images.length > WIX_MAX_IMAGES) {
      tooManyImages.push(p.name);
      images = images.slice(0, WIX_MAX_IMAGES);
    }

    const hasVariants = p.variants.length > 0;
    const basePrice = hasVariants
      ? Math.min(...p.variants.map((v) => v.priceCents))
      : p.priceCents;

    // Discounts are product-level in Wix; only simple products can carry one.
    let price = basePrice;
    let discountMode = "";
    let discountValue = "";
    if (!hasVariants && p.compareAtCents && p.compareAtCents > p.priceCents) {
      price = p.compareAtCents;
      discountMode = "AMOUNT";
      discountValue = money(p.compareAtCents - p.priceCents);
    } else if (hasVariants && p.variants.some((v) => v.compareAtCents)) {
      variantSales.push(p.name);
    }

    const productRow: Row = {
      handleId,
      fieldType: "Product",
      name: truncate(p.name, WIX_MAX_NAME),
      description,
      productImageUrl: images.join(";"),
      collection: p.collections.map((c) => c.replace(/;/g, " ")).join(";"),
      sku: hasVariants ? "" : (p.sku ?? ""),
      price: money(price),
      visible: p.published ? "TRUE" : "FALSE",
      discountMode,
      discountValue,
      inventory: hasVariants
        ? ""
        : p.trackInventory
          ? Math.max(0, p.inventoryQty)
          : "InStock",
      weight: weightPounds(p),
      cost: money(p.costCents),
    };

    if (hasVariants) {
      opts.names.forEach((name, o) => {
        const choices: string[] = [];
        for (const row of values) {
          const c = row[o] ?? "";
          if (c && !choices.includes(c)) choices.push(c);
        }
        productRow[`productOptionName${o + 1}`] = truncate(
          name,
          WIX_MAX_OPTION_NAME,
        );
        productRow[`productOptionType${o + 1}`] = "DROP_DOWN";
        productRow[`productOptionDescription${o + 1}`] = choices
          .map((c) => c.replace(/;/g, ","))
          .join(";");
      });
    }
    rows.push(productRow);

    p.variants.forEach((v, i) => {
      const variantRow: Row = {
        handleId,
        fieldType: "Variant",
        sku: v.sku ?? "",
        surcharge: money(v.priceCents - basePrice),
        visible: p.published ? "TRUE" : "FALSE",
        inventory: p.trackInventory ? Math.max(0, v.inventoryQty) : "InStock",
      };
      opts.names.forEach((_, o) => {
        variantRow[`productOptionDescription${o + 1}`] = (
          values[i]?.[o] ?? ""
        ).replace(/;/g, ",");
      });
      rows.push(variantRow);
    });
  }

  const list = (names: string[]) =>
    `${names.slice(0, 5).join(", ")}${names.length > 5 ? ", ..." : ""}`;

  if (overflowed.length > 0) {
    notes.push({
      level: "warn",
      message: `Wix allows 6 product options; ${overflowed.length} product(s) had more (${list(overflowed)}). The extras were merged into the sixth option.`,
    });
  }
  if (truncatedChoices.length > 0) {
    notes.push({
      level: "warn",
      message: `Wix limits drop-down choices to 20 characters; option values were shortened on ${truncatedChoices.length} product(s) (${list(truncatedChoices)}). Check those variants after importing.`,
    });
  }
  if (tooManyImages.length > 0) {
    notes.push({
      level: "warn",
      message: `Wix accepts 15 images per product; extra images were left out of the Wix file for ${list(tooManyImages)}. They are still in the Photos folder.`,
    });
  }
  if (longDescriptions.length > 0) {
    notes.push({
      level: "warn",
      message: `Wix limits descriptions to 8,000 characters; the Wix file shortens the description of ${list(longDescriptions)}.`,
    });
  }
  if (variantSales.length > 0) {
    notes.push({
      level: "info",
      message: `Wix sale prices are product-wide, so the "compare at" prices on variants were not imported (${list(variantSales)}).`,
    });
  }

  return { csv: toCsv(WIX_HEADERS, rows), notes };
}
