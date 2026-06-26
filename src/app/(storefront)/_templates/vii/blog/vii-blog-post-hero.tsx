"use client";

import Image from "next/image";

import { formatDate } from "~/lib/utils";

import {
  heroHeadingStyle,
  heroMediaStyle,
  heroRevealStyle,
  useViiHeroMotion,
} from "../hooks/use-vii-hero-motion";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  image?: string;
  title: string;
  createdAt: Date;
};

export function ViiBlogPostHero({ image, title, createdAt }: Props) {
  const { shown, reduced } = useViiHeroMotion();
  const hasImage = !!image?.trim();

  return (
    <section
      aria-label={title}
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
      {/* Background media — Ken-Burns scale-settle, clipped by overflow:hidden */}
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
            src={image!}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: "center 30%" }}
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

      {/* Content — bottom-left aligned */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 clamp(24px, 6vw, 96px) clamp(48px, 7vh, 88px)",
          maxWidth: 820,
        }}
      >
        <ViiOverline
          align="left"
          tone="dark"
          style={{ marginBottom: 16, ...heroRevealStyle(shown, reduced, 0) }}
        >
          {`Blog · ${formatDate(createdAt)}`}
        </ViiOverline>

        <h1
          style={{
            ...heroHeadingStyle(shown, reduced, 0.15),
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            // Larger ceiling than the cream masthead (72px) — this h1 sits over a dark photo.
            fontSize: "clamp(36px, 6vw, 80px)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "var(--vii-paper)",
            margin: 0,
            textWrap: "balance",
          }}
        >
          {title}
        </h1>
      </div>
    </section>
  );
}
