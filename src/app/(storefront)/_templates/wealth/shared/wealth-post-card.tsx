import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";

import { cn } from "~/lib/utils";

import { WealthLedgeButton } from "./wealth-ledge-button";

type WealthPostCardProps = {
  href: string;
  title: string;
  /** Square-cropped (≥720px) / 16:10 (phones) image. Omit → a quiet forest placeholder box of the same ratio so rows align. */
  image?: string | null;
  imageAlt?: string;
  imagePosition?: string;
  /** Mono caps meta line, e.g. "Fast Company · Nov 24, 2025". */
  meta?: React.ReactNode;
  excerpt?: React.ReactNode;
  /** Ledge-button label. Blank hides the button (the title still links). */
  ctaLabel?: string;
  /** Opens in a new tab (press links). Defaults to true for http(s) hrefs. */
  external?: boolean;
  titleAs?: "h2" | "h3";
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "title">;

/**
 * Story / news card (design.md redesign "wealth-post-card"): image, mono
 * meta, italic PT Sans title with the 39×3 sage bar, muted excerpt and a
 * small READ MORE ledge button. Lay them out in `.wealth-posts` (1 / 3
 * columns). Extra attributes (`listItemAttr`, reveal classes) land on the
 * `<article>`. The button's accessible name includes the title.
 */
export function WealthPostCard({
  href,
  title,
  image,
  imageAlt = "",
  imagePosition,
  meta,
  excerpt,
  ctaLabel = "Read more",
  external,
  titleAs: TitleTag = "h3",
  className,
  ...rest
}: WealthPostCardProps) {
  const opensNewTab = external ?? /^https?:\/\//i.test(href);
  const tabProps = opensNewTab
    ? ({ target: "_blank", rel: "noopener noreferrer" } as const)
    : {};
  return (
    <article {...rest} className={cn("wealth-post", className)}>
      {image?.trim() ? (
        <div className="wealth-post__media">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(min-width: 720px) 33vw, 100vw"
            style={
              imagePosition ? { objectPosition: imagePosition } : undefined
            }
          />
        </div>
      ) : (
        <div
          className="wealth-post__media wealth-post__media--empty"
          aria-hidden="true"
        >
          <Newspaper className="wealth-post__media-mark" strokeWidth={1.25} />
        </div>
      )}
      <div className="wealth-post__body">
        {meta ? <p className="wealth-post__meta">{meta}</p> : null}
        <TitleTag className="wealth-post__title">
          <Link href={href} {...tabProps}>
            {title}
            {opensNewTab ? (
              <span className="sr-only"> (opens in new tab)</span>
            ) : null}
          </Link>
        </TitleTag>
        {excerpt ? <p className="wealth-post__excerpt">{excerpt}</p> : null}
        {ctaLabel.trim() ? (
          <div className="wealth-post__cta">
            <WealthLedgeButton
              href={href}
              external={opensNewTab}
              size="sm"
              aria-label={`${ctaLabel}: ${title}${opensNewTab ? " (opens in new tab)" : ""}`}
            >
              {ctaLabel}
            </WealthLedgeButton>
          </div>
        ) : null}
      </div>
    </article>
  );
}
