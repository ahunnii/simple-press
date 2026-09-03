"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn, formatDate } from "~/lib/utils";

import { resolveFields } from "../index";
import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal, BambooRevealGroup } from "../shared/bamboo-reveal";
import {
  bambooBlobStyle,
  BambooPostArt,
  BambooPostCard,
  BambooPostPhoto,
} from "./bamboo-post-card";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

export function BambooBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "animated-bamboo.blog.listing-title",
    "animated-bamboo.blog.listing-intro",
    "animated-bamboo.blog.listing-image",
  ]);

  const pageTitle = f["animated-bamboo.blog.listing-title"] ?? "";
  const pageIntro = f["animated-bamboo.blog.listing-intro"] ?? "";
  const heroImage = f["animated-bamboo.blog.listing-image"] ?? "";

  const [query, setQuery] = useState("");

  const postsWithSearch = useMemo(
    () =>
      pages.map((post) => ({ post, searchBlob: buildBlogSearchBlob(post) })),
    [pages],
  );

  const trimmed = query.trim();

  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return pages;
    return postsWithSearch
      .filter(({ searchBlob }) => blobIncludesQuery(searchBlob, q))
      .map(({ post }) => post);
  }, [trimmed, pages, postsWithSearch]);

  const searching = trimmed !== "";
  const leadPost = searching ? undefined : filtered[0];
  const listPosts = leadPost ? filtered.slice(1) : filtered;
  const hasPosts = pages.length > 0;

  return (
    <>
      {/* ── Sage hero band ─────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("blog", "listing")}
        aria-labelledby="bamboo-blog-heading"
        className="relative isolate flex items-center overflow-hidden"
        style={{
          background: "var(--bamboo-sage)",
          marginTop: "calc(var(--bamboo-header-offset) * -1)",
          minHeight: "min(36vh, 400px)",
          paddingTop:
            "calc(var(--bamboo-header-offset) + clamp(34px, 4vw, 58px))",
          paddingBottom: "clamp(46px, 5.4vw, 82px)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          {/* the page's one edge anchor: a crownless culm rooted off the left
              edge, so it is only ever cropped by the band itself */}
          <span className="hidden md:block">
            <span
              className="bamboo-el bamboo-el--b"
              style={
                {
                  "--w": "138px",
                  "--l": "-3.6%",
                  "--b": "-150px",
                  "--d": "0.24s",
                } as React.CSSProperties
              }
            >
              <span
                className="bamboo-sway"
                style={
                  {
                    "--dur": "8.8s",
                    "--dl": "-2.4s",
                    "--a1": "-0.5deg",
                    "--a2": "0.55deg",
                  } as React.CSSProperties
                }
              >
                <BambooGlyph id="s-culm-run" />
              </span>
            </span>
          </span>

          {/* inner-page ambient budget: two drifting leaves on desktop, one at 390 */}
          <span
            className="bamboo-drift"
            style={
              {
                "--l": "42%",
                "--t": "4%",
                "--w": "28px",
                "--dur": "16s",
                "--dl": "-3s",
                "--dx": "104px",
                "--dy": "300px",
                "--dr": "170deg",
              } as React.CSSProperties
            }
          >
            <BambooGlyph id="s-leaf" />
          </span>
          <span className="hidden md:block">
            <span
              className="bamboo-drift"
              style={
                {
                  "--l": "63%",
                  "--t": "2%",
                  "--w": "23px",
                  "--dur": "20s",
                  "--dl": "-11s",
                  "--dx": "-78px",
                  "--dy": "340px",
                  "--dr": "-150deg",
                } as React.CSSProperties
              }
            >
              <BambooGlyph id="s-leaf-d" />
            </span>
          </span>
        </div>

        <div
          className={cn(
            "relative mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 px-6",
            heroImage &&
              "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.76fr)] lg:gap-16",
          )}
        >
          <div className="max-w-[560px]">
            <h1
              id="bamboo-blog-heading"
              className="font-heading text-[clamp(2.3rem,4.4vw,3.5rem)] leading-[1.06] font-bold tracking-[-0.026em] text-balance text-[var(--bamboo-pine)]"
              {...fieldAttr("animated-bamboo.blog.listing-title")}
            >
              {pageTitle}
            </h1>
            {pageIntro ? (
              <p
                className="mt-[18px] max-w-[38ch] text-[1.08rem] leading-[1.6] text-[var(--bamboo-ink)]"
                {...fieldAttr("animated-bamboo.blog.listing-intro")}
              >
                {pageIntro}
              </p>
            ) : null}
          </div>

          {/* Optional photo: layers into the scene as a tilted photo card.
              Unset → the illustrated scene carries the band on its own. The
              tilt lives on the WRAPPER, not on `.bamboo-photo-card` itself — a
              transform there would make the frame a stacking context and bury
              its own ground-shadow `::after` (z-index:-1). */}
          {heroImage ? (
            <div className="mx-auto w-full max-w-[360px] rotate-[-2.5deg] lg:mx-0 lg:ml-auto">
              <figure className="bamboo-photo-card">
                <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg">
                  <Image
                    src={heroImage}
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 1024px) 360px, 30vw"
                    className="object-cover"
                  />
                </span>
                <span className="bamboo-photo-badge" aria-hidden="true">
                  <BambooGlyph id="s-wreath" className="block h-auto w-full" />
                </span>
              </figure>
            </div>
          ) : null}
        </div>
      </section>

      <BambooEdge
        from="sage"
        to="paper"
        variant="a"
        leaves={[
          { id: "s-leaf-d", l: "14%", t: "6%", w: "28px", r: "-24deg" },
          { id: "s-leaf", l: "46%", t: "34%", w: "22px", r: "18deg" },
          { id: "s-leaf-l", l: "73%", t: "2%", w: "25px", r: "-9deg" },
        ]}
      />

      {/* ── Paper: search + posts ──────────────────────────────────────── */}
      <section className="pt-[clamp(30px,3.4vw,52px)] pb-[clamp(58px,6vw,96px)]">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          {hasPosts ? (
            <BambooReveal className="mx-auto max-w-[520px]">
              <label htmlFor="bamboo-blog-search" className="sr-only">
                Search articles
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-[var(--bamboo-muted)]"
                  aria-hidden="true"
                />
                <input
                  id="bamboo-blog-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles"
                  className="w-full rounded-full border-2 border-[var(--bamboo-sage-deep)] bg-[var(--bamboo-roll)] py-3 pr-5 pl-12 text-[0.98rem] text-[var(--bamboo-ink)] placeholder:text-[var(--bamboo-muted)]"
                />
              </div>
              <p
                aria-live="polite"
                aria-atomic="true"
                className="mt-2 min-h-[1.3rem] text-center text-[0.86rem] text-[var(--bamboo-muted)]"
              >
                {searching
                  ? filtered.length === 0
                    ? "No articles found. Try a different keyword."
                    : `${filtered.length} article${filtered.length === 1 ? "" : "s"} found`
                  : ""}
              </p>
            </BambooReveal>
          ) : null}

          {/* Designed empty state — no posts published yet. */}
          {!hasPosts ? (
            <BambooReveal className="mx-auto max-w-[560px]">
              <div className="bamboo-torn-card text-center">
                <BambooGlyph
                  id="s-sprig"
                  className="mx-auto mt-3 h-16 w-auto"
                />
                <p className="font-heading mt-4 text-[1.35rem] font-semibold text-[var(--bamboo-pine)]">
                  Insights are coming soon
                </p>
                <p className="mx-auto mt-2 max-w-[38ch] text-[0.98rem] leading-relaxed text-[var(--bamboo-ink-soft)]">
                  New notes on tree-free living are on their way. Check back
                  soon.
                </p>
                <Link
                  href="/"
                  className="bamboo-btn bamboo-btn-primary mt-7 inline-flex"
                >
                  Back to home
                </Link>
              </div>
            </BambooReveal>
          ) : null}

          {/* Lead post — the newest story, given its own room. */}
          {leadPost ? (
            <BambooReveal className="mt-[clamp(30px,3.6vw,52px)]">
              <article className="bamboo-torn-card grid gap-8 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:items-center md:gap-12 md:p-10">
                <div className="relative grid min-h-[220px] place-items-center md:min-h-[300px]">
                  <span
                    className="bamboo-blob"
                    style={bambooBlobStyle(0)}
                    aria-hidden="true"
                  />
                  {leadPost.image ? (
                    <BambooPostPhoto
                      src={leadPost.image}
                      width="80%"
                      priority
                      sizes="(max-width: 768px) 78vw, 34vw"
                    />
                  ) : (
                    <BambooPostArt index={0} className="w-[80%]" />
                  )}
                </div>

                <div>
                  <p className="flex items-center gap-2.5">
                    <BambooGlyph
                      id="s-wreath"
                      className="h-7 w-auto shrink-0"
                    />
                    <time
                      className="text-[0.86rem] font-medium text-[var(--bamboo-muted)]"
                      dateTime={new Date(leadPost.createdAt).toISOString()}
                    >
                      {formatDate(leadPost.createdAt)}
                    </time>
                  </p>
                  <h2 className="font-heading mt-4 text-[clamp(1.5rem,2.6vw,2.15rem)] leading-[1.14] font-bold tracking-[-0.018em] text-balance text-[var(--bamboo-pine)]">
                    <Link
                      href={`/blog/${leadPost.slug}`}
                      className="bamboo-card-link"
                    >
                      {leadPost.title}
                    </Link>
                  </h2>
                  {leadPost.excerpt ? (
                    <p className="mt-3 max-w-[52ch] text-[1.02rem] leading-relaxed text-[var(--bamboo-ink-soft)]">
                      {leadPost.excerpt}
                    </p>
                  ) : null}
                  <span
                    aria-hidden="true"
                    className="mt-5 inline-block text-[0.95rem] font-medium text-[var(--bamboo-terracotta-deep)]"
                  >
                    Read the story →
                  </span>
                </div>
              </article>
            </BambooReveal>
          ) : null}

          {/* The rest of the shelf — suppressed entirely when the lead post is
              the only post, so a one-post blog never shows an empty rail. */}
          {hasPosts && (searching || listPosts.length > 0) ? (
            <>
              <BambooReveal className="mt-[clamp(38px,4.4vw,64px)]">
                <h2 className="font-heading text-[clamp(1.4rem,2.2vw,1.9rem)] font-bold tracking-[-0.018em] text-[var(--bamboo-pine)]">
                  {searching ? "Search results" : "More insights"}
                </h2>
              </BambooReveal>

              {listPosts.length > 0 ? (
                <BambooRevealGroup
                  key={listPosts.map((p) => p.id).join("|")}
                  className="mt-[clamp(22px,2.6vw,36px)] grid gap-7 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {listPosts.map((post, i) => (
                    <BambooPostCard key={post.slug} post={post} index={i} />
                  ))}
                </BambooRevealGroup>
              ) : (
                <BambooReveal className="mt-[clamp(22px,2.6vw,36px)]">
                  <div className="bamboo-torn-card mx-auto max-w-[520px] text-center">
                    <BambooGlyph
                      id="s-sprig"
                      className="mx-auto mt-3 h-12 w-auto"
                    />
                    <p className="font-heading mt-4 text-[1.15rem] font-semibold text-[var(--bamboo-pine)]">
                      Nothing matched that search
                    </p>
                    <p className="mx-auto mt-2 max-w-[36ch] text-[0.95rem] leading-relaxed text-[var(--bamboo-ink-soft)]">
                      Try a different keyword, or clear the search to see every
                      article.
                    </p>
                  </div>
                </BambooReveal>
              )}
            </>
          ) : null}
        </div>
      </section>

      <BambooEdge from="paper" to="pine" variant="c" />
    </>
  );
}
