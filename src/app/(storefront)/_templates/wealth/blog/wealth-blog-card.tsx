import Link from "next/link";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { deriveExcerpt } from "~/lib/blog-search";
import { formatDate } from "~/lib/utils";

import { WealthBlogAccentBar } from "./wealth-blog-accent-bar";
import { WealthBlogReadLink } from "./wealth-blog-read-link";

type Page = DefaultBlogPageTemplateProps["pages"][number];

type Props = {
  post: Page;
  /** Stagger index for the reveal group (capped by the caller). */
  index?: number;
  excerptLength?: number;
  /**
   * Heading level for the card title: "h2" on the blog index (titles sit
   * directly under the page h1), "h3" in the post page's related strip
   * (titles sit under the strip's h2). Defaults to h3.
   */
  headingLevel?: "h2" | "h3";
};

/**
 * The "News + Notes" card language, recreated from the real DCWF Squarespace
 * skin (see the ditto clone's `feature-card.tsx`): mono uppercase date
 * eyebrow → PT Sans italic ~30px title with a 39×3px orange underline bar →
 * muted excerpt → a mono "read more" affordance.
 *
 * DEVIATION: the clone's card also carries a "category" mono link
 * (`href2`/`label`) pointing at a Squarespace category-archive URL. `Page`
 * has no category/taxonomy column on this platform, so a fake category would
 * either be static filler or a dead link — dropped rather than fabricated
 * (same call pink's blog card made for its own missing-taxonomy case).
 */
export function WealthBlogCard({
  post,
  index,
  excerptLength = 200,
  headingLevel: TitleTag = "h3",
}: Props) {
  const excerpt = post.excerpt?.trim()
    ? post.excerpt
    : deriveExcerpt(post.content, excerptLength);

  return (
    <article
      className="wealth-reveal-item"
      style={index != null ? ({ "--i": Math.min(index, 7) } as React.CSSProperties) : undefined}
    >
      <Link
        href={`/blog/${post.slug}`}
        className="group block"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <time
          dateTime={new Date(post.createdAt).toISOString()}
          style={{
            display: "block",
            fontFamily: "var(--font-wealth-mono)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "1.69px",
            textTransform: "uppercase",
            color: "var(--wealth-eyebrow)",
            marginBottom: 20,
          }}
        >
          {formatDate(post.createdAt)}
        </time>

        <TitleTag
          className="transition-opacity group-hover:opacity-75"
          style={{
            fontFamily: "var(--font-wealth-sub)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(22px, 2.6vw, 30px)",
            lineHeight: 1.23,
            letterSpacing: "0.3px",
            color: "var(--wealth-ink)",
            margin: 0,
            textWrap: "balance",
          }}
        >
          {post.title}
        </TitleTag>

        <WealthBlogAccentBar style={{ marginTop: 20, marginBottom: 20 }} />

        {excerpt && (
          <p
            style={{
              fontFamily: "var(--font-wealth-sub)",
              fontSize: 18,
              lineHeight: 1.5,
              color: "var(--wealth-muted)",
              margin: "0 0 20px",
            }}
          >
            {excerpt}
          </p>
        )}

        <WealthBlogReadLink>Read more</WealthBlogReadLink>
      </Link>
    </article>
  );
}
