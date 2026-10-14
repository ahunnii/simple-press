/**
 * Pure helpers shared by the four platform import-file builders.
 */
import Papa from "papaparse";

import type { ExportProduct } from "./types";
import { sanitizeCsvRows } from "~/lib/csv/escape-cell";

/** Cents -> "19.99" (no currency symbol). */
export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) {
    return "";
  }
  return (cents / 100).toFixed(2);
}

/** Weight in grams (Shopify). */
export function weightGrams(
  p: Pick<ExportProduct, "weight" | "weightUnit">,
): string {
  if (!p.weight || p.weight <= 0) return "";
  const grams = p.weightUnit === "kg" ? p.weight * 1000 : p.weight * 453.592;
  return String(Math.round(grams));
}

/** Weight in pounds (Squarespace / Square), up to 3 decimals. */
export function weightPounds(
  p: Pick<ExportProduct, "weight" | "weightUnit">,
): string {
  if (!p.weight || p.weight <= 0) return "";
  const lb = p.weightUnit === "kg" ? p.weight * 2.20462 : p.weight;
  return String(Math.round(lb * 1000) / 1000);
}

const HTML_TAG_RE = /<\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>/i;

export function looksLikeHtml(text: string): boolean {
  return HTML_TAG_RE.test(text);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Product descriptions are authored in a plain textarea. HTML-accepting
 * platforms get paragraphs / line breaks; text that already contains tags
 * (e.g. brought over by an earlier importer) is passed through untouched.
 */
export function descriptionToHtml(description: string): string {
  const text = description.trim();
  if (!text) return "";
  if (looksLikeHtml(text)) return text;
  return text
    .split(/\n{2,}/)
    .map(
      (para) => `<p>${escapeHtml(para.trim()).replace(/\r?\n/g, "<br>")}</p>`,
    )
    .join("");
}

/** Plain text for platforms without HTML descriptions (Square). */
export function descriptionToText(description: string): string {
  const text = description.trim();
  if (!text) return "";
  if (!looksLikeHtml(text)) return text;
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Lowercase, dash-separated, URL-safe (no leading/trailing dashes). */
export function slugifyHandle(value: string, fallback = "product"): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

/** Capitalize the first letter of a stored option key ("size" -> "Size"). */
export function titleCaseOption(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
}

export interface NormalizedOptions {
  /** Option names, at most `max` entries. */
  names: string[];
  /** One entry per product variant, `names.length` values each. */
  values: string[][];
  /** True when the product had more options than the platform allows. */
  overflowed: boolean;
  /** How many options the product really has. */
  originalCount: number;
}

/**
 * Collapse a product's variant options into at most `max` option columns.
 *
 * - Options are the union of names across variants, in first-seen order.
 * - Variants with no options at all fall back to a single synthetic option
 *   named "Option" whose value is the variant name.
 * - Overflow options (beyond `max`) are merged into the last column as
 *   "A / B" so every variant stays distinguishable; the caller adds a note.
 */
export function normalizeOptions(
  product: ExportProduct,
  max: number,
): NormalizedOptions {
  const variants = product.variants;
  if (variants.length === 0) {
    return { names: [], values: [], overflowed: false, originalCount: 0 };
  }

  const nameOrder: string[] = [];
  for (const v of variants) {
    for (const o of v.options) {
      if (!nameOrder.includes(o.name)) nameOrder.push(o.name);
    }
  }

  if (nameOrder.length === 0) {
    return {
      names: ["Option"],
      values: variants.map((v, i) => [v.name.trim() || `Option ${i + 1}`]),
      overflowed: false,
      originalCount: 1,
    };
  }

  const matrix = variants.map((v) =>
    nameOrder.map((n) => v.options.find((o) => o.name === n)?.value ?? ""),
  );

  if (nameOrder.length <= max) {
    return {
      names: nameOrder,
      values: matrix,
      overflowed: false,
      originalCount: nameOrder.length,
    };
  }

  const head = nameOrder.slice(0, max - 1);
  const tail = nameOrder.slice(max - 1);
  return {
    names: [...head, tail.join(" / ")],
    values: matrix.map((row) => [
      ...row.slice(0, max - 1),
      row
        .slice(max - 1)
        .filter((v) => v !== "")
        .join(" / "),
    ]),
    overflowed: true,
    originalCount: nameOrder.length,
  };
}

/**
 * Serialize rows to CSV with a fixed column order.
 *
 * Formula-injection escaping uses the "wordpress" mode of `escapeCsvCell`:
 * these files are read directly by platform importers, not opened in a
 * spreadsheet first, so a leading `'` would be imported literally. Only
 * `=`, `@`, tab and CR prefixes are neutralized; prices ("-2.00"), URLs and
 * handles are never touched.
 */
export function toCsv(
  headers: readonly string[],
  rows: Array<Record<string, string | number>>,
): string {
  const full = rows.map((row) => {
    const out: Record<string, string | number> = {};
    for (const h of headers) out[h] = row[h] ?? "";
    return out;
  });
  return Papa.unparse(sanitizeCsvRows(full, { mode: "wordpress" }), {
    columns: [...headers],
    header: true,
  });
}

/** Image URL extensions Squarespace / Wix accept. */
export function hasSupportedImageExtension(url: string): boolean {
  const path = url.split(/[?#]/)[0] ?? "";
  return /\.(jpe?g|png|gif)$/i.test(path);
}
