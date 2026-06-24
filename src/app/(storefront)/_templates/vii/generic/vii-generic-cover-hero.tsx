"use client";

import Image from "next/image";

import {
  heroHeadingStyle,
  heroMediaStyle,
  heroRevealStyle,
  useViiHeroMotion,
} from "../hooks/use-vii-hero-motion";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  image: string;
  title: string;
  excerpt?: string;
  kicker?: string;
};

export function ViiGenericCoverHero({ image, title, excerpt, kicker }: Props) {
  const { shown, reduced } = useViiHeroMotion();

  return (
    <section
      aria-label={title || "Page"}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "clamp(360px, 52vw, 620px)",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
        background: "var(--vii-navy)",
      }}
    >
      {/* Background media — Ken-Burns scale-settle. Wrapped in overflow:hidden
          so the scale doesn't bleed outside the section. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          ...heroMediaStyle(shown, reduced),
        }}
      >
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>

      {/* Scrim — outside the scaled layer so it stays flat */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) 82%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 30%, transparent) 55%, color-mix(in srgb, var(--vii-navy) 12%, transparent) 100%)",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 clamp(24px, 6vw, 96px) clamp(48px, 7vh, 88px)",
          maxWidth: 760,
        }}
      >
        {kicker && (
          <ViiOverline
            align="left"
            tone="dark"
            style={{ marginBottom: 16, ...heroRevealStyle(shown, reduced, 0) }}
          >
            {kicker}
          </ViiOverline>
        )}

        <h1
          style={{
            ...heroHeadingStyle(shown, reduced, 0.15),
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 80px)",
            lineHeight: 1.02,
            color: "var(--vii-paper)",
            margin: 0,
          }}
        >
          {title}
        </h1>

        {excerpt && (
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
            {excerpt}
          </p>
        )}
      </div>
    </section>
  );
}
