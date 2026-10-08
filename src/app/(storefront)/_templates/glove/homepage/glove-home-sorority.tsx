import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { GloveButton, GloveSection } from "../shared";
import { gloveIsExternal } from "../steps/glove-links";

type GloveHomeSororityProps = {
  image: string;
  imageAlt: string;
  heading: string;
  body: string;
  buttonLabel: string;
  /** Empty hides the button (blank, or its route's feature is off). */
  buttonUrl: string;
  sectionAttrs?: Record<string, string>;
};

/** Split band: text and button on the left, the color-pairing photo on the right. */
export function GloveHomeSorority({
  image,
  imageAlt,
  heading,
  body,
  buttonLabel,
  buttonUrl,
  sectionAttrs,
}: GloveHomeSororityProps) {
  return (
    <GloveSection
      aria-labelledby="glove-sorority-heading"
      sectionAttrs={sectionAttrs}
    >
      <div className="grid items-center gap-8 md:grid-cols-[5fr_7fr] md:gap-12">
        <div className="text-center md:text-left">
          <h2
            id="glove-sorority-heading"
            className="glove-display text-[clamp(26px,3.2vw,40px)] leading-[1.25] font-semibold text-[var(--glove-ink)]"
            {...fieldAttr("glove.homepage.sorority-heading")}
          >
            {heading}
          </h2>
          {body ? (
            <p
              className="glove-body mt-4 text-[17px] leading-[1.7] text-[var(--glove-text)] md:text-[19px]"
              {...fieldAttr("glove.homepage.sorority-body")}
            >
              {body}
            </p>
          ) : null}
          {buttonLabel && buttonUrl ? (
            <GloveButton
              href={buttonUrl}
              external={gloveIsExternal(buttonUrl)}
              size="md"
              className="mt-7"
            >
              <span {...fieldAttr("glove.homepage.sorority-button-label")}>
                {buttonLabel}
              </span>
            </GloveButton>
          ) : null}
        </div>
        {image ? (
          <div className="relative aspect-[1835/953] w-full overflow-hidden rounded-[var(--glove-radius-card)] bg-[var(--glove-cloud)] shadow-[var(--glove-shadow-sm)]">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(max-width: 768px) 92vw, 700px"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </GloveSection>
  );
}
