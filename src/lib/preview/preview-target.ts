/**
 * Click-to-edit target resolution for the visual editor preview.
 *
 * A hotspot click resolves to a whole `[data-sp-group]` section; these helpers
 * narrow it to the most specific editable element under the pointer — one
 * row of a list field (`data-sp-item`, see `listItemAttr`) or one text field
 * (`data-sp-field`, see `fieldAttr`) — so the editor can open that exact row
 * or field instead of just the section.
 *
 * Pure DOM-reading functions (no React, no window access) so they can be
 * unit tested and shared by the overlay (sender) and frame (receiver).
 */

/** The optional narrowing carried by an `sp:edit-group` message. */
export type PreviewEditTarget = {
  /** Template field key, e.g. "bamboo.homepage.hero-badges". */
  field: string;
  /** 0-based list row index — only for `list` fields. */
  item?: number;
};

/** Elements that can narrow a hotspot click. Nearest ancestor wins. */
export const PREVIEW_TARGET_SELECTOR = "[data-sp-item],[data-sp-field]";

/** Overlay chrome (hotspot highlight button etc.) — never a click target. */
const OVERLAY_SELECTOR = "[data-sp-overlay]";

/** Sanity caps so a hostile/garbage message can't smuggle in huge values. */
const MAX_FIELD_KEY_LENGTH = 256;
const MAX_ITEM_INDEX = 10_000;

function isValidFieldKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_FIELD_KEY_LENGTH
  );
}

function isValidItemIndex(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_ITEM_INDEX
  );
}

/**
 * Parses a `data-sp-item` value (`"<fieldKey>#<index>"`) into a target.
 * Splits on the LAST `#` so a key containing `#` still parses. Returns null
 * for anything malformed.
 */
export function parseItemAttr(
  value: string | null | undefined,
): PreviewEditTarget | null {
  if (!value) return null;
  const hash = value.lastIndexOf("#");
  if (hash <= 0) return null;
  const field = value.slice(0, hash);
  const rawIndex = value.slice(hash + 1);
  if (!/^\d+$/.test(rawIndex)) return null;
  const item = Number(rawIndex);
  if (!isValidFieldKey(field) || !isValidItemIndex(item)) return null;
  return { field, item };
}

/**
 * Validates the optional `field` / `item` members of a received
 * `sp:edit-group` message. Garbage is dropped rather than rejected: an
 * invalid `item` keeps the (valid) field; an invalid `field` drops both.
 */
export function sanitizeEditTarget(
  field: unknown,
  item: unknown,
): PreviewEditTarget | null {
  if (!isValidFieldKey(field)) return null;
  return isValidItemIndex(item) ? { field, item } : { field };
}

/**
 * Resolves the most specific edit target for `el` within the hotspot section
 * `groupId` (the full `data-sp-group` value, e.g. "homepage.hero").
 *
 * Walks up from `el` to the nearest `[data-sp-item]` / `[data-sp-field]`
 * ancestor and accepts it only if its own nearest `[data-sp-group]` is the
 * hotspot's group — a target owned by a different (nested or enclosing)
 * section is ignored. Malformed annotations fall through to the next
 * annotated ancestor inside the same group.
 */
export function resolvePreviewTarget(
  el: Element | null,
  groupId: string,
): PreviewEditTarget | null {
  if (!el || !groupId) return null;
  if (el.closest(OVERLAY_SELECTOR)) return null;

  let hit = el.closest(PREVIEW_TARGET_SELECTOR);
  while (hit) {
    const owner = hit.closest("[data-sp-group]");
    if (owner?.getAttribute("data-sp-group") !== groupId) return null;

    const itemAttr = hit.getAttribute("data-sp-item");
    if (itemAttr !== null) {
      const parsed = parseItemAttr(itemAttr);
      if (parsed) return parsed;
    } else {
      const field = hit.getAttribute("data-sp-field");
      if (isValidFieldKey(field)) return { field };
    }
    hit = hit.parentElement?.closest(PREVIEW_TARGET_SELECTOR) ?? null;
  }
  return null;
}

/**
 * Desktop variant: `stack` is `document.elementsFromPoint(x, y)` (topmost
 * first). The hotspot's own highlight button sits on top of the section, so
 * overlay elements are skipped and only the first real page element under
 * the pointer is resolved.
 */
export function resolvePreviewTargetFromStack(
  stack: readonly Element[],
  groupId: string,
): PreviewEditTarget | null {
  const first = stack.find((el) => !el.closest(OVERLAY_SELECTOR));
  return first ? resolvePreviewTarget(first, groupId) : null;
}
