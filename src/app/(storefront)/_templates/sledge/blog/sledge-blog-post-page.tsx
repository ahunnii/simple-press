"use client";

import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
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

type SledgeBlogPostPageProps = DefaultBlogPostPageTemplateProps & {
  business?: {
    name?: string | null;
    siteContent?: { customFields?: unknown } | null;
  } | null;
};

const PROSE =
  "prose max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-[0.04em] prose-headings:text-[var(--sl-coral)] prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-[1.25rem] prose-h3:leading-snug prose-h3:mt-10 prose-h3:mb-4 prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.85] prose-p:text-[var(--sl-ink-soft)] prose-p:mt-0 prose-p:mb-6 prose-strong:font-semibold prose-strong:text-[var(--sl-ink)] prose-a:text-[var(--sl-coral)] prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70 prose-li:font-sans prose-li:text-[15px] prose-li:leading-[1.85] prose-li:text-[var(--sl-ink-soft)] prose-ul:my-4 prose-ol:my-4 prose-blockquote:border-l-4 prose-blockquote:border-[var(--sl-coral)] prose-blockquote:pl-6 prose-blockquote:font-sans prose-blockquote:italic prose-blockquote:text-[var(--sl-ink-soft)] prose-hr:border-[#e8e8e8] prose-hr:my-10";

export function SledgeBlogPostPage({
  page,
  relatedPosts,
  business,
}: SledgeBlogPostPageProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, [
    "sledge.global.shop-cta-text",
    "sledge.global.shop-cta-link",
    "sledge.blog.post-shop-cta-heading",
    "sledge.blog.post-shop-cta-subheading",
  ]);

  const shopCtaText = f["sledge.global.shop-cta-text"] ?? "Browse Shop";
  const shopCtaLink = f["sledge.global.shop-cta-link"] ?? "/shop";
  const shopCtaHeading =
    f["sledge.blog.post-shop-cta-heading"] ?? "Trending Now";
  const shopCtaSubheading =
    f["sledge.blog.post-shop-cta-subheading"] ??
    "Explore one-of-a-kind pieces from the studio.";

  const filtered = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 3);

  return (
    <PageTransition>
      <header
        className="px-7 pt-16 pb-8 md:pt-20"
        style={{ background: "#ffffff" }}
      >
        <FadeIn style={{ maxWidth: "820px", margin: "0 auto" }}>
          <Link
            href="/blog"
            className="mb-6 inline-block font-sans text-xs tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            ← Back to Blog
          </Link>

          <h1
            className="uppercase"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              color: "var(--sl-coral)",
              letterSpacing: "0.04em",
              lineHeight: 1.1,
            }}
          >
            {page.title}
          </h1>

          <p
            className="mt-6 font-sans text-xs tracking-[0.14em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            {fmtDate(page.createdAt)}
          </p>
        </FadeIn>
      </header>

      <div
        className="relative mx-auto w-full overflow-hidden px-7"
        style={{ maxWidth: "1100px" }}
      >
        <div
          className="relative w-full overflow-hidden rounded-sm"
          style={{ aspectRatio: "21/9", background: "var(--sl-green)" }}
        >
          {page.image ? (
            <Image
              src={page.image}
              alt={page.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1100px) 100vw, 1100px"
            />
          ) : (
            <div
              className="sledge-card-placeholder absolute inset-0 flex items-center justify-center"
              style={{ background: "var(--sl-green)" }}
            >
              <span className="sledge-card-placeholder-num select-none">★</span>
            </div>
          )}
        </div>
      </div>

      <section
        className="px-7 py-14 md:py-16"
        style={{ background: "#ffffff" }}
      >
        <FadeIn className="mx-auto w-full max-w-3xl">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className={PROSE}
          />
        </FadeIn>
      </section>

      <section className="px-7 py-12" style={{ background: "var(--sl-cream)" }}>
        <FadeIn className="mx-auto flex w-full max-w-3xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              className="uppercase"
              style={{
                fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
                color: "var(--sl-coral)",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              {shopCtaHeading}
            </h2>
            <p
              className="mt-2 font-sans text-sm leading-relaxed"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              {shopCtaSubheading}
            </p>
          </div>
          <Link href={shopCtaLink} className="sl-btn flex-shrink-0 text-xs">
            {shopCtaText} →
          </Link>
        </FadeIn>
      </section>

      {filtered.length > 0 && (
        <section
          className="mx-auto w-full px-7 py-16"
          style={{ maxWidth: "1100px", background: "#ffffff" }}
        >
          <FadeIn className="mb-10 flex items-center justify-between">
            <h2
              className="uppercase"
              style={{
                fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
                color: "var(--sl-coral)",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              More Posts
            </h2>
            <Link
              href="/blog"
              className="hidden font-sans text-xs tracking-[0.18em] uppercase transition-opacity hover:opacity-60 md:inline-flex"
              style={{
                border: "1px solid var(--sl-ink)",
                color: "var(--sl-ink)",
                padding: "8px 16px",
              }}
            >
              View All →
            </Link>
          </FadeIn>

          <StaggerContainer
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.08}
          >
            {filtered.map((post, i) => (
              <StaggerItem key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div
                    className="relative mb-4 overflow-hidden rounded-sm"
                    style={{
                      aspectRatio: "4/3",
                      background: "var(--sl-green)",
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
                        className="sledge-card-placeholder absolute inset-0 flex items-center justify-center"
                        style={{ background: "var(--sl-green)" }}
                      >
                        <span className="sledge-card-placeholder-num select-none">
                          {String.fromCharCode(65 + (i % 6))}
                        </span>
                      </div>
                    )}
                  </div>

                  <p
                    className="mb-2 font-sans text-xs tracking-[0.12em] uppercase"
                    style={{ color: "var(--sl-ink-soft)" }}
                  >
                    {fmtDate(post.createdAt)}
                  </p>
                  <h4
                    className="font-sans text-base leading-tight tracking-[0.04em] uppercase transition-opacity group-hover:opacity-70"
                    style={{ color: "var(--sl-ink)" }}
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
