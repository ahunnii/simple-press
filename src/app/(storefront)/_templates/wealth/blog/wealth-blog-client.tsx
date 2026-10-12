"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { usePageParam } from "~/hooks/use-page-param";

import { WealthBlock } from "../shared/wealth-block";
import {
  WealthLedgeButton,
  wealthLedgeButtonClasses,
} from "../shared/wealth-ledge-button";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";
import { WealthBlogCard } from "./wealth-blog-card";

type Props = {
  pages: DefaultBlogPageTemplateProps["pages"];
};

/** Posts shown per "Load More" step: the featured card + a 3-up grid. */
const PAGE_SIZE = 9;

/**
 * Client list for the News + Notes index: a client-side search (required by
 * the BlogPage playbook — `buildBlogSearchBlob`/`blobIncludesQuery`, with an
 * `aria-live` result-count announcer) layered on a crawlable "Load More"
 * (`?page=N` shows the first N × PAGE_SIZE posts; `getBlogPages()` already
 * returns every published post, so it reveals more of the same array).
 * The newest visible post renders as the wide featured card, the rest as a
 * 3-up grid (a short last row is centred by CSS). Searching shows every
 * match at once in a plain grid (no featured card) and hides Load More.
 *
 * The search form sits OUTSIDE every reveal wrapper (forms never go in
 * reveals); only the card blocks reveal.
 */
export function WealthBlogClient({ pages }: Props) {
  const [query, setQuery] = useState("");
  // "Load More" is URL-backed so each step is a crawlable link.
  const { page, goToPage, pageLinkProps } = usePageParam();
  const visibleCount = page * PAGE_SIZE;

  const postsWithSearch = useMemo(
    () => pages.map((p) => ({ post: p, searchBlob: buildBlogSearchBlob(p) })),
    [pages],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return postsWithSearch
      .filter(({ searchBlob }) => blobIncludesQuery(searchBlob, q))
      .map(({ post }) => post);
  }, [query, pages, postsWithSearch]);

  const isSearching = query.trim().length > 0;
  const visible = isSearching ? filtered : pages.slice(0, visibleCount);
  const canLoadMore = !isSearching && visibleCount < pages.length;
  // The wide "newest post" card is for the browse view only; search results
  // are a uniform grid (the first match is not "the newest post").
  const featured = isSearching ? undefined : visible[0];
  const rest = isSearching ? visible : visible.slice(1);

  return (
    <WealthBlock tone="paper" aria-label="Posts" className="wealth-blog-list">
      <form
        role="search"
        className="wealth-blog-search"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor="wealth-blog-search" className="sr-only">
          Search News + Notes posts
        </label>
        <Search aria-hidden="true" className="wealth-blog-search__icon" />
        <input
          id="wealth-blog-search"
          type="search"
          className="wealth-blog-search__input"
          placeholder="Search posts…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (page > 1) goToPage(1, { scroll: false });
          }}
        />
      </form>

      {/* Screen-reader result count */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isSearching
          ? `${filtered.length} post${filtered.length === 1 ? "" : "s"} found`
          : ""}
      </p>

      {visible.length === 0 ? (
        <div className="wealth-blog-none wealth-on-surface" role="status">
          <p className="wealth-blog-none__title">
            No posts match &ldquo;{query.trim()}&rdquo;.
          </p>
          <p className="wealth-blog-none__body">
            Try a different word, or clear the search to see every post.
          </p>
          <WealthLedgeButton
            variant="forest"
            onClick={() => {
              setQuery("");
            }}
          >
            Clear search
          </WealthLedgeButton>
        </div>
      ) : (
        <>
          {featured ? (
            <WealthReveal threshold={0}>
              <WealthBlogCard post={featured} headingLevel="h2" featured />
            </WealthReveal>
          ) : null}

          {rest.length > 0 ? (
            <WealthRevealGroup
              threshold={0}
              className="wealth-posts wealth-blog-grid"
            >
              {rest.map((post, i) => (
                <WealthBlogCard
                  key={post.slug}
                  post={post}
                  index={i % PAGE_SIZE}
                  headingLevel="h2"
                />
              ))}
            </WealthRevealGroup>
          ) : null}

          {canLoadMore ? (
            <div className="wealth-btn-row wealth-btn-row--center wealth-blog-more">
              <a
                {...pageLinkProps(page + 1, { scroll: false })}
                className={wealthLedgeButtonClasses({ variant: "outline" })}
              >
                Load More
              </a>
            </div>
          ) : null}
        </>
      )}
    </WealthBlock>
  );
}
