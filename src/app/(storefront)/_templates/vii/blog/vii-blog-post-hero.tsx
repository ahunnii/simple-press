"use client";

import { formatDate } from "~/lib/utils";

import { ViiHero } from "../shared/vii-hero";

type Props = {
  image?: string;
  title: string;
  createdAt: Date;
};

export function ViiBlogPostHero({ image, title, createdAt }: Props) {
  return (
    <ViiHero
      heading={title}
      aria-label={title}
      image={image}
      imageObjectPosition="center 30%"
      overline={`Blog · ${formatDate(createdAt)}`}
      contentMaxWidth={820}
      headingStyle={{
        fontSize: "clamp(36px, 6vw, 80px)",
        lineHeight: 1.05,
        letterSpacing: "-0.01em",
        textWrap: "balance",
      }}
    />
  );
}
