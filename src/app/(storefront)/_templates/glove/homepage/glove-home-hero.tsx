import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { GloveButton } from "../shared";
import { gloveIsExternal } from "../steps/glove-links";

type GloveHomeHeroProps = {
  image: string;
  imageAlt: string;
  heading: string;
  subheading: string;
  buttonLabel: string;
  /** Empty hides the button (blank, or its route's feature is off). */
  buttonUrl: string;
  sectionAttrs?: Record<string, string>;
};

/**
 * Full-width founder photo under a scrim, with the page's one `h1`. The
 * heading rises 20px over 700ms and the sub-line follows 150ms later. The
 * button is a white outline so it reads on the scrim; clearing its label
 * hides it.
 */
export function GloveHomeHero({
  image,
  imageAlt,
  heading,
  subheading,
  buttonLabel,
  buttonUrl,
  sectionAttrs,
}: GloveHomeHeroProps) {
  return (
    <section
      className="glove-on-dark relative isolate flex min-h-[64svh] items-center justify-center overflow-hidden bg-[var(--glove-primary)] text-center text-[var(--glove-on-primary)] md:min-h-[70svh]"
      aria-labelledby="glove-home-hero-heading"
      {...sectionAttrs}
    >
      {image ? (
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover [object-position:center_30%]"
        />
      ) : null}
      <div
        className="absolute inset-0 -z-10 bg-[var(--glove-hero-scrim)]"
        aria-hidden="true"
      />

      <div className="glove-container py-20 md:py-28">
        <h1
          id="glove-home-hero-heading"
          className="glove-display glove-hero-rise mx-auto max-w-[18ch] text-[clamp(32px,4.2vw,50px)] leading-[1.15] font-medium [text-shadow:var(--glove-hero-text-shadow)] md:max-w-[24ch]"
          {...fieldAttr("glove.homepage.hero-heading")}
        >
          {heading}
        </h1>
        {subheading ? (
          <p
            className="glove-display glove-hero-rise glove-hero-rise--late mx-auto mt-4 max-w-[34ch] text-[clamp(18px,2vw,25px)] leading-snug [text-shadow:var(--glove-hero-text-shadow)]"
            {...fieldAttr("glove.homepage.hero-subheading")}
          >
            {subheading}
          </p>
        ) : null}
        {buttonLabel && buttonUrl ? (
          <div className="glove-hero-rise glove-hero-rise--late mt-8">
            <GloveButton
              href={buttonUrl}
              external={gloveIsExternal(buttonUrl)}
              variant="solid"
              size="lg"
              className="glove-on-dark"
            >
              <span {...fieldAttr("glove.homepage.hero-button-label")}>
                {buttonLabel}
              </span>
            </GloveButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}
