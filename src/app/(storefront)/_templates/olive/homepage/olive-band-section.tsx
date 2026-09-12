import Image from "next/image";

import {
  hasOliveImage,
  OliveButton,
  OliveImageFallback,
  OliveReveal,
  OliveSection,
  OliveSectionHeading,
} from "../shared";

type Props = {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
  bodyFieldKey?: string;
  ctaLabelFieldKey?: string;
};

/**
 * The cover band — the one place the sage field runs edge to edge across the
 * page, the same green as the footer and the bag. White type on the left, one
 * photograph framed as a white card on the right.
 *
 * `olive-invert` is what makes the scoped type classes follow the section's
 * white foreground; it is deliberately scoped to the text column so the photo
 * card keeps its own ink-on-white pairing.
 */
export function OliveBandSection({
  heading,
  body,
  ctaLabel,
  ctaHref,
  image,
  sectionAttrs,
  headingFieldKey,
  bodyFieldKey,
  ctaLabelFieldKey,
}: Props) {
  return (
    <OliveSection
      bleed
      tone="sage"
      aria-labelledby="olive-band-heading"
      innerClassName="grid items-center gap-8 md:grid-cols-2 md:gap-12"
      {...sectionAttrs}
    >
      <OliveReveal className="olive-invert flex flex-col items-start gap-6">
        <OliveSectionHeading
          heading={heading}
          id="olive-band-heading"
          body={body}
          tone="invert"
          headingFieldKey={headingFieldKey}
          bodyFieldKey={bodyFieldKey}
        />

        {ctaLabel ? (
          <OliveButton
            variant="secondary"
            href={ctaHref}
            data-sp-field={ctaLabelFieldKey}
          >
            {ctaLabel}
          </OliveButton>
        ) : null}
      </OliveReveal>

      <OliveReveal className="olive-card relative aspect-[4/3] overflow-hidden md:aspect-[4/5]">
        {hasOliveImage(image) ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <OliveImageFallback className="absolute inset-0" size={44} />
        )}
      </OliveReveal>
    </OliveSection>
  );
}
