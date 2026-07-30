"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";

import { PinkBadge } from "../shared/pink-badge";
import { PinkEmptyState } from "../shared/pink-empty-state";
import { PinkFilterChips } from "../shared/pink-filter-chips";
import { PinkImageFallback } from "../shared/pink-image-fallback";
import { PinkReveal } from "../shared/pink-reveal";
import { estimateReadMinutes, formatBlogDate } from "./pink-blog-shared";

type BlogPost = DefaultBlogPageTemplateProps["pages"][number];

const PAGE_SIZE = 9;

type Props = {
  pages: BlogPost[];
  journalLabel: string;
  showFeatured: boolean;
  featuredBadge: string;
  emptyHeading: string;
  emptyBody: string;
  emptyCtaLabel: string;
  emptyCtaLink: string;
  searchEmptyMessage: string;
};

/**
 * `blog.featured` (hideable) + `blog.grid` (not hideable) — the interactive
 * half of the blog index. Server parent (`pink-blog-page.tsx`) resolves
 * fields and hands off here for the client-side sort + "load more" state
 * (server → client handoff idiom).
 *
 * DEVIATION: design.md's "hairline category chip row (categories derived
 * from the posts)" is not implemented — `Page` has no category/taxonomy
 * column, so a fake category chip row would be non-functional. The same
 * hairline chip row is repurposed as a real Newest/Oldest sort control.
 */
