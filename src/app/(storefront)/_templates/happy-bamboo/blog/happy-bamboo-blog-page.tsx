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

// const featuredPost = {
//   slug: "5-reasons-bamboo-toilet-paper-is-better",
//   title: "5 Reasons Bamboo Toilet Paper Is Better for You and the Planet",
//   excerpt:
//     "From reducing deforestation to delivering superior softness, discover why making the switch to bamboo is one of the most impactful small changes you can make in your daily routine.",
//   image: "/images/blog-bamboo-benefits.jpg",
//   date: "March 18, 2025",
//   readTime: "6 min read",
//   author: "Our Team",
//   category: "Sustainability",
// };

// const relatedPosts = [
//   {
//     slug: "sustainable-bathroom-swaps",
//     title: "Simple Sustainable Swaps for a Greener Bathroom",
//     excerpt:
//       "Small changes in your bathroom routine can add up to a big environmental impact. Here are our top eco-friendly swaps to get you started.",
//     image: "/images/blog-sustainable-living.jpg",
//     createdAt: "February 24, 2025",
//     category: "Eco Living",
//   },
//   {
//     slug: "bamboo-vs-regular-toilet-paper",
//     title: "Bamboo vs. Regular Toilet Paper: What the Numbers Say",
//     excerpt:
//       "We break down the data on water usage, carbon footprint, and deforestation impact so you can see exactly why bamboo wins every time.",
//     image: "/images/blog-bamboo-vs-trees.jpg",
//     createdAt: "January 10, 2025",
//     category: "Education",
//   },
// ];

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
  business?: { name?: string | null } | null;
};

