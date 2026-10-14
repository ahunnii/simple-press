import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { deriveExcerpt } from "~/lib/blog-search";
import { cn, formatDate } from "~/lib/utils";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthPostCard } from "../shared/wealth-post-card";

type Page = DefaultBlogPageTemplateProps["pages"][number];

type Props = {
  post: Page;
  /** Stagger index for the reveal group (capped by the caller). Omit when the
   *  card is not inside a `WealthRevealGroup`. */
  index?: number;
  excerptLength?: number;
  /**
   * Heading level for the card title: "h2" on the blog index (titles sit
   * directly under the page h1), "h3" in the post page's related strip
   * (titles sit under the strip's h2). Defaults to h3.
   */
  headingLevel?: "h2" | "h3";
  /** The wide "newest post" card (image 60% + text) instead of a grid card. */
  featured?: boolean;
};

/**
 * Blog index / related-strip card. Grid cards are the shared
 * `WealthPostCard` (square image, mono date, italic title with the sage bar,
 * excerpt, READ MORE); `featured` renders the wide variant for the newest
 * post. Posts without a cover photo render without media (the grid card
 * shows the quiet forest placeholder so rows align, as on the homepage;
 * the featured card collapses to a text-only card).
 *
 * DEVIATION: no category eyebrow — `Page` has no category/taxonomy column,
 * so the meta line is the date only (design.md's "date · category" cannot be
 * fed real data).
 */
export function WealthBlogCard({
  post,
  index,
  excerptLength = 200,
  headingLevel: TitleTag = "h3",
  featured = false,
}: Props) {
  const excerpt = post.excerpt?.trim()
    ? post.excerpt
    : deriveExcerpt(post.content, excerptLength);
  const href = `/blog/${post.slug}`;
  const image = post.image?.trim() ? post.image : null;
  const date = (
    <time dateTime={new Date(post.createdAt).toISOString()}>
      {formatDate(post.createdAt)}
    </time>
  );
  const stagger =
    index != null
      ? ({ "--i": Math.min(index, 7) } as React.CSSProperties)
      : undefined;
  const revealClass = index != null ? "wealth-reveal-item" : undefined;

  if (!featured) {
    return (
      <WealthPostCard
        href={href}
        title={post.title}
        image={image}
        meta={date}
        excerpt={excerpt || undefined}
        titleAs={TitleTag}
        className={revealClass}
        style={stagger}
      />
    );
  }

  return (
    <article
      className={cn(
        "wealth-blog-featured wealth-on-surface",
        !image && "wealth-blog-featured--noimage",
        revealClass,
      )}
      style={stagger}
    >
      {image ? (
        <div className="wealth-blog-featured__media">
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 900px) 58vw, 100vw"
          />
        </div>
      ) : null}
      <div className="wealth-blog-featured__body">
        <p className="wealth-blog-featured__meta">{date}</p>
        <TitleTag className="wealth-blog-featured__title">
          <Link href={href}>{post.title}</Link>
        </TitleTag>
        {excerpt ? (
          <p className="wealth-blog-featured__excerpt">{excerpt}</p>
        ) : null}
        <div className="wealth-blog-featured__cta">
          <WealthLedgeButton
            href={href}
            aria-label={`Read more: ${post.title}`}
          >
            Read more
          </WealthLedgeButton>
        </div>
      </div>
    </article>
  );
}
