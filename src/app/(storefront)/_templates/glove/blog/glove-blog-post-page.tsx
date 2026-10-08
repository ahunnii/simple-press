import Image from "next/image";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { formatDate } from "~/lib/utils";

import { resolveFields } from "..";
import { GloveGeneralLayout } from "../generic/glove-general-layout";
import { GloveProse } from "../generic/glove-prose";
import { GloveButton, GloveHeading, GloveSection } from "../shared";
import { GloveBlogCard, postExcerpt } from "./glove-blog-card";
import { GloveBlogShare } from "./glove-blog-share";

type Props = DefaultBlogPostPageTemplateProps & {
  business?: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  customFields?: Record<string, string>;
};

const FIELD_KEYS = [
  "glove.blog.header-title",
  "glove.blog.listing-read-more",
  "glove.blog.post-related-heading",
  "glove.blog.post-back-label",
];

/**
 * `/blog/<slug>` — navy band (title + date), a single ~760px prose column
 * (cover image and lede above it), share row, then the other-posts band with
 * a back link. The excerpt is shown once, as the lede.
 */
export function GloveBlogPostPage({
  page,
  relatedPosts,
  business,
  customFields,
}: Props) {
  const fields = customFields ?? business?.siteContent?.customFields;
  const f = resolveFields(fields, FIELD_KEYS);
  const get = (key: string) => f[key] ?? "";

  const blogTitle = get("glove.blog.header-title").trim() || "Blog";
  const date = page.publishedAt ?? page.createdAt;
  const lede = postExcerpt(page, 220);
  const others = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 3);
  const relatedHeading = get("glove.blog.post-related-heading").trim();
  const backLabel = get("glove.blog.post-back-label").trim();

  return (
    <GloveGeneralLayout
      title={page.title}
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: blogTitle, href: "/blog" },
        { label: page.title },
      ]}
      bandChildren={
        <p className="glove-body text-[15px] text-[var(--glove-navy-soft)]">
          <time dateTime={new Date(date).toISOString()}>
            {formatDate(date)}
          </time>
        </p>
      }
    >
      {/* No reveal around the article: rich text can embed forms. */}
      <GloveSection tone="paper" reveal={false} aria-label={page.title}>
        <article className="mx-auto max-w-[760px]">
          {page.image ? (
            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-[12px] bg-[var(--glove-mist)]">
              <Image
                src={page.image}
                alt=""
                fill
                priority
                sizes="(max-width: 800px) 100vw, 760px"
                className="object-cover"
              />
            </div>
          ) : null}
          {lede ? (
            <p className="glove-body mb-8 text-[18px] leading-[1.6] text-[var(--glove-ink)] md:text-[20px]">
              {lede}
            </p>
          ) : null}
          <GloveProse content={page.content as unknown} />
          <div className="mt-10 border-t border-[var(--glove-line)] pt-6">
            <GloveBlogShare
              title={page.title}
              path={`/blog/${page.slug}`}
              image={page.image ?? undefined}
            />
          </div>
        </article>
      </GloveSection>

      {isSectionVisible(fields, "glove", "blog.post") &&
      (others.length > 0 || backLabel) ? (
        <GloveSection
          tone="mist"
          aria-label="More posts"
          sectionAttrs={sectionGroupAttr("blog", "post")}
          revealThreshold={0}
        >
          {others.length > 0 && relatedHeading ? (
            <GloveHeading
              fieldKey="glove.blog.post-related-heading"
              className="mb-10"
            >
              {relatedHeading}
            </GloveHeading>
          ) : null}
          {others.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((post) => (
                <GloveBlogCard
                  key={post.id}
                  post={post}
                  headingAs="h3"
                  readMoreLabel={get("glove.blog.listing-read-more")}
                  readMoreFieldKey="glove.blog.listing-read-more"
                />
              ))}
            </div>
          ) : null}
          {backLabel ? (
            <div
              className={
                others.length > 0 ? "mt-12 text-center" : "text-center"
              }
            >
              <GloveButton href="/blog" variant="wooOutline" size="lg">
                <span {...fieldAttr("glove.blog.post-back-label")}>
                  {backLabel}
                </span>
              </GloveButton>
            </div>
          ) : null}
        </GloveSection>
      ) : null}
    </GloveGeneralLayout>
  );
}