export function HappyBambooBlogPage({ pages, customFields, business }: Props) {
  const fields = resolveFields(customFields, [
    "happy-bamboo.blog-listing-title",
    "happy-bamboo.blog-listing-intro",
    "happy-bamboo.blog-listing-image",
  ]);

  const pageTitle = fields["happy-bamboo.blog-listing-title"]!;
  const pageIntro = fields["happy-bamboo.blog-listing-intro"]!;
  const blogImage = fields["happy-bamboo.blog-listing-image"]!;

  const [query, setQuery] = useState("");

  const authorName = business?.name?.trim() ? business.name.trim() : "Our Team";

  const allPosts = useMemo(
    () =>
      pages.map((p, idx) => ({
        ...p,
        featured: idx === 0,
        author: authorName,
      })),
    [pages, authorName],
  ) as (Page & { featured: boolean; author?: string })[];

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
  return (
    <PageTransition>
      {/* Page Header */}
      <section
        className="bg-muted/50 py-16 md:py-24"
        {...sectionGroupAttr("blog", "listing")}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto flex w-full flex-col items-center justify-center gap-12 md:flex-row">
            {/* Text content */}
            <FadeIn className="flex flex-1 flex-col justify-center text-left">
              <Badge className="mb-4 w-fit">
                <Leaf className="mr-1 h-3 w-3" />
                Stories & Insights
              </Badge>
              <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">
                {pageTitle}
              </h1>
              {pageIntro && (
                <p className="text-muted-foreground mx-auto max-w-xl text-lg leading-relaxed">
                  {pageIntro}
                </p>
              )}
            </FadeIn>
            {/* Aspect-video image on the right */}
            <FadeIn
              direction="right"
              className="flex flex-1 items-center justify-center"
            >
              <div className="aspect-video w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-white/20 shadow-md">
                <img
                  src={blogImage}
                  alt="Blog listing image"
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
              </div>
            </FadeIn>
          </div>

          {/* 
          <FadeIn className="text-center">
            <Badge className="mb-4">
              <Leaf className="mr-1 h-3 w-3" />
              Stories & Insights
            </Badge>
            <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">
              {pageTitle}
            </h1>
            {pageIntro && (
              <p className="text-muted-foreground mx-auto max-w-xl text-lg leading-relaxed">
                {pageIntro}
              </p>
            )}

     
            <div className="mx-auto mt-8 max-w-lg">
              <InputGroup>
                <InputGroupAddon>
                  <Search className="text-muted-foreground h-4 w-4" />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  placeholder="Search articles..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search blog posts"
                />
              </InputGroup>
              {query.trim() !== "" && (
                <p className="text-muted-foreground mt-2 text-sm">
                  {filtered.length === 0
                    ? "No articles found. Try a different keyword."
                    : `${filtered.length} article${filtered.length !== 1 ? "s" : ""} found`}
                </p>
              )}
            </div>
          </FadeIn> */}
        </div>
      </section>

      <FadeIn className="container mx-auto mt-12 px-4 py-4 md:py-8">
        <div className="mx-auto max-w-lg">
          <InputGroup>
            <InputGroupAddon>
              <Search className="text-muted-foreground h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search blog posts"
            />
          </InputGroup>
          {query.trim() !== "" && (
            <p className="text-muted-foreground mt-2 text-sm">
              {filtered.length === 0
                ? "No articles found. Try a different keyword."
                : `${filtered.length} article${filtered.length !== 1 ? "s" : ""} found`}
            </p>
          )}
        </div>
      </FadeIn>

      {/* Featured Post — only shown when not searching */}
      {featuredResult && (
        <section className="pt-8 pb-16 md:pt-12 md:pb-24">
          <div className="container mx-auto px-4">
            <FadeIn className="mb-8" delay={0.1}>
              <span className="text-primary text-sm font-semibold tracking-widest uppercase">
                Latest Post
              </span>
            </FadeIn>
            <FadeIn delay={0.2}>
              <Link
                href={`/blog/${featuredResult.slug}`}
                className="group block"
              >
                <div className="border-border grid overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-lg lg:grid-cols-2">
                  <div className="relative aspect-4/3 lg:aspect-auto">
                    <Image
                      src={featuredResult.image ?? "/placeholder.svg"}
                      alt={featuredResult.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      priority
                    />
                  </div>
                  <div className="bg-card flex flex-col justify-center p-8 md:p-12">
                    <Badge variant="secondary" className="mb-4 w-fit">
                      <Tag className="mr-1 h-3 w-3" />
                      Latest Post
                    </Badge>
                    <h2 className="text-foreground group-hover:text-primary mb-4 text-2xl leading-snug font-bold transition-colors md:text-3xl">
                      {featuredResult.title}
                    </h2>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {featuredResult.excerpt}
                    </p>
                    <div className="text-muted-foreground mb-8 flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        {formatDate(featuredResult.createdAt)}
                      </span>
                      {/* <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {featuredResult.readTime}
                      </span> */}
                    </div>
                    <div className="text-primary flex items-center gap-2 font-semibold">
                      Read Article
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </FadeIn>
          </div>
        </section>
      )}

      {featuredResult && <Separator className="container mx-auto" />}

      {/* Articles grid — "More Articles" in default view, full results when searching */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <FadeIn className="mb-12">
            <h2 className="font-serif text-2xl font-bold md:text-3xl">
              {query.trim() !== "" ? "Search Results" : "More Articles"}
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
                    <Card className="border-border h-full overflow-hidden transition-shadow hover:shadow-lg">
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={post.image ?? "/placeholder.svg"}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-6">
                        {/* <Badge
                          variant="secondary"
                          className="mb-3 w-fit text-xs"
                        >
                          <Tag className="mr-1 h-3 w-3" />
                          {post.category}
                        </Badge> */}
                        <h3 className="group-hover:text-primary mb-3 text-xl leading-snug font-bold transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                          {post.excerpt}
                        </p>
                        <div className="text-muted-foreground flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
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
                <Search className="mb-4 h-10 w-10 opacity-30" />
                <p className="text-lg font-medium">
                  No articles matched &ldquo;{query}&rdquo;
                </p>
                <p className="mt-1 text-sm">
                  Try searching for &ldquo;bamboo&rdquo;,
                  &ldquo;sustainability&rdquo;, or &ldquo;eco living&rdquo;.
                </p>
              </div>
            </FadeIn>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
