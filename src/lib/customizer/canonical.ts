import type { CustomizerSelection } from "~/lib/customizer/types";
import { cleanCustomizerText } from "~/lib/customizer/text";

/**
 * Canonical form + identity key for a selection.
 *
 * A cart line is identified by product + variant + `configKey(selection)`,
 * so two gloves of the same color with different charms are two lines, and
 * re-adding the same build bumps the existing line. The key must therefore
 * ignore everything that is not meaning: group order, value order, repeats,
 * surrounding whitespace, empty entries.
 *
 * Isomorphic and dependency-free (no `crypto`): the browser and the server
 * must compute the same key for the same build.
 */

type SelectionInput = Partial<CustomizerSelection> | null | undefined;

/**
 * Groups sorted by id, value ids de-duplicated and sorted, a group listed
 * twice merged, texts cleaned (`cleanCustomizerText`), and empty texts and
 * empty choice groups dropped. Ordering is by UTF-16 code unit (`<`), never
 * locale, so it is identical on every runtime.
 */
export function normalizeSelection(
  selection: SelectionInput,
): CustomizerSelection {
  const choices = new Map<string, Set<string>>();
  for (const entry of selection?.choices ?? []) {
    const set = choices.get(entry.groupId) ?? new Set<string>();
    for (const id of entry.valueIds) set.add(id);
    choices.set(entry.groupId, set);
  }

  const texts = new Map<string, string>();
  for (const entry of selection?.texts ?? []) {
    const text = cleanCustomizerText(entry.text);
    // First non-empty entry wins; a duplicate is invalid input anyway.
    if (text !== "" && !texts.has(entry.groupId)) {
      texts.set(entry.groupId, text);
    }
  }

  return {
    choices: [...choices]
      .filter(([, ids]) => ids.size > 0)
      .map(([groupId, ids]) => ({ groupId, valueIds: [...ids].sort(byCode) }))
      .sort((a, b) => byCode(a.groupId, b.groupId)),
    texts: [...texts]
      .map(([groupId, text]) => ({ groupId, text }))
      .sort((a, b) => byCode(a.groupId, b.groupId)),
  };
}

export function isEmptySelection(selection: SelectionInput): boolean {
  const normalized = normalizeSelection(selection);
  return normalized.choices.length === 0 && normalized.texts.length === 0;
}

/**
 * Short stable hash of the normalized selection: 16 hex chars (two 32-bit
 * FNV-1a passes with different seeds). `""` for an empty/missing selection,
 * so an unconfigured line keeps the same identity it had before options
 * existed.
 */
export function configKey(selection: SelectionInput): string {
  const normalized = normalizeSelection(selection);
  if (normalized.choices.length === 0 && normalized.texts.length === 0) {
    return "";
  }
  return stableHash16(JSON.stringify(normalized));
}

/**
 * 16 hex chars from two 32-bit FNV-1a passes with different seeds. Stable
 * across runtimes and releases (saved carts embed it), so never change the
 * seeds or the pass order. Not cryptographic: identity only.
 */
export function stableHash16(input: string): string {
  return fnv1a(input, 0x811c9dc5) + fnv1a(input, 0x050c5d1f);
}

function fnv1a(input: string, seed: number): string {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function byCode(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
