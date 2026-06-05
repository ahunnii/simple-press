"use client";

import { useEffect, useRef, useState } from "react";
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
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    if (mq.matches) {
      setVisible(true);
    } else {
      // Tick after mount so the CSS transition runs.
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    }
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
    <section style={{ background: "var(--sl-cream)" }} aria-label="Hero">
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "2rem 1rem 2.5rem",
        }}
      >
        <div className="sl-mosaic py-5">
          {/* Logo / wordmark — top center of the collage */}

          <div className="sl-m-logo">
            {logoUrl ? (
              <div
                style={{
                  position: "relative",
                  width: "min(88%, 360px)",
                  aspectRatio: "5 / 4",
                }}
              >
                <Image
                  src={logoUrl}
                  alt={businessName ?? ""}
                  fill
                  sizes="360px"
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <span
                className="font-heading"
                style={{
                  fontSize: "clamp(3rem, 8vw, 5.5rem)",
                  color: "var(--sl-coral)",
                  lineHeight: 1,
                  textAlign: "center",
                }}
              >
                {businessName ?? "Judy Sledge"}
              </span>
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
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Tagline */}
        <p
          className="font-sans italic"
          style={{
            textAlign: "center",
            fontSize: "clamp(20px, 2.3vw, 30px)",
            color: "var(--sl-ink)",
            letterSpacing: "0.04em",
            fontWeight: 500,
            margin: "2.25rem auto 1.75rem",
          }}
        >
          {resolvedTagline}
        </p>

        {/* CTA — larger than the default sl-btn to match the original hero */}
        <div style={{ textAlign: "center", paddingBottom: "0.5rem" }}>
          <Link
            href={resolvedCtaHref}
            className="sl-btn"
            style={{ fontSize: 17, padding: "16px 46px" }}
          >
            {resolvedCtaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
