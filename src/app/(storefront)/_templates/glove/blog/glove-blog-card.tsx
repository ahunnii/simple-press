import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { deriveExcerpt } from "~/lib/blog-search";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn, formatDate } from "~/lib/utils";

import { GloveHandIcon } from "../shared";

export type GloveBlogPost = DefaultBlogPageTemplateProps["pages"][number];

/** The author's excerpt, else a plain-text one derived from the body. */
export function postExcerpt(
  post: Pick<GloveBlogPost, "excerpt" | "content">,
  maxLen: number,
): string {
  const own = post.excerpt?.trim();
  if (own) return own;
  return deriveExcerpt(post.content, maxLen);
}

type GloveBlogCardProps = {
  post: GloveBlogPost;
  /** "Continue reading" label (field). */
  readMoreLabel: string;
  readMoreFieldKey?: string;
  /** Heading level; h2 on the index, h3 under a section heading. */
  headingAs?: "h2" | "h3";
  /** Above-the-fold image: loads eagerly. */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Blog card: 12px-radius image (3:2), primary uppercase date overline,
 * Poppins title, excerpt, "Continue reading →". The whole card is one
 * stretched link (the title link covers it) so there is a single tab stop.
 */
export function GloveBlogCard({
  post,
  readMoreLabel,
  readMoreFieldKey,
  headingAs: Heading = "h2",
  priority = false,
  className,
  style,
}: GloveBlogCardProps) {
  const date = post.publishedAt ?? post.createdAt;
  const excerpt = postExcerpt(post, 150);
  return (
    <article
      className={cn("group relative flex h-full flex-col", className)}
      style={style}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[12px] bg-[var(--glove-mist)]",
          post.image ? "aspect-[3/2]" : "aspect-[16/9] md:aspect-[3/2]",
        )}
      >
        {post.image ? (
          <Image
            src={post.image}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[var(--glove-primary)]/60">
            <GloveHandIcon className="size-14" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <p className="glove-display text-[12px] font-medium tracking-[2px] text-[var(--glove-primary)] uppercase">
          <time dateTime={new Date(date).toISOString()}>
            {formatDate(date)}
          </time>
        </p>
        <Heading className="glove-display mt-2 text-[20px] leading-[1.3] font-medium text-[var(--glove-ink)]">
          <Link
            href={`/blog/${post.slug}`}
            className="transition-colors group-hover:text-[var(--glove-primary)] after:absolute after:inset-0 after:content-['']"
          >
            {post.title}
          </Link>
        </Heading>
        {excerpt ? (
          <p className="glove-body mt-2 line-clamp-3 text-[15px] leading-relaxed text-[var(--glove-text)]">
            {excerpt}
          </p>
        ) : null}
        <span className="glove-display mt-4 inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.5px] text-[var(--glove-primary)] transition-[gap] duration-200 group-hover:gap-3 motion-reduce:transition-none">
          <span {...(readMoreFieldKey ? fieldAttr(readMoreFieldKey) : {})}>
            {readMoreLabel}
          </span>
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </article>
  );
}
