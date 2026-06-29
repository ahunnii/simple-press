"use client";

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
    />
  );
}
