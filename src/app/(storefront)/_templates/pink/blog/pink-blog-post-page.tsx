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
import { PinkBlogPostArticle } from "./pink-blog-post-article";

type PinkBlogPostPageProps = DefaultBlogPostPageTemplateProps & {
  customFields?: Record<string, string>;
  business?: { siteContent?: { customFields?: unknown } | null } | null;
};

const FIELD_KEYS = ["pink.blog.post-related-heading"];

/**
 * `BlogPostPage` slot for pink — design.md → "Blog (post)". Uses the light
 * footer tone automatically (`pink-footer.tsx` infers it from the
 * `/blog/[slug]` route) and adds the sticky scroll-progress bar.
 *
 * DEVIATIONS (see docs/templates/pink/build/reports/E-phase3.md for the
 * full reasoning): the "category eyebrow" is a fixed `Journal` label
 * (no per-post category exists on `Page`, and the nav-label fields it once
 * reused moved to Content → Navigation); figure captions and the "ink
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

  // Fixed eyebrow label — see the DEVIATIONS note above.
  const journalLabel = "Journal";

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
