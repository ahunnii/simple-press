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
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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
        className="border-b-2 border-foreground px-6 pt-16 pb-14 text-center"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1280px" }}>
          <p
            className="font-mono text-[10px] tracking-[0.28em] uppercase mb-4"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Reading Room
          </p>
          <h1
            className="font-serif italic leading-none tracking-tight"
            style={{ fontSize: "clamp(3.5rem, 8vw, 6rem)", letterSpacing: "-0.025em" }}
          >
            {heading}
          </h1>
          <p
            className="font-sans mt-6 mx-auto leading-[1.85]"
            style={{ fontSize: "15px", color: "var(--vn-ink-soft)", maxWidth: "52ch" }}
          >
            {intro}
          </p>
        </FadeIn>

        {/* Search bar */}
        <div
          className="mx-auto mt-10 flex items-center gap-4 border-t border-foreground/15 px-7 py-3"
          style={{ maxWidth: "1280px" }}
        >
          <span
            className="font-mono text-[9.5px] tracking-[0.22em] uppercase flex-shrink-0"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Search
          </span>
          <input
            type="search"
            placeholder="Filter the archive…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent font-mono text-[11px] tracking-[0.12em] uppercase outline-none placeholder:opacity-30"
            style={{
              color: "var(--vn-ink)",
              borderBottom: "1px solid var(--vn-rule)",
            }}
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

      {/* ── Featured article ── */}
      {featured && !query.trim() && (
        <section
          className="border-b-2 border-foreground"
          style={{ background: "var(--vn-paper)" }}
        >
          <FadeIn>
            <Link
              href={`/blog/${featured.slug}`}
              className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
            >
              {/* Image — 5:4 on the featured article */}
              <div
                className="relative overflow-hidden border-b border-foreground md:border-b-0 md:border-r"
                style={{ minHeight: "clamp(280px, 48vw, 480px)", background: "var(--vn-steel)" }}
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
                  Featured
                </div>
                <div
                  className="absolute right-4 top-4 font-mono text-[9.5px] tracking-[0.2em] uppercase px-2 py-1"
                  style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
                >
                  The Journal
                </div>
              </div>

              {/* Text */}
              <div className="flex flex-col justify-between gap-8 p-10 lg:p-14">
                <div className="flex flex-col gap-4">
                  {/* Category chip */}
                  <span
                    className="font-mono text-[9.5px] tracking-[0.22em] uppercase self-start px-2 py-1"
                    style={{ background: "var(--vn-bone)", color: "var(--vn-steel-mist)", border: "1px solid var(--vn-rule)" }}
                  >
                    Featured · Issue 01
                  </span>
                  <h2
                    className="font-serif italic leading-[1.05] tracking-tight transition-opacity group-hover:opacity-70"
                    style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", letterSpacing: "-0.02em" }}
                  >
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p
                      className="font-sans leading-relaxed max-w-[44ch]"
                      style={{ fontSize: "15px", color: "var(--vn-ink-soft)" }}
                    >
                      {featured.excerpt}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      {fmtDate(featured.createdAt)}
                    </p>
                    <p
                      className="font-mono text-[10.5px] tracking-[0.14em] uppercase"
                      style={{ color: "var(--vn-ink)" }}
                    >
                      Studio Editor
                    </p>
                  </div>
                  <span
                    className="vn-stamp text-[10px] transition-all group-hover:bg-foreground group-hover:text-background"
                  >
                    Read the essay →
                  </span>
                </div>
              </div>
            </Link>
          </FadeIn>
        </section>
      )}

      {/* ── Archive heading ── */}
      <div
        className="flex items-baseline justify-between border-b border-foreground/20 px-7 py-6"
        style={{ background: "var(--vn-paper)" }}
      >
        <div
          className="font-serif italic leading-none"
          style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", letterSpacing: "-0.02em" }}
        >
          {query.trim() ? "Results." : "Dispatches."}
        </div>
        <div
          className="font-mono text-[10px] tracking-[0.18em] uppercase hidden md:block"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          {filtered.length} in the archive
        </div>
      </div>

      {/* ── Post grid ── */}
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
            className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.07}
          >
            {(query.trim() ? filtered : rest).map((post, i) => (
              <StaggerItem key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  {/* Cover — 4:3 aspect matching design */}
                  <div
                    className="relative overflow-hidden border border-foreground"
                    style={{ aspectRatio: "4/3", background: "var(--vn-steel)" }}
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
                    <div
                      className="absolute left-2.5 top-2.5 font-mono text-[9px] tracking-[0.18em] uppercase px-1.5 py-1 whitespace-nowrap"
                      style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
                    >
                      The Journal
                    </div>
                  </div>

                  {/* Meta */}
                  <div
                    className="flex items-center gap-2 mt-4 font-mono text-[10px] tracking-[0.14em] uppercase"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    <span>{fmtDate(post.createdAt)}</span>
                    <span style={{ color: "var(--vn-rule)" }}>·</span>
                    <span>Dispatch</span>
                  </div>

                  {/* Title */}
                  <h3
                    className="mt-2.5 font-serif italic leading-[1.15] tracking-tight transition-opacity group-hover:opacity-70"
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
                    <span>Studio Editor</span>
                    <span className="transition-opacity group-hover:opacity-60">Read →</span>
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
