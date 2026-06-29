"use client";

import { ViiHero } from "../shared/vii-hero";

type Props = {
  heroImage?: string;
  overline: string;
  heading: string;
};

export function ViiContactHero({ heroImage, overline, heading }: Props) {
  return (
    <ViiHero
      heading={heading}
      aria-label="Contact"
      image={heroImage}
      overline={overline}
      minHeight="clamp(340px, 46vw, 560px)"
    />
  );
}
