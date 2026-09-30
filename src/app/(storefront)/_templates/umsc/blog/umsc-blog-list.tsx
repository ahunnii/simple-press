"use client";

import type { CSSProperties } from "react";
import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";

import type { UmscBlogPost } from "./umsc-blog-card";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { UmscInput } from "../shared/umsc-form-fields";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscBlogCard } from "./umsc-blog-card";

type Props = {
  pages: UmscBlogPost[];
  /** "No posts match your search." — `default.blog.listing-search-empty`. */
  searchEmpty: string;
  /** "More posts" — `default.blog.listing-more-label`, the grid's h2. */
  moreLabel: string;
  /** "Read the story" — `umsc.blog.card-link-label`; blank hides the link. */
  cardLinkLabel: string;
};

/**
 * The blog index's interactive half (server → client handoff, playbook
 * "BlogPage"): Default's client-side search (`buildBlogSearchBlob` /
 * `blobIncludesQuery`) with an `aria-live` result count, then the latest
 * post as a split lead story and the rest as a 3→2→1 card grid under a
 * "More posts" heading. A query swaps both for a flat results grid. Only
 * rendered when there is at least one post — the server page owns the
 * designed empty state.
 */
export function UmscBlogList({
  pages,
  searchEmpty,
  moreLabel,
  cardLinkLabel,
}: Props) {
  const searchId = useId();
  const [query, setQuery] = useState("");

  const postsWithSearch = useMemo(
    () => pages.map((p) => ({ post: p, searchBlob: buildBlogSearchBlob(p) })),
    [pages],
  );

  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return pages;
    return postsWithSearch
      .filter(({ searchBlob }) => blobIncludesQuery(searchBlob, trimmed))
      .map(({ post }) => post);
  }, [trimmed, pages, postsWithSearch]);

  const [featured, ...rest] = filtered;
  const searching = trimmed.length > 0;
  const gridPosts = searching ? filtered : rest;

  return (
    <div className="flex flex-col gap-14">
      <div className="relative w-full max-w-[420px]">
        <label htmlFor={searchId} className="sr-only">
          Search blog posts
        </label>
        <Search
          aria-hidden="true"
          strokeWidth={1.5}
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--umsc-gold-ink)]"
        />
        <UmscInput
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts"
          className="pl-11"
        />
      </div>
      {/* Announces the filtered result count to screen readers. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {searching
          ? `${filtered.length} post${filtered.length === 1 ? "" : "s"} found`
          : ""}
      </p>

      {searching && filtered.length === 0 ? (
        <p
          {...fieldAttr("default.blog.listing-search-empty")}
          className="umsc-sans max-w-[56ch] border-t border-[var(--umsc-line)] pt-8 text-[17px] leading-[1.6] text-[var(--umsc-muted)]"
        >
          {searchEmpty}
        </p>
      ) : null}

      {!searching && featured ? (
        <UmscBlogCard
          post={featured}
          variant="featured"
          headingLevel="h2"
          linkLabel={cardLinkLabel}
          linkLabelFieldKey="umsc.blog.card-link-label"
          priority
        />
      ) : null}

      {gridPosts.length > 0 ? (
        <div className="flex flex-col gap-10">
          {!searching && moreLabel.trim() ? (
            <div className="border-t border-[var(--umsc-line)] pt-10">
              <UmscHeading
                as="h2"
                fieldKey="default.blog.listing-more-label"
                className="text-[clamp(22px,2.2vw,30px)] leading-[1.15]"
              >
                {moreLabel}
              </UmscHeading>
            </div>
          ) : null}
          <UmscRevealGroup className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {gridPosts.map((post, i) => (
              <div
                key={post.slug}
                className="umsc-reveal-item min-w-0"
                style={{ "--i": Math.min(i, 6) } as CSSProperties}
              >
                <UmscBlogCard post={post} linkLabel={cardLinkLabel} />
              </div>
            ))}
          </UmscRevealGroup>
        </div>
      ) : null}
    </div>
  );
}
