"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
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

export function NoiseBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "noise.blog-listing-heading",
    "noise.blog-listing-intro",
  ]);

  const heading = f["noise.blog-listing-heading"] ?? "The Journal.";
  const intro =
    f["noise.blog-listing-intro"] ??
    "Notes from the studio, the mills, and the streets that keep us thinking. We publish when we have something to say.";

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
      {/* ── Centered header — "Reading Room" overline + h1 + intro ── */}
      <section
        className="border-foreground border-b px-6 pt-16 pb-14 text-center"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1280px" }}>
          <p
            className="mb-4 font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Blog
          </p>
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(3.5rem, 8vw, 6rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {heading}
          </h1>
          <p
            className="mx-auto mt-6 font-sans leading-[1.85]"
            style={{
              fontSize: "15px",
              color: "var(--vn-ink-soft)",
              maxWidth: "52ch",
            }}
          >
            {intro}
          </p>
        </FadeIn>

        {/* Search bar */}
        <div className="mx-auto mt-10 px-7" style={{ maxWidth: "1280px" }}>
          <div
            className="flex items-center gap-4 px-5 py-4"
            style={{
              background: "var(--vn-bone)",
              border: "1.5px solid var(--vn-steel)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="flex-shrink-0 opacity-50"
              style={{ color: "var(--vn-ink)" }}
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
              placeholder="Search the archive…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent font-mono text-[12px] tracking-[0.12em] uppercase outline-none placeholder:opacity-40"
              style={{ color: "var(--vn-ink)" }}
              aria-label="Search blog posts"
            />
            {query.trim() ? (
              <span
                className="flex-shrink-0 font-mono text-[9.5px] tracking-[0.18em] uppercase"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            ) : (
              <span
                className="flex-shrink-0 font-mono text-[9px] tracking-[0.22em] uppercase opacity-40"
                style={{ color: "var(--vn-ink)" }}
              >
                Search
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Featured article ── */}
      {featured && !query.trim() && (
        <section
          className="border-foreground border-b"
          style={{ background: "var(--vn-paper)" }}
        >
          <FadeIn>
            <Link
              href={`/blog/${featured.slug}`}
              className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
            >
              {/* Image — 5:4 on the featured article */}
              <div
                className="border-foreground relative overflow-hidden border-b md:border-r md:border-b-0"
                style={{
                  minHeight: "clamp(280px, 48vw, 480px)",
                  background: "var(--vn-steel)",
                }}
              >
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
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: `repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                    }}
                  >
                    <span
                      className="font-serif italic select-none"
                      style={{
                        fontSize: "80px",
                        color: "var(--vn-bone)",
                        opacity: 0.2,
                      }}
                    >
                      I
                    </span>
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="flex flex-col justify-between gap-8 p-10 lg:p-14">
                <div className="flex flex-col gap-4">
                  {/* Category chip */}
                  <span
                    className="self-start px-2 py-1 font-mono text-[9.5px] tracking-[0.22em] uppercase"
                    style={{
                      background: "var(--vn-bone)",
                      color: "var(--vn-steel-mist)",
                      border: "1px solid var(--vn-rule)",
                    }}
                  >
                    Latest
                  </span>
                  <h2
                    className="font-serif leading-[1.05] tracking-tight italic transition-opacity group-hover:opacity-70"
                    style={{
                      fontSize: "clamp(2rem, 3.5vw, 3rem)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p
                      className="max-w-[44ch] font-sans leading-relaxed"
                      style={{ fontSize: "15px", color: "var(--vn-ink-soft)" }}
                    >
                      {featured.excerpt}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="mb-1 font-mono text-[9px] tracking-[0.2em] uppercase"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      {fmtDate(featured.createdAt)}
                    </p>
                  </div>
                  <span className="vn-stamp group-hover:bg-foreground group-hover:text-background text-[10px] transition-all">
                    Read the post →
                  </span>
                </div>
              </div>
            </Link>
          </FadeIn>
        </section>
      )}

      {/* ── Archive heading ── */}
      <div
        className="border-foreground/20 flex items-baseline justify-between border-b px-7 py-6"
        style={{ background: "var(--vn-paper)" }}
      >
        <div
          className="font-serif leading-none italic"
          style={{
            fontSize: "clamp(2rem, 4vw, 3.2rem)",
            letterSpacing: "-0.02em",
          }}
        >
          {query.trim() ? "Results" : "Posts"}
        </div>
        <div
          className="hidden font-mono text-[10px] tracking-[0.18em] uppercase md:block"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          {filtered.length} in the blog
        </div>
      </div>

      {/* ── Post grid ── */}
      <section className="px-7 py-12" style={{ background: "var(--vn-paper)" }}>
        {filtered.length === 0 ? (
          <FadeIn className="py-20 text-center">
            <p
              className="font-serif text-2xl font-light italic"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              No posts found for &ldquo;{query}&rdquo;
            </p>
          </FadeIn>
        ) : (
          <StaggerContainer
            key={filtered.map((p) => p.id).join("|")}
            className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.07}
          >
            {(query.trim() ? filtered : rest).map((post, i) => (
              <StaggerItem key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  {/* Cover — 4:3 aspect matching design */}
                  <div
                    className="border-foreground relative overflow-hidden border"
                    style={{
                      aspectRatio: "4/3",
                      background: "var(--vn-steel)",
                    }}
                  >
                    {post.image ? (
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          background: `repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                        }}
                      >
                        <span
                          className="font-serif italic select-none"
                          style={{
                            fontSize: "64px",
                            color: "var(--vn-bone)",
                            opacity: 0.3,
                          }}
                        >
                          {String.fromCharCode(0x2160 + (i % 6))}
                        </span>
                      </div>
                    )}
                    <div
                      className="absolute top-2.5 left-2.5 px-1.5 py-1 font-mono text-[9px] tracking-[0.18em] whitespace-nowrap uppercase"
                      style={{
                        background: "var(--vn-bone)",
                        color: "var(--vn-ink)",
                      }}
                    >
                      Blog
                    </div>
                  </div>

                  {/* Meta */}
                  <div
                    className="mt-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    <span>{fmtDate(post.createdAt)}</span>
                  </div>

                  {/* Title */}
                  <h3
                    className="mt-2.5 font-serif leading-[1.15] tracking-tight italic transition-opacity group-hover:opacity-70"
                    style={{ fontSize: "22px", letterSpacing: "-0.005em" }}
                  >
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  {post.excerpt && (
                    <p
                      className="mt-2 line-clamp-2 font-sans text-sm leading-relaxed"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      {post.excerpt}
                    </p>
                  )}

                  {/* Footer */}
                  <div
                    className="mt-4 flex items-center justify-between font-mono text-[10px] tracking-[0.16em] uppercase"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    <span className="transition-opacity group-hover:opacity-60">
                      Read →
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </section>
    </PageTransition>
  );
}
