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

export function ViiContactHero({
  heroImage,
  heroImageAlt,
  overline,
  heading,
  headingFallback,
}: Props) {
  return (
    <ViiHero
      heading={heading}
      aria-label="Contact"
      image={heroImage}
      imageAlt={heroImageAlt}
      headingFallback={headingFallback}
      overline={overline}
      minHeight="clamp(340px, 46vw, 560px)"
      sectionAttrs={sectionGroupAttr("contact", "hero")}
      overlineFieldKey="vii.contact.hero-overline"
      headingFieldKey="vii.contact.hero-heading"
    />
  );
}
