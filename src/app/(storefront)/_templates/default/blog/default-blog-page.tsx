"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { formatDate } from "~/lib/utils";
import { Input } from "~/components/ui/input";

import { resolveFields } from "..";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

function PostCard({ post }: { post: Props["pages"][number] }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={post.image ?? "/placeholder.svg"}
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div className="p-6">
        <p className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(post.createdAt)}
        </p>
        <h3 className="mb-2 text-lg font-bold text-[#374151] transition-colors group-hover:text-[#5e8b4a]">
          {post.title}
        </h3>
        {post.excerpt ? (
          <p className="line-clamp-3 text-sm text-gray-600">{post.excerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function DefaultBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "default.blog.listing-title",
    "default.blog.listing-intro",
  ]);

  const listingTitle = (f["default.blog.listing-title"] ?? "").trim() || "Blog";
  const listingIntro = (f["default.blog.listing-intro"] ?? "").trim();

  const [query, setQuery] = useState("");

  const postsWithSearch = useMemo(
    () =>
      pages.map((p) => ({
        post: p,
        searchBlob: buildBlogSearchBlob(p),
      })),
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

  if (pages.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-[#374151] md:text-4xl">
            {listingTitle}
          </h1>
          {listingIntro ? (
            <p className="mt-2 text-gray-600">{listingIntro}</p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-gray-50 py-16 text-center">
          <p className="text-gray-600">No blog posts yet. Check back soon!</p>
          <Link
            href="/"
            className="mt-4 inline-block font-semibold text-[#5e8b4a] hover:underline"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-[#374151] md:text-4xl">
          {listingTitle}
        </h1>
        {listingIntro ? (
          <p className="mt-2 text-gray-600">{listingIntro}</p>
        ) : null}
      </header>

      <div className="mx-auto mb-10 max-w-md">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <Input
            type="search"
            placeholder="Search posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search blog posts"
            className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        {query.trim() ? (
          <p className="mt-2 text-center text-sm text-gray-600">
            {filtered.length === 0
              ? "No posts match your search."
              : `${filtered.length} post${filtered.length !== 1 ? "s" : ""} found`}
          </p>
        ) : null}
      </div>

      {query.trim() ? (
        <section>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-600">
              <p className="text-lg">No posts match your search.</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {gridPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {featured ? (
            <section className="mb-12">
              <Link
                href={`/blog/${featured.slug}`}
                className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="grid gap-0 lg:grid-cols-2 lg:items-stretch">
                  <div className="relative aspect-[4/3] min-h-[220px] lg:aspect-auto lg:min-h-[280px]">
                    <Image
                      src={featured.image ?? "/placeholder.svg"}
                      alt={featured.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      priority
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                  <div className="flex flex-col justify-center p-8 lg:p-10">
                    <p className="mb-2 text-xs font-medium tracking-wide text-[#5e8b4a] uppercase">
                      {formatDate(featured.createdAt)} · Latest
                    </p>
                    <h2 className="text-2xl font-bold text-[#374151] transition-colors group-hover:text-[#5e8b4a] md:text-3xl">
                      {featured.title}
                    </h2>
                    {featured.excerpt ? (
                      <p className="mt-4 line-clamp-3 text-gray-600">
                        {featured.excerpt}
                      </p>
                    ) : null}
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#5e8b4a]">
                      Read article
                      <span className="h-px w-8 bg-[#5e8b4a] transition-all group-hover:w-12" />
                    </span>
                  </div>
                </div>
              </Link>
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section>
              <h2 className="mb-6 text-2xl font-bold text-[#374151]">
                More articles
              </h2>
              <div className="grid gap-8 md:grid-cols-2">
                {gridPosts.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </section>
          ) : !featured ? (
            <div className="rounded-2xl bg-gray-50 py-16 text-center text-gray-600">
              No blog posts yet.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
