import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { formatDate } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { DreamGenericCoverHero } from "../generic/dream-generic-cover-hero";
import { DREAM_PROSE_CLASSNAME } from "../generic/dream-generic-page";
import { DreamHeading } from "../shared/dream-heading";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamQuoteCta } from "../shared/dream-quote-cta";
import { DreamSection } from "../shared/dream-section";
import { DreamBlogPostCard } from "./dream-blog-post-card";

type Business = NonNullable<RouterOutputs["business"]["simplifiedGet"]>;

// `blog/[slug]/page.tsx` passes `customFields` and `business` alongside
// `page`/`relatedPosts` — not on `DefaultBlogPostPageTemplateProps` (see
// page-playbooks.md's BlogPostPage note). Accept both as additional props,
// matching `DreamBlogPage`'s own intersection.
type Props = DefaultBlogPostPageTemplateProps & {
  business: Business;
  customFields?: Record<string, string>;
};

const FIELD_KEYS = [
  "dream.blog.related-heading",
  "dream.blog.related-empty",
  "dream.blog.cta-heading",
  "dream.blog.cta-accent",
  "dream.blog.cta-lede",
  "dream.blog.cta-label",
  "dream.blog.cta-url",
];

/**
 * `/blog/<slug>` — one journal post (parity-plan-2026-09-28 PF19). Hero
 * branches on `page.image` exactly like `DreamGenericPage` (cover band vs.
 * the `DreamPageHero` masthead fallback), and the body renders through the
 * generic page's own prose styling (`DREAM_PROSE_CLASSNAME`) so post copy
 * reads at the same 66ch measure, Italiana headings, and rose links as every
 * other long-form page in the template (B1.7).
 */
export function DreamBlogPostPage({
  page,
  relatedPosts,
  business,
  customFields,
}: Props) {
  const rawCustomFields =
    customFields ?? business.siteContent?.customFields ?? null;
  const f = resolveFields(rawCustomFields, FIELD_KEYS);

  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name ?? "",
  );

  const others = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 3);
  const hasCover = !!page.image?.trim();

  return (
    <>
      {hasCover ? (
        <DreamGenericCoverHero
          image={page.image!}
          title={page.title}
          excerpt={page.excerpt ?? undefined}
        />
      ) : (
        <DreamPageHero
          logoUrl={logoUrl}
          logoAlt={logoAlt}
          title={page.title}
          lede={page.excerpt ?? ""}
        />
      )}

      <DreamSection tone="paper">
        <p className="mb-8 text-[14px] text-[var(--dream-soft)]">
          {formatDate(page.createdAt)}
        </p>
        <div className="dream-embed">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className={DREAM_PROSE_CLASSNAME}
          />
        </div>
      </DreamSection>

      {isSectionVisible(rawCustomFields, "dream", "blog.cta") && (
        <DreamQuoteCta
          heading={f["dream.blog.cta-heading"] ?? ""}
          accent={f["dream.blog.cta-accent"] ?? ""}
          lede={f["dream.blog.cta-lede"] ?? ""}
          ctaLabel={f["dream.blog.cta-label"] ?? ""}
          ctaUrl={f["dream.blog.cta-url"] ?? "/contact"}
          headingFieldKey="dream.blog.cta-heading"
          accentFieldKey="dream.blog.cta-accent"
          ledeFieldKey="dream.blog.cta-lede"
          ctaLabelFieldKey="dream.blog.cta-label"
          sectionAttrs={sectionGroupAttr("blog", "cta")}
        />
      )}

      <DreamSection
        tone="sky"
        sectionAttrs={sectionGroupAttr("blog", "related")}
      >
        <DreamHeading as="h2" fieldKey="dream.blog.related-heading">
          {f["dream.blog.related-heading"] ?? ""}
        </DreamHeading>
        {others.length === 0 ? (
          <p
            {...fieldAttr("dream.blog.related-empty")}
            className="!mt-4 text-[15px] text-[var(--dream-soft)]"
          >
            {f["dream.blog.related-empty"] ?? ""}
          </p>
        ) : (
          <div className="!mt-8 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((post) => (
              <DreamBlogPostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </DreamSection>
    </>
  );
}
