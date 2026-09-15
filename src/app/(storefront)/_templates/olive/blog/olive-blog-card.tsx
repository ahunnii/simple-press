import type { CSSProperties, ElementType } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { deriveExcerpt } from "~/lib/blog-search";
import { cn, formatDate } from "~/lib/utils";

import { hasOliveImage, OliveImageFallback } from "../shared";

export type OliveBlogPost = DefaultBlogPageTemplateProps["pages"][number];

type Props = {
  post: OliveBlogPost;
  /** "lead" spans full width with a bigger two-up (image/content) layout on desktop. */
  size?: "default" | "lead";
  /** h2 on the index (cards sit directly under the page h1); h3 in the post page's related strip (under its own h2). */
  headingLevel?: "h2" | "h3";
  priority?: boolean;
  /** Sets the `--i` custom property for `OliveRevealGroup`'s stagger; omit to skip the reveal item class. */
  revealIndex?: number;
};

/**
 * OliveBlogCard — the journal's one card language: image 4:3 (or full-bleed
 * left column on "lead"), date in slate-deep, title in the shared
 * `.olive-card-title` face, excerpt, a decorative "Read more" ghost
 * affordance. The whole card is one link (`aria-label` set to the post
 * title so its accessible name doesn't also read the excerpt); the
 * "Read more" span is `aria-hidden` rather than a second nested link.
 */
export function OliveBlogCard({
  post,
  size = "default",
  headingLevel = "h3",
  priority = false,
  revealIndex,
}: Props) {
  const Title = headingLevel as ElementType;
  const isLead = size === "lead";
  const excerpt = post.excerpt?.trim()
    ? post.excerpt
    : deriveExcerpt(post.content, isLead ? 240 : 140);

  return (
    <Link
      href={`/blog/${post.slug}`}
      aria-label={post.title}
      className={cn(
        "olive-card olive-card-paper olive-card-lift group block overflow-hidden",
        revealIndex != null && "olive-reveal-item",
        isLead && "md:grid md:grid-cols-2 md:items-stretch",
      )}
      style={{
        ...(revealIndex != null
          ? ({ "--i": Math.min(revealIndex, 8) } as CSSProperties)
          : undefined),
        ...(isLead ? { gridColumn: "1 / -1" } : undefined),
      }}
    >
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden",
          isLead && "md:aspect-auto md:h-full",
        )}
      >
        {hasOliveImage(post.image) ? (
          <Image
            src={post.image ?? "/placeholder.svg"}
            alt=""
            fill
            priority={priority}
            sizes={
              isLead
                ? "(max-width: 768px) 100vw, 50vw"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            }
            className="olive-photo-push object-cover"
          />
        ) : (
          <OliveImageFallback className="absolute inset-0" />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col items-start gap-2 p-5",
          isLead && "md:justify-center md:gap-3 md:p-8",
        )}
      >
        <time
          dateTime={new Date(post.createdAt).toISOString()}
          className="olive-caption"
          style={{ color: "var(--olive-slate-deep)" }}
        >
          {formatDate(post.createdAt)}
        </time>
        <Title className={isLead ? "olive-h3" : "olive-card-title"}>
          {post.title}
        </Title>
        {excerpt ? (
          <p className="olive-caption" style={{ maxWidth: "60ch" }}>
            {excerpt}
          </p>
        ) : null}
        <span
          aria-hidden="true"
          className="olive-btn olive-btn-ghost olive-btn-sm mt-1"
        >
          Read more
        </span>
      </div>
    </Link>
  );
}
