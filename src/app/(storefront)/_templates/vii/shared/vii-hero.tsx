"use client";

/**
 * ViiHero — unified full-bleed hero for the vii storefront template.
 *
 * DESIGNED TO REPLACE (after prop-threaded migration at each call-site):
 *
 *   ViiAboutHero (about/vii-about-hero.tsx)
 *     All prop defaults apply. Pass: aria-label="About"
 *
 *   ViiContactHero (contact/vii-contact-hero.tsx)
 *     Pass: minHeight="clamp(340px, 46vw, 560px)"  aria-label="Contact"
 *
 *   ViiBlogPostHero (blog/vii-blog-post-hero.tsx)
 *     Pass: contentMaxWidth={820}  aria-label={title}
 *           imageObjectPosition="center 30%"
 *           overline={`Blog · ${formatDate(createdAt)}`}
 *           headingStyle={{ fontSize: "clamp(36px, 6vw, 80px)", lineHeight: 1.05,
 *                           letterSpacing: "-0.01em", textWrap: "balance" }}
 *
 *   ViiGenericCoverHero (generic/vii-generic-cover-hero.tsx)
 *     All prop defaults apply. Pass: aria-label={title || "Page"}
 *     Excerpt: pass as children. The original excerpt uses heroRevealStyle(delay=0.3)
 *     + opacity 0.82 when shown. Children lack access to internal `shown` state — either
 *     call useViiHeroMotion() in the excerpt component, or accept static opacity.
 *
 *   ViiHeroSection (homepage/vii-hero-section.tsx) — most differences:
 *     Pass: minHeight="100dvh"
 *           scrimVariant="homepage"
 *           contentPaddingBottom="clamp(56px, 8vh, 96px)"
 *           overlineMarginBottom={20}
 *           headingStyle={{ fontFamily: "var(--font-sans)", fontSize: "clamp(18px, 2.4vw, 28px)",
 *                           lineHeight: 1.55, maxWidth: 560, marginBottom: 36, fontWeight: 300 }}
 *           video={heroVideo}  videoRef={ref}  image={heroImage}
 *           controls={<PausePlayButton videoRef={ref} />}
 *           children={<animated CTA link>}
 *     Note: ViiHero renders a plain autoplay/muted/loop <video>. The homepage's
 *     reduced-motion pause logic must live in the caller; use videoRef to get the element.
 *
 * SCRIM DIFFERENCES:
 *   "default"  (about, contact, blog, generic) → 82%@0% / 30%@55% / 12%@100%
 *   "homepage" (homepage)                      → uses CSS vars:
 *              var(--vii-scrim-strong)@0% / var(--vii-scrim-medium)@60% / var(--vii-scrim-soft)@100%
 *              resolved values: 82% / 25% / 10%
 */

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";

import {
  heroHeadingStyle,
  heroMediaStyle,
  heroRevealStyle,
  useViiHeroMotion,
} from "../hooks/use-vii-hero-motion";
import { ViiOverline } from "./vii-overline";

export type ViiHeroProps = {
  /** The page's primary h1 text. */
  heading: string;
  /** Accessible name for the <section>. Defaults to "Hero". */
  "aria-label"?: string;
  /**
   * Background video URL. Rendered as autoplay / muted / loop.
   * Takes precedence over `image`. Pass videoRef to control it externally.
   */
  video?: string;
  /**
   * Ref forwarded to the <video> element so the caller can manage pause/play
   * state without baking it into ViiHero. Ignored when `video` is not provided.
   */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  /** Background image URL. Used when no `video` is provided. */
  image?: string;
  /**
   * CSS object-position for the background image.
   * Blog post heroes use "center 30%". Defaults to browser default (center).
   */
  imageObjectPosition?: string;
  /** Short kicker rendered above the heading via ViiOverline. */
  overline?: string;
  /**
   * ViiOverline colour tone.
   * Defaults to "dark" (used on navy media backgrounds across all existing heroes).
   */
  overlineTone?: "light" | "dark";
  /**
   * Bottom margin applied below the overline wrapper.
   * Defaults to 16 (about / contact / blog / generic).
   * Homepage uses 20.
   */
  overlineMarginBottom?: number;
  /**
   * Section min-height.
   * Default: "clamp(360px, 52vw, 620px)" — about / blog / generic.
   * Contact: "clamp(340px, 46vw, 560px)". Homepage: "100dvh".
   */
  minHeight?: string;
  /**
   * Content column max-width.
   * Default: 760 (about / contact / generic / homepage).
   * Blog post: 820.
   */
  contentMaxWidth?: number | string;
  /**
   * Bottom padding of the content column.
   * Default: "clamp(48px, 7vh, 88px)" (about / contact / blog / generic).
   * Homepage: "clamp(56px, 8vh, 96px)".
   */
  contentPaddingBottom?: string;
  /**
   * Inline styles merged onto the <h1> after animation props and default typography.
   * Override fontFamily / fontSize / lineHeight / fontWeight / etc. per call-site.
   *
   * Default (used by about / contact / generic):
   *   font-serif, 400, clamp(40px,6vw,80px), lineHeight 1.02, color var(--vii-paper), margin 0
   *
   * Blog post differs: fontSize clamp(36px,6vw,80px), lineHeight 1.05, letterSpacing -0.01em, textWrap balance
   * Homepage differs:  fontFamily var(--font-sans), fontSize clamp(18px,2.4vw,28px),
   *                    lineHeight 1.55, fontWeight 300, maxWidth 560, marginBottom 36
   */
  headingStyle?: CSSProperties;
  /**
   * Scrim gradient variant.
   *   "default"  → 82%@0% / 30%@55% / 12%@100%  (about, contact, blog, generic)
   *   "homepage" → uses --vii-scrim-strong/medium/soft vars → 82%@0% / 25%@60% / 10%@100%
   */
  scrimVariant?: "default" | "homepage";
  /**
   * Content rendered below the <h1> inside the content stack.
   * Use for CTAs, excerpt paragraphs, publication meta, etc.
   */
  children?: ReactNode;
  /**
   * Absolutely-positioned overlay slot rendered as a direct child of the <section>
   * (which is position:relative). Callers must provide position:absolute and a
   * z-index ≥ 20 on the root element to clear the scrim layer.
   * Intended for the homepage pause/play button.
   */
  controls?: ReactNode;
  /** Extra data attributes (e.g. `data-sp-group`) spread onto the root `<section>` for the preview overlay. */
  sectionAttrs?: Record<string, string>;
  /** Full template field key for `overline`, when it's a live-patchable field. */
  overlineFieldKey?: string;
  /** Full template field key for `heading`, when it's a live-patchable field. */
  headingFieldKey?: string;
};

