import type { TemplateListRow } from "~/lib/template-fields";
import {
  getListFieldValue,
  parseTemplateListRows,
} from "~/lib/template-fields";

import {
  DREAM_LANE_SECTIONS_DEFAULT_ROWS,
  DREAM_LANE_SECTIONS_KEY,
} from "./dream-lane-sections-defaults";

/** How a `dream-lane.sections` row renders, decided by what is filled in. */
export type DreamLaneSectionKind = "split" | "photo" | "text";

export type DreamLaneSection = {
  /** Stable key for React. */
  id: string;
  kind: DreamLaneSectionKind;
  heading: string;
  body: string;
  image: string;
  alt: string;
  /** True crops the photo to fill its frame; false shows it whole. */
  crop: boolean;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Classifies one section row by its content:
 * - text + photo -> `"split"` (alternating text/photo row)
 * - photo only   -> `"photo"` (centered wide photo)
 * - text only    -> `"text"` (centered text block)
 * - neither      -> `null` (skipped)
 *
 * Text = heading or body is non-blank. Photo = image is non-empty, and
 * `"/placeholder.svg"` counts: the built-in example rows then show the
 * designed "photo coming soon" tile.
 */
export function classifyLaneSection(
  row: Record<string, unknown>,
): DreamLaneSectionKind | null {
  const hasText = clean(row.heading) !== "" || clean(row.body) !== "";
  const hasPhoto = clean(row.image) !== "";
  if (hasText && hasPhoto) return "split";
  if (hasPhoto) return "photo";
  if (hasText) return "text";
  return null;
}

/**
 * Resolves the page's sections: the saved `dream-lane.sections` list, or the
 * built-in example rows when it is unsaved or empty (deleting every row brings
 * the examples back — the "Show sections" switch is how to hide them all).
 * Rows with neither text nor a photo are dropped.
 *
 * The retired numbered `block-{1,2,3}-*` keys are deliberately NOT read: the
 * list editor can't show rows built from them (a later first edit would
 * silently replace them). `scripts/dream/backfill-dream-lane-sections.ts`
 * migrates saved blocks into this list instead.
 */
export function resolveDreamLaneSections(
  customFields: unknown,
): DreamLaneSection[] {
  const saved = getListFieldValue(customFields, DREAM_LANE_SECTIONS_KEY);
  const savedRows: TemplateListRow[] = saved
    ? parseTemplateListRows(saved)
    : [];
  const rows: TemplateListRow[] =
    savedRows.length > 0
      ? savedRows
      : parseTemplateListRows(DREAM_LANE_SECTIONS_DEFAULT_ROWS);

  const out: DreamLaneSection[] = [];
  for (const row of rows) {
    const kind = classifyLaneSection(row);
    if (!kind) continue;
    out.push({
      id: String(row._id),
      kind,
      heading: clean(row.heading),
      body: clean(row.body),
      image: clean(row.image),
      alt: clean(row.alt),
      crop: row.crop === "true",
    });
  }
  return out;
}
