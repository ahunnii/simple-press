import Image from "next/image";
import Link from "next/link";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn, formatDate } from "~/lib/utils";

import { UMSC_META_CLASS } from "../generic/umsc-page-kit";
import {
  hasCustomImage,
  UmscImageFallback,
} from "../shared/umsc-image-fallback";

export type UmscBlogPost = DefaultBlogPageTemplateProps["pages"][number];

type Props = {
  post: UmscBlogPost;
  /** Small link under the card; hidden when blank. */
  linkLabel?: string;
  /** Tag the link text for live patching — only on the index page's cards. */
  linkLabelFieldKey?: string;
  /** `featured` = the index page's lead story (split, larger title). */
  variant?: "grid" | "featured";
  headingLevel?: "h2" | "h3";
  priority?: boolean;
};

/**
 * UmscBlogCard — a post as a umsc shelf card: hairline-framed photo that
 * scales 1.03 on hover (the product-card grammar), the date as an uppercase
 * meta line, the title in Marcellus, two lines of excerpt and a gold-ink
 * "Read the story →" whose arrow nudges like the collection doors. The whole
 * card is one link. No photo → the cream UM-mark tile, never a blank box.
 */
export function UmscBlogCard({
  post,
  linkLabel,
  linkLabelFieldKey,
  variant = "grid",
  headingLevel = "h3",
  priority = false,
}: Props) {
  const Heading = headingLevel;
  const featured = variant === "featured";
  const label = linkLabel?.trim() ? linkLabel : null;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        "umsc-product-card group block text-[var(--umsc-ink)] no-underline",
        featured &&
          "grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14",
      )}
    >
      <div
        className="relative w-full overflow-hidden border border-[var(--umsc-line)] bg-[var(--umsc-cream)]"
        style={{ aspectRatio: "4 / 3" }}
      >
        {hasCustomImage(post.image) ? (
          <Image
            src={post.image!}
            alt=""
            fill
            priority={priority}
            className="umsc-product-card-img object-cover"
            sizes={
              featured
                ? "(max-width: 1024px) 100vw, 640px"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            }
          />
        ) : (
          <UmscImageFallback className="border-0" />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col items-start",
          featured ? "gap-4" : "mt-5 gap-2",
        )}
      >
        <p className={cn(UMSC_META_CLASS, "text-[var(--umsc-muted)]")}>
          {formatDate(post.createdAt)}
        </p>
        <Heading
          className={cn(
            "umsc-serif font-normal tracking-[0.015em] text-balance break-words",
            featured
              ? "text-[clamp(28px,3.2vw,44px)] leading-[1.1]"
              : "text-[22px] leading-[1.2]",
          )}
        >
          {post.title}
        </Heading>
        {post.excerpt ? (
          <p
            className={cn(
              "umsc-sans max-w-[60ch] leading-[1.6] text-[var(--umsc-muted)]",
              featured
                ? "line-clamp-3 text-[17px]"
                : "line-clamp-2 text-[15px]",
            )}
          >
            {post.excerpt}
          </p>
        ) : null}
        {label ? (
          <span
            className={cn(
              UMSC_META_CLASS,
              "mt-1 inline-flex items-center gap-1.5 text-[var(--umsc-gold-ink)]",
            )}
          >
            <span {...(linkLabelFieldKey ? fieldAttr(linkLabelFieldKey) : {})}>
              {label}
            </span>
            <span aria-hidden="true" className="umsc-door-arrow">
              →
            </span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}
