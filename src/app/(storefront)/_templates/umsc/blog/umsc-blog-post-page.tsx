import type { CSSProperties } from "react";
import Image from "next/image";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn, formatDate } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

// Default's resolver for the `default.blog.*` keys — see umsc-blog-page.tsx.
import { resolveFields as resolveDefaultFields } from "../../default";
import { UmscGatedLink } from "../generic/umsc-gated-link";
import {
  UMSC_META_CLASS,
  UmscBackLink,
  UmscClosingBand,
} from "../generic/umsc-page-kit";
import {
  UMSC_EMBED_STYLE,
  UMSC_EMBED_VARS,
  UMSC_PROSE_CLASSNAME,
} from "../generic/umsc-prose";
import { UmscButton } from "../shared/umsc-button";
import { UmscHeading } from "../shared/umsc-heading";
import { hasCustomImage } from "../shared/umsc-image-fallback";
import { nonBlank } from "../shared/umsc-non-blank";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";
import { resolveUmscBlogFields } from "./index";
import { UmscBlogCard } from "./umsc-blog-card";

type Props = DefaultBlogPostPageTemplateProps & {
  /** `blog/[slug]/page.tsx` passes these beyond the nominal props. */
  customFields?: Record<string, string>;
  business?: { siteContent?: { customFields?: unknown } | null } | null;
};

/**
 * `/blog/<slug>` — one post on umsc's generic page base (parity PF22):
 *
 * 1. The black `UmscPageHero` at detail scale: "← All posts", the title as
 *    the page's only h1, the excerpt as the lede, the date under it.
 * 2. The article on the shared container: the cover photo as a wide
 *    hairline-framed strip (so it shows at every width — the band's
 *    right-side image slot is desktop-only), then the Tiptap body in the
 *    umsc prose system at a 66ch measure on the same left edge.
 * 3. `blog.post` (cream): "More articles" + up to three related cards and
 *    an "All posts" link. Skipped when there are no other posts.
 * 4. `blog.cta` (hideable): the black closing band with a flag-gated pill.
 */
export function UmscBlogPostPage({
  page,
  relatedPosts,
  customFields,
  business,
}: Props) {
  const fields = customFields ?? business?.siteContent?.customFields;
  const d = resolveDefaultFields(fields, ["default.blog.post-more-heading"]);
  const f = resolveUmscBlogFields(fields, [
    "umsc.blog.card-link-label",
    "umsc.blog.cta-heading",
    "umsc.blog.cta-body",
    "umsc.blog.cta-button-label",
    "umsc.blog.cta-button-url",
  ]);

  const others = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 3);
  const showCover = hasCustomImage(page.image);

  return (
    <PageTransition>
      <style>{UMSC_EMBED_STYLE}</style>

      <UmscPageHero
        compact
        leading={<UmscBackLink href="/blog">All posts</UmscBackLink>}
        heading={page.title}
        lede={page.excerpt ?? undefined}
      >
        <p className={cn(UMSC_META_CLASS, "mt-6 text-[var(--umsc-gold-soft)]")}>
          <time dateTime={new Date(page.createdAt).toISOString()}>
            {formatDate(page.createdAt)}
          </time>
        </p>
      </UmscPageHero>

      <UmscSection tone="paper" aria-label={page.title}>
        <article className="flex flex-col gap-12">
          {showCover ? (
            <div
              className="relative w-full overflow-hidden border border-[var(--umsc-line)]"
              style={{ aspectRatio: "16 / 7" }}
            >
              <Image
                src={page.image!}
                alt=""
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          ) : null}
          <div className="umsc-embed" style={UMSC_EMBED_VARS}>
            <TiptapRenderer
              content={page.content as TiptapJSON}
              className={UMSC_PROSE_CLASSNAME}
            />
          </div>
        </article>
      </UmscSection>

      {others.length > 0 ? (
        <UmscSection
          tone="cream"
          aria-label={
            nonBlank(d["default.blog.post-more-heading"]) ?? "More articles"
          }
          sectionAttrs={sectionGroupAttr("blog", "post")}
        >
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <UmscHeading as="h2" fieldKey="default.blog.post-more-heading">
              {nonBlank(d["default.blog.post-more-heading"]) ?? "More articles"}
            </UmscHeading>
            <UmscButton as="link" href="/blog" variant="link">
              All posts
            </UmscButton>
          </div>
          <UmscRevealGroup className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((post, i) => (
              <div
                key={post.slug}
                className="umsc-reveal-item min-w-0"
                style={{ "--i": Math.min(i, 6) } as CSSProperties}
              >
                <UmscBlogCard
                  post={post}
                  linkLabel={f["umsc.blog.card-link-label"] ?? ""}
                />
              </div>
            ))}
          </UmscRevealGroup>
        </UmscSection>
      ) : null}

      {isSectionVisible(fields, "umsc", "blog.cta") ? (
        <UmscClosingBand
          sectionAttrs={sectionGroupAttr("blog", "cta")}
          heading={f["umsc.blog.cta-heading"] ?? ""}
          headingFieldKey="umsc.blog.cta-heading"
          body={f["umsc.blog.cta-body"]}
          bodyFieldKey="umsc.blog.cta-body"
        >
          <UmscGatedLink
            href={f["umsc.blog.cta-button-url"] ?? ""}
            label={f["umsc.blog.cta-button-label"] ?? ""}
            labelFieldKey="umsc.blog.cta-button-label"
          />
        </UmscClosingBand>
      ) : null}
    </PageTransition>
  );
}
