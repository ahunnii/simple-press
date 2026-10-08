import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { GloveButton, GloveSection } from "../shared";
import { gloveIsExternal } from "../steps/glove-links";

type GloveHomeGiftProps = {
  image: string;
  imageAlt: string;
  heading: string;
  body: string;
  buttonLabel: string;
  /** Empty hides the button (blank, or its route's feature is off). */
  buttonUrl: string;
  sectionAttrs?: Record<string, string>;
};

/** Gift card band: a round photo beside a heading, paragraph and button. */
export function GloveHomeGift({
  image,
  imageAlt,
  heading,
  body,
  buttonLabel,
  buttonUrl,
  sectionAttrs,
}: GloveHomeGiftProps) {
  return (
    <GloveSection
      aria-labelledby="glove-gift-heading"
      sectionAttrs={sectionAttrs}
      padded={false}
      className="py-6 md:py-10"
    >
      <div className="grid items-center gap-8 rounded-[var(--glove-radius-panel)] bg-[var(--glove-cloud)] p-6 md:grid-cols-[minmax(0,300px)_1fr] md:gap-12 md:p-12">
        {image ? (
          <div className="relative mx-auto aspect-square w-[min(72vw,260px)] overflow-hidden rounded-full shadow-[var(--glove-shadow-md)] md:w-full">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(max-width: 768px) 260px, 300px"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="text-center md:text-left">
          <h2
            id="glove-gift-heading"
            className="glove-display text-[clamp(24px,2.6vw,32px)] leading-tight font-semibold text-[var(--glove-ink)]"
            {...fieldAttr("glove.homepage.gift-heading")}
          >
            {heading}
          </h2>
          {body ? (
            <p
              className="glove-body mt-4 text-[16px] leading-[1.75] text-[var(--glove-text)] md:text-[17px]"
              {...fieldAttr("glove.homepage.gift-body")}
            >
              {body}
            </p>
          ) : null}
          {buttonLabel && buttonUrl ? (
            <GloveButton
              href={buttonUrl}
              external={gloveIsExternal(buttonUrl)}
              size="md"
              className="mt-6"
            >
              <span {...fieldAttr("glove.homepage.gift-button-label")}>
                {buttonLabel}
              </span>
            </GloveButton>
          ) : null}
        </div>
      </div>
    </GloveSection>
  );
}
