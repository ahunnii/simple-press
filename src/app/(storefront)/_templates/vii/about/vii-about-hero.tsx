"use client";

import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { ViiHero } from "../shared/vii-hero";

type Props = {
  heroImage?: string;
  heroImageAlt?: string;
  overline: string;
  heading: string;
  /** sr-only h1 text used when `heading` is blank. */
  headingFallback?: string;
};

export function ViiAboutHero({
  heroImage,
  heroImageAlt,
  overline,
  heading,
  headingFallback,
}: Props) {
  return (
    <ViiHero
      heading={heading}
      aria-label="About"
      image={heroImage}
      imageAlt={heroImageAlt}
      headingFallback={headingFallback}
      overline={overline}
      sectionAttrs={sectionGroupAttr("about", "hero")}
      overlineFieldKey="vii.about.hero-overline"
      headingFieldKey="vii.about.hero-heading"
    />
  );
}
