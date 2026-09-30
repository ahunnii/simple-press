"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultAboutPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import { resolveFields } from "..";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

function useScrollReveal(threshold = 0.12) {
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

export function ElegantAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const [shown, setShown] = useState(false);
  const story = useScrollReveal();
  const values = useScrollReveal();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, [
    "elegant.about.hero-image",
    "elegant.about.hero-title",
    "elegant.about.hero-subtitle",
    "elegant.about.hero-label",
    "elegant.about.story-label",
    "elegant.about.story-heading",
    "elegant.about.story-body",
    "elegant.about.story-image",
    "elegant.about.story-button-text",
    "elegant.about.story-button-link",
    "elegant.about.mission",
    "elegant.about.mission-heading",
    "elegant.about.vision",
    "elegant.about.vision-heading",
  ]);

  const heroTitle = f["elegant.about.hero-title"] ?? "";
  const heroSubtitle = f["elegant.about.hero-subtitle"] ?? "";
  const heroImage = f["elegant.about.hero-image"] ?? "";
  const heroLabel = f["elegant.about.hero-label"] ?? "";
  const storyLabel = f["elegant.about.story-label"] ?? "";
  const storyHeading = f["elegant.about.story-heading"] ?? "";
  const storyBody = f["elegant.about.story-body"] ?? "";
  const storyImage = f["elegant.about.story-image"] ?? "";
  const storyButtonText = f["elegant.about.story-button-text"] ?? "";
  // An invalid saved URL is scrubbed to "" by resolveFields; fall back to "/contact".
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const storyButtonLink = f["elegant.about.story-button-link"] || "/contact";
  const mission = f["elegant.about.mission"] ?? "";
  const missionHeading = f["elegant.about.mission-heading"] ?? "";
  const vision = f["elegant.about.vision"] ?? "";
  const visionHeading = f["elegant.about.vision-heading"] ?? "";

  const showStory = isSectionVisible(customFields, "elegant", "about.story");
  const showValues = isSectionVisible(customFields, "elegant", "about.values");

  const hasHeroImage = !!heroImage && heroImage !== "/placeholder.svg";
  const hasStoryImage = !!storyImage && storyImage !== "/placeholder.svg";

  const maskStyle = (delay: number): React.CSSProperties =>
    reducedMotion
      ? { display: "block" }
      : {
          display: "block",
          transform: shown ? "translateY(0)" : "translateY(110%)",
          transition: `transform 1.1s ${easeOut} ${delay}s`,
        };

  const fadeStyle = (visible: boolean, delay: number): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
        };

  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)" }}>
      {/* ── Hero ── */}
      <section
        {...sectionGroupAttr("about", "hero")}
        style={{ padding: "48px 40px 40px" }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          {heroLabel && (
            <div style={fadeStyle(shown, 0)}>
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}
                {...fieldAttr("elegant.about.hero-label")}
              >
                {heroLabel}
              </span>
            </div>
          )}

          <h1
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(52px, 8.5vw, 118px)",
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              marginTop: 18,
              color: "var(--el-ink, #1c1a17)",
              maxWidth: 900,
            }}
          >
            <span style={{ display: "block", overflow: "hidden" }}>
              <span
                style={maskStyle(0.08)}
                {...fieldAttr("elegant.about.hero-title")}
              >
                {heroTitle}
              </span>
            </span>
          </h1>

          {/* Description paragraph — separate from the heading */}
          {heroSubtitle && (
            <div style={fadeStyle(shown, 0.5)}>
              <p
                style={{
                  marginTop: 32,
                  fontSize: 19,
                  color: "var(--el-ink-soft, #6b6659)",
                  maxWidth: 600,
                  lineHeight: 1.6,
                  fontFamily: "var(--font-sans, sans-serif)",
                }}
                {...fieldAttr("elegant.about.hero-subtitle")}
              >
                {heroSubtitle}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Full-width image ── */}
      {hasHeroImage && (
        <section
          {...sectionGroupAttr("about", "hero")}
          style={{ padding: "0 40px" }}
        >
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <div
              style={{
                ...fadeStyle(shown, 0.4),
                position: "relative",
                width: "100%",
                aspectRatio: "16/7",
                borderRadius: 8,
                overflow: "hidden",
                background: "var(--el-cream-2, #ebe6dc)",
              }}
            >
              <Image
                src={heroImage}
                alt={heroTitle}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Story / editorial ── */}
      {showStory && (
        <section
          ref={story.ref}
          {...sectionGroupAttr("about", "story")}
          style={{
            padding: "80px 40px",
            background: "var(--el-paper, #fbf8f2)",
          }}
        >
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <div
              className="el-about-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.1fr",
                gap: 80,
                alignItems: "center",
              }}
            >
              {/* Left: text */}
              <div style={fadeStyle(story.visible, 0)}>
                {storyLabel && (
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
                    {...fieldAttr("elegant.about.story-label")}
                  >
                    {storyLabel}
                  </span>
                )}
                <h2
                  style={{
                    fontFamily:
                      "var(--font-serif, 'Cormorant Garamond', serif)",
                    fontWeight: 400,
                    fontSize: "clamp(36px, 4.5vw, 56px)",
                    lineHeight: 1.08,
                    letterSpacing: "-0.01em",
                    color: "var(--el-ink, #1c1a17)",
                    marginBottom: 24,
                  }}
                  {...fieldAttr("elegant.about.story-heading")}
                >
                  {storyHeading}
                </h2>
                {storyBody && (
                  <p
                    style={{
                      fontSize: 17,
                      lineHeight: 1.75,
                      color: "var(--el-ink-soft, #6b6659)",
                      fontFamily: "var(--font-sans, sans-serif)",
                      marginBottom: 32,
                      whiteSpace: "pre-line",
                    }}
                    {...fieldAttr("elegant.about.story-body")}
                  >
                    {storyBody}
                  </p>
                )}
                {storyButtonText && (
                  <Link
                    href={storyButtonLink}
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
                      fontFamily: "var(--font-sans, sans-serif)",
                      transition: `background 0.4s ${ease}`,
                    }}
                  >
                    <span {...fieldAttr("elegant.about.story-button-text")}>
                      {storyButtonText}
                    </span>
                    <ArrowRight
                      aria-hidden={true}
                      style={{ width: 14, height: 14 }}
                    />
                  </Link>
                )}
              </div>

              {/* Right: image */}
              <div
                style={{
                  ...fadeStyle(story.visible, 0.15),
                  position: "relative",
                  aspectRatio: "4/5",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "var(--el-cream-2, #ebe6dc)",
                }}
              >
                {hasStoryImage && (
                  <Image
                    src={storyImage}
                    alt={storyHeading}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Mission / Vision ── */}
      {showValues && (mission || vision) && (
        <section
          ref={values.ref}
          {...sectionGroupAttr("about", "values")}
          style={{ padding: "80px 40px" }}
        >
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 48,
              }}
            >
              {mission && (
                <div style={fadeStyle(values.visible, 0)}>
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
                    {...fieldAttr("elegant.about.mission-heading")}
                  >
                    {missionHeading}
                  </span>
                  <p
                    style={{
                      fontFamily:
                        "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontSize: 22,
                      lineHeight: 1.5,
                      color: "var(--el-ink, #1c1a17)",
                      borderLeft: "1px solid var(--el-sage, #4a5240)",
                      paddingLeft: 24,
                    }}
                    {...fieldAttr("elegant.about.mission")}
                  >
                    {mission}
                  </p>
                </div>
              )}
              {vision && (
                <div style={fadeStyle(values.visible, 0.1)}>
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
                    {...fieldAttr("elegant.about.vision-heading")}
                  >
                    {visionHeading}
                  </span>
                  <p
                    style={{
                      fontFamily:
                        "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontSize: 22,
                      lineHeight: 1.5,
                      color: "var(--el-ink, #1c1a17)",
                      borderLeft: "1px solid var(--el-sage, #4a5240)",
                      paddingLeft: 24,
                    }}
                    {...fieldAttr("elegant.about.vision")}
                  >
                    {vision}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
