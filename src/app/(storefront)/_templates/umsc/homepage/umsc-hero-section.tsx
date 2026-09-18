"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import { UmscButton } from "../shared/umsc-button";
import { hasCustomImage } from "../shared/umsc-image-fallback";

type Props = {
  video?: string;
  image?: string;
  imageAlt?: string;
  headline: string;
  lede: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
};

/**
 * Arms the entrance sequence one frame after mount (so the CSS transition
 * fires instead of the element painting already-settled), and adds the
 * `.umsc-js` gate class to the template root — the same progressive-
 * enhancement contract as `useUmscReveal`. Reduced-motion users skip straight
 * to the settled state.
 */
function useUmscHeroMotion() {
  const [shown, setShown] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.querySelector(".umsc")?.classList.add("umsc-js");
    if (reduced) {
      setShown(true);
      return;
    }
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setShown(true)),
    );
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  return shown;
}

/**
 * UmscHeroSection — the FIRST VIEWPORT and the template's one authored
 * motion moment (design.md "Motion → Hero"). Full-bleed video-with-image-
 * fallback (24s film drift on the image path), static scrim, bottom-anchored
 * content stack with a staggered entrance, and a gold hairline that draws
 * across the bottom edge to hand off to the section below.
 */
export function UmscHeroSection({
  video,
  image,
  imageAlt,
  headline,
  lede,
  primaryLabel,
  primaryUrl,
  secondaryLabel,
  secondaryUrl,
}: Props) {
  const shown = useUmscHeroMotion();
  const hasVideo = !!video?.trim();
  const hasImage = hasCustomImage(image);

  return (
    <section
      aria-label="Hero"
      {...sectionGroupAttr("homepage", "hero")}
      className="umsc-hero relative flex min-h-[calc(100svh-106px)] w-full items-end overflow-hidden bg-[var(--umsc-black)] md:min-h-[calc(100svh-122px)]"
    >
      {/* ── Background media ── */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {hasVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={hasImage ? image : undefined}
            className="absolute inset-0 size-full object-cover"
          >
            <source src={video} type="video/mp4" />
          </video>
        ) : hasImage ? (
          <Image
            src={image!}
            alt=""
            fill
            priority
            className="umsc-hero-film absolute inset-0 size-full object-cover"
            sizes="100vw"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--umsc-gold) 14%, transparent) 0%, transparent 62%), var(--umsc-black)",
            }}
          />
        )}
      </div>

      {/* ── Static readability scrim ── */}
      <div aria-hidden="true" className="umsc-hero-scrim absolute inset-0" />

      {/* ── Content ── */}
      <div className="relative z-[2] mx-auto w-full max-w-[1040px] px-6 pt-[96px] pb-[clamp(44px,8vh,84px)] text-center sm:px-8">
        {headline && (
          <h1
            {...fieldAttr("umsc.homepage.hero-headline")}
            className="umsc-hero-rise umsc-serif text-[clamp(42px,6.4vw,86px)] leading-[1.05] tracking-[0.035em] text-balance text-[var(--umsc-cream-on-black)] uppercase"
            style={{ transitionDelay: "0ms" }}
            data-visible={shown || undefined}
          >
            {headline}
          </h1>
        )}

        {lede && (
          <p
            {...fieldAttr("umsc.homepage.hero-lede")}
            className="umsc-hero-rise umsc-sans mx-auto mt-6 max-w-[560px] text-[18px] leading-[1.6] text-[var(--umsc-cream-on-black)]"
            style={{ transitionDelay: "100ms" }}
            data-visible={shown || undefined}
          >
            {lede}
          </p>
        )}

        {(primaryLabel || secondaryLabel) && (
          <div
            className="umsc-hero-rise mt-9 flex flex-wrap items-center justify-center gap-4"
            style={{ transitionDelay: "200ms" }}
            data-visible={shown || undefined}
          >
            {primaryLabel && (
              <UmscButton
                variant="gold"
                href={primaryUrl}
                fieldKey="umsc.homepage.hero-primary-label"
                showArrow={false}
              >
                {primaryLabel}
              </UmscButton>
            )}
            {secondaryLabel && (
              <UmscButton
                variant="ghost"
                href={secondaryUrl}
                fieldKey="umsc.homepage.hero-secondary-label"
                showArrow={false}
                className="umsc-btn-ghost-onblack"
              >
                {secondaryLabel}
              </UmscButton>
            )}
          </div>
        )}
      </div>

      {/* ── Gold hairline hand-off to the shelf below ── */}
      <div
        aria-hidden="true"
        className="umsc-hero-hairline absolute inset-x-0 bottom-0 z-[2] h-px bg-[var(--umsc-gold)]"
        data-visible={shown || undefined}
      />

      {imageAlt && hasImage ? (
        <span className="sr-only">{imageAlt}</span>
      ) : null}
    </section>
  );
}
