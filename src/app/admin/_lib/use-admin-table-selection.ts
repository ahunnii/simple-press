"use client";

import type { ReadonlyURLSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { ADMIN_BULK_SELECTION_LIMIT } from "~/lib/validators/admin-table";

/**
 * The multi-select engine behind the admin list tables (Collections, Services).
 *
 * Extracted verbatim from those two components, which held line-for-line
 * identical copies of it. Every invariant below was arrived at by fixing a real
 * bug; the comments are the record of which one, so they travel with the code
 * rather than with whichever page happened to be written first.
 *
 * Adopting it is optional — Inventory deliberately has no selection at all, and
 * nothing here is coupled to AdminFilters, AdminBulkBar or AdminPagination.
 */

export type UseAdminTableSelectionArgs = {
  /**
   * Ids of the rows on the CURRENT page, in the order they render. Shift-range
   * select indexes into this array, so the order must match the rendered rows.
   */
  rowIds: string[];
  /**
   * Ids of every row matching the current filters, across all pages — or `null`
   * when the server declined to enumerate them because more than
   * ADMIN_BULK_SELECTION_LIMIT match. Both `buildTablePage` and
   * `product.secureList` return exactly this shape.
   *
   * `null` is not `[]`: an empty array is a genuine "nothing matched". The
   * escalation is offered in neither case, but only `null` gets an explanation
   * (`escalationDisabledReason`) — "nothing matched" needs none, because with no
   * rows there is no full page to escalate FROM.
   */
  matchingIds: string[] | null;
  /**
   * Rows matching the current filters, across all pages. Equal to
   * `matchingIds.length` whenever those were sent — but it is also the only
   * count available when they weren't, which is exactly when the escalation has
   * to explain itself with a real number.
   */
  totalCount: number;
  /** The current page number, as resolved server-side and passed in as a prop. */
  page: number;
  /** `useSearchParams()` from the calling component. */
  searchParams: ReadonlyURLSearchParams | URLSearchParams;
};

export type AdminTableSelection = {
  /** Ids currently selected, possibly spanning pages. */
  selectedIds: Set<string>;
  /** `selectedIds.size`, hoisted because every consumer wants it. */
  selectedCount: number;
  /** True once the user escalated past the current page via "Select all N". */
  isEscalated: boolean;
  /** Every row on this page is selected (false when the page is empty). */
  allPageSelected: boolean;
  /** Some but not all — drives the header checkbox's indeterminate state. */
  somePageSelected: boolean;
  /** The page is exhausted and more matches exist, so escalation is offerable. */
  canEscalate: boolean;
  /**
   * Why "select all N matching" can't be taken up, or undefined when it can.
   * Set only when `matchingIds` was withheld — the bulk bar shows this sentence
   * in place of the escalation link rather than dropping it silently, so the
   * reader learns the set is too large instead of wondering where the link went.
   */
  escalationDisabledReason: string | undefined;
  clearSelection: () => void;
  /** Drop ids a mutation just consumed, so the counter can't outrun reality. */
  pruneSelection: (ids: string[]) => void;
  /** Toggle the row at `index` into/out of the selection (shift-aware). */
  handleRowToggle: (index: number) => void;
  /** Header checkbox — selects or deselects every row on the visible page. */
  handleSelectAllOnPage: () => void;
  /** Escalate to every id matching the current filters. */
  handleSelectAllMatching: () => void;
  /** Pass straight to each row checkbox's `onClickCapture`. */
  onRowClickCapture: (event: { shiftKey: boolean }) => void;
  /** Pass straight to `<AdminFilters onFiltersChange={…}>`. */
  onFiltersChange: (changedKeys: string[]) => void;
};

export function useAdminTableSelection({
  rowIds,
  matchingIds,
  totalCount,
  page,
  searchParams,
}: UseAdminTableSelectionArgs): AdminTableSelection {
  // Id-based so a selection survives paging — the ids of rows that scrolled off
  // are still meaningful, unlike row indices.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** True once the user escalated past the current page via "Select all N". */
  const [isEscalated, setIsEscalated] = useState(false);
  /** Anchor for shift-click range select — an index into the CURRENT page. */
  const [lastToggledIndex, setLastToggledIndex] = useState<number | null>(null);

  // ── Page change vs. filter change ──────────────────────────────────────────
  // Both are `router.push` to the same route, so the two are told apart by what
  // actually changed in the URL rather than by which control was clicked:
  // everything except `page` is a *filter* signature. A filter change invalidates
  // the selection (the rows it refers to may no longer be reachable, and a bulk
  // action promising "5 collections" while zero are on screen is a trap), while a
  // page change deliberately preserves it. Deriving this from the URL — rather
  // than only from AdminFilters' onFiltersChange — also covers back/forward
  // navigation and the "Clear filters" link in the empty state, neither of which
  // routes through that callback.

  // `sort` is excluded alongside `page`: reordering cannot change WHICH rows
  // match, so `matchingIds` and every selected id stay valid across a re-sort.
  // Sorting to find something and then selecting it is a normal workflow, and
  // wiping the selection for a pure reorder would be gratuitous.
  const filterSignature = (() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("sort");
    params.sort();
    return params.toString();
  })();

  // Render-phase adjustment rather than an effect: the stale selection must
  // never be painted, not even for one frame. Same pattern AdminFilters uses to
  // re-seed its own inputs from the URL.
  const [lastFilterSignature, setLastFilterSignature] =
    useState(filterSignature);
  if (filterSignature !== lastFilterSignature) {
    setLastFilterSignature(filterSignature);
    setSelectedIds(new Set());
    setIsEscalated(false);
    setLastToggledIndex(null);
  }

  // A page or sort change keeps the selection, but the shift-click anchor is a
  // *positional* index and means nothing against a different set or order of rows.
  const sortKey = searchParams.get("sort") ?? "";
  const [lastPageAndSort, setLastPageAndSort] = useState(`${page}|${sortKey}`);
  if (`${page}|${sortKey}` !== lastPageAndSort) {
    setLastPageAndSort(`${page}|${sortKey}`);
    setLastToggledIndex(null);
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const selectedOnPage = rowIds.filter((id) => selectedIds.has(id));
  const allPageSelected =
    rowIds.length > 0 && selectedOnPage.length === rowIds.length;
  const somePageSelected = selectedOnPage.length > 0 && !allPageSelected;

  // ── Selection helpers ──────────────────────────────────────────────────────

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsEscalated(false);
    setLastToggledIndex(null);
  };

  /** Drop ids a mutation just consumed, so the counter can't outrun reality. */
  const pruneSelection = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    setIsEscalated(false);
    setLastToggledIndex(null);
  };

  // Radix's Checkbox reports the new checked state, not the originating event.
  // A capture-phase click listener runs before Radix's own handler fires
  // onCheckedChange, so the modifier key is recorded by the time we need it.
  // Keyboard activation produces a click with shiftKey === false, as intended.
  const shiftKeyRef = useRef(false);

  const onRowClickCapture = (event: { shiftKey: boolean }) => {
    shiftKeyRef.current = event.shiftKey;
  };

  const handleRowToggle = (index: number) => {
    const withShift = shiftKeyRef.current;
    shiftKeyRef.current = false;

    const id = rowIds[index];
    if (!id) return;

    setIsEscalated(false);

    if (withShift && lastToggledIndex !== null && lastToggledIndex !== index) {
      const start = Math.min(lastToggledIndex, index);
      const end = Math.max(lastToggledIndex, index);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          const rangeId = rowIds[i];
          if (rangeId) next.add(rangeId);
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }

    setLastToggledIndex(index);
  };

  /** Select-all is scoped to the visible page, matching Products and Testimonials.
   *  Services used to target every filtered row across every page while the header
   *  checkbox computed its indeterminate state against that same off-screen set —
   *  so one click could select rows the user had never seen. */
  const handleSelectAllOnPage = () => {
    setIsEscalated(false);
    setLastToggledIndex(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of rowIds) next.delete(id);
      } else {
        for (const id of rowIds) next.add(id);
      }
      return next;
    });
  };

  /** REPLACES the selection rather than unioning: the promise the bulk bar makes
   *  is "all N matching", and a union with off-filter leftovers would not be that.
   *
   *  A no-op when the ids were withheld. The bulk bar renders the reason instead
   *  of the link on that path, so this is unreachable through the UI — but
   *  clearing the selection to `new Set(null ?? [])` would be a silent, actively
   *  wrong outcome if it ever were reached. */
  const handleSelectAllMatching = () => {
    if (matchingIds === null) return;
    setSelectedIds(new Set(matchingIds));
    setIsEscalated(true);
    setLastToggledIndex(null);
  };

  // Redundant with the URL-signature check above, but it fires at push time so a
  // stale count disappears immediately rather than after the server round-trip.
  // Applies the same `sort` exemption the signature does, or a re-sort would
  // clear the selection here first.
  const onFiltersChange = (changedKeys: string[]) => {
    if (changedKeys.some((key) => key !== "sort")) clearSelection();
  };

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isEscalated,
    allPageSelected,
    somePageSelected,
    // Offer the escalation only when the page is exhausted and more matches
    // exist. Counted from `totalCount`, not `matchingIds.length`: the two are
    // equal whenever the ids were sent, and `totalCount` is the only one that
    // still means something when they weren't — which is precisely the case
    // that needs to show the disabled explanation rather than nothing at all.
    canEscalate: allPageSelected && totalCount > rowIds.length,
    escalationDisabledReason:
      matchingIds === null
        ? `Too many matches to select at once (${totalCount.toLocaleString()}). Work through them ${ADMIN_BULK_SELECTION_LIMIT.toLocaleString()} or fewer at a time.`
        : undefined,
    clearSelection,
    pruneSelection,
    handleRowToggle,
    handleSelectAllOnPage,
    handleSelectAllMatching,
    onRowClickCapture,
    onFiltersChange,
  };
}
