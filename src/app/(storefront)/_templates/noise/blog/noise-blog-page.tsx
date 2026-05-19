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

/* "18 · 05 · 26" format matching design */
function fmtDispatchDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = String(dt.getFullYear()).slice(-2);
  return `${day} · ${month} · ${year}`;
}

const QUOTE =
  "A garment that doesn't pick a fight with the room it walks into isn't trying hard enough. We make clothes for people who actually want to be seen.";

export function NoiseBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "noise.blog-listing-heading",
    "noise.blog-listing-intro",
  ]);

  const heading = f["noise.blog-listing-heading"] ?? "The Journal.";
  const [query, setQuery] = useState("");

  const postsWithSearch = useMemo(
    () => pages.map((p) => ({ post: p, searchBlob: buildBlogSearchBlob(p) })),
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
  const totalCount = pages.length;

  return (
    <PageTransition>
      {/* Editorial 3-column header — matches shop/product page pattern */}
      <section
        className="border-b-2 border-foreground"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="flex items-stretch" style={{ minHeight: "140px" }}>
          <div
            className="hidden md:flex flex-col justify-center gap-2 px-7 py-8 border-r border-foreground/20"
            style={{ minWidth: "200px" }}
          >
            <span className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground">
              Section / 03
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground">
              The Journal — Vol. IX
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground opacity-60">
              ↳ {totalCount} dispatches
            </span>
          </div>

          <FadeIn className="flex-1 flex items-center px-7 py-8">
            <h1
              className="font-serif italic leading-none tracking-tight"
              style={{
                fontSize: "clamp(3rem, 7vw, 6rem)",
                letterSpacing: "-0.025em",
              }}
            >
              {heading}
            </h1>
          </FadeIn>

          <div
            className="hidden lg:flex flex-col justify-center gap-2 px-7 py-8 border-l border-foreground/20 text-right"
            style={{ minWidth: "160px" }}
          >
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground">
              Visual Noise
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground">
              {totalCount} dispatches
            </span>
          </div>
        </div>

        {/* Search bar — mono style */}
        <div
          className="border-t border-foreground/15 px-7 py-3 flex items-center gap-4"
          style={{ background: "var(--vn-paper)" }}
        >
          <span
            className="font-mono text-[9.5px] tracking-[0.22em] uppercase flex-shrink-0"
            style={{ color: "var(--vn-steel)" }}
          >
            Search
          </span>
          <input
            type="search"
            placeholder="FILTER THE ARCHIVE..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent font-mono text-[11px] tracking-[0.12em] uppercase outline-none placeholder:opacity-30"
            style={{ color: "var(--vn-ink)", borderBottom: "1px solid var(--vn-rule)" }}
            aria-label="Search blog posts"
          />
          {query.trim() && (
            <span
              className="font-mono text-[9.5px] tracking-[0.18em] uppercase flex-shrink-0"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </section>

      {/* Featured article */}
      {featured && !query.trim() && (
        <section
          className="border-b-2 border-foreground"
          style={{ background: "var(--vn-paper)" }}
        >
          <FadeIn>
            <Link
              href={`/blog/${featured.slug}`}
              className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
            >
              {/* Image */}
              <div
                className="relative overflow-hidden border-b border-foreground md:border-b-0 md:border-r"
                style={{ minHeight: "clamp(300px, 50vw, 480px)" }}
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
                      style={{ fontSize: "80px", color: "var(--vn-bone)", opacity: 0.2 }}
                    >
                      I
                    </span>
                  </div>
                )}
                {/* Corner stamps */}
                <div
                  className="absolute left-4 top-4 font-mono text-[9.5px] tracking-[0.2em] uppercase px-2 py-1"
                  style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
                >
                  Featured · Issue 02
                </div>
                <div
                  className="absolute right-4 top-4 font-mono text-[9.5px] tracking-[0.2em] uppercase px-2 py-1"
                  style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
                >
                  ★ Editor&apos;s Pick
                </div>
              </div>

              {/* Text */}
              <div className="flex flex-col justify-between gap-6 p-10 lg:p-14">
                <div
                  className="flex items-center gap-3 font-mono text-[9.5px] tracking-[0.18em] uppercase"
                  style={{ color: "var(--vn-steel)" }}
                >
                  <span>{fmtDispatchDate(featured.createdAt)}</span>
                  <span style={{ color: "var(--vn-rule)" }}>·</span>
                  <span>The Journal</span>
                  <span style={{ color: "var(--vn-rule)" }}>·</span>
                  <span>Long read</span>
                </div>

                <h2
                  className="font-serif italic leading-[1.0] tracking-tight transition-opacity group-hover:opacity-70"
                  style={{
                    fontSize: "clamp(2rem, 3.5vw, 3.5rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p
                    className="font-sans text-[15px] leading-relaxed max-w-[44ch]"
                    style={{ color: "var(--vn-ink-soft)" }}
                  >
                    {featured.excerpt}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <div
                      className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      Written by
                    </div>
                    <div
                      className="font-mono text-[10.5px] tracking-[0.14em] uppercase"
                      style={{ color: "var(--vn-ink)" }}
                    >
                      Studio Editor
                    </div>
                  </div>
                  <span
                    className="vn-stamp transition-all group-hover:bg-foreground group-hover:text-background"
                    style={{ fontSize: "10px" }}
                  >
                    Read the dispatch →
                  </span>
                </div>
              </div>
            </Link>
          </FadeIn>
        </section>
      )}

      {/* Archive header */}
      <div
        className="flex items-baseline justify-between border-b border-foreground/20 px-7 py-6"
        style={{ background: "var(--vn-paper)" }}
      >
        <div
          className="font-serif italic leading-none"
          style={{
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            letterSpacing: "-0.02em",
          }}
        >
          {query.trim() ? "Results." : "Dispatches."}
        </div>
        <div
          className="font-mono text-[10px] tracking-[0.18em] uppercase hidden md:block"
          style={{ color: "var(--vn-steel)" }}
        >
          {filtered.length} in the archive
        </div>
      </div>

      {/* Journal grid */}
      <section className="px-7 py-12" style={{ background: "var(--vn-paper)" }}>
        {filtered.length === 0 ? (
          <FadeIn className="py-20 text-center">
            <p
              className="font-serif italic text-2xl font-light"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              No dispatches found for &ldquo;{query}&rdquo;
            </p>
          </FadeIn>
        ) : (
          <StaggerContainer
            key={filtered.map((p) => p.id).join("|")}
            className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.07}
          >
            {(query.trim() ? filtered : rest).map((post, i) => {
              const issueNum = totalCount - i - (query.trim() ? 0 : 1);
              return (
                <StaggerItem key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="group block">
                    {/* Cover */}
                    <div
                      className="relative overflow-hidden border border-foreground"
                      style={{ aspectRatio: "4/5", background: "var(--vn-steel)" }}
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
                            style={{ fontSize: "64px", color: "var(--vn-bone)", opacity: 0.3 }}
                          >
                            {String.fromCharCode(0x2160 + (i % 6))}
                          </span>
                        </div>
                      )}
                      {/* Corner stamp — category */}
                      <div
                        className="absolute left-2.5 top-2.5 font-mono text-[9px] tracking-[0.18em] uppercase px-1.5 py-1 whitespace-nowrap"
                        style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
                      >
                        The Journal
                      </div>
                      {/* Issue number */}
                      <div
                        className="absolute right-2.5 top-2.5 font-mono text-[9px] tracking-[0.18em] uppercase px-1.5 py-1"
                        style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
                      >
                        N° {String(Math.max(issueNum, 1)).padStart(3, "0")}
                      </div>
                    </div>

                    {/* Meta row */}
                    <div
                      className="flex items-center gap-2 mt-3 font-mono text-[10px] tracking-[0.14em] uppercase"
                      style={{ color: "var(--vn-steel)" }}
                    >
                      <span>{fmtDispatchDate(post.createdAt)}</span>
                      <span style={{ color: "var(--vn-rule)" }}>·</span>
                      <span>Dispatch</span>
                    </div>

                    {/* Title */}
                    <h3
                      className="mt-2 font-serif italic leading-[1.15] tracking-tight transition-opacity group-hover:opacity-70"
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
                      className="mt-3 flex items-center justify-between font-mono text-[10px] tracking-[0.16em] uppercase"
                      style={{ color: "var(--vn-steel)" }}
                    >
                      <span>Studio</span>
                      <span className="transition-opacity group-hover:opacity-60">
                        Read →
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </section>

      {/* Quote band */}
      {!query.trim() && (
        <section
          className="border-y-2 border-foreground px-7 py-20"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          <FadeIn className="mx-auto max-w-4xl">
            <div
              className="font-serif italic leading-none mb-6"
              style={{ fontSize: "80px", opacity: 0.3, lineHeight: 0.8 }}
            >
              &ldquo;
            </div>
            <p
              className="font-serif italic leading-[1.2]"
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                letterSpacing: "-0.01em",
                maxWidth: "36ch",
              }}
            >
              {QUOTE}
            </p>
            <div className="mt-8">
              <em
                className="font-serif italic"
                style={{ fontSize: "20px", color: "var(--vn-bone)" }}
              >
                Marisol Knight
              </em>
              <p
                className="font-mono text-[10px] tracking-[0.2em] uppercase mt-1"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Founder & head of atelier · Visual Noise · Det.
              </p>
            </div>
          </FadeIn>
        </section>
      )}

      {/* Closing marquee */}
      {!query.trim() && (
        <div
          className="overflow-hidden border-b border-foreground/20 py-3"
          style={{ background: "var(--vn-ink)" }}
        >
          <div className="vn-marquee-track" aria-hidden="true">
            {[0, 1].map((n) => (
              <span
                key={n}
                className="whitespace-nowrap font-serif italic px-6"
                style={{
                  fontSize: "clamp(1.4rem, 3vw, 2rem)",
                  color: "var(--vn-bone)",
                  opacity: 0.7,
                  letterSpacing: "-0.01em",
                }}
              >
                Field notes from the studio
                <span
                  className="font-mono not-italic mx-6"
                  style={{ fontSize: "14px", color: "var(--vn-steel-mist)" }}
                >
                  ✦
                </span>
                Updated every fortnight
                <span
                  className="font-mono not-italic mx-6"
                  style={{ fontSize: "14px", color: "var(--vn-steel-mist)" }}
                >
                  ✦
                </span>
                Written in Detroit
                <span
                  className="font-mono not-italic mx-6"
                  style={{ fontSize: "14px", color: "var(--vn-steel-mist)" }}
                >
                  ✦
                </span>
                Read like a fanzine
                <span
                  className="font-mono not-italic mx-6"
                  style={{ fontSize: "14px", color: "var(--vn-steel-mist)" }}
                >
                  ✦
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
