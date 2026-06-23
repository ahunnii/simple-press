"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

type Props = {
  heroVideo?: string;
  heroImage?: string;
  heroOverline: string;
  heroHeading: string;
  heroCtaText: string;
  heroCtaLink: string;
};

export function ViiHeroSection({
  heroVideo,
  heroImage,
  heroOverline,
  heroHeading,
  heroCtaText,
  heroCtaLink,
}: Props) {
  const [videoPaused, setVideoPaused] = useState(false);
  const [shown, setShown] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Honour prefers-reduced-motion: pause video immediately
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setVideoPaused(true);
      videoRef.current?.pause();
    }
  }, []);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
      setVideoPaused(false);
    } else {
      video.pause();
      setVideoPaused(true);
    }
  };

  const hasVideo = !!heroVideo?.trim();
  const hasImage = !!heroImage?.trim();

  const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";

  // Only animate when motion is allowed — detect via CSS media query flag
  // We assume reduced motion was checked in the useEffect above;
  // for the enter animation we just gate on `shown`.
  const revealStyle = (delay: number): React.CSSProperties => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
  });

  return (
    <section
      aria-label="Hero"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
        background: "var(--vii-navy)",
      }}
    >
      {/* ── Background media ── */}
      {hasVideo ? (
        <>
          <video
            ref={videoRef}
            autoPlay={!videoPaused}
            muted
            loop
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            aria-hidden="true"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          {/* Pause / play button */}
          <button
            type="button"
            onClick={toggleVideo}
            aria-label={
              videoPaused ? "Play background video" : "Pause background video"
            }
            style={{
              position: "absolute",
              bottom: 24,
              right: 24,
              zIndex: 20,
              width: 44,
              height: 44,
              borderRadius: "50%",
              background:
                "color-mix(in srgb, var(--vii-paper) 18%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--vii-paper) 40%, transparent)",
              color: "var(--vii-paper)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          >
            {videoPaused ? (
              <Play aria-hidden={true} style={{ width: 14, height: 14 }} />
            ) : (
              <Pause aria-hidden={true} style={{ width: 14, height: 14 }} />
            )}
          </button>
        </>
      ) : hasImage ? (
        <Image
          src={heroImage!}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      ) : (
        // Navy gradient fallback
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(160deg, var(--vii-navy) 0%, var(--vii-slate) 100%)",
          }}
        />
      )}

      {/* ── Dark overlay scrim ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) 82%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 25%, transparent) 60%, color-mix(in srgb, var(--vii-navy) 10%, transparent) 100%)",
          zIndex: 1,
        }}
      />

      {/* ── Content ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 clamp(24px, 6vw, 96px) clamp(56px, 8vh, 96px)",
          maxWidth: 760,
        }}
      >
        {/* Overline */}
        {heroOverline && (
          <p
            style={{
              ...revealStyle(0),
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--vii-tan)",
              marginBottom: 20,
            }}
          >
            {heroOverline}
          </p>
        )}

        {/* Primary statement — the page's h1 */}
        {heroHeading && (
          <h1
            style={{
              ...revealStyle(0.15),
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(18px, 2.4vw, 28px)",
              lineHeight: 1.55,
              color: "var(--vii-paper)",
              maxWidth: 560,
              marginBottom: 36,
              fontWeight: 300,
            }}
          >
            {heroHeading}
          </h1>
        )}

        {/* CTA */}
        {heroCtaText && (
          <div style={revealStyle(0.3)}>
            <Link
              href={heroCtaLink}
              style={{
                display: "inline-block",
                padding: "14px 32px",
                background: "var(--vii-copper-deep)",
                color: "var(--vii-paper)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textDecoration: "none",
                borderRadius: "var(--radius)",
                transition: "background 0.3s ease, opacity 0.3s ease",
              }}
              className="vii-cta-btn"
            >
              {heroCtaText}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
