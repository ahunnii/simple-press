"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
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

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="sledge-card-placeholder absolute inset-0 flex items-center justify-center bg-[var(--sl-green)]">
      <span className="sledge-card-placeholder-num select-none">{label}</span>
    </div>
  );
}

export function SledgeBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "sledge.blog-listing-heading",
    "sledge.blog-listing-intro",
  ]);

  const heading = f["sledge.blog-listing-heading"] ?? "Blog";
  const intro =
    f["sledge.blog-listing-intro"] ??
    "News, studio notes, and stories from behind the scenes.";

  const [query, setQuery] = useState("");

  const postsWithBlob = useMemo(
    () => pages.map((p) => ({ post: p, blob: buildBlogSearchBlob(p) })),
    [pages],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return postsWithBlob
      .filter(({ blob }) => blobIncludesQuery(blob, q))
      .map(({ post }) => post);
  }, [query, pages, postsWithBlob]);

  const [featured, ...rest] = filtered;

  return (
    <PageTransition>
      <section
        className="bg-white px-7 pt-16 pb-10 md:pt-20 md:pb-12"
        {...sectionGroupAttr("blog", "listing")}
      >
        <FadeIn className="sl-container">
          <h1 className="sl-page-title-lg font-heading text-[var(--sl-coral)] uppercase">
            {heading}
          </h1>
          {intro && (
            <p className="sl-eyebrow mt-4 max-w-[52ch] font-sans text-sm leading-relaxed md:text-base">
              {intro}
            </p>
          )}
        </FadeIn>

        <div className="sl-container mx-auto mt-8">
          <div className="flex items-center gap-4 rounded-sm border border-[var(--sl-border-input)] bg-[var(--sl-cream)] px-5 py-3.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="flex-shrink-0 text-[var(--sl-ink)] opacity-50"
            >
              <circle
                cx="6.5"
                cy="6.5"
                r="5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10.5 10.5L14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              placeholder="Search posts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent font-sans text-sm text-[var(--sl-ink)] outline-none placeholder:opacity-50"
              aria-label="Search blog posts"
            />
            {query.trim() ? (
              <span className="sl-eyebrow flex-shrink-0 font-sans text-xs tracking-[0.12em] uppercase">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {featured && !query.trim() && (
        <section className="bg-white px-7 pb-10">
          <FadeIn className="sl-container">
            <Link
              href={`/blog/${featured.slug}`}
              className="sl-card-shadow group grid grid-cols-1 overflow-hidden rounded-sm border border-[var(--sl-border)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
            >
              <div className="relative min-h-[clamp(260px,42vw,420px)] overflow-hidden bg-[var(--sl-green)]">
                {featured.image ? (
                  <Image
                    src={featured.image}
                    alt={featured.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    priority
                    sizes="(max-width: 768px) 100vw, 55vw"
                  />
                ) : (
                  <ImagePlaceholder label="★" />
                )}
              </div>

              <div className="flex flex-col justify-between gap-8 bg-white p-8 lg:p-10">
                <div className="flex flex-col gap-4">
                  <span className="self-start rounded-sm bg-[var(--sl-cream)] px-2.5 py-1 font-sans text-[10px] tracking-[0.18em] text-[var(--sl-coral)] uppercase">
                    Latest
                  </span>
                  <h2 className="font-sans text-xl leading-tight tracking-[0.04em] text-[var(--sl-ink)] uppercase transition-opacity group-hover:opacity-70 md:text-2xl lg:text-3xl">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="sl-eyebrow max-w-[44ch] font-sans text-sm leading-relaxed">
                      {featured.excerpt}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <p className="sl-eyebrow font-sans text-xs tracking-[0.14em] uppercase">
                    {fmtDate(featured.createdAt)}
                  </p>
                  <span className="sl-btn text-xs">Read Post →</span>
                </div>
              </div>
            </Link>
          </FadeIn>
        </section>
      )}

      <div className="sl-container mx-auto flex items-baseline justify-between px-7 py-8">
        <h2 className="sl-page-title-md font-heading text-[var(--sl-coral)] uppercase">
          {query.trim() ? "Results" : "All Posts"}
        </h2>
        <span className="sl-eyebrow hidden font-sans text-xs tracking-[0.14em] uppercase md:block">
          {filtered.length} {filtered.length === 1 ? "post" : "posts"}
        </span>
      </div>

      <section className="bg-white px-7 pb-16 md:pb-20">
        <div className="sl-container">
          {filtered.length === 0 ? (
            <FadeIn className="py-20 text-center">
              <p className="sl-eyebrow font-sans text-base">
                No posts found for &ldquo;{query}&rdquo;
              </p>
            </FadeIn>
          ) : (
            <StaggerContainer
              key={filtered.map((p) => p.id).join("|")}
              className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
              staggerDelay={0.07}
            >
              {(query.trim() ? filtered : rest).map((post, i) => (
                <StaggerItem key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="group block">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-[var(--sl-green)]">
                      {post.image ? (
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <ImagePlaceholder
                          label={String.fromCharCode(65 + (i % 6))}
                        />
                      )}
                    </div>

                    <p className="sl-eyebrow mt-4 font-sans text-xs tracking-[0.12em] uppercase">
                      {fmtDate(post.createdAt)}
                    </p>

                    <h3 className="mt-2 font-sans text-base leading-tight tracking-[0.04em] text-[var(--sl-ink)] uppercase transition-opacity group-hover:opacity-70 md:text-lg">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="sl-eyebrow mt-2 line-clamp-2 font-sans text-sm leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}

                    <span className="mt-3 inline-block font-sans text-xs tracking-[0.14em] text-[var(--sl-coral)] uppercase transition-opacity group-hover:opacity-60">
                      Read →
                    </span>
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
