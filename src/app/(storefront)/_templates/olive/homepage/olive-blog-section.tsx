import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  hasOliveImage,
  OliveImageFallback,
  OliveRevealGroup,
  OliveSection,
  OliveSectionHeading,
} from "../shared";

export type OliveBlogTeaser = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  /** Already formatted in the server component — never a raw Date. */
  dateLabel: string;
};

type Props = {
  heading: string;
  linkLabel: string;
  linkHref: string;
  posts: OliveBlogTeaser[];
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
  linkLabelFieldKey?: string;
};

/**
 * The journal teaser — three unframed entries, each a photograph, a date in
 * taupe ink, a Bodoni title and one line. The whole entry is the link, so the
 * hit target is the entry and not a five-word phrase at the bottom of it.
 *
 * Nothing here is owner-authored except the heading and the link: the posts
 * are real, and with no published posts (or the blog turned off) the section
 * does not render.
 */
export function OliveBlogSection({
  heading,
  linkLabel,
  linkHref,
  posts,
  sectionAttrs,
  headingFieldKey,
  linkLabelFieldKey,
}: Props) {
  const shown = posts.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <OliveSection
      tone="ivory"
      aria-labelledby="olive-blog-heading"
      {...sectionAttrs}
    >
      <OliveSectionHeading
        heading={heading}
        id="olive-blog-heading"
        caps
        link={
          linkLabel && linkHref
            ? { label: linkLabel, href: linkHref }
            : undefined
        }
        headingFieldKey={headingFieldKey}
        linkFieldKey={linkLabelFieldKey}
        className="mb-8 md:mb-10"
      />

      <OliveRevealGroup className="grid gap-10 md:grid-cols-3 md:gap-6">
        {shown.map((post, index) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="olive-blog-teaser group olive-reveal-item flex flex-col"
            style={{ "--i": index } as CSSProperties}
          >
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: "4 / 3",
                backgroundColor: "var(--olive-sand)",
              }}
            >
              {hasOliveImage(post.image) ? (
                <Image
                  src={post.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="olive-photo-push object-cover"
                />
              ) : (
                <OliveImageFallback className="absolute inset-0" />
              )}
            </div>

            <div className="flex flex-col gap-2 pt-4">
              {post.dateLabel ? (
                <span
                  className="olive-caption"
                  style={{ color: "var(--olive-taupe-ink)" }}
                >
                  {post.dateLabel}
                </span>
              ) : null}

              <h3 className="olive-h3 olive-blog-teaser-title">{post.title}</h3>

              {post.excerpt ? (
                <span
                  className="line-clamp-2 text-[0.875rem] leading-relaxed"
                  style={{ color: "var(--olive-ink-soft)" }}
                >
                  {post.excerpt}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </OliveRevealGroup>
    </OliveSection>
  );
}
