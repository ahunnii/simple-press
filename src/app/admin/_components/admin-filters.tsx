"use client";

import { useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export type AdminFilterOption = {
  value: string;
  label: string;
};

export type AdminFilterDef = {
  /** URL param name, e.g. "status" */
  key: string;
  /** Human label, e.g. "Status" — used by the popover field and the chip prefix */
  label: string;
  /** When this value is selected the param is DELETED, so the default state has a clean URL */
  defaultValue: string;
  options: AdminFilterOption[];
};

export type AdminFiltersProps = {
  /** Route the filter bar navigates within, e.g. "/admin/collections" */
  basePath: string;
  searchPlaceholder: string;
  searchAriaLabel: string;
  /** Every non-search filter. Pass [] for search-only pages — the popover hides itself. */
  filters: AdminFilterDef[];
  /** Shown (politely announced) only while at least one filter or the search term is active */
  resultCount?: number;
  itemNoun?: { one: string; many: string };
  /**
   * Fired when a navigation actually changes something, with the param keys that
   * changed (never including `page`). Consumers use this to react immediately
   * rather than waiting on the server round-trip — Collections drops its
   * multi-select, since a selection surviving a filter change is a real hazard.
   *
   * The keys matter: not every param narrows the result set. A `sort` change
   * reorders without changing which rows match, so a consumer can reasonably
   * ignore it. Nothing fires when a navigation would be a no-op.
   */
  onFiltersChange?: (changedKeys: string[]) => void;
};

/** One active constraint, rendered as a removable chip below the bar. */
type ActiveChip = {
  /** URL param this chip owns */
  key: string;
  /** "Status" / "Search" */
  label: string;
  /** "Drafts" / "\"blue mug\"" */
  valueLabel: string;
};

const DEFAULT_ITEM_NOUN = { one: "result", many: "results" };

export function AdminFilters({
  basePath,
  searchPlaceholder,
  searchAriaLabel,
  filters,
  resultCount,
  itemNoun = DEFAULT_ITEM_NOUN,
  onFiltersChange,
}: AdminFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fieldIdPrefix = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  const searchParam = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(searchParam);
  const [lastSearchParam, setLastSearchParam] = useState(searchParam);

  // Re-seed the uncontrolled-ish search box when the URL param changes out from
  // under us (back/forward navigation, "Clear all", a link elsewhere on the page).
  // Adjusting state during render is the supported React pattern for this; it does
  // NOT clobber in-progress typing, because typing never changes `searchParam`.
  if (searchParam !== lastSearchParam) {
    setLastSearchParam(searchParam);
    setSearch(searchParam);
  }

  const valueFor = (filter: AdminFilterDef) =>
    searchParams.get(filter.key) ?? filter.defaultValue;

  // "Active" is decided by VALUE, not mere presence. A hand-edited or bookmarked
  // `?status=all` (the default) or `?status=bogus` (not an option) must not render
  // a chip or bump the badge count — the server falls back to the default for both,
  // so claiming a filter is active would be a lie.
  const activeFilters = filters.filter((filter) => {
    const raw = searchParams.get(filter.key);
    return (
      raw !== null &&
      raw !== filter.defaultValue &&
      filter.options.some((option) => option.value === raw)
    );
  });
  const activeFilterCount = activeFilters.length;
  const hasActiveFilters = activeFilterCount > 0 || searchParam !== "";

  const chips: ActiveChip[] = [
    ...(searchParam
      ? [{ key: "search", label: "Search", valueLabel: `“${searchParam}”` }]
      : []),
    ...activeFilters.map((filter) => {
      const raw = searchParams.get(filter.key) ?? filter.defaultValue;
      const option = filter.options.find((o) => o.value === raw);
      return {
        key: filter.key,
        label: filter.label,
        valueLabel: option?.label ?? raw,
      };
    }),
  ];

  const buildParams = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    // Always reset pagination — changing a filter must never strand the user on
    // a page number that no longer exists in the narrowed result set.
    params.delete("page");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    return params.toString();
  };

  const navigate = (queryString: string) => {
    router.push(queryString ? `${basePath}?${queryString}` : basePath);

    // Diff the outgoing params against the current ones rather than having each
    // caller declare what it touched — that way the merged pending-search term
    // and every clear-path are accounted for automatically, and a param that was
    // "changed" to the value it already had reports as unchanged.
    const next = new URLSearchParams(queryString);
    const current = new URLSearchParams(searchParams.toString());
    next.delete("page");
    current.delete("page");
    const changedKeys = [
      ...new Set([...next.keys(), ...current.keys()]),
    ].filter((key) => next.get(key) !== current.get(key));

    if (changedKeys.length > 0) onFiltersChange?.(changedKeys);
  };

  /** Merge the pending (typed but unsubmitted) search term into a navigation, so
   *  changing a filter doesn't silently discard what's in the box. Callers that
   *  deliberately clear or set `search` win, since their override lands second. */
  const withPendingSearch = (overrides: Record<string, string | null>) =>
    buildParams({ search: search.trim() || null, ...overrides });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = search.trim();
    // Submitting an unchanged query must not navigate. `navigate` fires
    // `onFiltersChange` (which consumers use to drop a multi-select) and
    // `buildParams` always deletes `page` — so a no-op Search click would
    // otherwise throw away both the user's selection and their page.
    if (next === searchParam) return;
    navigate(buildParams({ search: next || null }));
  };

  const handleFilterChange = (filter: AdminFilterDef, value: string) => {
    navigate(
      withPendingSearch({
        [filter.key]: value === filter.defaultValue ? null : value,
      }),
    );
  };

  /** Chips unmount when removed, so keyboard focus would fall to <body>.
   *  Park it on a control that always exists instead. */
  const restoreFocus = () => {
    const target = filterTriggerRef.current ?? searchInputRef.current;
    target?.focus();
  };

  const handleRemoveChip = (key: string) => {
    if (key === "search") setSearch("");
    // `withPendingSearch` preserves typed-but-unsubmitted text when removing a
    // *filter* chip; removing the *search* chip passes `search: null`, which
    // lands second in the spread and correctly wins.
    navigate(withPendingSearch({ [key]: null }));
    restoreFocus();
  };

  /** Clears search + every declared filter, but preserves any unrelated params
   *  the host page may own (tab, view, etc.). */
  const handleClearAll = () => {
    setSearch("");
    const overrides: Record<string, string | null> = { search: null };
    for (const filter of filters) overrides[filter.key] = null;
    navigate(buildParams(overrides));
    restoreFocus();
  };

  /** Popover-local reset: clears the filters but keeps the search term. */
  const handleResetFilters = () => {
    const overrides: Record<string, string | null> = {};
    for (const filter of filters) overrides[filter.key] = null;
    navigate(withPendingSearch(overrides));
    // This button unmounts once the count hits zero; hand focus back to the
    // trigger (which also dismisses the popover) rather than dropping to <body>.
    restoreFocus();
  };

  const noun = resultCount === 1 ? itemNoun.one : itemNoun.many;

  return (
    <div className="bg-card mb-6 rounded-lg border p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Search — inline, highest-frequency control. Submits on Enter only. */}
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              aria-label={searchAriaLabel}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* `secondary`, not the default filled variant. The page's own primary
              action (Create X) is already a filled button; a second one here
              would give the screen two primaries and neither would read as THE
              action. Three tiers: filled = create, secondary = submit search,
              outline = open filters. */}
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-3 md:shrink-0">
          {/* Announced after a filter change; the region stays mounted so the
              update is a live change rather than a fresh insertion. */}
          <span
            role="status"
            aria-live="polite"
            className="text-muted-foreground text-xs whitespace-nowrap"
          >
            {hasActiveFilters && typeof resultCount === "number"
              ? `${resultCount} ${noun} found`
              : ""}
          </span>

          {filters.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  ref={filterTriggerRef}
                  type="button"
                  variant="outline"
                  className="flex-1 md:flex-none"
                  aria-label={
                    activeFilterCount > 0
                      ? `Filters, ${activeFilterCount} active`
                      : "Filters, none active"
                  }
                >
                  <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="bg-primary text-primary-foreground ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums"
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Filters</p>
                  {activeFilterCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 px-2 text-xs"
                      onClick={handleResetFilters}
                    >
                      Reset
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {filters.map((filter) => {
                    const labelId = `${fieldIdPrefix}-${filter.key}-label`;
                    const triggerId = `${fieldIdPrefix}-${filter.key}`;
                    return (
                      <div key={filter.key} className="flex flex-col gap-2">
                        <Label id={labelId} htmlFor={triggerId}>
                          {filter.label}
                        </Label>
                        <Select
                          value={valueFor(filter)}
                          onValueChange={(value) =>
                            handleFilterChange(filter, value)
                          }
                        >
                          <SelectTrigger
                            id={triggerId}
                            // Name = "<label> <current value>" so the selection is
                            // announced alongside the field name.
                            aria-labelledby={`${labelId} ${triggerId}`}
                            className="w-full"
                          >
                            <SelectValue placeholder={filter.label} />
                          </SelectTrigger>
                          <SelectContent>
                            {filter.options.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div
          role="group"
          aria-label="Active filters"
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          {chips.map((chip) => (
            <span
              key={chip.key}
              className={cn(
                "bg-muted text-foreground inline-flex h-8 items-center gap-1.5",
                "rounded-full py-1 pr-1 pl-3 text-xs font-medium",
              )}
            >
              <span className="text-muted-foreground">{chip.label}:</span>
              <span className="max-w-[14rem] truncate">{chip.valueLabel}</span>
              <button
                type="button"
                onClick={() => handleRemoveChip(chip.key)}
                aria-label={`Remove ${chip.label} filter`}
                className="text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-ring/50 grid size-6 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </span>
          ))}
          {chips.length >= 2 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs"
              onClick={handleClearAll}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
