import type { CSSProperties } from "react";
import Image from "next/image";

import { listItemAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import {
  hasOliveImage,
  OliveImageFallback,
  OliveRevealGroup,
  OliveSection,
  OliveSectionHeading,
} from "../shared";

export type OliveFeedImage = {
  id: string;
  image: string;
  caption: string;
  /** Original (pre-filter) position in the owner's `feed-images` list. */
  index: number;
};

type Props = {
  heading: string;
  handle: string;
  profileUrl: string;
  images: OliveFeedImage[];
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
  handleFieldKey?: string;
};

/**
 * The feed — six square photographs of the shop as it actually looks, at the
 * density of a contact sheet rather than a carousel: no frames, a hairline
 * gutter, a slow push-in on hover. Six across on a laptop, three on a phone,
 * so the block keeps its shape at both ends.
 *
 * Each square links out to the profile only when the owner has given a URL;
 * without one the photographs are shown plainly rather than as links that go
 * nowhere. An empty list hides the section outright — a fresh store must not
 * ship six grey squares.
 */
export function OliveFeedSection({
  heading,
  handle,
  profileUrl,
  images,
  sectionAttrs,
  headingFieldKey,
  handleFieldKey,
}: Props) {
  const shown = images.slice(0, 6);
  if (shown.length === 0) return null;

  const href = profileUrl.trim();

  return (
    <OliveSection
      bleed
      tone="ivory"
      aria-labelledby="olive-feed-heading"
      {...sectionAttrs}
    >
      <OliveSectionHeading
        heading={heading}
        id="olive-feed-heading"
        caps
        align="center"
        body={handle.trim() ? handle : undefined}
        headingFieldKey={headingFieldKey}
        bodyFieldKey={handleFieldKey}
        className="mb-8 md:mb-10"
      />

      <OliveRevealGroup className="grid grid-cols-3 gap-1 md:grid-cols-6 md:gap-1.5">
        {shown.map((item, index) => {
          const caption = item.caption.trim();
          const photo = hasOliveImage(item.image) ? (
            <Image
              src={item.image}
              alt={href ? "" : caption}
              fill
              sizes="(max-width: 768px) 33vw, 16vw"
              className="olive-photo-push object-cover"
            />
          ) : (
            <OliveImageFallback className="absolute inset-0" />
          );

          const tileStyle = {
            "--i": index,
            backgroundColor: "var(--olive-sand)",
          } as CSSProperties;
          const frame =
            "olive-reveal-item relative block aspect-square overflow-hidden";

          const itemAttrs = listItemAttr(
            "olive.homepage.feed-images",
            item.index,
          );

          return href ? (
            <a
              key={item.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${caption ? caption : `Photograph ${index + 1}`} (opens in a new tab)`}
              className={cn(frame, "group")}
              style={tileStyle}
              {...itemAttrs}
            >
              {photo}
            </a>
          ) : (
            <div
              key={item.id}
              className={frame}
              style={tileStyle}
              {...itemAttrs}
            >
              {photo}
            </div>
          );
        })}
      </OliveRevealGroup>
    </OliveSection>
  );
}
