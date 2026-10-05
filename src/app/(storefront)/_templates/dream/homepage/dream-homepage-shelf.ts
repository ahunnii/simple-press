import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import {
  getListFieldValue,
  parseTemplateListRows,
} from "~/lib/template-fields";

import { DREAM_HERO_SHELF_DEFAULT_ROWS } from "./index";

export const DREAM_HERO_SHELF_KEY = "dream.homepage.hero-shelf";

/** One frame on the hero shelf, ready to render. */
export type DreamHeroShelfPhoto = {
  /** Empty string renders the warm fallback tile. */
  src: string;
  alt: string;
  caption: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** `/placeholder.svg` is the platform's "no image" marker — same as empty. */
function cleanImage(value: unknown): string {
  const image = clean(value);
  return image === "/placeholder.svg" ? "" : image;
}

function toPhoto(
  image: unknown,
  alt: unknown,
  caption: unknown,
): DreamHeroShelfPhoto {
  const cap = clean(caption);
  return { src: cleanImage(image), alt: clean(alt) || cap, caption: cap };
}

/**
 * Resolves the hero shelf's frames, left to right: the saved
 * `dream.homepage.hero-shelf` list (rows with a photo or a label are kept — a
 * row with no photo shows the warm fallback tile), otherwise the field's
 * built-in `defaultRows`.
 *
 * The pre-list numbered keys (`hero-shelf-photo-N`, `-N-alt`, `-N-caption`)
 * are retired (2026-10-05, `RETIRED_TEMPLATE_KEYS`) and deliberately NOT read:
 * no live store used them, and a fallback the editor can't show would let an
 * owner's first list edit silently replace those photos with the defaults.
 */
export function resolveDreamHeroShelf(
  customFields: unknown,
): DreamHeroShelfPhoto[] {
  const saved = getListFieldValue(customFields, DREAM_HERO_SHELF_KEY);
  if (saved) {
    const kept = parseTemplateListRows(saved)
      .map((row) => toPhoto(row.image, row.alt, row.caption))
      .filter((photo) => photo.src !== "" || photo.caption !== "");
    if (kept.length > 0) return kept;
  }

  return listRowsFromDefaults(DREAM_HERO_SHELF_DEFAULT_ROWS, "shelf").map(
    (row) => toPhoto(row.image, row.alt, row.caption),
  );
}