export function PinkBlogListing({
  pages,
  journalLabel,
  showFeatured,
  featuredBadge,
  emptyHeading,
  emptyBody,
  emptyCtaLabel,
  emptyCtaLink,
  searchEmptyMessage,
}: Props) {
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const postsWithSearchBlob = useMemo(
    () => pages.map((p) => ({ post: p, blob: buildBlogSearchBlob(p) })),
    [pages],
  );

  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const searchResults = useMemo(
    () =>
      isSearching
        ? postsWithSearchBlob
            .filter(({ blob }) => blobIncludesQuery(blob, trimmedQuery))
            .map(({ post }) => post)
        : [],
    [isSearching, postsWithSearchBlob, trimmedQuery],
  );

  // Searching supersedes the featured spotlight and the sort/pagination —
  // it's a flat, relevance-agnostic result list over every post.
  const featured = showFeatured && !isSearching ? pages[0] : undefined;
  const rest = featured ? pages.slice(1) : pages;
  const sorted = useMemo(
    () => (sort === "oldest" ? [...rest].reverse() : rest),
    [rest, sort],
  );
  const visible = isSearching ? searchResults : sorted.slice(0, visibleCount);
  const hasMore = !isSearching && visibleCount < sorted.length;

  if (pages.length === 0) {
    return (
      <section
        className="px-5 py-16 md:px-10 md:py-20"
        {...sectionGroupAttr("blog", "grid")}
      >
        <div className="mx-auto max-w-[1400px]">
          <PinkEmptyState
            heading={emptyHeading}
            body={emptyBody || undefined}
            ctaLabel={emptyCtaLabel || undefined}
            ctaHref={emptyCtaLabel ? emptyCtaLink : undefined}
          />
        </div>
      </section>
    );
  }

  return (
    <>
      {featured && (
        <section
          className="px-5 pt-12 pb-4 md:px-10 md:pt-16"
          aria-label="Featured post"
          {...sectionGroupAttr("blog", "featured")}
        >
          <PinkReveal
            className="mx-auto grid max-w-[1400px] md:grid-cols-[1.1fr_.9fr]"
            style={{ border: "1px solid var(--pink-line)", background: "var(--pink-white)" }}
          >
            <Link
              href={`/blog/${featured.slug}`}
              className="group relative block overflow-hidden"
              style={{ aspectRatio: "16/10", background: "var(--pink-panel)" }}
            >
              {featured.image ? (
                <Image
                  src={featured.image}
                  alt={featured.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 55vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <PinkImageFallback surface="paper" className="absolute inset-0" />
              )}
              <span className="absolute top-3 left-3" {...fieldAttr("pink.blog.featured-badge")}>
                <PinkBadge>{featuredBadge}</PinkBadge>
              </span>
            </Link>
            <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
              <p className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                <span>{journalLabel}</span>
                <span aria-hidden="true"> · </span>
                <span>{formatBlogDate(featured.createdAt)}</span>
                <span aria-hidden="true"> · </span>
                <span>{estimateReadMinutes(featured.content)} min read</span>
              </p>
              <Link
                href={`/blog/${featured.slug}`}
                className="pink-display block max-w-[22ch]"
                style={{
                  fontSize: "clamp(24px, 2.6vw, 32px)",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  color: "var(--pink-ink)",
                }}
              >
                {featured.title}
              </Link>
              {featured.excerpt && (
                <p
                  className="max-w-[48ch] text-[15px] leading-[1.7]"
                  style={{ color: "var(--pink-muted)" }}
                >
                  {featured.excerpt}
                </p>
              )}
              <Link
                href={`/blog/${featured.slug}`}
                className="text-[15px] font-medium"
                style={{ color: "var(--pink-rose)" }}
              >
                Read the post →
              </Link>
            </div>
          </PinkReveal>
        </section>
      )}

      <section
        className="px-5 pt-8 pb-16 md:px-10 md:pt-10 md:pb-20"
        {...sectionGroupAttr("blog", "grid")}
      >
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-6 flex justify-end">
            <label className="relative block w-full max-w-[280px]">
              <span className="sr-only">Search posts</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                style={{
                  color: searchFocused ? "var(--pink-rose)" : "var(--pink-subtle)",
                }}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search posts…"
                className="pink-input w-full"
                style={{ paddingLeft: "38px" }}
              />
            </label>
          </div>

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {isSearching
              ? `${searchResults.length} ${searchResults.length === 1 ? "post" : "posts"} match "${query.trim()}"`
              : ""}
          </p>

          <div
            className="mb-8 flex flex-wrap items-end justify-between gap-4 pb-5"
            style={{ borderBottom: "1px solid var(--pink-line)" }}
          >
            <h2
              className="pink-display"
              style={{ fontSize: "clamp(26px, 2.8vw, 38px)", fontWeight: 600, letterSpacing: "-0.025em" }}
            >
              {isSearching
                ? `${searchResults.length} ${searchResults.length === 1 ? "result" : "results"}`
                : `${sorted.length} ${sorted.length === 1 ? "post" : "posts"}`}
            </h2>
            {!isSearching && (
              <PinkFilterChips
                aria-label="Sort posts"
                activeId={sort}
                onSelect={(id) => {
                  setSort(id === "oldest" ? "oldest" : "newest");
                  setVisibleCount(PAGE_SIZE);
                }}
                items={[
                  { id: "newest", label: "Newest" },
                  { id: "oldest", label: "Oldest" },
                ]}
              />
            )}
          </div>

          {visible.length === 0 ? (
            isSearching ? (
              <div
                className="flex flex-col items-center gap-2 p-12 text-center"
                style={{ background: "var(--pink-panel)", border: "1px solid var(--pink-line)" }}
              >
                <p
                  className="pink-display text-[18px] font-semibold"
                  {...fieldAttr("pink.blog.search-empty-state")}
                >
                  {searchEmptyMessage}
                </p>
                <p className="text-[14px]" style={{ color: "var(--pink-muted)" }}>
                  Try a different word, or{" "}
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="font-medium underline"
                    style={{ color: "var(--pink-rose)" }}
                  >
                    clear the search
                  </button>
                  .
                </p>
              </div>
            ) : (
              <PinkEmptyState
                heading={emptyHeading}
                body={emptyBody || undefined}
                ctaLabel={emptyCtaLabel || undefined}
                ctaHref={emptyCtaLabel ? emptyCtaLink : undefined}
              />
            )
          ) : (
            <>
              <div className="grid grid-cols-1 gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((post, i) => (
                  <PinkReveal as="article" key={post.slug} index={i % 6} className="flex flex-col">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="pink-lift relative block overflow-hidden"
                      style={{ aspectRatio: "4/3", background: "var(--pink-panel)" }}
                    >
                      {post.image ? (
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <PinkImageFallback surface="paper" className="absolute inset-0" />
                      )}
                    </Link>
                    <div
                      className="mt-4 flex flex-1 flex-col gap-2 pt-4"
                      style={{ borderTop: "1px solid var(--pink-ink)" }}
                    >
                      <p className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                        <span>{journalLabel}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{formatBlogDate(post.createdAt)}</span>
                      </p>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="pink-display"
                        style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--pink-ink)" }}
                      >
                        {post.title}
                      </Link>
                      {post.excerpt && (
                        <p
                          className="line-clamp-2 text-[15px] leading-[1.6]"
                          style={{ color: "var(--pink-muted)" }}
                        >
                          {post.excerpt}
                        </p>
                      )}
                      <p className="mt-auto text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                        {estimateReadMinutes(post.content)} min read
                      </p>
                    </div>
                  </PinkReveal>
                ))}
              </div>

              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="pink-btn pink-btn-ghost"
                  >
                    Older posts
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
