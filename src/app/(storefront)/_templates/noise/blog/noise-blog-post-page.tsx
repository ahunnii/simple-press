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

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const SUBSCRIBE_META =
  "One dispatch a fortnight. Studio notes, new garments, pattern math. Written here, sent nowhere else.";

export function NoiseBlogPostPage({
  page,
  relatedPosts,
}: DefaultBlogPostPageTemplateProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

  const filtered = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 3);

  return (
    <PageTransition>
      {/* ── Centered header — back link → category → h1 → metadata ── */}
      <header
        className="px-6 pt-16 pb-10 text-center border-b border-foreground/15"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "820px" }}>
          {/* Back to Journal */}
          <Link
            href="/blog"
            className="font-mono text-[10px] tracking-[0.22em] uppercase transition-opacity hover:opacity-60 inline-block mb-6"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            ← The Journal
          </Link>

          {/* Category overline */}
          <p
            className="font-mono text-[10px] tracking-[0.28em] uppercase mb-4"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            The Journal
          </p>

          {/* H1 */}
          <h1
            className="font-serif italic leading-[1.1] tracking-tight"
            style={{
              fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {page.title}
          </h1>

          {/* Metadata row */}
          <div
            className="mt-8 font-mono text-[11px] tracking-[0.18em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            By Studio Editor &nbsp;·&nbsp; {fmtDate(page.createdAt)} &nbsp;·&nbsp; 5 min read
          </div>
        </FadeIn>
      </header>

      {/* ── Full-bleed 21:9 hero image ── */}
      <div
        className="relative w-full overflow-hidden border-b border-foreground/15"
        style={{ aspectRatio: "21/9", background: "var(--vn-steel)" }}
      >
        {page.image ? (
          <Image
            src={page.image}
            alt={page.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
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
              style={{ fontSize: "clamp(4rem, 12vw, 10rem)", color: "var(--vn-bone)", opacity: 0.12 }}
            >
              VN
            </span>
          </div>
        )}
      </div>

      {/* ── Article body ── */}
      <section
        className="px-6 py-16 border-b border-foreground/15"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "680px" }}>
          <article
            className="vn-article prose prose-base max-w-none
              prose-headings:font-serif prose-headings:italic prose-headings:font-light prose-headings:tracking-tight prose-headings:text-foreground
              prose-h2:text-[2rem] prose-h3:text-[1.5rem]
              prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.85] prose-p:text-foreground/80
              prose-strong:text-foreground prose-strong:font-medium
              prose-a:text-foreground prose-a:underline prose-a:underline-offset-4
              prose-blockquote:border-l-0 prose-blockquote:border-t prose-blockquote:border-b
              prose-blockquote:border-foreground/20 prose-blockquote:py-8 prose-blockquote:px-0
              prose-blockquote:my-10 prose-blockquote:font-serif prose-blockquote:italic
              prose-blockquote:text-[1.8rem] prose-blockquote:leading-[1.4]
              prose-blockquote:tracking-tight prose-blockquote:not-italic prose-blockquote:text-center
            "
          >
            <TiptapRenderer content={page.content as TiptapJSON} />
          </article>

          {/* Filed under + actions */}
          <div
            className="mt-14 pt-6 flex items-center justify-between border-t font-mono text-[11px] tracking-[0.16em] uppercase"
            style={{ borderColor: "var(--vn-rule)", color: "var(--vn-steel-mist)" }}
          >
            <span>Filed under · The Journal</span>
            <div className="flex gap-5">
              <button className="hover:opacity-60 transition-opacity">Share</button>
              <button className="hover:opacity-60 transition-opacity">Save</button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Shop CTA band ── */}
      <section
        className="border-b border-foreground/20 px-7 py-0"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "680px" }}>
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-y-2 border-foreground py-8"
          >
            <div>
              <p className="font-serif italic leading-none" style={{ fontSize: "28px", letterSpacing: "-0.01em" }}>
                Wear the Noise.
              </p>
              <p className="mt-1.5 font-sans text-sm" style={{ color: "var(--vn-steel-mist)" }}>
                Fashion that dances. Garments that fly.
              </p>
            </div>
            <Link
              href="/shop"
              className="vn-stamp vn-stamp-solid flex-shrink-0 text-[10.5px] transition-all hover:opacity-80"
            >
              Shop the Collection →
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ── Subscribe band ── */}
      <section
        className="grid border-b border-foreground/20 md:grid-cols-2"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="px-10 py-14 border-b border-foreground/20 md:border-b-0 md:border-r">
          <span className="vn-stamp text-[9.5px] mb-5 inline-flex">Get the next dispatch</span>
          <h3
            className="font-serif italic leading-[0.95] tracking-tight mt-5 mb-4"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.02em" }}
          >
            A dispatch a fortnight,
            <br />from the cutting table.
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
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setSubscribed(true);
              }}
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
          <p className="mt-4 font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: "var(--vn-steel-mist)" }}>
            No spam, no static.
          </p>
        </div>
      </section>

      {/* ── Related articles ── */}
      {filtered.length > 0 && (
        <section className="px-7 py-16" style={{ background: "var(--vn-paper)" }}>
          <FadeIn className="mb-10 flex items-end justify-between border-b border-foreground/20 pb-6">
            <h2
              className="font-serif italic leading-none"
              style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", letterSpacing: "-0.02em" }}
            >
              More from the Journal.
            </h2>
            <Link
              href="/blog"
              className="font-mono text-[10px] tracking-[0.22em] uppercase hidden md:flex items-center gap-3 transition-opacity hover:opacity-60"
              style={{ color: "var(--vn-ink)" }}
            >
              All dispatches →
            </Link>
          </FadeIn>

          <StaggerContainer
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.08}
          >
            {filtered.map((post) => (
              <StaggerItem key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  {/* 4:3 cover image */}
                  <div
                    className="relative overflow-hidden border border-foreground mb-4"
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
                      The Journal
                    </div>
                  </div>

                  <p
                    className="font-mono text-[9.5px] tracking-[0.16em] uppercase mb-2"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    {fmtDate(post.createdAt)}
                  </p>
                  <h4
                    className="font-serif italic leading-[1.1] tracking-tight transition-opacity group-hover:opacity-70"
                    style={{ fontSize: "20px", letterSpacing: "-0.005em" }}
                  >
                    {post.title}
                  </h4>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}
    </PageTransition>
  );
}
