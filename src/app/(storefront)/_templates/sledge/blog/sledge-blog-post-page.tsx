"use client";

import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "../index";
import { SledgeBlogPostCard } from "../shared/sledge-blog-post-card";
import {
  fmtBlogDate,
  SLEDGE_BLOG_PROSE,
  SledgeBlogImagePlaceholder,
} from "../shared/sledge-blog-utils";
import {
  SLEDGE_PAGE_CONTAINER,
  SLEDGE_PAGE_HEADER_PADDING,
  SledgePageSection,
  SledgePageSubheading,
} from "../shared/sledge-page-layout";
import { SledgeProductRail } from "../shared/sledge-product-rail";

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
      <nav
        className={cn(SLEDGE_PAGE_CONTAINER, "pt-8 pb-2")}
        aria-label="Breadcrumb"
      >
        <ol className="sl-eyebrow flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs tracking-[0.14em] uppercase">
          <li>
            <Link href="/blog" className="transition-opacity hover:opacity-60">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="max-w-[40ch] truncate text-[var(--sl-ink)]">
            {page.title}
          </li>
        </ol>
      </nav>

      <section
        className={cn(
          SLEDGE_PAGE_CONTAINER,
          SLEDGE_PAGE_HEADER_PADDING,
          "border-b border-[var(--sl-border)]",
        )}
      >
        <FadeIn className="mx-auto max-w-3xl text-left">
          <Link
            href="/blog"
            className="sl-eyebrow mb-6 inline-block font-sans text-xs tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
          >
            ← Back to Blog
          </Link>

          <p className="sl-eyebrow mb-4 font-sans text-xs tracking-[0.18em] uppercase">
            Journal
          </p>

          <h1 className="sl-blog-post-title font-serif leading-tight tracking-tight">
            {page.title}
          </h1>

          {page.excerpt ? (
            <p className="sl-eyebrow mt-5 font-sans text-sm leading-relaxed md:text-[15px] md:leading-[1.85]">
              {page.excerpt}
            </p>
          ) : null}

          <p className="sl-eyebrow mt-5 font-sans text-xs tracking-[0.14em] uppercase">
            {fmtBlogDate(page.createdAt)}
          </p>
        </FadeIn>
      </section>

      <div className={cn(SLEDGE_PAGE_CONTAINER, "py-8 md:py-10")}>
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-sm bg-[var(--sl-green)]">
          {page.image ? (
            <Image
              src={page.image}
              alt={page.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          ) : (
            <SledgeBlogImagePlaceholder label="★" />
          )}
        </div>
      </div>

      <section className="border-b border-[var(--sl-border)] px-7 py-14 md:py-16">
        <FadeIn className="mx-auto w-full max-w-3xl">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className={SLEDGE_BLOG_PROSE}
          />
        </FadeIn>
      </section>

      <SledgeProductRail
        heading={shopCtaHeading}
        ctaText={shopCtaText}
        ctaHref={shopCtaLink}
        products={featuredProducts}
      />

      {filtered.length > 0 ? (
        <>
          <SledgePageSubheading
            title="More Posts"
            aside={
              <Link
                href="/blog"
                className="sl-cta-pill hidden shrink-0 items-center gap-2 px-4 py-2.5 font-sans text-[14px] font-medium tracking-[.18em] uppercase transition-opacity hover:opacity-70 md:inline-flex"
              >
                View All →
              </Link>
            }
          />

          <SledgePageSection>
            <StaggerContainer
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              staggerDelay={0.08}
            >
              {filtered.map((post, i) => (
                <StaggerItem key={post.slug}>
                  <SledgeBlogPostCard
                    post={post}
                    index={i}
                    showExcerpt={false}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </SledgePageSection>
        </>
      ) : null}
    </PageTransition>
  );
}
