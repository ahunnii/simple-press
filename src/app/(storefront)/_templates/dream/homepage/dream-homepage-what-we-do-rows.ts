import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import {
  getListFieldValue,
  parseTemplateListRows,
} from "~/lib/template-fields";

import { DREAM_WHAT_WE_DO_DEFAULT_ROWS } from "./index";

export const DREAM_WHAT_WE_DO_ROWS_KEY = "dream.homepage.what-we-do-rows";

/** One "What we do" row, ready to render (before link flag gating). */
export type DreamWhatWeDoRow = {
  heading: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
  /** Empty string renders the designed placeholder. */
  image: string;
  /** Falls back to the heading when the owner left the description blank. */
  alt: string;
  /** Empty string means the owner picked no side photo. */
  sideImage: string;
  /** Blank means the side photo is decorative (`alt=""`). */
  sideAlt: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** `/placeholder.svg` is the platform's "no image" marker — same as empty. */
function cleanImage(value: unknown): string {
  const image = clean(value);
  return image === "/placeholder.svg" ? "" : image;
}

function toRow(row: Record<string, unknown>): DreamWhatWeDoRow {
  const heading = clean(row.heading);
  return {
    heading,
    body: clean(row.body),
    linkLabel: clean(row.linkLabel),
    linkUrl: clean(row.linkUrl),
    image: cleanImage(row.image),
    alt: clean(row.alt) || heading,
    sideImage: cleanImage(row.sideImage),
    sideAlt: clean(row.sideAlt),
  };
}

/**
 * Resolves the homepage "What we do" rows, top to bottom: the saved
 * `dream.homepage.what-we-do-rows` list (a row is kept when it has a heading,
 * a paragraph, or a main photo), otherwise the field's built-in
 * `defaultRows`.
 *
 * The pre-list numbered keys (`row-N-heading`, `-body`, `-link-label`,
 * `-link-url`, `-photo`, `-photo-alt`, `-side-photo`, `-side-photo-alt`) are
 * retired (2026-10-05, `RETIRED_TEMPLATE_KEYS`) and deliberately NOT read.
 */
export function resolveDreamWhatWeDoRows(
  customFields: unknown,
): DreamWhatWeDoRow[] {
  const saved = getListFieldValue(customFields, DREAM_WHAT_WE_DO_ROWS_KEY);
  if (saved) {
    const kept = parseTemplateListRows(saved)
      .map(toRow)
      .filter(
        (row) => row.heading !== "" || row.body !== "" || row.image !== "",
      );
    if (kept.length > 0) return kept;
  }

  return listRowsFromDefaults(DREAM_WHAT_WE_DO_DEFAULT_ROWS, "row").map(toRow);
}
