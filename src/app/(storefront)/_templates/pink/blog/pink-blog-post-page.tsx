import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { PinkDarkBand } from "../shared/pink-dark-band";
import { PinkHairlineGrid } from "../shared/pink-hairline-grid";
import { PinkImageFallback } from "../shared/pink-image-fallback";
import { PinkPageHeader } from "../shared/pink-page-header";
import { PinkBlogAuthorCard } from "./pink-blog-author-card";
import { PinkBlogPostArticle } from "./pink-blog-post-article";
import { hasCustomImage } from "./pink-blog-shared";

type PinkBlogPostPageProps = DefaultBlogPostPageTemplateProps & {
  customFields?: Record<string, string>;
  business?: { siteContent?: { customFields?: unknown } | null } | null;
};

const FIELD_KEYS = [
  "pink.global.nav-blog",
  "pink.blog.post-author-name",
  "pink.blog.post-author-role",
  "pink.blog.post-author-avatar",
  "pink.blog.post-author-bio",
  "pink.blog.post-author-cta-label",
  "pink.blog.post-author-cta-link",
  "pink.blog.post-related-heading",
];

/**
 * `BlogPostPage` slot for pink — design.md → "Blog (post)". Uses the light
 * footer tone automatically (`pink-footer.tsx` infers it from the
 * `/blog/[slug]` route) and adds the sticky scroll-progress bar.
 *
 * DEVIATIONS (see docs/templates/pink/build/reports/E-phase3.md for the
 * full reasoning): the "category eyebrow" reuses the `Journal` nav label
 * (no per-post category exists on `Page`); figure captions and the "ink
 * callout block for editorial asides" are not implemented (TiptapRenderer
 * has no figure/caption or callout extension registered, and extending it
 * is out of this agent's assigned directories); the right rail shows
 * products only, not collections (see `pink-blog-post-article.tsx`).
 */
export function PinkBlogPostPage({
  page,
  relatedPosts,
  customFields,
}: PinkBlogPostPageProps) {
  const f = resolveFields(customFields, FIELD_KEYS);

  const journalLabel = f["pink.global.nav-blog"] ?? "Journal";

  const showAuthor = isSectionVisible(customFields, "pink", "blog.post-author");
  const authorName = f["pink.blog.post-author-name"] ?? "";
  const authorRole = f["pink.blog.post-author-role"] ?? "";
  const authorAvatar = f["pink.blog.post-author-avatar"] ?? "/placeholder.svg";
  const authorBio = f["pink.blog.post-author-bio"] ?? "";
  const authorCtaLabel = (f["pink.blog.post-author-cta-label"] ?? "").trim();
  const authorCtaLink = f["pink.blog.post-author-cta-link"] ?? "/about";
  const hasAuthor = showAuthor && authorName.length > 0;

  const showRelated = isSectionVisible(
    customFields,
    "pink",
    "blog.post-related",
  );
  const relatedHeading = f["pink.blog.post-related-heading"] ?? "Keep reading";
  const filteredRelated = relatedPosts
    .filter((p) => p.slug !== page.slug)
    .slice(0, 3);

  return (
    <div>
      <PinkPageHeader
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: journalLabel, href: "/blog" },
          { label: page.title },
        ]}
        heading={page.title}
        intro={page.excerpt ?? undefined}
        rightSlot={
          hasAuthor ? (
            <div
              className="flex items-center gap-3"
              {...sectionGroupAttr("blog", "post-author")}
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden">
                {hasCustomImage(authorAvatar) ? (
                  <Image
                    src={authorAvatar}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <PinkImageFallback surface="dark" />
                )}
              </div>
              <div className="flex flex-col">
                <span
                  className="text-[14px] font-medium"
                  style={{ color: "var(--pink-paper)" }}
                  {...fieldAttr("pink.blog.post-author-name")}
                >
                  {authorName}
                </span>
                {authorRole && (
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--pink-ink-subtle)" }}
                    {...fieldAttr("pink.blog.post-author-role")}
                  >
                    {authorRole}
                  </span>
                )}
              </div>
            </div>
          ) : undefined
        }
      />

      {page.image && (
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "21/9", background: "var(--pink-panel)" }}
        >
          <Image
            src={page.image}
            alt={page.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
      )}

      <PinkBlogPostArticle content={page.content as TiptapJSON} />

      {hasAuthor && (
        <section className="px-5 pb-4 md:px-10" aria-label="About the artist">
          <div className="mx-auto max-w-[1400px]">
            <PinkBlogAuthorCard
              name={authorName}
              role={authorRole || undefined}
              avatar={authorAvatar}
              bio={authorBio || undefined}
              ctaLabel={authorCtaLabel || undefined}
              ctaHref={authorCtaLink}
            />
          </div>
        </section>
      )}

      {showRelated && filteredRelated.length > 0 && (
        <PinkDarkBand
          ariaLabel="Keep reading"
          sectionAttrs={sectionGroupAttr("blog", "post-related")}
        >
          <div
            className="mb-8 flex flex-wrap items-end justify-between gap-4 pb-5"
            style={{ borderBottom: "1px solid var(--pink-ink-line)" }}
          >
            <h2
              className="pink-display"
              style={{
                fontSize: "clamp(1.625rem, 2.8vw, 2.375rem)",
                fontWeight: 600,
                letterSpacing: "-0.025em",
              }}
              {...fieldAttr("pink.blog.post-related-heading")}
            >
              {relatedHeading}
            </h2>
            <Link
              href="/blog"
              className="text-[14px] font-medium"
              style={{ color: "var(--pink-blush)" }}
            >
              All posts →
            </Link>
          </div>

          <PinkHairlineGrid
            tone="dark"
            columnsClassName="grid-cols-1 sm:grid-cols-3"
          >
            {filteredRelated.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-3 p-5"
              >
                <div
                  className="relative overflow-hidden"
                  style={{
                    aspectRatio: "4/3",
                    background: "var(--pink-ink-tint)",
                  }}
                >
                  {post.image ? (
                    <Image
                      src={post.image}
                      // Decorative: the post title is rendered directly below,
                      // so repeating it here is redundant to a screen reader.
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <PinkImageFallback
                      surface="dark"
                      className="absolute inset-0"
                    />
                  )}
                </div>
                <p
                  className="pink-display"
                  style={{
                    fontSize: "17px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: "var(--pink-paper)",
                  }}
                >
                  {post.title}
                </p>
              </Link>
            ))}
          </PinkHairlineGrid>
        </PinkDarkBand>
      )}
    </div>
  );
}
