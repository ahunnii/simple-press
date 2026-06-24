"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  overline: string;
  heading: string;
  headingAccent: string;
  body: string;
  videoSrc?: string;
  posterSrc?: string;
  ctaText: string;
  ctaHref: string;
};

export function ViiVideoFeature({
  overline,
  heading,
  headingAccent,
  body,
  videoSrc,
  posterSrc,
  ctaText,
  ctaHref,
}: Props) {
  const { ref: textRef, visible: textVisible } = useViiReveal(0.1);
  const { ref: mediaRef, visible: mediaVisible } = useViiReveal(0.1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  const hasVideo = !!videoSrc?.trim();
  const hasPoster = !!posterSrc?.trim();
  if (!hasVideo && !hasPoster) return null;

  const startVideo = () => {
    setPlaying(true);
    // Defer so the <video> is mounted before we call play().
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => undefined);
    });
  };

  return (
    <section
      aria-labelledby="vii-video-heading"
      style={{
        background: "var(--vii-navy)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div
        className="vii-video-grid"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "clamp(32px, 5vw, 72px)",
          alignItems: "center",
        }}
      >
        {/* ── Text column ── */}
        <div
          ref={textRef}
          className={`vii-reveal${textVisible ? " is-visible" : ""}`}
        >
          {overline && (
            <ViiOverline tone="dark" style={{ marginBottom: 16 }}>
              {overline}
            </ViiOverline>
          )}

          {(heading || headingAccent) && (
            <h2
              id="vii-video-heading"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(30px, 4.4vw, 56px)",
                lineHeight: 1.08,
                color: "var(--vii-paper)",
                margin: 0,
              }}
            >
              {heading}
              {heading && headingAccent ? " " : ""}
              {headingAccent && (
                <em
                  style={{
                    fontStyle: "italic",
                    color: "var(--vii-copper-light)",
                  }}
                >
                  {headingAccent}
                </em>
              )}
            </h2>
          )}

          {body && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.75,
                color: "var(--vii-paper)",
                opacity: 0.82,
                maxWidth: 480,
                margin: "24px 0 0",
              }}
            >
              {body}
            </p>
          )}

          {ctaText && (
            <div style={{ marginTop: "clamp(28px, 4vw, 40px)" }}>
              <Link
                href={ctaHref}
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: "var(--vii-paper)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--vii-copper-light)",
                  paddingBottom: 4,
                }}
              >
                {ctaText}
              </Link>
            </div>
          )}
        </div>

        {/* ── Media column ── */}
        <div
          ref={mediaRef}
          className={`vii-reveal${mediaVisible ? " is-visible" : ""}`}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4 / 3",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            background: "var(--vii-slate)",
          }}
        >
          {playing && hasVideo ? (
            <video
              ref={videoRef}
              controls
              playsInline
              poster={posterSrc?.trim() ? posterSrc : undefined}
              autoPlay={!reducedMotion}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          ) : (
            <>
              {hasPoster && (
                <Image
                  src={posterSrc!}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: "cover" }}
                />
              )}
              {hasVideo && (
                <button
                  type="button"
                  onClick={startVideo}
                  aria-label="Play video"
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "color-mix(in srgb, var(--vii-navy) 25%, transparent)",
                    border: "none",
                    cursor: "pointer",
                  }}
                  className="vii-video-play"
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background:
                        "color-mix(in srgb, var(--vii-paper) 92%, transparent)",
                      color: "var(--vii-navy)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Play
                      style={{ width: 24, height: 24, marginLeft: 4 }}
                      fill="currentColor"
                    />
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .vii-video-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .vii-video-play {
          transition: background 0.3s ease;
        }
        .vii-video-play:hover,
        .vii-video-play:focus-visible {
          background: color-mix(in srgb, var(--vii-navy) 10%, transparent);
        }
      `}</style>
    </section>
  );
}
