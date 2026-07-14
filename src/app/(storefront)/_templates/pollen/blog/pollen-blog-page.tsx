"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatDate } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { FadeIn } from "~/components/page-animations";

import { resolveFields } from "..";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

function PostCard({ post }: { post: Props["pages"][number] }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group bg-card block overflow-hidden rounded-2xl border border-[#e5e7eb] shadow-sm transition hover:border-[#A8D081]/50 hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={post.image ?? "/placeholder.svg"}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div className="p-6">
        <p className="mb-2 flex items-center gap-1.5 text-xs text-[#6b7280]">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {formatDate(post.createdAt)}
        </p>
        <h3 className="mb-2 text-lg font-semibold tracking-wide text-[#374151] transition-colors group-hover:text-[#3d5a28]">
          {post.title}
        </h3>
        {post.excerpt ? (
          <p className="line-clamp-3 text-sm text-[#4b5563]">{post.excerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function PollenBlogPage({ pages, customFields, business }: Props) {
  const f = resolveFields(customFields, [
    "pollen.blog.listing-title",
    "pollen.blog.listing-intro",
    "pollen.blog.listing-hero-image",
  ]);

  const listingTitle = (f["pollen.blog.listing-title"] ?? "").trim() || "Blog";
  const listingIntro = (f["pollen.blog.listing-intro"] ?? "").trim();
  const listingHeroImage = (f["pollen.blog.listing-hero-image"] ?? "").trim();

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

  const heroImageUrl = listingHeroImage || undefined;

  if (pages.length === 0) {
    return (
      <PollenGeneralLayout
        business={business}
        title={listingTitle}
        subtitle="Blog"
        imageUrl={heroImageUrl}
        titleFieldKey="pollen.blog.listing-title"
        sectionAttrs={sectionGroupAttr("blog", "header")}
      >
        <section className="bg-background py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn direction="up">
              {listingIntro ? (
                <p
                  className="mx-auto mb-10 max-w-3xl text-center text-lg leading-relaxed text-[#4b5563]"
                  {...fieldAttr("pollen.blog.listing-intro")}
                >
                  {listingIntro}
                </p>
              ) : null}
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] py-16 text-center">
                <h2 className="text-[#4b5563]">
                  No blog posts yet. Check back soon!
                </h2>
                <Link
                  href="/"
                  className="mt-4 inline-block font-medium text-[#3d5a28] hover:underline"
                >
                  Back to home
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </PollenGeneralLayout>
    );
  }

  return (
    <PollenGeneralLayout
      business={business}
      title={listingTitle}
      subtitle="Blog"
      imageUrl={heroImageUrl}
      titleFieldKey="pollen.blog.listing-title"
      sectionAttrs={sectionGroupAttr("blog", "header")}
    >
      <section className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn direction="up">
            {listingIntro ? (
              <p
                className="mx-auto mb-10 max-w-3xl text-center text-lg leading-relaxed text-[#4b5563]"
                {...fieldAttr("pollen.blog.listing-intro")}
              >
                {listingIntro}
              </p>
            ) : null}

            <div className="mx-auto mb-10 max-w-md">
              <div className="bg-background flex items-center gap-2 rounded-xl border border-[#e5e7eb] px-3 py-2 shadow-sm">
                <Search
                  className="h-4 w-4 shrink-0 text-[#9ca3af]"
                  aria-hidden
                />
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
                <p
                  className="mt-2 text-center text-sm text-[#6b7280]"
                  role="status"
                >
                  {filtered.length === 0
                    ? "No posts match your search."
                    : `${filtered.length} post${filtered.length !== 1 ? "s" : ""} found`}
                </p>
              ) : null}
            </div>
          </FadeIn>

          {query.trim() ? (
            <section>
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-[#6b7280]">
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
                    className="group bg-card block overflow-hidden rounded-2xl border border-[#e5e7eb] shadow-sm transition hover:border-[#A8D081]/50 hover:shadow-md"
                  >
                    <div className="grid gap-0 lg:grid-cols-2 lg:items-stretch">
                      <div className="relative aspect-4/3 min-h-[220px] lg:aspect-auto lg:min-h-[280px]">
                        <Image
                          src={featured.image ?? "/placeholder.svg"}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          priority
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      </div>
                      <div className="flex flex-col justify-center p-8 lg:p-10">
                        <p className="mb-2 text-xs font-medium tracking-[0.2em] text-[#5e7747] uppercase">
                          {formatDate(featured.createdAt)} · Latest
                        </p>
                        <h2 className="text-2xl font-bold tracking-wide text-[#374151] transition-colors group-hover:text-[#3d5a28] md:text-3xl">
                          {featured.title}
                        </h2>
                        {featured.excerpt ? (
                          <p className="mt-4 line-clamp-3 text-[#4b5563]">
                            {featured.excerpt}
                          </p>
                        ) : null}
                        <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#3d5a28]">
                          Read article
                          <span
                            className="h-px w-8 bg-[#3d5a28] transition-all group-hover:w-12"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </div>
                  </Link>
                </section>
              ) : null}

              {rest.length > 0 ? (
                <section>
                  <h2 className="mb-6 text-2xl font-bold tracking-wide text-[#374151]">
                    More articles
                  </h2>
                  <div className="grid gap-8 md:grid-cols-2">
                    {gridPosts.map((post) => (
                      <PostCard key={post.slug} post={post} />
                    ))}
                  </div>
                </section>
              ) : !featured ? (
                <div className="rounded-2xl bg-[#f9fafb] py-16 text-center text-[#6b7280]">
                  No blog posts yet.
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </PollenGeneralLayout>
  );
}
