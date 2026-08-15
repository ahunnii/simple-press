import { parseTemplateListRows } from "~/lib/template-fields";

/**
 * List-row shapes + parsers for the relocation homepage's list fields.
 *
 * Split out of `./index.ts` on purpose: `parseTemplateListRows` is a RUNTIME
 * import from `~/lib/template-fields`, and that module aggregates every
 * template's field registry — including this template's root `../index.ts`,
 * which imports `./index.ts`. Keeping the runtime helper import in the field
 * module created a circular-evaluation TDZ crash ("Cannot access
 * 'relocationFieldGroups' before initialization") on every storefront route.
 * Components import parsers from here; the field module stays type-only
 * toward `~/lib/template-fields`.
 */

/** An illustrated badge + terracotta title + bold blurb (services, reasons). */
export type RelocationIconRow = {
  image: string;
  alt: string;
  title: string;
  text: string;
};

/** A photo-only row (the "movers in action" circle gallery). */
export type RelocationPhotoRow = {
  image: string;
  alt: string;
};

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

/**
 * Rows here are image + alt + title + text, which none of the shared
 * `parseTemplate*ListRows` helpers models (`parseTemplateImageListRows` is
 * image/label/description with no alt slot, and `parseTemplateIconListRows`
 * resolves a Lucide icon rather than an uploaded illustration), so this coerces
 * the generic `parseTemplateListRows` output instead. Rows with neither an
 * image nor a title are dropped so a half-filled editor row never renders as a
 * gap; an entirely empty list falls back to the shipped rows.
 */
export function toRelocationIconRows(
  raw: unknown,
  fallback: RelocationIconRow[],
): RelocationIconRow[] {
  const rows = parseTemplateListRows(raw)
    .map((row) => ({
      image: readString(row, "image"),
      alt: readString(row, "alt"),
      title: readString(row, "title"),
      text: readString(row, "text"),
    }))
    .filter((row) => row.image !== "" || row.title !== "");
  return rows.length > 0 ? rows : fallback;
}

/** Same contract as {@link toRelocationIconRows}, for photo-only lists. */
export function toRelocationPhotoRows(
  raw: unknown,
  fallback: RelocationPhotoRow[],
): RelocationPhotoRow[] {
  const rows = parseTemplateListRows(raw)
    .map((row) => ({
      image: readString(row, "image"),
      alt: readString(row, "alt"),
    }))
    .filter((row) => row.image !== "");
  return rows.length > 0 ? rows : fallback;
}
