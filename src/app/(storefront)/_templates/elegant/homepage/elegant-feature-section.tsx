"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Pause, Play } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DEFAULT_ELEGANT_ABOUT_FEATURES } from "..";

type Props = {
  homepage: RouterOutputs["business"]["getHomepage"];
  aboutTitle?: string;
  aboutText?: string;
  aboutVideo?: string;
  aboutImage?: string;
  aboutTagline?: string;
  /** Spread on root <section> for preview overlay hotspot (homepage.about). */
  sectionAttrs?: Record<string, string>;
};

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export function ElegantFeatureSection({
  homepage,
  aboutTitle,
  aboutText,
  aboutTagline,
  aboutVideo,
  aboutImage,
  sectionAttrs,
}: Props) {
  const { ref, visible } = useReveal();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(false);

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

  const hasVideo = !!aboutVideo?.trim();
  const hasImage =
    !!aboutImage?.trim() && aboutImage !== "/placeholder.svg";

  const featureCards = parseTemplateIconListRows(
    getListFieldValue(
      homepage?.siteContent?.customFields,
      "elegant.homepage.about-features-list",
    ),
    DEFAULT_ELEGANT_ABOUT_FEATURES,
  );

  const revealStyle = (delay: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
  });

  return (
    <section
      {...sectionAttrs}
      style={{
        padding: "80px 40px",
        background: "var(--el-paper, #fbf8f2)",
      }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div
          ref={ref}
          className="el-editorial-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: 80,
            alignItems: "center",
          }}
        >
          {/* Left: media */}
          <div
            style={{
              ...revealStyle(0),
              position: "relative",
              aspectRatio: "4/5",
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
                  <source src={aboutVideo} type="video/mp4" />
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
                  {videoPaused
                    ? <Play aria-hidden={true} style={{ width: 13, height: 13 }} />
                    : <Pause aria-hidden={true} style={{ width: 13, height: 13 }} />}
                </button>
              </>
            ) : hasImage ? (
              <Image
                src={aboutImage!}
                fill
                className="object-cover"
                alt="About"
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ transition: `transform 1.2s ${ease}` }}
              />
            ) : null}
          </div>

          {/* Right: text + feature cards */}
          <div>
            <div style={revealStyle(0.1)}>
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                  display: "block",
                  marginBottom: 16,
                }}
              >
                {aboutTagline ?? "About Us"}
              </span>
            </div>

            <div style={revealStyle(0.18)}>
              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontWeight: 400,
                  fontSize: "clamp(36px, 4.5vw, 60px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.01em",
                  marginBottom: 24,
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                {aboutTitle ?? "About Us"}
              </h2>
            </div>

            <div style={revealStyle(0.26)}>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.7,
                  color: "var(--el-ink-soft, #6b6659)",
                  marginBottom: 32,
                  maxWidth: 520,
                  fontFamily: "var(--font-sans, sans-serif)",
                }}
              >
                {aboutText}
              </p>
            </div>

            {/* Feature icon cards */}
            {featureCards && featureCards.length > 0 && (
              <div
                {...sectionGroupAttr("homepage", "features")}
                style={{
                  ...revealStyle(0.34),
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 32,
                }}
              >
                {featureCards.map((feature) => (
                  <div
                    key={feature.title}
                    style={{
                      background: "var(--el-cream, #f5f1ea)",
                      borderRadius: 8,
                      padding: "18px 20px",
                      border: "1px solid var(--el-line-2, rgba(28,26,23,0.06))",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                      }}
                    >
                      <feature.icon
                        style={{
                          width: 20,
                          height: 20,
                          color: "var(--el-sage, #4a5240)",
                        }}
                        strokeWidth={1.5}
                      />
                    </div>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        marginBottom: 4,
                        color: "var(--el-ink, #1c1a17)",
                        fontFamily: "var(--font-sans, sans-serif)",
                      }}
                    >
                      {feature.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--el-ink-soft, #6b6659)",
                        lineHeight: 1.5,
                        fontFamily: "var(--font-sans, sans-serif)",
                      }}
                    >
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div style={revealStyle(0.42)}>
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
                  fontFamily: "var(--font-sans, sans-serif)",
                  transition: `background 0.4s ${ease}, color 0.4s ${ease}`,
                }}
                className="el-btn-ghost"
              >
                Read our story
                <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
              </Link>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
