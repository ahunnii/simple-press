import type { ReactNode } from "react";
import Image from "next/image";
import { Leaf } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { FadeIn } from "~/components/page-animations";

type Props = {
  /** The page's only h1. */
  title: string;
  /** Template field behind `title` — adds `data-sp-field` for live patching. */
  titleFieldKey?: string;
  /** Leaf badge above the h1. Omitted when blank. */
  smallLabel?: string;
  smallLabelFieldKey?: string;
  /** Muted intro under the h1. Omitted when blank. */
  subtitle?: string;
  subtitleFieldKey?: string;
  /** `sectionGroupAttr(page, group)` for the band's editor hotspot. */
  sectionAttrs?: Record<string, string>;
  /** Right-hand image. Omitted when `src` is blank and no `media` is given. */
  image?: { src: string; alt: string } | null;
  /**
   * Custom content for the right-hand frame (e.g. an event flier with its
   * lightbox or video player). Wins over `image`. The node fills a
   * `relative` frame — size it with `absolute inset-0` / `h-full` or its own
   * matching aspect ratio.
   */
  media?: ReactNode;
  /**
   * `cover` (default): the services-index 16:9 photo frame, cropped to fill.
   * `contain`: a 3:4 poster frame on the card surface, letterboxed so a
   * flier with words on it is never cropped.
   */
  imageFit?: "cover" | "contain";
};

/**
 * The happy-bamboo page shelf — the muted title band every inner page opens
 * with, lifted out of `services/happy-bamboo-services-index-page.tsx` so the
 * optional pages (Events, Event, Videos, Donate, FAQ) and the generic/policy
 * page share one implementation: `bg-muted/50` band, `container mx-auto px-4`
 * edge, optional leaf badge, serif h1, muted intro and an optional image frame
 * on the right (stacked below the text on phones).
 *
 * Body content that follows should sit in the same `container mx-auto px-4`
 * so the h1 and the body share one left edge.
 *
 * `.happy-bamboo *` forces the sans family onto every descendant, so the
 * serif class sits on the h1's inner text span, not just the h1.
 */
export function HappyBambooPageShelf({
  title,
  titleFieldKey,
  smallLabel,
  smallLabelFieldKey,
  subtitle,
  subtitleFieldKey,
  sectionAttrs,
  image,
  media,
  imageFit = "cover",
}: Props) {
  const hasImage = !!image && image.src.trim().length > 0;
  const hasFrame = media != null || hasImage;
  const contain = imageFit === "contain";

  return (
    <section className="bg-muted/50 py-16 md:py-24" {...sectionAttrs}>
      <div className="container mx-auto px-4">
        <div className="flex w-full flex-col items-center justify-center gap-12 md:flex-row">
          <FadeIn className="flex w-full min-w-0 flex-1 flex-col justify-center text-left">
            {!!smallLabel?.trim() && (
              <Badge
                className="mb-4 w-fit"
                {...(smallLabelFieldKey ? fieldAttr(smallLabelFieldKey) : {})}
              >
                <Leaf className="mr-1 h-3 w-3" aria-hidden="true" />
                {smallLabel}
              </Badge>
            )}
            <h1 className="mb-4 font-serif text-4xl font-bold break-words md:text-5xl">
              <span
                className="font-serif"
                {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
              >
                {title}
              </span>
            </h1>
            {!!subtitle?.trim() && (
              <p
                className="text-muted-foreground max-w-2xl text-lg leading-relaxed"
                {...(subtitleFieldKey ? fieldAttr(subtitleFieldKey) : {})}
              >
                {subtitle}
              </p>
            )}
          </FadeIn>

          {hasFrame && (
            <FadeIn
              direction="right"
              className="flex w-full flex-1 items-center justify-center"
            >
              <div
                className={cn(
                  "relative w-full overflow-hidden rounded-xl shadow-md",
                  contain
                    ? "border-border bg-card aspect-3/4 max-w-xs border"
                    : "aspect-video max-w-md",
                )}
              >
                {media ??
                  (hasImage && image ? (
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      priority
                      sizes={
                        contain
                          ? "(max-width: 768px) 100vw, 320px"
                          : "(max-width: 768px) 100vw, 448px"
                      }
                      className={contain ? "object-contain" : "object-cover"}
                    />
                  ) : null)}
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </section>
  );
}
