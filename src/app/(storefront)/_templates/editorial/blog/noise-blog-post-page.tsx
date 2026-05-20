"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

function fmtDispatchDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = String(dt.getFullYear());
  return `${day} · ${month} · ${year}`;
}

const TOOLBAR_STAMPS = ["↗ Share", "★ Save", "↓ Print"] as const;

const SUBSCRIBE_META = "One dispatch a fortnight. Studio notes, new garments, pattern math. Written here, sent nowhere else.";

export function NoiseBlogPostPage({
  page,
  relatedPosts,
}: DefaultBlogPostPageTemplateProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

  const filtered = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 3);

  return (
    <PageTransition>
      {/* Breadcrumb */}
      <div
        className="flex items-center justify-between px-7 py-3.5 border-b border-foreground/20"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase flex items-center">
          <Link
            href="/blog"
            className="transition-colors hover:opacity-60"
            style={{ color: "var(--vn-steel)" }}
          >
            Journal
          </Link>
          <span className="mx-2" style={{ color: "var(--vn-rule)" }}>/</span>
          <span style={{ color: "var(--vn-ink)" }}
            className="truncate max-w-[40ch]"
          >
            {page.title}
          </span>
        </div>
        <span
          className="font-mono text-[10px] tracking-[0.16em] uppercase hidden md:block flex-shrink-0 ml-4"
          style={{ color: "var(--vn-steel)" }}
        >
          Dispatch · Vol. IX
        </span>
      </div>

      {/* Article head — two-column: stamps+h1+dek left, byline right */}
      <section
        className="grid border-b-2 border-foreground grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
        style={{ background: "var(--vn-paper)" }}
      >
        {/* LEFT — stamps, h1, dek */}
        <FadeIn className="flex flex-col gap-6 px-7 py-14 border-b border-foreground md:border-b-0 md:border-r">
          {/* Stamps */}
          <div className="flex flex-wrap gap-1.5">
            <span className="vn-stamp vn-stamp-solid text-[10px]">Featured</span>
            <span className="vn-stamp text-[10px]">The Journal</span>
            <span className="vn-stamp text-[10px]">S/S 26</span>
          </div>

          {/* H1 */}
          <h1
            className="font-serif italic leading-[1.0] tracking-tight"
            style={{
              fontSize: "clamp(2.2rem, 4.5vw, 4.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {page.title}
          </h1>

          {/* Dek / excerpt */}
          {page.excerpt && (
            <p
              className="font-sans text-[15px] leading-relaxed max-w-[44ch]"
              style={{ color: "var(--vn-ink-soft)" }}
            >
              {page.excerpt}
            </p>
          )}
        </FadeIn>

        {/* RIGHT — byline grid + toolbar */}
        <FadeIn
          delay={0.1}
          className="flex flex-col gap-8 px-8 py-14"
          style={{ background: "var(--vn-bone)" }}
        >
          {/* Byline 2×2 grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {[
              { label: "Written by", value: "Studio Editor", mono: false },
              { label: "Published", value: fmtDispatchDate(page.createdAt), mono: true },
              { label: "Topic", value: "The Journal", mono: false },
              { label: "Reading time", value: "5 min", mono: true },
            ].map((item) => (
              <div key={item.label}>
                <h5
                  className="font-mono text-[9px] tracking-[0.22em] uppercase mb-1"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  {item.label}
                </h5>
                <div
                  className={item.mono ? "font-mono text-[11px] tracking-[0.12em]" : "font-sans text-[13px]"}
                  style={{ color: "var(--vn-ink)" }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar stamps */}
          <div>
            <h5
              className="font-mono text-[9px] tracking-[0.22em] uppercase mb-3"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Toolbar
            </h5>
            <div className="flex flex-wrap gap-2">
              {TOOLBAR_STAMPS.map((s) => (
                <span
                  key={s}
                  className="vn-stamp text-[9.5px] cursor-pointer transition-all hover:bg-foreground hover:text-background hover:border-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Hero image with editorial caption */}
      {page.image && (
        <figure
          className="border-b border-foreground/20"
          style={{ background: "var(--vn-paper)" }}
        >
          <FadeIn>
            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: "16/7" }}
            >
              <Image
                src={page.image}
                alt={page.title}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            </div>
            <figcaption
              className="flex items-start justify-between px-7 py-3 gap-8 border-t border-foreground/15"
              style={{ background: "var(--vn-paper)" }}
            >
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--vn-steel-mist)" }}>
                <em className="font-serif italic not-uppercase" style={{ fontSize: "13px", color: "var(--vn-ink)" }}>
                  Fig. 01.
                </em>{" "}
                {page.title}
              </span>
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase flex-shrink-0" style={{ color: "var(--vn-steel-mist)" }}>
                Visual Noise · Det. {new Date(page.createdAt).getFullYear()}
              </span>
            </figcaption>
          </FadeIn>
        </figure>
      )}

      {/* Article body */}
      <section
        className="px-7 py-16 border-b border-foreground/15"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn>
          <div className="mx-auto max-w-2xl">
            <article
              className="vn-article prose prose-base max-w-none
                prose-headings:font-serif prose-headings:italic prose-headings:font-light prose-headings:tracking-tight prose-headings:text-foreground
                prose-h2:text-[2rem] prose-h3:text-[1.5rem]
                prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.7] prose-p:text-foreground/80
                prose-strong:text-foreground prose-strong:font-medium
                prose-a:text-foreground prose-a:underline prose-a:underline-offset-4
                prose-blockquote:border-l-2 prose-blockquote:border-foreground prose-blockquote:pl-6 prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:text-xl prose-blockquote:not-italic
              "
            >
              <TiptapRenderer content={page.content as TiptapJSON} />
            </article>
          </div>
        </FadeIn>

        {/* CTA band */}
        <FadeIn delay={0.1} className="mx-auto max-w-2xl mt-16">
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-y-2 border-foreground py-8"
            style={{ background: "var(--vn-paper)" }}
          >
            <div>
              <p
                className="font-serif italic leading-none"
                style={{ fontSize: "28px", letterSpacing: "-0.01em" }}
              >
                Wear the Noise.
              </p>
              <p
                className="mt-1.5 font-sans text-sm"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Fashion that dances. Garments that fly.
              </p>
            </div>
            <Link
              href="/shop"
              className="vn-stamp vn-stamp-solid flex-shrink-0 text-[10.5px] transition-all hover:bg-accent hover:border-accent"
            >
              Shop the Collection →
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Author bar */}
      <section
        className="border-b border-foreground/20 px-7 py-10"
        style={{ background: "var(--vn-bone)" }}
      >
        <FadeIn className="mx-auto max-w-2xl flex items-start gap-6">
          {/* Avatar circle */}
          <div
            className="flex-shrink-0 flex items-center justify-center border-2 border-foreground font-serif italic select-none"
            style={{
              width: "56px",
              height: "56px",
              background: "var(--vn-steel)",
              color: "var(--vn-bone)",
              fontSize: "20px",
              borderRadius: 0,
            }}
          >
            VN
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="font-mono text-[9px] tracking-[0.22em] uppercase mb-1"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Written by
            </div>
            <div
              className="font-mono text-[11px] tracking-[0.14em] uppercase mb-2"
              style={{ color: "var(--vn-ink)" }}
            >
              Studio Editor · Visual Noise
            </div>
            <p
              className="font-sans text-sm leading-relaxed"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Field notes from the atelier on Gratiot Avenue. Dispatches cover
              process, garments, and the city that shapes them.
            </p>
          </div>

          {/* Tag stamps */}
          <div className="hidden md:flex flex-wrap gap-1.5 flex-shrink-0">
            <span className="vn-stamp text-[9px]">#journal</span>
            <span className="vn-stamp text-[9px]">#ss26</span>
            <span className="vn-stamp text-[9px]">#detroit</span>
          </div>
        </FadeIn>
      </section>

      {/* Marquee */}
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
                fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)",
                color: "var(--vn-bone)",
                opacity: 0.75,
                letterSpacing: "-0.01em",
              }}
            >
              One dispatch · every fortnight
              <span className="font-mono not-italic mx-5" style={{ fontSize: "12px", color: "var(--vn-steel-mist)" }}>✦</span>
              Sent from Detroit
              <span className="font-mono not-italic mx-5" style={{ fontSize: "12px", color: "var(--vn-steel-mist)" }}>✦</span>
              No spam, no static
              <span className="font-mono not-italic mx-5" style={{ fontSize: "12px", color: "var(--vn-steel-mist)" }}>✦</span>
              Written here, sent nowhere else
              <span className="font-mono not-italic mx-5" style={{ fontSize: "12px", color: "var(--vn-steel-mist)" }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Subscribe band */}
      <section
        className="grid border-b-2 border-foreground md:grid-cols-2"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="px-10 py-14 border-b border-foreground md:border-b-0 md:border-r">
          <span className="vn-stamp text-[9.5px] mb-5 inline-flex">Get the next dispatch</span>
          <h3
            className="font-serif italic leading-[0.95] tracking-tight mt-5 mb-4"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.02em" }}
          >
            A dispatch a fortnight,
            <br />straight from the cutting table.
          </h3>
          <p className="font-sans text-sm leading-relaxed" style={{ color: "var(--vn-ink-soft)", maxWidth: "38ch" }}>
            {SUBSCRIBE_META}
          </p>
        </div>
        <div className="px-10 py-14" style={{ background: "var(--vn-bone)" }}>
          <h5
            className="font-mono text-[10.5px] tracking-[0.22em] uppercase mb-5"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Subscribe
          </h5>
          {subscribed ? (
            <div
              className="flex items-center gap-3 border-2 border-foreground px-5 py-4"
              style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
            >
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase">
                Subscribed ✓ — first dispatch incoming
              </span>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); if (email) setSubscribed(true); }}
              className="flex border-2 border-foreground max-w-sm"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@frequency.com"
                className="flex-1 bg-transparent px-4 py-3 font-mono text-[11px] tracking-[0.1em] uppercase outline-none placeholder:opacity-30"
                required
              />
              <button
                type="submit"
                className="px-4 py-3 font-mono text-[10px] tracking-[0.2em] uppercase transition-opacity hover:opacity-80 flex-shrink-0"
                style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
              >
                Subscribe →
              </button>
            </form>
          )}
          <div
            className="mt-5 font-mono text-[10px] tracking-[0.16em] uppercase leading-relaxed"
            style={{ color: "var(--vn-steel)" }}
          >
            No spam, no static.
          </div>
        </div>
      </section>

      {/* Related dispatches */}
      {filtered.length > 0 && (
        <section className="px-7 py-14" style={{ background: "var(--vn-paper)" }}>
          <FadeIn className="flex items-end justify-between mb-8 border-b border-foreground/20 pb-5">
            <h2
              className="font-serif italic leading-none"
              style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.02em" }}
            >
              Keep reading.
            </h2>
            <Link
              href="/blog"
              className="font-mono text-[10px] tracking-[0.3em] uppercase hidden md:flex items-center gap-3 transition-opacity hover:opacity-60"
            >
              All dispatches
              <span className="h-px w-10 bg-foreground" />
            </Link>
          </FadeIn>

          <StaggerContainer
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.08}
          >
            {filtered.map((post) => (
              <StaggerItem key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  {/* Cover */}
                  <div
                    className="relative overflow-hidden border border-foreground mb-3"
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
                        className="absolute inset-0"
                        style={{
                          background: `repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                        }}
                      />
                    )}
                    <div
                      className="absolute left-2.5 top-2.5 font-mono text-[9px] tracking-[0.18em] uppercase px-1.5 py-1"
                      style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
                    >
                      Dispatch
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 mb-1.5 font-mono text-[9.5px] tracking-[0.16em] uppercase"
                    style={{ color: "var(--vn-steel)" }}
                  >
                    <span>{fmtDispatchDate(post.createdAt)}</span>
                    <span style={{ color: "var(--vn-rule)" }}>·</span>
                    <span>6 min</span>
                  </div>
                  <h3
                    className="font-serif italic leading-[1.1] tracking-tight transition-opacity group-hover:opacity-70"
                    style={{ fontSize: "20px", letterSpacing: "-0.005em" }}
                  >
                    {post.title}
                  </h3>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}
    </PageTransition>
  );
}
