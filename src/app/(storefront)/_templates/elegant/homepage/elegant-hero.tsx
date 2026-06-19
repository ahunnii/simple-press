"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Pause, Play } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

type Props = {
  homepage: RouterOutputs["business"]["getHomepage"];
  tagline?: string;
  heroImage?: string;
  heroVideo?: string;
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  heroDescription?: string;
  heroButtonText?: string;
  heroButtonLink?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export function ElegantHero({
  tagline,
  heroImage,
  heroVideo,
  heroTitleLine1,
  heroTitleLine2,
  heroDescription,
  heroButtonText,
  heroButtonLink,
  sectionAttrs,
}: Props) {
  const [shown, setShown] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
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
  const hasImage = !!heroImage?.trim() && heroImage !== "/placeholder.svg";

  const revealStyle = (delay: number): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
        };

  const maskStyle = (delay: number): React.CSSProperties =>
    reducedMotion
      ? { display: "block" }
      : {
          display: "block",
          transform: shown ? "translateY(0)" : "translateY(110%)",
          transition: `transform 1.1s ${easeOut} ${delay}s`,
        };

  return (
    <section
      {...sectionAttrs}
      style={{
        padding: "0 16px",
        marginTop: -100,
        background: "var(--el-cream, #f5f1ea)",
        position: "relative",
      }}
    >
      <div
        className="el-hero-grid"
        style={{
          position: "relative",
          minHeight: "100vh",
          paddingTop: 110,
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 40,
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {/* ── Text column ── */}
        <div style={{ padding: "0 24px 48px 24px" }}>
          {/* Eyebrow */}
          <div style={revealStyle(0)}>
            <span
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 28,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 28,
                  height: 1,
                  background: "currentColor",
                  flexShrink: 0,
                }}
              />
              {tagline ?? "A thoughtful studio"}
            </span>
          </div>

          {/* Display heading with mask-reveal lines */}
          <h1
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(52px, 8.5vw, 118px)",
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              color: "var(--el-ink, #1c1a17)",
            }}
          >
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={maskStyle(0.08)}>
                {heroTitleLine1 ?? "Made with care."}
              </span>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <em style={{ ...maskStyle(0.2), fontStyle: "italic" }}>
                {heroTitleLine2 ?? "Especially for you."}
              </em>
            </span>
          </h1>

          {/* Description */}
          <p
            style={{
              ...revealStyle(0.5),
              marginTop: 32,
              maxWidth: 460,
              fontSize: 17,
              lineHeight: 1.65,
              color: "var(--el-ink-soft, #6b6659)",
              fontFamily: "var(--font-sans, sans-serif)",
            }}
          >
            {heroDescription ?? "Explore our collection."}
          </p>

          {/* CTAs */}
          <div
            style={{
              ...revealStyle(0.65),
              marginTop: 36,
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Link
              href={heroButtonLink ?? "/shop"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 26px",
                borderRadius: 999,
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                background: "var(--el-ink, #1c1a17)",
                color: "var(--el-paper, #fbf8f2)",
                textDecoration: "none",
                transition: `background 0.4s ${ease}, transform 0.4s ${ease}`,
                fontFamily: "var(--font-sans, sans-serif)",
              }}
              className="el-btn-primary"
            >
              {heroButtonText ?? "Shop Now"}
              <ArrowRight
                aria-hidden={true}
                style={{ width: 14, height: 14 }}
              />
            </Link>
            <Link
              href="/about"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 26px",
                borderRadius: 999,
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                background: "transparent",
                color: "var(--el-ink, #1c1a17)",
                border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                textDecoration: "none",
                transition: `background 0.4s ${ease}, color 0.4s ${ease}`,
                fontFamily: "var(--font-sans, sans-serif)",
              }}
              className="el-btn-ghost"
            >
              Our story
            </Link>
          </div>
        </div>

        {/* ── Visual column ── */}
        <div
          style={{
            position: "relative",
            height: "min(82vh, 760px)",
            padding: "0 24px",
          }}
        >
          {/* Main hero media */}
          <div
            style={{
              ...revealStyle(0.3),
              position: "absolute",
              top: "4%",
              left: "8%",
              right: "8%",
              bottom: "10%",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--el-cream-2, #ebe6dc)",
            }}
          >
            {hasVideo ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
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
                >
                  <source src={heroVideo} type="video/mp4" />
                </video>
                <button
                  type="button"
                  onClick={toggleVideo}
                  aria-label={videoPaused ? "Play video" : "Pause video"}
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    zIndex: 10,
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: "rgba(251,248,242,0.85)",
                    border: "1px solid rgba(28,26,23,0.12)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--el-ink, #1c1a17)",
                  }}
                  className="el-video-toggle"
                >
                  {videoPaused ? (
                    <Play
                      aria-hidden={true}
                      style={{ width: 13, height: 13 }}
                    />
                  ) : (
                    <Pause
                      aria-hidden={true}
                      style={{ width: 13, height: 13 }}
                    />
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
                style={{ transition: `transform 1.2s ${ease}` }}
              />
            ) : null}
          </div>

          {/* Floating scroll indicator */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "4%",
              transform: "translateX(-50%)",
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              ...revealStyle(0.9),
            }}
          >
            Scroll
            <span
              className="el-scroll-pulse-line"
              style={{
                display: "block",
                width: 1,
                height: 36,
                background:
                  "linear-gradient(180deg, var(--el-ink-soft, #6b6659), transparent)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
