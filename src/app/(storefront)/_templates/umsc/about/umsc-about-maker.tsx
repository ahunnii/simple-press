import Image from "next/image";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscButton } from "../shared/umsc-button";
import { UmscHeading } from "../shared/umsc-heading";
import {
  hasCustomImage,
  UmscImageFallback,
} from "../shared/umsc-image-fallback";
import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  heading: string;
  body1: string;
  body2: string;
  body3: string;
  image?: string;
  imageAlt?: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
};

/**
 * UmscAboutMaker — design.md "About #2": white split, portrait/market photo
 * left, her three About paragraphs verbatim right, two buttons. Not
 * hideable — this is the core of the page.
 */
export function UmscAboutMaker({
  heading,
  body1,
  body2,
  body3,
  image,
  imageAlt,
  primaryLabel,
  primaryUrl,
  secondaryLabel,
  secondaryUrl,
}: Props) {
  const showImage = hasCustomImage(image);

  return (
    <UmscSection
      tone="white"
      aria-label="The maker"
      sectionAttrs={sectionGroupAttr("about", "maker")}
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <UmscReveal className="relative aspect-[4/5] w-full overflow-hidden border border-[var(--umsc-line)] lg:order-1">
          {showImage ? (
            <Image
              src={image!}
              alt={imageAlt ?? ""}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 40vw, 90vw"
            />
          ) : (
            <UmscImageFallback aspect="4 / 5" className="h-full" />
          )}
        </UmscReveal>

        <UmscReveal className="lg:order-2">
          <UmscHeading as="h2" fieldKey="umsc.about.maker-heading">
            {heading}
          </UmscHeading>
          <div className="mt-6 flex flex-col gap-5">
            {body1 && (
              <p
                {...fieldAttr("umsc.about.maker-body-1")}
                className="umsc-sans max-w-[62ch] text-[17px] leading-[1.6] text-[var(--umsc-muted)]"
              >
                {body1}
              </p>
            )}
            {body2 && (
              <p
                {...fieldAttr("umsc.about.maker-body-2")}
                className="umsc-sans max-w-[62ch] text-[17px] leading-[1.6] text-[var(--umsc-muted)]"
              >
                {body2}
              </p>
            )}
            {body3 && (
              <p
                {...fieldAttr("umsc.about.maker-body-3")}
                className="umsc-sans max-w-[62ch] text-[17px] leading-[1.6] text-[var(--umsc-muted)]"
              >
                {body3}
              </p>
            )}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            {primaryLabel && (
              <UmscButton
                as="link"
                href={primaryUrl || "/shop"}
                variant="gold"
                fieldKey="umsc.about.maker-primary-label"
              >
                {primaryLabel}
              </UmscButton>
            )}
            {secondaryLabel && (
              <UmscButton
                as="link"
                href={secondaryUrl || "/contact"}
                variant="ghost"
                fieldKey="umsc.about.maker-secondary-label"
              >
                {secondaryLabel}
              </UmscButton>
            )}
          </div>
        </UmscReveal>
      </div>
    </UmscSection>
  );
}
