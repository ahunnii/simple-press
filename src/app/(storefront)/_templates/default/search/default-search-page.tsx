import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import type { SearchPageTemplateProps } from "../../types";
import type { SearchPopularLink } from "~/app/(storefront)/_components/search/popular";
import type {
  SiteSearchGroup,
  SiteSearchItem,
  SiteSearchType,
} from "~/server/search/site-search-types";
import {
  SITE_SEARCH_MAX_LENGTH,
  SITE_SEARCH_MIN_LENGTH,
} from "~/server/search/site-search-types";
import { Highlight } from "~/app/(storefront)/_components/search/highlight";
import { SearchTypeIcon } from "~/app/(storefront)/_components/search/search-type-icon";

/**
 * Default `/search` page — the fallback for every template (`getTemplate`
 * merges it in). Template-neutral on purpose: colours and radii come from the
 * scoped `.sp-search` variables in globals.css (accent = the template's
 * `--sp-button-bg`), text colour and fonts inherit from the template root.
 *
 * Works without JavaScript: the search box is a plain GET form and the type
 * tabs are links (`?q=…&type=products`).
 */

function searchHref(q: string, type?: SiteSearchType): string {
  const params = new URLSearchParams({ q });
  if (type) params.set("type", type);
  return `/search?${params.toString()}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function DefaultSearchPage({
  result,
  q,
  type,
  popular,
}: SearchPageTemplateProps) {
  const query = q.trim();
  const hasQuery = query.length >= SITE_SEARCH_MIN_LENGTH;
  const groups = type
    ? result.groups.filter((g) => g.type === type)
    : result.groups;

  let sub = "Find products, pages, and answers.";
  if (hasQuery) {
    sub =
      result.total > 0
        ? `${plural(result.total, "result")} for “${query}”`
        : `No results for “${query}”`;
  } else if (query.length > 0) {
    sub = `Type at least ${SITE_SEARCH_MIN_LENGTH} characters to search.`;
  }

  return (
    <div className="sp-search sp-search-page">
      <div className="sp-search-page-inner">
        <header className="sp-search-page-head">
          <h1 className="sp-search-title">Search</h1>
          <p className="sp-search-page-sub" aria-live="polite">
            {sub}
          </p>
        </header>

        <form
          action="/search"
          method="get"
          role="search"
          className="sp-search-page-form"
        >
          <label htmlFor="sp-search-page-q" className="sr-only">
            Search this site
          </label>
          <span className="sp-search-page-field">
            <Search
              className="sp-search-page-field-icon"
              aria-hidden="true"
              strokeWidth={1.75}
            />
            <input
              id="sp-search-page-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search products, services, pages…"
              maxLength={SITE_SEARCH_MAX_LENGTH}
              autoComplete="off"
              enterKeyHint="search"
              className="sp-search-page-input"
            />
          </span>
          <button type="submit" className="sp-search-page-submit">
            Search
          </button>
        </form>

        {hasQuery && result.total > 0 ? (
          <nav aria-label="Result types" className="sp-search-tabs">
            <Link
              href={searchHref(query)}
              aria-current={type === null ? "page" : undefined}
              className="sp-search-tab"
            >
              All <span className="sp-search-tab-count">{result.total}</span>
            </Link>
            {result.groups.map((g) => (
              <Link
                key={g.type}
                href={searchHref(query, g.type)}
                aria-current={type === g.type ? "page" : undefined}
                className="sp-search-tab"
              >
                {g.label} <span className="sp-search-tab-count">{g.count}</span>
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="sp-search-page-body">
          {!hasQuery ? (
            <PopularChips links={popular} heading="Popular" />
          ) : result.total === 0 ? (
            <div className="sp-search-none">
              <p className="sp-search-none-title">No matches for “{query}”.</p>
              <p className="sp-search-note">
                Check the spelling, or try a shorter or more general word.
              </p>
              <PopularChips links={popular} heading="Or browse" />
            </div>
          ) : groups.length === 0 ? (
            <div className="sp-search-none">
              <p className="sp-search-none-title">
                Nothing of this kind matches “{query}”.
              </p>
              <Link href={searchHref(query)} className="sp-search-seeall">
                See all {plural(result.total, "result")}{" "}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            groups.map((group) => (
              <ResultSection
                key={group.type}
                group={group}
                query={query}
                single={type !== null}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ResultSection({
  group,
  query,
  single,
}: {
  group: SiteSearchGroup;
  query: string;
  /** Rendering one type tab (no "See all", a truncation note instead). */
  single: boolean;
}) {
  const headingId = `sp-search-section-${group.type}`;
  const truncated = group.count > group.items.length;
  return (
    <section aria-labelledby={headingId} className="sp-search-section">
      <div className="sp-search-section-head">
        <h2 id={headingId} className="sp-search-section-title">
          {group.label}
          <span className="sp-search-tab-count">{group.count}</span>
        </h2>
        {!single && truncated ? (
          <Link
            href={searchHref(query, group.type)}
            className="sp-search-seeall"
          >
            See all {group.count} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>

      {group.type === "products" ? (
        <ul className="sp-search-grid">
          {group.items.map((item) => (
            <li key={item.id}>
              <ProductCard item={item} query={query} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="sp-search-rows">
          {group.items.map((item) => (
            <li key={item.id}>
              <ResultRow item={item} query={query} />
            </li>
          ))}
        </ul>
      )}

      {single && truncated ? (
        <p className="sp-search-note">
          Showing the first {group.items.length} of {group.count}. Add another
          word to narrow it down.
        </p>
      ) : null}
    </section>
  );
}

function ProductCard({ item, query }: { item: SiteSearchItem; query: string }) {
  return (
    <Link href={item.href} className="sp-search-card">
      <span className="sp-search-card-media">
        {item.image ? (
          <Image
            src={item.image}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 260px"
          />
        ) : (
          <SearchTypeIcon type={item.type} className="sp-search-card-icon" />
        )}
      </span>
      <span className="sp-search-card-title">
        <Highlight text={item.title} query={query} />
      </span>
      {item.subtitle ? (
        <span className="sp-search-row-sub">{item.subtitle}</span>
      ) : null}
      {item.priceLabel ? (
        <span className="sp-search-card-price">{item.priceLabel}</span>
      ) : null}
    </Link>
  );
}

function ResultRow({ item, query }: { item: SiteSearchItem; query: string }) {
  return (
    <Link href={item.href} className="sp-search-row sp-search-row--page">
      <span className="sp-search-thumb">
        {item.image ? (
          <Image src={item.image} alt="" width={48} height={48} sizes="48px" />
        ) : (
          <SearchTypeIcon type={item.type} />
        )}
      </span>
      <span className="sp-search-row-text">
        <span className="sp-search-row-title">
          <Highlight text={item.title} query={query} />
        </span>
        {item.subtitle ? (
          <span className="sp-search-row-sub">{item.subtitle}</span>
        ) : null}
        {item.snippet ? (
          <span className="sp-search-row-snippet">
            <Highlight text={item.snippet} query={query} />
          </span>
        ) : null}
      </span>
      {item.priceLabel ? (
        <span className="sp-search-row-price">{item.priceLabel}</span>
      ) : null}
    </Link>
  );
}

function PopularChips({
  links,
  heading,
}: {
  links: SearchPopularLink[];
  heading: string;
}) {
  if (links.length === 0) return null;
  return (
    <div className="sp-search-empty">
      <h2 className="sp-search-group-label">{heading}</h2>
      <ul className="sp-search-chips">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="sp-search-chip">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
