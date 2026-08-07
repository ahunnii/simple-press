"use client";

import { toast } from "sonner";

/**
 * Copy and guards shared by the admin list tables that offer bulk actions.
 *
 * Everything here is parameterised by the page's item noun so Collections and
 * Services (and the next one) produce word-for-word the same sentences about
 * their own rows — the two used to hold private copies that were free to drift.
 */

/** Singular/plural pair, matching what AdminFilters and AdminBulkBar take. */
export type AdminItemNoun = { one: string; many: string };

/**
 * Turn a selection into something a person can actually check before confirming
 * a delete — "“Summer Collection” and “Night Out”" beats "2 collections", which
 * tells you the count you already knew and nothing about what you're destroying.
 *
 * `names` only covers the rows on the current page, since that's all a list
 * component holds. A selection accumulated across pages degrades gracefully to
 * naming what it can plus a remainder.
 *
 * The nothing-named fallback is deliberately always plural: it is the "selection
 * reaches entirely past this page" case, and it reads inside a sentence that
 * already carries the count.
 */
export function describeSelection(
  names: string[],
  total: number,
  itemNoun: AdminItemNoun,
  maxNamed = 3,
) {
  const shown = names.slice(0, maxNamed).map((name) => `“${name}”`);
  const remaining = total - shown.length;

  // Reachable with total === 1: select a row, page forward, then bulk-delete —
  // the selection is real but entirely off-page, so there's no name to show.
  // Pluralise on the count, not on the branch, or that path reads "1 collections".
  if (shown.length === 0) {
    return `${total} ${total === 1 ? itemNoun.one : itemNoun.many}`;
  }
  if (remaining > 0) return `${shown.join(", ")} and ${remaining} more`;
  if (shown.length === 1) return shown[0]!;
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]!}`;
}

/**
 * "3 of 5" — a bulk op silently touching fewer rows than asked must say so.
 *
 * A factory rather than a four-argument function: the noun is fixed per page, so
 * binding it once at module scope keeps every call site down to the three values
 * that actually vary.
 */
export function createShortfallMessage(itemNoun: AdminItemNoun) {
  return (done: number, requested: number, verb: string) =>
    `${done} of ${requested} ${requested === 1 ? itemNoun.one : itemNoun.many} ${verb} — ${
      requested - done
    } could not be found. They may have been deleted already.`;
}

/**
 * Belt-and-braces cap check: escalation is already blocked past the cap, but a
 * user can also accumulate a selection page by page. Fail here, with a sentence
 * naming the limit, rather than at the API with a validator error.
 *
 * Returns true when the selection is over `max` — the caller bails on true.
 *
 * A factory because it binds the live selection size, which changes every render;
 * call it inside the component, once, after `selectedCount` is known.
 */
export function createOverCapGuard(
  selectedCount: number,
  itemNoun: AdminItemNoun,
) {
  return (max: number, verb: string) => {
    if (selectedCount <= max) return false;
    toast.error(
      `You can ${verb} at most ${max.toLocaleString()} ${itemNoun.many} at a time. ${selectedCount.toLocaleString()} are selected.`,
    );
    return true;
  };
}
