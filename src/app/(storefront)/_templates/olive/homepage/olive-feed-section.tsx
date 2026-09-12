import type { CSSProperties } from "react";
import Image from "next/image";

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
 * The feed — six squares of the shop as it actually looks, at the density of
 * a contact sheet rather than a carousel. Six across on a laptop, three on a
 * phone, so the block keeps its shape at both ends.
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
      tone="paper"
      aria-labelledby="olive-feed-heading"
      {...sectionAttrs}
    >
      <OliveSectionHeading
        heading={heading}
        id="olive-feed-heading"
        body={handle.trim() ? handle : undefined}
        headingFieldKey={headingFieldKey}
        bodyFieldKey={handleFieldKey}
        className="mb-8"
      />

      <OliveRevealGroup fan className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {shown.map((item, index) => {
          const caption = item.caption.trim();
          const photo = hasOliveImage(item.image) ? (
            <Image
              src={item.image}
              alt={href ? "" : caption}
              fill
              sizes="(max-width: 768px) 33vw, 16vw"
              className="object-cover"
            />
          ) : (
            <OliveImageFallback className="absolute inset-0" size={22} />
          );

          const tileStyle = { "--i": index } as CSSProperties;
          const frame =
            "olive-card olive-reveal-item relative aspect-square overflow-hidden";

          return href ? (
            <a
              key={item.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${caption ? caption : `Photograph ${index + 1}`} (opens in a new tab)`}
              className={cn(frame, "olive-card-lift")}
              style={tileStyle}
            >
              {photo}
            </a>
          ) : (
            <div key={item.id} className={frame} style={tileStyle}>
              {photo}
            </div>
          );
        })}
      </OliveRevealGroup>
    </OliveSection>
  );
}
