"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import type { GloveBlogPost } from "./glove-blog-card";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { usePageParam } from "~/hooks/use-page-param";

import {
  gloveButtonClass,
  GloveInput,
  GloveRevealGroup,
  gloveRevealItemStyle,
} from "../shared";
import { GloveBlogCard } from "./glove-blog-card";

const PAGE_SIZE = 9;

type GloveBlogGridProps = {
  posts: GloveBlogPost[];
  readMoreLabel: string;
  loadMoreLabel: string;
  searchEmptyMessage: string;
};

/**
 * Search + 3-col card grid + "load more". Page state is the URL's `?page=N`
 * (shows the first N x PAGE_SIZE posts); the load-more control is a real
 * `<a href="?page=N+1">` so every step is crawlable (baseline B1.8). While
 * searching, results are a flat match list across every post.
 */
export function GloveBlogGrid({
  posts,
  readMoreLabel,
  loadMoreLabel,
  searchEmptyMessage,
}: GloveBlogGridProps) {
  const { page, pageLinkProps } = usePageParam();
  const [query, setQuery] = useState("");

  const withBlobs = useMemo(
    () => posts.map((post) => ({ post, blob: buildBlogSearchBlob(post) })),
    [posts],
  );

  const trimmed = query.trim().toLowerCase();
  const isSearching = trimmed.length > 0;

  const results = useMemo(
    () =>
      isSearching
        ? withBlobs
            .filter(({ blob }) => blobIncludesQuery(blob, trimmed))
            .map(({ post }) => post)
        : posts,
    [isSearching, withBlobs, trimmed, posts],
  );

  const visibleCount = page * PAGE_SIZE;
  const visible = isSearching ? results : results.slice(0, visibleCount);
  const hasMore = !isSearching && visibleCount < results.length;

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <div className="relative w-full max-w-[320px]">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-[var(--glove-muted)]"
        />
        <GloveInput
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts"
          aria-label="Search blog posts"
          className="rounded-none border-0 border-b border-[var(--glove-muted)] bg-transparent pr-0 pl-7 focus-visible:border-b-2 focus-visible:border-[var(--glove-primary)] focus-visible:shadow-none"
        />
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isSearching
          ? `${results.length} post${results.length === 1 ? "" : "s"} found`
          : ""}
      </p>

      {visible.length === 0 ? (
        <p
          className="glove-body py-10 text-center text-[16px] text-[var(--glove-muted)]"
          {...fieldAttr("glove.blog.listing-search-empty")}
        >
          {searchEmptyMessage}
        </p>
      ) : (
        <GloveRevealGroup
          threshold={0}
          className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((post, i) => (
            <GloveBlogCard
              key={post.id}
              post={post}
              readMoreLabel={readMoreLabel}
              readMoreFieldKey="glove.blog.listing-read-more"
              priority={i < 3}
              className="glove-reveal-item"
              style={gloveRevealItemStyle(i % 9)}
            />
          ))}
        </GloveRevealGroup>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <a
            {...pageLinkProps(page + 1, { scroll: false })}
            className={gloveButtonClass({ variant: "outline", size: "lg" })}
          >
            <span {...fieldAttr("glove.blog.listing-load-more")}>
              {loadMoreLabel}
            </span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
