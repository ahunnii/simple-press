import Image from "next/image";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { deriveExcerpt } from "~/lib/blog-search";
import { isSectionVisible } from "~/lib/sp-meta";
import { formatDate } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { hasOliveImage } from "../shared";
import { OliveBlogPostBand } from "./olive-blog-post-band";
import { OliveBlogShareRow } from "./olive-blog-share-row";
import { estimateReadingMinutes } from "./olive-reading-time";

type Props = DefaultBlogPostPageTemplateProps & {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  customFields?: Record<string, string>;
};

const FIELD_KEYS = [
  "olive.blog.post-related-heading",
  "olive.blog.post-cta-heading",
  "olive.blog.post-cta-body",
  "olive.blog.post-cta-button-text",
  "olive.blog.post-cta-button-link",
] as const;

/**
 * OliveBlogPostPage — one post, narrow reading column (max 68ch). The cover
 * image (when set) renders as a bounded card inside that same column — this
 * template never grows a post's photo into a full-bleed band; "the swatch
 * book" treats everything, hero photos included, as a card on the page. With
 * no cover, the post's excerpt is inlined once as the typographic masthead's
 * lede instead (never shown twice).
 */
export function OliveBlogPostPage({
  page,
  relatedPosts,
  business,
  customFields,
}: Props) {
  const fields = customFields ?? business.siteContent?.customFields;
  const f = resolveFields(fields, [...FIELD_KEYS]);

  const hasCover = hasOliveImage(page.image);
  const readingMinutes = estimateReadingMinutes(page.content);
  const displayDate = page.publishedAt ?? page.createdAt;
  const excerpt = page.excerpt?.trim()
    ? page.excerpt
    : deriveExcerpt(page.content, 220);

  return (
    <>
      <article
        aria-label={page.title}
        style={{
          maxWidth: "68ch",
          margin: "0 auto",
          padding: "var(--olive-section-pad-y) var(--olive-section-pad-x)",
        }}
      >
        <p
          className="olive-caption"
          style={{ color: "var(--olive-slate-deep)", marginBottom: "0.75rem" }}
        >
          <time dateTime={new Date(displayDate).toISOString()}>
            {formatDate(displayDate)}
          </time>
          {" · "}
          {readingMinutes} min read
        </p>

        <h1
          className="olive-display"
          style={{ marginBottom: hasCover ? "1.75rem" : "1rem" }}
        >
          {page.title}
        </h1>

        {hasCover ? (
          <figure className="olive-card relative mb-10 aspect-[3/2] overflow-hidden">
            <Image
              src={page.image!}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 680px"
              className="object-cover"
            />
          </figure>
        ) : excerpt ? (
          <p
            style={{
              fontFamily: "var(--olive-font-body)",
              fontSize: "1.125rem",
              lineHeight: 1.6,
              color: "var(--olive-ink-soft)",
              marginBottom: "2rem",
            }}
          >
            {excerpt}
          </p>
        ) : null}

        <TiptapRenderer
          content={page.content as TiptapJSON}
          className="olive-prose"
        />

        <div style={{ marginTop: "2.5rem" }}>
          <OliveBlogShareRow title={page.title} path={`/blog/${page.slug}`} />
        </div>
      </article>

      {isSectionVisible(fields, "olive", "blog.post") ? (
        <OliveBlogPostBand
          relatedPosts={relatedPosts}
          currentSlug={page.slug}
          relatedHeading={f["olive.blog.post-related-heading"] ?? ""}
          ctaHeading={f["olive.blog.post-cta-heading"] ?? ""}
          ctaBody={f["olive.blog.post-cta-body"] ?? ""}
          ctaButtonText={f["olive.blog.post-cta-button-text"] ?? ""}
          ctaButtonLink={f["olive.blog.post-cta-button-link"] ?? "/shop"}
        />
      ) : null}
    </>
  );
}
