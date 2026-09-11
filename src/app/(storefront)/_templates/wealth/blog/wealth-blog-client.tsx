"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { cn } from "~/lib/utils";

import { useWealthReveal } from "../hooks/use-wealth-reveal";
import { WealthBlogCard } from "./wealth-blog-card";

type Props = {
  pages: DefaultBlogPageTemplateProps["pages"];
};

/** Cards shown per "Load More" click — a 3-column × 3-row page on desktop. */
const PAGE_SIZE = 9;

/**
 * Client list for the News + Notes index: a client-side search (required by
 * the BlogPage playbook — `buildBlogSearchBlob`/`blobIncludesQuery`, with an
 * `aria-live` result-count announcer) layered on top of the site's real
 * "Load More" affordance (the ditto clone source shows a static PT-Sans
 * italic "Load More" link at the foot of the list, not true pagination —
 * `getBlogPages()` already returns every published post, so "Load More"
 * reveals more of that same array rather than a real page-2 fetch).
 * Searching shows every match at once and hides Load More, mirroring vii's
 * `ViiBlogClient` conditional.
 */
export function WealthBlogClient({ pages }: Props) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  const { ref: gridRef, visible: gridVisible } = useWealthReveal(0.05);

  return (
    <div>
      {/* Search */}
      <div
        className="mx-auto"
        style={{
          maxWidth: 360,
          marginBottom: "calc(var(--wealth-rhythm) * 2)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid var(--wealth-surface-2)",
          paddingBottom: 10,
        }}
      >
        <Search
          aria-hidden="true"
          style={{ width: 15, height: 15, color: "var(--wealth-muted)", flexShrink: 0 }}
        />
        <input
          type="search"
          placeholder="Search posts…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          aria-label="Search News + Notes posts"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outlineOffset: 2,
            fontFamily: "var(--font-wealth-body)",
            fontSize: 15,
            color: "var(--wealth-ink)",
          }}
        />
      </div>

      {/* Screen-reader result count */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isSearching
          ? `${filtered.length} post${filtered.length === 1 ? "" : "s"} found`
          : ""}
      </p>

      {isSearching && filtered.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-wealth-body)",
            fontSize: 16,
            color: "var(--wealth-muted)",
            textAlign: "center",
            padding: "calc(var(--wealth-rhythm) * 2) 0",
          }}
        >
          No posts match your search.
        </p>
      ) : (
        <>
          <div
            ref={gridRef}
            className={cn("wealth-reveal-group grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", gridVisible && "is-visible")}
            style={{
              columnGap: "var(--wealth-gutter)",
              rowGap: "calc(var(--wealth-rhythm) * 2)",
            }}
          >
            {visible.map((post, i) => (
              <WealthBlogCard
                key={post.slug}
                post={post}
                index={i % PAGE_SIZE}
                headingLevel="h2"
              />
            ))}
          </div>

          {canLoadMore && (
            <div
              style={{
                textAlign: "center",
                marginTop: "calc(var(--wealth-rhythm) * 2)",
              }}
            >
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-wealth-sub)",
                  fontStyle: "italic",
                  fontSize: 21,
                  letterSpacing: "0.21px",
                  color: "var(--wealth-primary)",
                }}
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
