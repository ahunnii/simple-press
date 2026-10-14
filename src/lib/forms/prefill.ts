import type { FormField } from "~/lib/validators/form";

/**
 * URL prefill for picture-choice fields: `?pick=<fieldId>:<optionId>,<optionId>`.
 * The param can repeat (one per field, or several for the same field, which
 * merge). A link from anywhere on the site (e.g. a color browser's "use these
 * in my quote" button) can open a form with tiles already picked.
 *
 * PURE and isomorphic (no React, no `window`): the storefront renderer reads
 * `location.search` and applies the result; the builder of a link calls
 * `buildPicturePrefillParam`. A prefill is only a starting point: the
 * visitor can change it, and the submit still validates as usual.
 *
 * The parsed values use the renderer's raw value shapes, which
 * `PictureChoiceField` also uses: `"one"` → an option id string, `"many"` →
 * option ids, `"quantity"` → `{ [optionId]: quantity }`.
 */

export const PICTURE_PREFILL_PARAM = "pick";

/** A param value longer than this is ignored whole (a hostile or broken link). */
const MAX_PARAM_LENGTH = 2000;
/** Repeats of `pick` read; more are ignored. */
const MAX_PARAMS = 100;

export type PicturePrefillValue = string | string[] | Record<string, number>;

/**
 * One `pick` value, `fieldId:id,id`. The caller URL-encodes it (e.g. via
 * `URLSearchParams`). Option ids containing `,` can't be expressed, and a
 * field id containing `:` can't be parsed; builder-made ids never do.
 */
export function buildPicturePrefillParam(
  fieldId: string,
  optionIds: readonly string[],
): string {
  return `${fieldId}:${optionIds.join(",")}`;
}

/**
 * Read every `pick` param and resolve it against `fields`. Only picture-choice
 * fields are prefilled, and only with option ids that exist and aren't
 * `hidden`, de-duplicated. Then the selection mode applies, keeping the ids
 * listed first in the link: `"one"` keeps one id, `"many"` keeps up to
 * `maxTotal`, and `"quantity"` gives each id a quantity of 1 while the total
 * stays within `maxTotal`. Kept ids come back in definition order. A field with nothing usable is left out of the result.
 */
export function parsePicturePrefill(
  search: string | URLSearchParams,
  fields: readonly FormField[],
): Record<string, PicturePrefillValue> {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;

  const requested = new Map<string, Set<string>>(); // fieldId → option ids
  for (const raw of params.getAll(PICTURE_PREFILL_PARAM).slice(0, MAX_PARAMS)) {
    if (raw.length > MAX_PARAM_LENGTH) continue;
    const colon = raw.indexOf(":");
    if (colon <= 0) continue;
    const fieldId = raw.slice(0, colon).trim();
    const ids = requested.get(fieldId) ?? new Set<string>();
    for (const id of raw.slice(colon + 1).split(",")) {
      const trimmed = id.trim();
      if (trimmed !== "") ids.add(trimmed);
    }
    requested.set(fieldId, ids);
  }

  const result: Record<string, PicturePrefillValue> = {};
  for (const field of fields) {
    if (field.type !== "picturechoice") continue;
    const wanted = requested.get(field.id);
    if (!wanted) continue;

    // Usable ids in the link's order, so a cap keeps what was listed first
    // (the visitor's own picks); the kept ids then follow definition order.
    const position = new Map(
      field.options
        .filter((option) => !option.hidden)
        .map((option, index) => [option.id, index]),
    );
    const usable = [...wanted].filter((id) => position.has(id));
    if (usable.length === 0) continue;
    const cap =
      field.selection === "one" ? 1 : (field.maxTotal ?? usable.length);
    const ids = usable
      .slice(0, cap)
      .sort((a, b) => position.get(a)! - position.get(b)!);

    if (field.selection === "one") {
      result[field.id] = ids[0]!;
    } else if (field.selection === "many") {
      result[field.id] = ids;
    } else {
      result[field.id] = Object.fromEntries(ids.map((id) => [id, 1]));
    }
  }
  return result;
}
