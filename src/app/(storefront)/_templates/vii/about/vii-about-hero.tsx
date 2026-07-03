"use client";

import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { ViiHero } from "../shared/vii-hero";

type Props = {
  heroImage?: string;
  overline: string;
  heading: string;
};

export function ViiAboutHero({ heroImage, overline, heading }: Props) {
  return (
    <ViiHero
      heading={heading}
      aria-label="About"
      image={heroImage}
      overline={overline}
      sectionAttrs={sectionGroupAttr("about", "hero")}
      overlineFieldKey="vii.about.hero-overline"
      headingFieldKey="vii.about.hero-heading"
    />
  );
}
