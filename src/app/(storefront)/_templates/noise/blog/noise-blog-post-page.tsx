"use client";

import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "../index";

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type NoiseBlogPostPageProps = DefaultBlogPostPageTemplateProps & {
  business?: {
    name?: string | null;
    siteContent?: { customFields?: unknown } | null;
  } | null;
};

export function NoiseBlogPostPage({
  page,
  relatedPosts,
  business,
}: NoiseBlogPostPageProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, [
    "noise.global.shop-cta-text",
    "noise.global.shop-cta-link",
    "noise.blog.post-shop-cta-heading",
    "noise.blog.post-shop-cta-subheading",
  ]);

  const shopCtaText = f["noise.global.shop-cta-text"] ?? "Shop the Collection";
  const shopCtaLink = f["noise.global.shop-cta-link"] ?? "/shop";
  const shopCtaHeading =
    f["noise.blog.post-shop-cta-heading"] ?? "Shop the Collection.";
  const shopCtaSubheading =
    f["noise.blog.post-shop-cta-subheading"] ??
    "Discover pieces made with intention.";

  const filtered = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 3);

  return (
    <PageTransition>
      {/* ── Centered header — back link → category → h1 → metadata ── */}
      <header
        className="border-foreground/15 border-b px-6 pt-16 pb-10 text-center"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "820px" }}>
          {/* Back to Journal */}
          <Link
            href="/blog"
            className="mb-6 inline-block font-mono text-[10px] tracking-[0.22em] uppercase transition-opacity hover:opacity-60"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            ← Back to the Blog
          </Link>

          {/* H1 */}
          <h1
            className="font-serif leading-[1.1] tracking-tight italic"
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
            {fmtDate(page.createdAt)}
          </div>
        </FadeIn>
      </header>

      {/* ── Full-bleed 21:9 hero image ── */}
      <div
        className="border-foreground/15 relative w-full overflow-hidden border-b"
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
              style={{
                fontSize: "clamp(4rem, 12vw, 10rem)",
                color: "var(--vn-bone)",
                opacity: 0.12,
              }}
            >
              VN
            </span>
          </div>
        )}
      </div>

      {/* ── Article body ── */}
      <section className="px-6 py-16" style={{ background: "var(--vn-paper)" }}>
        <FadeIn className="mx-auto w-full max-w-5xl">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="prose prose-headings:font-serif prose-headings:font-light prose-headings:italic prose-headings:tracking-tight prose-headings:text-foreground prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-[1.25rem] prose-h3:leading-snug prose-h3:mt-10 prose-h3:mb-4 prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.95] prose-p:tracking-[0.01em] prose-p:text-foreground/75 prose-p:mt-0 prose-p:mb-6 prose-strong:font-semibold prose-strong:text-foreground prose-strong:tracking-normal prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-60 prose-li:font-sans prose-li:text-[15px] prose-li:leading-[1.85] prose-li:text-foreground/75 prose-li:tracking-[0.01em] prose-ul:my-4 prose-ol:my-4 prose-blockquote:border-l prose-blockquote:border-foreground/30 prose-blockquote:pl-6 prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:text-[1.1rem] prose-blockquote:text-foreground/60 prose-blockquote:not-italic prose-hr:border-foreground/15 prose-hr:my-10 max-w-none"
          />
        </FadeIn>
      </section>

      {/* ── Shop CTA band ── */}
      {isSectionVisible(customFields, "noise", "blog.post") && (
        <section
          className="px-7 py-0"
          style={{ background: "var(--vn-paper)" }}
          {...sectionGroupAttr("blog", "post")}
        >
          <FadeIn className="mx-auto w-full max-w-5xl">
            <div className="border-foreground flex flex-col gap-6 border-y-2 py-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p
                  className="font-serif leading-none italic"
                  style={{ fontSize: "28px", letterSpacing: "-0.01em" }}
                  {...fieldAttr("noise.blog.post-shop-cta-heading")}
                >
                  {shopCtaHeading}
                </p>
                <p
                  className="mt-1.5 font-sans text-sm"
                  style={{ color: "var(--vn-steel-mist)" }}
                  {...fieldAttr("noise.blog.post-shop-cta-subheading")}
                >
                  {shopCtaSubheading}
                </p>
              </div>
              <Link
                href={shopCtaLink}
                className="vn-stamp vn-stamp-solid flex-shrink-0 text-[10.5px] transition-all hover:opacity-80"
              >
                <span {...fieldAttr("noise.global.shop-cta-text")}>
                  {shopCtaText}
                </span>{" "}
                →
              </Link>
            </div>
          </FadeIn>
        </section>
      )}

      {/* ── Related articles ── */}
      {filtered.length > 0 && (
        <section
          className="mx-auto w-full max-w-[1440px] px-7 py-16"
          style={{ background: "var(--vn-paper)" }}
        >
          <FadeIn className="border-foreground/20 mb-10 flex items-end justify-between border-b pb-6">
            <h2
              className="font-serif leading-none italic"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                letterSpacing: "-0.02em",
              }}
            >
              Blog Posts
            </h2>
            <Link
              href="/blog"
              className="hidden items-center gap-3 font-mono text-[10px] tracking-[0.22em] uppercase transition-opacity hover:opacity-60 md:flex"
              style={{ color: "var(--vn-ink)" }}
            >
              View all →
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
                    className="border-foreground relative mb-4 overflow-hidden border"
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
                        className="absolute inset-0"
                        style={{
                          background: `repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                        }}
                      />
                    )}
                    <div
                      className="absolute top-2.5 left-2.5 px-1.5 py-1 font-mono text-[9px] tracking-[0.18em] uppercase"
                      style={{
                        background: "var(--vn-bone)",
                        color: "var(--vn-ink)",
                      }}
                    >
                      The Journal
                    </div>
                  </div>

                  <p
                    className="mb-2 font-mono text-[9.5px] tracking-[0.16em] uppercase"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    {fmtDate(post.createdAt)}
                  </p>
                  <h3
                    className="font-serif leading-[1.1] tracking-tight italic transition-opacity group-hover:opacity-70"
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
