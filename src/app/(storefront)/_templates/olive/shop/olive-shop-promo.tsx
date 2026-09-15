import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";

import {
  hasOliveImage,
  OliveButton,
  OliveImageFallback,
  OliveReveal,
  OliveSection,
} from "../shared";

type Props = {
  image: string;
  heading: string;
  body: string;
  buttonLabel: string;
  buttonLink: string;
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
  bodyFieldKey?: string;
};

/**
 * OliveShopPromo — two tiles on the sage wash, under the grid.
 *
 * A photograph and a short pitch, side by side at the same height, so the
 * band reads as one spread rather than a card sitting on a card. The whole
 * section disappears when the heading is blank: an owner with nothing to
 * cross-sell should not be made to invent one.
 */
export function OliveShopPromo({
  image,
  heading,
  body,
  buttonLabel,
  buttonLink,
  sectionAttrs,
  headingFieldKey,
  bodyFieldKey,
}: Props) {
  const hasHeading = heading.trim().length > 0;
  const hasBody = body.trim().length > 0;
  if (!hasHeading && !hasBody) return null;

  const showButton =
    buttonLabel.trim().length > 0 && buttonLink.trim().length > 0;

  return (
    <OliveSection
      bleed
      tone="sage-tint"
      {...(hasHeading
        ? { "aria-labelledby": "olive-shop-promo-heading" }
        : { "aria-label": "Promotion" })}
      {...sectionAttrs}
    >
      <OliveReveal>
        <div className="grid items-stretch gap-6 md:grid-cols-2 md:gap-10">
          <div
            className="relative overflow-hidden"
            style={{
              aspectRatio: "4 / 3",
              borderRadius: "var(--olive-card-radius)",
            }}
          >
            {hasOliveImage(image) ? (
              <Image
                src={image}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <OliveImageFallback className="absolute inset-0" size={40} />
            )}
          </div>

          <div className="flex flex-col justify-center gap-4 md:py-4">
            {hasHeading ? (
              <h2
                id="olive-shop-promo-heading"
                className="olive-h2"
                {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
              >
                {heading}
              </h2>
            ) : null}

            {hasBody ? (
              <p
                className="max-w-[52ch] text-[0.9375rem] leading-relaxed"
                style={{ color: "var(--olive-ink)" }}
                {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
              >
                {body}
              </p>
            ) : null}

            {showButton ? (
              <OliveButton
                variant="primary"
                href={buttonLink}
                className="self-start"
                data-sp-field="olive.shop.promo-button-label"
              >
                {buttonLabel}
              </OliveButton>
            ) : null}
          </div>
        </div>
      </OliveReveal>
    </OliveSection>
  );
}