const DEFAULT_HEADING_STYLE: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontWeight: 400,
  fontSize: "clamp(40px, 6vw, 80px)",
  lineHeight: 1.02,
  color: "var(--vii-paper)",
  margin: 0,
};

export function ViiHero({
  heading,
  "aria-label": ariaLabel = "Hero",
  video,
  videoRef,
  image,
  imageObjectPosition,
  overline,
  overlineTone = "dark",
  overlineMarginBottom = 16,
  minHeight = "clamp(360px, 52vw, 620px)",
  contentMaxWidth = 760,
  contentPaddingBottom = "clamp(48px, 7vh, 88px)",
  headingStyle,
  scrimVariant = "default",
  children,
  controls,
  sectionAttrs,
  overlineFieldKey,
  headingFieldKey,
}: ViiHeroProps) {
  const { shown, reduced } = useViiHeroMotion();

  const hasVideo = !!video?.trim();
  const hasImage = !!image?.trim();

  const scrimBackground =
    scrimVariant === "homepage"
      ? "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) var(--vii-scrim-strong), transparent) 0%, color-mix(in srgb, var(--vii-navy) var(--vii-scrim-medium), transparent) 60%, color-mix(in srgb, var(--vii-navy) var(--vii-scrim-soft), transparent) 100%)"
      : "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) var(--vii-scrim-strong), transparent) 0%, color-mix(in srgb, var(--vii-navy) 30%, transparent) 55%, color-mix(in srgb, var(--vii-navy) 12%, transparent) 100%)";

  return (
    <section
      aria-label={ariaLabel}
      {...sectionAttrs}
      style={{
        position: "relative",
        width: "100%",
        minHeight,
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
        {hasVideo ? (
          <video
            ref={videoRef ?? null}
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
            aria-hidden="true"
          >
            <source src={video} type="video/mp4" />
          </video>
        ) : hasImage ? (
          <Image
            src={image ?? "/fallback"}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{
              objectFit: "cover",
              objectPosition: imageObjectPosition,
            }}
          />
        ) : (
          // Navy-to-slate gradient fallback when no media is provided
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
          background: scrimBackground,
          zIndex: 1,
        }}
      />

      {/* Controls overlay slot — e.g. the homepage pause/play button.
          Must include position:absolute and zIndex ≥ 20 to clear the scrim.
          Rendered as a direct child of the section (position:relative) so
          absolute positioning resolves relative to the section bounds. */}
      {controls}

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: `0 clamp(24px, 6vw, 96px) ${contentPaddingBottom}`,
          maxWidth: contentMaxWidth,
        }}
      >
        {overline && (
          <ViiOverline
            align="left"
            tone={overlineTone}
            style={{
              marginBottom: overlineMarginBottom,
              ...heroRevealStyle(shown, reduced, 0),
            }}
            fieldKey={overlineFieldKey}
          >
            {overline}
          </ViiOverline>
        )}

        <h1
          {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
          style={{
            ...heroHeadingStyle(shown, reduced),
            ...DEFAULT_HEADING_STYLE,
            ...headingStyle,
          }}
        >
          {heading}
        </h1>

        {children}
      </div>
    </section>
  );
}
