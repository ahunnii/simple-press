import Image from "next/image";
import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { PinkImageFallback } from "../shared/pink-image-fallback";
import { hasCustomImage } from "./pink-blog-shared";

type Props = {
  name: string;
  role?: string;
  avatar: string;
  bio?: string;
  ctaLabel?: string;
  ctaHref: string;
};

/**
 * The paper author card shown after every post's article body — the second
 * of `blog.post-author`'s two renderings (the first is the byline in
 * `PinkPageHeader`'s dark header, built inline in `pink-blog-post-page.tsx`).
 * Both carry the same `data-sp-group="blog.post-author"` so either instance
 * opens the same field panel. Server-safe.
 */
export function PinkBlogAuthorCard({
  name,
  role,
  avatar,
  bio,
  ctaLabel,
  ctaHref,
}: Props) {
  return (
    <div
      className="flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center"
      style={{
        background: "var(--pink-white)",
        border: "1px solid var(--pink-line)",
      }}
      {...sectionGroupAttr("blog", "post-author")}
    >
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden">
        {hasCustomImage(avatar) ? (
          <Image
            src={avatar}
            alt=""
            fill
            className="object-cover"
            sizes="72px"
          />
        ) : (
          <PinkImageFallback surface="paper" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <p
          className="pink-display"
          style={{
            fontSize: "17px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
          {...fieldAttr("pink.blog.post-author-name")}
        >
          {name}
        </p>
        {role && (
          <p
            className="pink-label"
            {...fieldAttr("pink.blog.post-author-role")}
          >
            {role}
          </p>
        )}
        {bio && (
          <p
            className="max-w-[52ch] text-[15px] leading-[1.7]"
            style={{ color: "var(--pink-muted)" }}
            {...fieldAttr("pink.blog.post-author-bio")}
          >
            {bio}
          </p>
        )}
        {ctaLabel && (
          <Link
            href={ctaHref}
            className="pink-btn pink-btn-ghost mt-2 w-fit"
            {...fieldAttr("pink.blog.post-author-cta-label")}
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
