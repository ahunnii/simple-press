"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// The collage places the logo top-center with up to 8 photo tiles around it
// (two tall flanking images + a cluster below). See `.sl-mosaic` in globals.css.
const MAX_TILES = 8;

type ImageEntry = { url: string; altText: string | null };

type SledgeMosaicHeroProps = {
  images: ImageEntry[];
  logoUrl?: string;
  tagline?: string;
  ctaText?: string;
  ctaHref?: string;
  businessName?: string;
};

export function SledgeMosaicHero({
  images,
  logoUrl,
  tagline,
  ctaText,
  ctaHref,
  businessName,
}: SledgeMosaicHeroProps) {
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    if (mq.matches) {
      setVisible(true);
      return;
    }

    // Tick after mount so the CSS transition runs.
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const tiles = images.slice(0, MAX_TILES);
  const resolvedTagline =
    tagline ?? "BE DIFFERENT. BE UNIQUELY YOU. BE OUTRAGEOUS.";
  const resolvedCtaText = ctaText ?? "What's New";
  const resolvedCtaHref = ctaHref ?? "/shop";

  const tileStyle = (i: number): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: visible ? 1 : 0,
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.85) translateY(16px)",
          transition: `opacity 0.55s cubic-bezier(.2,.7,.2,1) ${i * 70}ms, transform 0.55s cubic-bezier(.2,.7,.2,1) ${i * 70}ms`,
        };

  return (
    <section className="bg-[var(--sl-cream)]" aria-label="Hero">
      <div className="sl-container-hero">
        <div className="sl-mosaic py-5">
          {/* Logo / wordmark — top center of the collage */}

          <div className="sl-m-logo">
            {logoUrl ? (
              <>
                {/* M-1: sr-only h1 when logo image is shown (image alt names the brand) */}
                <h1 className="sr-only">{businessName ?? "Judy Sledge"}</h1>
                <div className="sl-logo-frame">
                  <Image
                    src={logoUrl}
                    alt={businessName ?? ""}
                    fill
                    sizes="360px"
                    className="object-contain"
                    priority
                  />
                </div>
              </>
            ) : (
              /* M-1: visible wordmark is the h1 */
              <h1 className="sl-hero-wordmark font-heading">
                {businessName ?? "Judy Sledge"}
              </h1>
            )}
          </div>

          {/* Photo tiles — always render all MAX_TILES slots so the grid has no holes */}
          {Array.from({ length: MAX_TILES }, (_, i) => {
            const img = tiles[i];
            return (
              <div
                key={i}
                className={`sl-m-tile sl-m-${i}`}
                style={tileStyle(i)}
              >
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt={img.altText ?? ""}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Tagline */}
        <p className="sl-hero-tagline font-sans italic">{resolvedTagline}</p>

        {/* CTA — larger than the default sl-btn to match the original hero */}
        <div className="sl-hero-cta-wrap">
          <Link href={resolvedCtaHref} className="sl-btn sl-btn-hero">
            {resolvedCtaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
