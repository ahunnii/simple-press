/* eslint-disable @next/next/no-img-element */
"use client";

import type { Page } from "generated/prisma";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Leaf, Search, Tag } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatDate } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Separator } from "~/components/ui/separator";
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

export function BambooBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "bamboo.blog.listing-title",
    "bamboo.blog.listing-intro",
    "bamboo.blog.listing-image",
  ]);

  const pageTitle = f["bamboo.blog.listing-title"];
  const pageIntro = f["bamboo.blog.listing-intro"];
  const blogImage = f["bamboo.blog.listing-image"];

  const [query, setQuery] = useState("");

  const allPosts = useMemo(
    () =>
      pages.map((p, idx) => ({
        ...p,
        featured: idx === 0,
      })),
    [pages],
  ) as (Page & { featured: boolean })[];

  const postsWithSearch = useMemo(
    () =>
      allPosts.map((post) => ({
        post,
        searchBlob: buildBlogSearchBlob(post),
      })),
    [allPosts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPosts;
    return postsWithSearch
      .filter(({ searchBlob }) => blobIncludesQuery(searchBlob, q))
      .map(({ post }) => post);
  }, [query, allPosts, postsWithSearch]);

  const featuredResult =
    query.trim() === "" ? filtered.find((p) => p.featured) : null;
  const listResults =
    query.trim() === "" ? filtered.filter((p) => !p.featured) : filtered;

  if (pages.length === 0) {
    return (
      <PageTransition>
        <section
          {...sectionGroupAttr("blog", "listing")}
          className="bg-secondary py-16 md:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn className="text-center">
              <h1 className="text-foreground font-heading text-4xl font-bold tracking-tight md:text-5xl">
                {pageTitle ?? "Blog"}
              </h1>
              {pageIntro ? (
                <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
                  {pageIntro}
                </p>
              ) : null}
            </FadeIn>
            <FadeIn className="mt-12">
              <div className="bg-muted/40 mx-auto max-w-xl rounded-2xl py-16 text-center">
                <p className="text-muted-foreground">
                  No blog posts yet. Check back soon!
                </p>
                <Link
                  href="/"
                  className="text-primary mt-6 inline-block font-semibold hover:underline"
                >
                  Back to home
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section
        {...sectionGroupAttr("blog", "listing")}
        className="bg-secondary py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <FadeIn className="flex flex-1 flex-col justify-center text-left">
              <Badge className="mb-4 w-fit">
                <Leaf className="mr-1 h-3 w-3" aria-hidden="true" />
                Stories &amp; Insights
              </Badge>
              <h1 className="text-foreground font-heading text-4xl font-bold tracking-tight md:text-5xl">
                {pageTitle ?? "Blog"}
              </h1>
              {pageIntro ? (
                <p className="text-muted-foreground mt-4 max-w-xl text-lg leading-relaxed">
                  {pageIntro}
                </p>
              ) : null}
            </FadeIn>
            <FadeIn
              direction="right"
              className="flex flex-1 items-center justify-center"
            >
              <div className="border-border/60 bg-card aspect-video w-full max-w-md overflow-hidden rounded-2xl border shadow-md">
                <img
                  src={blogImage}
                  alt=""
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <FadeIn className="mx-auto max-w-7xl px-4 py-8 md:py-10 lg:px-8">
        <div className="mx-auto max-w-lg">
          <InputGroup>
            <InputGroupAddon>
              <Search className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search blog posts"
            />
          </InputGroup>
          <p
            aria-live="polite"
            aria-atomic="true"
            className="text-muted-foreground mt-2 text-sm"
          >
            {query.trim() !== "" &&
              (filtered.length === 0
                ? "No articles found. Try a different keyword."
                : `${filtered.length} article${filtered.length !== 1 ? "s" : ""} found`)}
          </p>
        </div>
      </FadeIn>

      {featuredResult && (
        <section className="pb-16 md:pb-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn className="mb-8" delay={0.1}>
              <span className="text-primary text-sm font-semibold tracking-widest uppercase">
                Latest post
              </span>
            </FadeIn>
            <FadeIn delay={0.2}>
              <Link
                href={`/blog/${featuredResult.slug}`}
                className="group block"
              >
                <div className="border-border/60 bg-card grid overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-lg lg:grid-cols-2">
                  <div className="relative aspect-4/3 lg:aspect-auto">
                    <Image
                      src={featuredResult.image ?? "/placeholder.svg"}
                      alt={featuredResult.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      priority
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                  <div className="flex flex-col justify-center p-8 md:p-12">
                    <Badge variant="secondary" className="mb-4 w-fit">
                      <Tag className="mr-1 h-3 w-3" aria-hidden="true" />
                      Latest post
                    </Badge>
                    <h2 className="text-foreground font-heading group-hover:text-primary mb-4 text-2xl leading-snug font-bold transition-colors md:text-3xl">
                      {featuredResult.title}
                    </h2>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {featuredResult.excerpt}
                    </p>
                    <div className="text-muted-foreground mb-8 flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        {formatDate(featuredResult.createdAt)}
                      </span>
                    </div>
                    <div className="text-primary flex items-center gap-2 font-semibold">
                      Read article
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </FadeIn>
          </div>
        </section>
      )}

      {featuredResult && (
        <Separator className="mx-auto max-w-7xl px-4 lg:px-8" />
      )}

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn className="mb-12">
            <h2 className="text-foreground font-heading text-2xl font-bold tracking-tight md:text-3xl">
              {query.trim() !== "" ? "Search results" : "More articles"}
            </h2>
          </FadeIn>

          {listResults.length > 0 ? (
            <StaggerContainer
              key={listResults.map((p) => p.id).join("|")}
              className="grid gap-8 md:grid-cols-2"
            >
              {listResults.map((post) => (
                <StaggerItem key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block h-full"
                  >
                    <Card className="border-border/60 bg-card h-full overflow-hidden transition-shadow hover:shadow-lg">
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={post.image ?? "/placeholder.svg"}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                      <CardContent className="p-6">
                        <h3 className="text-foreground font-heading group-hover:text-primary mb-3 text-xl leading-snug font-bold transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                          {post.excerpt}
                        </p>
                        <div className="text-muted-foreground flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <FadeIn>
              <div className="text-muted-foreground flex flex-col items-center py-16 text-center">
                <Search className="mb-4 h-10 w-10 opacity-30" aria-hidden="true" />
                <p className="text-lg font-medium">
                  No articles matched &ldquo;{query}&rdquo;
                </p>
                <p className="mt-1 text-sm">
                  Try a different search term or browse all posts.
                </p>
              </div>
            </FadeIn>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
