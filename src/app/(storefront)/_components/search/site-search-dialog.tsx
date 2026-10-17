"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { keepPreviousData } from "@tanstack/react-query";
import { Search, X } from "lucide-react";

import type { SearchPopularLink } from "./popular";
import type { SiteSearchItem } from "~/server/search/site-search-types";
import {
  SITE_SEARCH_MAX_LENGTH,
  SITE_SEARCH_MIN_LENGTH,
} from "~/server/search/site-search-types";
import { api } from "~/trpc/react";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { Dialog, DialogPortal } from "~/components/ui/dialog";

import { Highlight } from "./highlight";
import { SearchTypeIcon } from "./search-type-icon";

/**
 * The quick-search dialog (typeahead). Loaded lazily by `SiteSearchProvider`
 * on first open — never import it statically from a header.
 *
 * Portal: rendered into `container` (the template root carrying
 * `data-sp-template-root`), not <body>, so the template's CSS variables
 * (`--sp-button-*`, fonts) still apply. Surface colours are read from that
 * root's computed style on open and set as `--sp-search-surface-bg/-fg`
 * (a template override of `--sp-search-bg/-fg` still wins).
 */

const DEBOUNCE_MS = 200;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: HTMLElement | null;
  popular: SearchPopularLink[];
  seed: { query: string; nonce: number } | null;
};

function isTransparent(color: string): boolean {
  if (!color || color === "transparent") return true;
  // rgba(0, 0, 0, 0) / color(srgb 0 0 0 / 0)
  return /(?:,|\/)\s*0(?:\.0+)?\s*\)$/.test(color);
}

/** Template surface colours: the root's text colour, and the first opaque
 *  background walking up from the root. Falls back to the CSS defaults. */
function readSurface(root: HTMLElement | null): React.CSSProperties {
  if (!root) return {};
  const vars: Record<string, string> = {};
  const fg = getComputedStyle(root).color;
  if (fg) vars["--sp-search-surface-fg"] = fg;
  for (let el: HTMLElement | null = root; el; el = el.parentElement) {
    const bg = getComputedStyle(el).backgroundColor;
    if (!isTransparent(bg)) {
      vars["--sp-search-surface-bg"] = bg;
      break;
    }
  }
  return vars as React.CSSProperties;
}

function searchHref(q: string): string {
  return `/search?q=${encodeURIComponent(q)}`;
}

