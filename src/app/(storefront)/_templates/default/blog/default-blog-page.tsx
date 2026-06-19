"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatDate } from "~/lib/utils";

import { resolveFields } from "..";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

function PostCard({ post }: { post: Props["pages"][number] }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="relative mb-4 aspect-4/3 overflow-hidden rounded-[var(--radius)] bg-[#f6f6f6]">
        <Image
          src={post.image ?? "/placeholder.svg"}
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
          {formatDate(post.createdAt)}
        </p>
        <h3 className="font-serif text-[18px] leading-snug font-medium tracking-[-0.01em] transition-opacity group-hover:opacity-70">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-[#6b6b6b]">
            {post.excerpt}
          </p>
        )}
        <span className="mt-1 inline-flex items-center gap-2 self-start border-b border-current pb-0.5 text-sm font-medium transition-[gap] group-hover:gap-3">
          Read article <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

export function DefaultBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "default.blog.listing-title",
    "default.blog.listing-intro",
  ]);

  const listingTitle =
    (f["default.blog.listing-title"] ?? "").trim() || "Journal";
  const listingIntro =
    (f["default.blog.listing-intro"] ?? "").trim() ||
    "Stories behind the work.";

  const [query, setQuery] = useState("");

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

  const [featured, ...rest] = filtered;
  const gridPosts = query.trim() ? filtered : rest;

  return (
    <div>
      {/* Page hero */}
      <section
        {...sectionGroupAttr("blog", "header")}
        className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
            Journal
          </span>
          <h1 className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em]">
            {listingTitle}
          </h1>
          {listingIntro && (
            <p className="mt-4 text-[17px] text-[#6b6b6b]">{listingIntro}</p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          {pages.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-[#6b6b6b]">No posts yet — check back soon!</p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
              >
                Back to home <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="mb-12 flex max-w-sm items-center gap-3 border-b border-[#e8e8e8] pb-3">
                <Search
                  className="h-4 w-4 shrink-0 text-[#6b6b6b]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  placeholder="Search posts..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search blog posts"
                  className="w-full bg-transparent text-sm text-[#0a0a0a] placeholder:text-[#767676]"
                />
              </div>
              {/* Live region: announces filtered result count to screen readers */}
              <p className="sr-only" aria-live="polite" aria-atomic="true">
                {query.trim()
                  ? `${filtered.length} post${filtered.length === 1 ? "" : "s"} found`
                  : ""}
              </p>

              {query.trim() ? (
                /* Search results */
                filtered.length === 0 ? (
                  <p className="py-16 text-center text-[#6b6b6b]">
                    No posts match your search.
                  </p>
                ) : (
                  <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((post) => (
                      <PostCard key={post.slug} post={post} />
                    ))}
                  </div>
                )
              ) : (
                <>
                  {/* Featured post */}
                  {featured && (
                    <Link
                      href={`/blog/${featured.slug}`}
                      className="group mb-20 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center"
                    >
                      <div className="relative aspect-4/3 overflow-hidden rounded-[var(--radius)] bg-[#f6f6f6]">
                        <Image
                          src={featured.image ?? "/placeholder.svg"}
                          alt={featured.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                          priority
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      </div>
                      <div className="flex flex-col gap-4">
                        <p className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                          {formatDate(featured.createdAt)} · Latest
                        </p>
                        <h2 className="font-serif text-[clamp(24px,3vw,38px)] leading-[1.15] font-medium tracking-[-0.02em] text-balance transition-opacity group-hover:opacity-70">
                          {featured.title}
                        </h2>
                        {featured.excerpt && (
                          <p className="line-clamp-3 text-[15px] leading-relaxed text-[#6b6b6b]">
                            {featured.excerpt}
                          </p>
                        )}
                        <span className="inline-flex items-center gap-2 self-start border-b border-current pb-0.5 text-sm font-medium transition-[gap] group-hover:gap-3">
                          Read article <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </Link>
                  )}

                  {/* Post grid */}
                  {gridPosts.length > 0 && (
                    <>
                      {featured && (
                        <div className="mb-10 flex items-center gap-2">
                          <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                            More posts
                          </span>
                          <div className="h-px flex-1 bg-[#e8e8e8]" />
                        </div>
                      )}
                      <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                        {gridPosts.map((post) => (
                          <PostCard key={post.slug} post={post} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
