"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { formatDate } from "~/lib/utils";
import { Input } from "~/components/ui/input";

import { resolveFields } from "..";
import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

function BlogPostCard({ post }: { post: Props["pages"][number] }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="overflow-hidden rounded-xl bg-[#1F1F1F] transition-transform group-hover:scale-[1.02]">
        <div className="relative aspect-4/3 overflow-hidden">
          <Image
            src={post.image ?? "/placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute right-0 bottom-0 left-0 p-5">
            <p className="mb-1 text-xs font-medium tracking-wider text-purple-400 uppercase">
              {formatDate(post.createdAt)}
            </p>
            <h3 className="text-lg font-bold text-white">{post.title}</h3>
          </div>
        </div>
        {post.excerpt ? (
          <div className="p-5">
            <p className="line-clamp-2 text-sm text-white/70">{post.excerpt}</p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function DarkTrendBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "dark-trend.blog.listing-title",
    "dark-trend.blog.listing-intro",
  ]);

  const listingTitle = f["dark-trend.blog.listing-title"] ?? "Journal";
  const listingIntro = f["dark-trend.blog.listing-intro"]?.trim() ?? "";

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

  return (
    <DarkTrendGeneralLayout
      title={listingTitle}
      excerpt={listingIntro || undefined}
    >
      <div className="mb-12">
        <div className="mx-auto flex max-w-md items-center gap-3 border-b border-white/20 pb-2">
          <Search className="h-4 w-4 shrink-0 text-white/50" />
          <Input
            type="search"
            placeholder="Search posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search blog posts"
            className="border-none bg-transparent px-0 text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        {query.trim() ? (
          <p className="mt-3 text-center text-sm text-white/60">
            {filtered.length === 0
              ? "No posts match your search."
              : `${filtered.length} post${filtered.length !== 1 ? "s" : ""} found`}
          </p>
        ) : null}
      </div>

      {featured && !query.trim() ? (
        <section className="mb-16">
          <Link
            href={`/blog/${featured.slug}`}
            className="group block overflow-hidden rounded-xl bg-[#1F1F1F] transition-transform hover:scale-[1.01]"
          >
            <div className="grid gap-0 lg:grid-cols-2 lg:items-stretch">
              <div className="relative aspect-4/3 min-h-[240px] lg:aspect-auto lg:min-h-[320px]">
                <Image
                  src={featured.image ?? "/placeholder.svg"}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent lg:bg-linear-to-r" />
              </div>
              <div className="flex flex-col justify-center p-8 lg:p-12">
                <p className="mb-3 text-sm font-semibold tracking-wider text-purple-400 uppercase">
                  {formatDate(featured.createdAt)} · Latest
                </p>
                <h2 className="text-2xl font-bold text-white md:text-3xl lg:text-4xl">
                  {featured.title}
                </h2>
                {featured.excerpt ? (
                  <p className="mt-4 line-clamp-3 text-white/70">
                    {featured.excerpt}
                  </p>
                ) : null}
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-purple-400">
                  Read article
                  <span className="h-px w-8 bg-purple-400 transition-all group-hover:w-12" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      ) : null}

      {query.trim() ? (
        <section>
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-white/60">
                No posts match your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {gridPosts.map((post) => (
                <BlogPostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {rest.length > 0 ? (
            <section>
              <h2 className="mb-8 text-center text-2xl font-bold text-white md:text-left">
                More stories
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {gridPosts.map((post) => (
                  <BlogPostCard key={post.slug} post={post} />
                ))}
              </div>
            </section>
          ) : !featured ? (
            <div className="py-20 text-center">
              <p className="text-lg text-white/60">No blog posts yet.</p>
            </div>
          ) : null}
        </>
      )}
    </DarkTrendGeneralLayout>
  );
}
