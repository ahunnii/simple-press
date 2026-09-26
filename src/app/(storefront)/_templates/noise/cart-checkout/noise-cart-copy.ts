import {
  getListFieldValue,
  parseTemplateListRows,
} from "~/lib/template-fields";

import { resolveFields } from "..";
import { nonBlank } from "../shared/noise-non-blank";
import { CART_NOTES_KEY } from "./index";

export type NoiseCartCopy = {
  /** Blank = hide the visible label. */
  label: string;
  emptyHeading: string;
  /** Blank = hide. */
  emptyBody: string;
  /** Blank = hide the button. */
  emptyButtonText: string;
  emptyButtonLink: string;
  /**
   * Owner-written checkout notes (`noise.global.cart-reassurance`), blank
   * rows dropped. Empty = the notes block is hidden — there are no built-in
   * rows (no promise is true for every store).
   */
  notes: string[];
};

/**
 * Resolves the `global.cart` group once for the cart panel, cart page and
 * checkout form. Pure and sync, so client components can call it too.
 */
export function resolveNoiseCartCopy(customFields: unknown): NoiseCartCopy {
  const f = resolveFields(customFields, [
    "noise.global.cart-label",
    "noise.global.cart-empty-heading",
    "noise.global.cart-empty-body",
    "noise.global.cart-empty-button-text",
    "noise.global.cart-empty-button-link",
  ]);

  const notes = parseTemplateListRows(
    getListFieldValue(customFields, CART_NOTES_KEY),
  )
    .map((row) => (typeof row.text === "string" ? row.text.trim() : ""))
    .filter((text) => text.length > 0)
    .slice(0, 4);

  return {
    label: f["noise.global.cart-label"] ?? "",
    emptyHeading: f["noise.global.cart-empty-heading"] ?? "",
    emptyBody: f["noise.global.cart-empty-body"] ?? "",
    emptyButtonText: f["noise.global.cart-empty-button-text"] ?? "",
    emptyButtonLink:
      nonBlank(f["noise.global.cart-empty-button-link"]) ?? "/shop",
    notes,
  };
}

/** Decorative glyphs cycled beside the checkout notes (aria-hidden). */
export const NOISE_NOTE_GLYPHS = ["✓", "✱", "↺", "✦"] as const;

export function noiseNoteGlyph(index: number): string {
  return NOISE_NOTE_GLYPHS[index % NOISE_NOTE_GLYPHS.length] ?? "✦";
}
