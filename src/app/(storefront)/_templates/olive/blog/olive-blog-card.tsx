import type { CSSProperties, ElementType } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
 * OliveBlogCard — the journal's one card language, unframed: image 4:3 (or a
 * left column on "lead"), a taupe-ink date, the title in Bodoni, the
 * excerpt, a decorative "Read more" link affordance. The whole card is one link (`aria-label` set to the post
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
        "group block",
        revealIndex != null && "olive-reveal-item",
        isLead && "md:grid md:grid-cols-2 md:items-center md:gap-10",
      )}
      style={{
        ...(revealIndex != null
          ? ({ "--i": Math.min(revealIndex, 8) } as CSSProperties)
          : undefined),
        ...(isLead ? { gridColumn: "1 / -1" } : undefined),
      }}
    >
      <div className={cn("relative aspect-[4/3] overflow-hidden")}>
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
          "flex flex-col items-start gap-2 pt-4",
          isLead && "md:justify-center md:gap-3 md:pt-0",
        )}
      >
        <time
          dateTime={new Date(post.createdAt).toISOString()}
          className="olive-label"
          style={{ color: "var(--olive-taupe-ink)" }}
        >
          {formatDate(post.createdAt)}
        </time>
        <Title className={isLead ? "olive-h2" : "olive-h3"}>{post.title}</Title>
        {excerpt ? (
          <p className="olive-caption" style={{ maxWidth: "60ch" }}>
            {excerpt}
          </p>
        ) : null}
        <span aria-hidden="true" className="olive-btn olive-btn-link mt-1">
          Read more
          <ArrowRight className="olive-btn-arrow" size={14} strokeWidth={1.5} />
        </span>
      </div>
    </Link>
  );
}
