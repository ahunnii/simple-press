import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { UmscButton } from "../shared/umsc-button";
import { UmscHeading } from "../shared/umsc-heading";
import {
  hasCustomImage,
  UmscImageFallback,
} from "../shared/umsc-image-fallback";
import { UmscLede } from "../shared/umsc-lede";
import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  image?: string;
  imageAlt: string;
  heading: string;
  lede: string;
  paragraph: string;
  ctaLabel: string;
  ctaUrl: string;
  sectionAttrs?: Record<string, string>;
};

/**
 * UmscStorySection (homepage.story) — cream band split 1.05fr/.95fr: photo
 * left with a gold hairline frame, right column carries the h2 + lede +
 * paragraph (verbatim from her About copy) + gold pill to /about
 * (design.md "Homepage → Story").
 */
export function UmscStorySection({
  image,
  imageAlt,
  heading,
  lede,
  paragraph,
  ctaLabel,
  ctaUrl,
  sectionAttrs,
}: Props) {
  const hasImage = hasCustomImage(image);

  return (
    <UmscSection
      tone="cream"
      aria-labelledby="umsc-story-heading"
      sectionAttrs={sectionAttrs}
    >
      <UmscReveal className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="relative aspect-[5/4] w-full overflow-hidden border border-[var(--umsc-line-gold)]">
          {hasImage ? (
            <Image
              src={image!}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <UmscImageFallback className="border-0" label={imageAlt} />
          )}
        </div>

        <div>
          <UmscHeading
            as="h2"
            id="umsc-story-heading"
            fieldKey="umsc.homepage.story-heading"
          >
            {heading}
          </UmscHeading>
          {lede && (
            <UmscLede fieldKey="umsc.homepage.story-lede" className="mt-5">
              {lede}
            </UmscLede>
          )}
          {paragraph && (
            <p
              {...fieldAttr("umsc.homepage.story-paragraph")}
              className="umsc-sans mt-4 max-w-[60ch] text-[16px] leading-[1.6] text-[var(--umsc-muted)]"
            >
              {paragraph}
            </p>
          )}
          {ctaLabel && (
            <div className="mt-8">
              <UmscButton
                variant="gold"
                href={ctaUrl}
                fieldKey="umsc.homepage.story-cta-label"
                showArrow={false}
              >
                {ctaLabel}
              </UmscButton>
            </div>
          )}
        </div>
      </UmscReveal>
    </UmscSection>
  );
}
