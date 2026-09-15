"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";

import { OliveInput, OliveRevealGroup } from "../shared";
import { OliveBlogCard } from "./olive-blog-card";

type Props = {
  posts: DefaultBlogPageTemplateProps["pages"];
  searchEmptyMessage: string;
};

/**
 * OliveBlogClient — search + the 2-up editorial grid.
 *
 * Client-side search (required by the BlogPage playbook —
 * `buildBlogSearchBlob`/`blobIncludesQuery`, with an `aria-live`
 * result-count announcer). The lead-post treatment (first post spans full
 * width) only applies to the natural, unsearched order — a search result
 * set is a plain match list, not an editorial ranking.
 */
export function OliveBlogClient({ posts, searchEmptyMessage }: Props) {
  const [query, setQuery] = useState("");

  const withBlobs = useMemo(
    () => posts.map((post) => ({ post, blob: buildBlogSearchBlob(post) })),
    [posts],
  );

  const trimmed = query.trim().toLowerCase();
  const isSearching = trimmed.length > 0;

  const filtered = useMemo(() => {
    if (!isSearching) return posts;
    return withBlobs
      .filter(({ blob }) => blobIncludesQuery(blob, trimmed))
      .map(({ post }) => post);
  }, [isSearching, trimmed, withBlobs, posts]);

  const leadPost =
    !isSearching && filtered.length > 0 ? filtered[0] : undefined;
  const restPosts = leadPost ? filtered.slice(1) : filtered;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-[22rem] items-center gap-2.5">
        <Search
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          style={{ color: "var(--olive-ink-soft)" }}
        />
        <OliveInput
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Search the journal…"
          aria-label="Search the journal"
        />
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isSearching
          ? `${filtered.length} post${filtered.length === 1 ? "" : "s"} found`
          : ""}
      </p>

      {filtered.length === 0 ? (
        <p
          className="olive-caption"
          style={{ textAlign: "center", padding: "2.5rem 0" }}
        >
          {searchEmptyMessage}
        </p>
      ) : (
        <OliveRevealGroup
          fan
          className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2"
        >
          {leadPost ? (
            <OliveBlogCard
              post={leadPost}
              size="lead"
              headingLevel="h2"
              priority
              revealIndex={0}
            />
          ) : null}
          {restPosts.map((post, i) => (
            <OliveBlogCard
              key={post.slug}
              post={post}
              headingLevel="h2"
              revealIndex={leadPost ? i + 1 : i}
            />
          ))}
        </OliveRevealGroup>
      )}
    </div>
  );
}
