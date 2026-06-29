"use client";

import { heroRevealStyle, useViiHeroMotion } from "../hooks/use-vii-hero-motion";
import { ViiHero } from "../shared/vii-hero";

type AnimatedExcerptProps = {
  text: string;
};

function AnimatedExcerpt({ text }: AnimatedExcerptProps) {
  const { shown, reduced } = useViiHeroMotion();
  return (
    <p
      style={{
        ...heroRevealStyle(shown, reduced, 0.3),
        fontFamily: "var(--font-sans)",
        fontSize: 17,
        lineHeight: 1.6,
        color: "var(--vii-paper)",
        opacity: shown ? 0.82 : 0,
        maxWidth: 560,
        marginTop: 18,
        marginBottom: 0,
      }}
    >
      {text}
    </p>
  );
}

type Props = {
  image: string;
  title: string;
  excerpt?: string;
  kicker?: string;
};

export function ViiGenericCoverHero({ image, title, excerpt, kicker }: Props) {
  return (
    <ViiHero
      heading={title}
      aria-label={title || "Page"}
      image={image}
      overline={kicker}
    >
      {excerpt && <AnimatedExcerpt text={excerpt} />}
    </ViiHero>
  );
}
