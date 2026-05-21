"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/utils";
import { useBlogPosts } from "~/hooks/use-blog-posts";
import { Input } from "~/components/ui/input";

import { resolveFields } from "..";
import { ModernGeneralLayout } from "../layout/modern-general-layout";
import { ModernBlogPostCard } from "./modern-blog-post-card";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

export function ModernBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "modern.blog.listing-title",
    "modern.blog.listing-intro",
    "modern.blog.listing-tagline",
  ]);

  const { query, setQuery, filtered, featuredResult, listResults } =
    useBlogPosts(pages);

  if (pages.length === 0) {
    return (
      <ModernGeneralLayout
        title={f["modern.blog.listing-title"]}
        subtitle={f["modern.blog.listing-tagline"]}
        excerpt={f["modern.blog.listing-intro"]}
      >
        <section className="bg-background py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
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
        </section>
      </ModernGeneralLayout>
    );
  }

  return (
    <ModernGeneralLayout
      title={f["modern.blog.listing-title"]}
      subtitle={f["modern.blog.listing-tagline"]}
      excerpt={f["modern.blog.listing-intro"]}
    >
      <section className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                  {listResults.map((post) => (
                    <ModernBlogPostCard key={post.slug} post={post} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              {featuredResult ? (
                <section className="mb-12">
                  <Link
                    href={`/blog/${featuredResult.slug}`}
                    className="group bg-card text-card-foreground border-border block overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-md"
                  >
                    <div className="grid gap-0 lg:grid-cols-2 lg:items-stretch">
                      <div className="relative aspect-4/3 min-h-[220px] lg:aspect-auto lg:min-h-[280px]">
                        <Image
                          src={featuredResult.image ?? "/placeholder.svg"}
                          alt={featuredResult.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          priority
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      </div>
                      <div className="flex flex-col justify-center p-8 lg:p-10">
                        <p className="text-primary mb-2 text-xs font-medium tracking-[0.2em] uppercase">
                          {formatDate(featuredResult.createdAt)} · Latest
                        </p>
                        <h2 className="text-foreground group-hover:text-primary font-serif text-2xl font-light tracking-wide transition-colors md:text-3xl">
                          {featuredResult.title}
                        </h2>
                        {featuredResult.excerpt ? (
                          <p className="text-muted-foreground mt-4 line-clamp-3">
                            {featuredResult.excerpt}
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

              {listResults.length > 0 ? (
                <section>
                  <h2 className="text-foreground mb-6 font-serif text-2xl font-light tracking-wide">
                    More articles
                  </h2>
                  <div className="grid gap-8 md:grid-cols-2">
                    {listResults.map((post) => (
                      <ModernBlogPostCard key={post.slug} post={post} />
                    ))}
                  </div>
                </section>
              ) : !featuredResult ? (
                <div className="bg-muted/40 text-muted-foreground rounded-2xl py-16 text-center">
                  No blog posts yet.
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </ModernGeneralLayout>
  );
}
