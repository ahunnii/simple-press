"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { formatDate } from "~/lib/utils";
import { Input } from "~/components/ui/input";

import { resolveFields } from ".";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

function PostCard({
  post,
}: {
  post: Props["pages"][number];
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group bg-card text-card-foreground block overflow-hidden rounded-2xl border border-border shadow-sm transition hover:shadow-md"
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
        <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(post.createdAt)}
        </p>
        <h3 className="text-foreground group-hover:text-primary mb-2 font-serif text-lg font-light tracking-wide transition-colors">
          {post.title}
        </h3>
        {post.excerpt ? (
          <p className="text-muted-foreground line-clamp-3 text-sm">{post.excerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function ElegantBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "elegant.blog.listing-title",
    "elegant.blog.listing-intro",
  ]);

  const listingTitle =
    (f["elegant.blog.listing-title"] ?? "").trim() || "Journal";
  const listingIntro = (f["elegant.blog.listing-intro"] ?? "").trim();

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
        <div className="bg-secondary/30 mb-12 rounded-2xl py-16 text-center">
          <h1 className="text-foreground font-serif text-4xl font-light tracking-wide md:text-5xl">
            {listingTitle}
          </h1>
          {listingIntro ? (
            <p className="text-muted-foreground mt-4 max-w-2xl px-4 text-lg">
              {listingIntro}
            </p>
          ) : null}
        </div>
        <div className="bg-muted/40 rounded-2xl py-16 text-center">
          <p className="text-muted-foreground">
            No blog posts yet. Check back soon!
          </p>
          <Link
            href="/"
            className="text-primary mt-4 inline-block font-medium hover:underline"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="bg-secondary/30 mb-10 rounded-2xl py-12 text-center sm:py-16">
        <h1 className="text-foreground font-serif text-4xl font-light tracking-wide md:text-5xl">
          {listingTitle}
        </h1>
        {listingIntro ? (
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl px-4 text-lg">
            {listingIntro}
          </p>
        ) : null}
      </header>

      <div className="mx-auto mb-10 max-w-md">
        <div className="border-border bg-background flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm">
          <Search className="text-muted-foreground h-4 w-4 shrink-0" />
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
          <p className="text-muted-foreground mt-2 text-center text-sm">
            {filtered.length === 0
              ? "No posts match your search."
              : `${filtered.length} post${filtered.length !== 1 ? "s" : ""} found`}
          </p>
        ) : null}
      </div>

      {query.trim() ? (
        <section>
          {filtered.length === 0 ? (
            <div className="text-muted-foreground py-16 text-center">
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
                className="group bg-card text-card-foreground block overflow-hidden rounded-2xl border border-border shadow-sm transition hover:shadow-md"
              >
                <div className="grid gap-0 lg:grid-cols-2 lg:items-stretch">
                  <div className="relative aspect-4/3 min-h-[220px] lg:aspect-auto lg:min-h-[280px]">
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
                    <p className="text-primary mb-2 text-xs font-medium tracking-[0.2em] uppercase">
                      {formatDate(featured.createdAt)} · Latest
                    </p>
                    <h2 className="text-foreground group-hover:text-primary font-serif text-2xl font-light tracking-wide transition-colors md:text-3xl">
                      {featured.title}
                    </h2>
                    {featured.excerpt ? (
                      <p className="text-muted-foreground mt-4 line-clamp-3">
                        {featured.excerpt}
                      </p>
                    ) : null}
                    <span className="text-primary mt-6 inline-flex items-center gap-2 text-sm font-medium">
                      Read article
                      <span className="bg-primary h-px w-8 transition-all group-hover:w-12" />
                    </span>
                  </div>
                </div>
              </Link>
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section>
              <h2 className="text-foreground mb-6 font-serif text-2xl font-light tracking-wide">
                More articles
              </h2>
              <div className="grid gap-8 md:grid-cols-2">
                {gridPosts.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </section>
          ) : !featured ? (
            <div className="bg-muted/40 text-muted-foreground rounded-2xl py-16 text-center">
              No blog posts yet.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
