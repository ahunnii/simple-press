import Link from "next/link";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/utils";

import { DreamPhoto } from "../shared/dream-photo";

type Post = DefaultBlogPageTemplateProps["pages"][number];

/**
 * Journal card: hairline 4:3 photo frame (with the designed fallback when
 * the post has no cover image), date, Italiana title, quiet excerpt. Shared
 * between the `/blog` grid and the "related stories" strip on `/blog/<slug>`.
 */
export function DreamBlogPostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col gap-3 rounded-[var(--dream-radius-photo)] no-underline"
    >
      <DreamPhoto
        src={post.image ?? ""}
        alt={post.title}
        aspect="4 / 3"
        fallbackTone="sky"
      />
      <span className="flex flex-col gap-1.5 px-1">
        <span className="text-[13px] text-[var(--dream-soft)]">
          {formatDate(post.createdAt)}
        </span>
        <span
          className="text-[20px] leading-[1.25] text-[var(--dream-ink)] decoration-[var(--dream-rose)] underline-offset-4 group-hover:underline"
          style={{ fontFamily: "var(--font-dream-display)" }}
        >
          {post.title}
        </span>
        {post.excerpt ? (
          <span className="line-clamp-2 text-[14px] leading-[1.5] text-[var(--dream-soft)]">
            {post.excerpt}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
