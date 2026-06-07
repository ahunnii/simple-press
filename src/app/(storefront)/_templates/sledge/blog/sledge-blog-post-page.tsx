"use client";

import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "../index";
import { SledgeProductRail } from "../shared/sledge-product-rail";

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type FeaturedProduct = NonNullable<
  RouterOutputs["business"]["getHomepage"]
>["products"][number];

type SledgeBlogPostPageProps = DefaultBlogPostPageTemplateProps & {
  business?: {
    name?: string | null;
    siteContent?: { customFields?: unknown } | null;
  } | null;
  featuredProducts?: FeaturedProduct[];
};

const PROSE =
  "prose max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-[0.04em] prose-headings:text-[var(--sl-coral)] prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-[1.25rem] prose-h3:leading-snug prose-h3:mt-10 prose-h3:mb-4 prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.85] prose-p:text-[var(--sl-ink-soft)] prose-p:mt-0 prose-p:mb-6 prose-strong:font-semibold prose-strong:text-[var(--sl-ink)] prose-a:text-[var(--sl-coral)] prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70 prose-li:font-sans prose-li:text-[15px] prose-li:leading-[1.85] prose-li:text-[var(--sl-ink-soft)] prose-ul:my-4 prose-ol:my-4 prose-blockquote:border-l-4 prose-blockquote:border-[var(--sl-coral)] prose-blockquote:pl-6 prose-blockquote:font-sans prose-blockquote:italic prose-blockquote:text-[var(--sl-ink-soft)] prose-hr:border-[#e8e8e8] prose-hr:my-10";

export function SledgeBlogPostPage({
  page,
  relatedPosts,
  business,
  featuredProducts = [],
}: SledgeBlogPostPageProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, [
    "sledge.global.shop-cta-text",
    "sledge.global.shop-cta-link",
    "sledge.blog.post-shop-cta-heading",
  ]);

  const shopCtaText = f["sledge.global.shop-cta-text"] ?? "Browse Shop";
  const shopCtaLink = f["sledge.global.shop-cta-link"] ?? "/shop";
  const shopCtaHeading =
    f["sledge.blog.post-shop-cta-heading"] ?? "Trending Now";

  const filtered = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 3);

  return (
    <PageTransition>
      <header className="bg-white px-7 pt-16 pb-8 md:pt-20">
        <FadeIn className="mx-auto max-w-[820px]">
          <Link
            href="/blog"
            className="sl-eyebrow mb-6 inline-block font-sans text-xs tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
          >
            ← Back to Blog
          </Link>

          <h1 className="sl-page-title-md font-heading text-[var(--sl-coral)] uppercase">
            {page.title}
          </h1>

          <p className="sl-eyebrow mt-6 font-sans text-xs tracking-[0.14em] uppercase">
            {fmtDate(page.createdAt)}
          </p>
        </FadeIn>
      </header>

      <div className="sl-container relative mx-auto w-full overflow-hidden px-7">
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-sm bg-[var(--sl-green)]">
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
            <div className="sledge-card-placeholder absolute inset-0 flex items-center justify-center bg-[var(--sl-green)]">
              <span className="sledge-card-placeholder-num select-none">★</span>
            </div>
          )}
        </div>
      </div>

      <section className="bg-white px-7 py-14 md:py-16">
        <FadeIn className="mx-auto w-full max-w-3xl">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className={PROSE}
          />
        </FadeIn>
      </section>

      <SledgeProductRail
        heading={shopCtaHeading}
        ctaText={shopCtaText}
        ctaHref={shopCtaLink}
        products={featuredProducts}
      />

      {filtered.length > 0 && (
        <section className="sl-container mx-auto w-full bg-white px-7 py-16">
          <FadeIn className="mb-10 flex items-center justify-between">
            <h2 className="sl-page-title-md font-heading text-[var(--sl-coral)] uppercase">
              More Posts
            </h2>
            <Link
              href="/blog"
              className="hidden border border-[var(--sl-ink)] px-4 py-2 font-sans text-xs tracking-[0.18em] text-[var(--sl-ink)] uppercase transition-opacity hover:opacity-60 md:inline-flex"
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
                  <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-sm bg-[var(--sl-green)]">
                    {post.image ? (
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="sledge-card-placeholder absolute inset-0 flex items-center justify-center bg-[var(--sl-green)]">
                        <span className="sledge-card-placeholder-num select-none">
                          {String.fromCharCode(65 + (i % 6))}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="sl-eyebrow mb-2 font-sans text-xs tracking-[0.12em] uppercase">
                    {fmtDate(post.createdAt)}
                  </p>
                  <h4 className="font-sans text-base leading-tight tracking-[0.04em] text-[var(--sl-ink)] uppercase transition-opacity group-hover:opacity-70">
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
