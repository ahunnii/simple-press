"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { formatDate } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

export function NoiseBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "noise.blog-listing-heading",
    "noise.blog-listing-intro",
  ]);

  const heading = f["noise.blog-listing-heading"] ?? "The Edit";
  const intro = f["noise.blog-listing-intro"] ?? undefined;

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

  return (
    <PageTransition>
      {/* Header */}
      <section className="border-b border-border bg-secondary py-20">
        <FadeIn className="mx-auto max-w-7xl px-4 lg:px-8">
          <p className="mb-4 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
            Editorial
          </p>
          <h1 className="font-serif text-5xl font-light tracking-tight text-foreground md:text-6xl lg:text-7xl">
            {heading}
          </h1>
          {intro && (
            <p className="mt-5 max-w-xl font-sans text-base text-muted-foreground">
              {intro}
            </p>
          )}

          {/* Search */}
          <div className="mt-10 flex max-w-sm items-center gap-3 border-b border-border pb-0">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search the archive..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search blog posts"
              className="h-auto rounded-none border-none bg-transparent px-0 pb-2 pt-0 font-sans text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          {query.trim() && (
            <p className="mt-2 font-sans text-xs text-muted-foreground">
              {filtered.length === 0
                ? "No articles found."
                : `${filtered.length} article${filtered.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </FadeIn>
      </section>

      {/* Featured Post */}
      {featured && !query.trim() && (
        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <FadeIn>
            <Link href={`/blog/${featured.slug}`} className="group grid gap-8 lg:grid-cols-2 lg:items-center">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={featured.image ?? "/placeholder.svg"}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="flex flex-col gap-4">
                <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
                  {formatDate(featured.createdAt)} · Latest
                </p>
                <h2 className="font-serif text-3xl font-light leading-tight text-foreground transition-opacity group-hover:opacity-70 md:text-4xl">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                    {featured.excerpt}
                  </p>
                )}
                <span className="inline-flex items-center gap-3 font-sans text-[10px] tracking-[0.3em] uppercase text-foreground transition-opacity group-hover:opacity-60">
                  Read More
                  <span className="h-px w-10 bg-foreground" />
                </span>
              </div>
            </Link>
          </FadeIn>
        </section>
      )}

      {/* Grid */}
      <section className={query.trim() || !featured ? "pt-8" : "border-t border-border"}>
        <div className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
          {(!query.trim() && rest.length > 0) && (
            <FadeIn className="mb-10 pt-16">
              <h2 className="font-serif text-2xl font-light text-foreground">
                More Stories
              </h2>
            </FadeIn>
          )}

          {filtered.length === 0 ? (
            <FadeIn className="py-20 text-center">
              <p className="font-serif text-xl font-light italic text-muted-foreground">
                No stories found for &ldquo;{query}&rdquo;
              </p>
            </FadeIn>
          ) : (
            <StaggerContainer
              key={filtered.map((p) => p.id).join("|")}
              className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
              staggerDelay={0.08}
            >
              {(query.trim() ? filtered : rest).map((post) => (
                <StaggerItem key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="group block">
                    <div className="relative mb-5 aspect-[4/3] overflow-hidden">
                      <Image
                        src={post.image ?? "/placeholder.svg"}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <p className="mb-2 font-sans text-[9px] tracking-[0.3em] uppercase text-muted-foreground">
                      {formatDate(post.createdAt)}
                    </p>
                    <h3 className="font-serif text-xl font-light leading-snug text-foreground transition-opacity group-hover:opacity-70">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-2 font-sans text-sm text-muted-foreground">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