export function SiteSearchDialog({
  open,
  onOpenChange,
  container,
  popular,
  seed,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const [query, setQuery] = useState(seed?.query ?? "");
  // A later open({ query }) re-seeds the input.
  const [seenSeed, setSeenSeed] = useState(seed);
  if (seed !== seenSeed) {
    setSeenSeed(seed);
    if (seed) setQuery(seed.query);
  }

  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const wantsResults = trimmed.length >= SITE_SEARCH_MIN_LENGTH;

  const search = api.storefrontSearch.query.useQuery(
    { q: debounced },
    {
      enabled: open && debounced.length >= SITE_SEARCH_MIN_LENGTH,
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    },
  );

  const data = wantsResults ? search.data : undefined;
  // Results on screen belong to an older query (still typing / fetching).
  const stale =
    debounced !== trimmed || search.isFetching || search.isPlaceholderData;
  const loading = wantsResults && stale;

  const flat = useMemo<SiteSearchItem[]>(
    () => data?.groups.flatMap((g) => g.items) ?? [],
    [data],
  );

  // Highlighted row, keyed to the result set so a new query starts at "none"
  // without a reset effect.
  const resultKey = `${data?.q ?? ""}|${trimmed}`;
  const [active, setActive] = useState<{ key: string; index: number }>({
    key: "",
    index: -1,
  });
  const activeIndex =
    active.key === resultKey && active.index < flat.length ? active.index : -1;
  const setActiveIndex = (index: number) =>
    setActive({ key: resultKey, index });

  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView({ block: "nearest" });
    // optionId is derived from the stable useId value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const surface = useMemo(
    () => (open ? readSurface(container) : {}),
    [open, container],
  );

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flat.length)
        setActiveIndex(Math.min(activeIndex + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length) setActiveIndex(Math.max(activeIndex - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = activeIndex >= 0 ? flat[activeIndex] : undefined;
      if (item) go(item.href);
      else if (wantsResults) go(searchHref(trimmed));
    }
  };

  const hasResults = !!data && data.total > 0;
  const showNoResults = !!data && data.total === 0 && !stale;
  const rateLimited = search.error?.data?.code === "TOO_MANY_REQUESTS";
  const showError = wantsResults && search.isError && !hasResults;

  let status = "";
  if (hasResults && !stale) {
    status = `${data.total} result${data.total === 1 ? "" : "s"}`;
  } else if (showNoResults) {
    status = "No results";
  }

  let rowIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal container={container ?? undefined}>
        <div className="sp-search sp-search-layer" style={surface}>
          <DialogPrimitive.Overlay className="sp-search-scrim" />
          <DialogPrimitive.Content
            className="sp-search-panel"
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              inputRef.current?.focus();
              inputRef.current?.select();
            }}
            onEscapeKeyDown={(e) => {
              // Esc clears first, closes second.
              if (query) {
                e.preventDefault();
                setQuery("");
              }
            }}
          >
            <DialogPrimitive.Title className="sr-only">
              Search this site
            </DialogPrimitive.Title>

            <div className="sp-search-bar">
              <Search
                className="sp-search-bar-icon"
                aria-hidden="true"
                strokeWidth={1.75}
              />
              <input
                ref={inputRef}
                type="text"
                inputMode="search"
                enterKeyHint="search"
                role="combobox"
                aria-label="Search"
                aria-autocomplete="list"
                aria-expanded={hasResults}
                aria-controls={hasResults ? listboxId : undefined}
                aria-activedescendant={
                  activeIndex >= 0 ? optionId(activeIndex) : undefined
                }
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={SITE_SEARCH_MAX_LENGTH}
                placeholder="Search products, services, pages…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                className="sp-search-input"
              />
              <span
                className="sp-search-spinner"
                data-active={loading ? "" : undefined}
                aria-hidden="true"
              />
              <kbd className="sp-search-esc" aria-hidden="true">
                esc
              </kbd>
              <DialogPrimitive.Close
                className="sp-search-close"
                aria-label="Close search"
              >
                <X aria-hidden="true" strokeWidth={1.75} />
              </DialogPrimitive.Close>
            </div>

            <div className="sp-search-body">
              {!wantsResults ? (
                <EmptyState
                  popular={popular}
                  onPick={() => onOpenChange(false)}
                  hint={
                    trimmed.length > 0
                      ? "Keep typing…"
                      : "Search products, services, pages and more."
                  }
                />
              ) : showError ? (
                <p className="sp-search-note">
                  {rateLimited
                    ? "That’s a lot of searches — try again in a moment."
                    : "Search isn’t available right now. Please try again."}
                </p>
              ) : hasResults ? (
                <div
                  id={listboxId}
                  role="listbox"
                  aria-label="Search results"
                  className="sp-search-list"
                  data-stale={stale ? "" : undefined}
                >
                  {data.groups.map((group) => {
                    const labelId = `${baseId}-group-${group.type}`;
                    return (
                      <div
                        key={group.type}
                        role="group"
                        aria-labelledby={labelId}
                        className="sp-search-group"
                      >
                        <div id={labelId} className="sp-search-group-label">
                          {group.label}
                        </div>
                        {group.items.map((item) => {
                          rowIndex += 1;
                          const i = rowIndex;
                          const selected = i === activeIndex;
                          return (
                            <Link
                              key={item.id}
                              id={optionId(i)}
                              href={item.href}
                              prefetch={false}
                              role="option"
                              aria-selected={selected}
                              tabIndex={-1}
                              data-active={selected ? "" : undefined}
                              className="sp-search-row"
                              onPointerMove={() => {
                                if (!selected) setActiveIndex(i);
                              }}
                              onClick={() => onOpenChange(false)}
                            >
                              <span className="sp-search-thumb">
                                {item.image ? (
                                  <Image
                                    src={item.image}
                                    alt=""
                                    width={40}
                                    height={40}
                                    sizes="40px"
                                  />
                                ) : (
                                  <SearchTypeIcon type={item.type} />
                                )}
                              </span>
                              <span className="sp-search-row-text">
                                <span className="sp-search-row-title">
                                  <Highlight
                                    text={item.title}
                                    query={trimmed}
                                  />
                                </span>
                                {item.snippet ? (
                                  <span className="sp-search-row-sub">
                                    <Highlight
                                      text={item.snippet}
                                      query={trimmed}
                                    />
                                  </span>
                                ) : item.subtitle ? (
                                  <span className="sp-search-row-sub">
                                    {item.subtitle}
                                  </span>
                                ) : null}
                              </span>
                              {item.priceLabel ? (
                                <span className="sp-search-row-price">
                                  {item.priceLabel}
                                </span>
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : showNoResults ? (
                <div className="sp-search-none">
                  <p className="sp-search-none-title">
                    No matches for “{trimmed}”.
                  </p>
                  <p className="sp-search-note">
                    Check the spelling, or try a shorter or more general word.
                  </p>
                  <EmptyState
                    popular={popular}
                    onPick={() => onOpenChange(false)}
                    heading="Or browse"
                  />
                </div>
              ) : (
                <p className="sp-search-note">Searching…</p>
              )}
            </div>

            <div className="sp-search-foot">
              <span className="sp-search-hints" aria-hidden="true">
                <kbd>↑</kbd>
                <kbd>↓</kbd> to move <span className="sp-search-dot">·</span>{" "}
                <kbd>enter</kbd> to open
              </span>
              {hasResults ? (
                <Link
                  href={searchHref(trimmed)}
                  prefetch={false}
                  className="sp-search-seeall"
                  onClick={() => onOpenChange(false)}
                >
                  See all {data.total} result{data.total === 1 ? "" : "s"}{" "}
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </div>

            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {status}
            </div>
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

function EmptyState({
  popular,
  onPick,
  heading = "Popular",
  hint,
}: {
  popular: SearchPopularLink[];
  onPick: () => void;
  heading?: string;
  hint?: string;
}) {
  return (
    <div className="sp-search-empty">
      {hint ? <p className="sp-search-note">{hint}</p> : null}
      {popular.length > 0 ? (
        <>
          <div className="sp-search-group-label">{heading}</div>
          <ul className="sp-search-chips">
            {popular.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  className="sp-search-chip"
                  onClick={onPick}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
