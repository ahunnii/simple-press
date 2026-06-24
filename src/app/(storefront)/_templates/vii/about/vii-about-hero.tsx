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
  heroImage?: string;
  overline: string;
  heading: string;
};

export function ViiAboutHero({ heroImage, overline, heading }: Props) {
  const { shown, reduced } = useViiHeroMotion();
  const hasImage = !!heroImage?.trim();

  return (
    <section
      aria-label="About"
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
        {hasImage ? (
          <Image
            src={heroImage ?? "/fallback"}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(160deg, var(--vii-navy) 0%, var(--vii-slate) 100%)",
            }}
          />
        )}
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
        {overline && (
          <ViiOverline
            align="left"
            tone="dark"
            style={{ marginBottom: 16, ...heroRevealStyle(shown, reduced, 0) }}
          >
            {overline}
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
          {heading}
        </h1>
      </div>
    </section>
  );
}
