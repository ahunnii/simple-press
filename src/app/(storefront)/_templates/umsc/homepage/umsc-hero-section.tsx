"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

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

/** Session key for a visitor's explicit pause/play choice on the hero video. */
const UMSC_HERO_VIDEO_CHOICE_KEY = "umsc-hero-video";

type VideoChoice = "play" | "pause";

function readVideoChoice(): VideoChoice | null {
  try {
    const value = window.sessionStorage.getItem(UMSC_HERO_VIDEO_CHOICE_KEY);
    return value === "play" || value === "pause" ? value : null;
  } catch {
    return null;
  }
}

function writeVideoChoice(choice: VideoChoice) {
  try {
    window.sessionStorage.setItem(UMSC_HERO_VIDEO_CHOICE_KEY, choice);
  } catch {
    // Storage blocked (private mode etc.) — the choice just won't persist.
  }
}

/**
 * Drives the hero background video (WCAG 2.2.2 Pause, Stop, Hide):
 * - No `autoPlay` attribute — playback starts here, only after the
 *   reduced-motion preference and any saved choice are known, so a
 *   reduced-motion visitor never sees a frame of motion (the poster shows).
 * - A visitor's pause/play choice persists for the session.
 * - Pauses while the hero is off screen or the tab is hidden, resuming
 *   only if the visitor still wants it playing.
 * The video stays muted: it's decoration, never a soundtrack.
 */
function useUmscHeroVideo(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  // `null` until mounted — nothing plays before the preference is read.
  const [wantsPlay, setWantsPlay] = useState<boolean | null>(null);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const choice = readVideoChoice();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setWantsPlay(choice ? choice === "play" : !reduced);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { threshold: 0 },
    );
    observer.observe(section);
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || wantsPlay === null) return;
    if (wantsPlay && inView && pageVisible) {
      // Autoplay can still be refused (e.g. iOS Low Power Mode) — fall back
      // to the paused state so the button offers Play.
      video.play().catch(() => setWantsPlay(false));
    } else {
      video.pause();
    }
  }, [wantsPlay, inView, pageVisible]);

  const toggle = useCallback(() => {
    setWantsPlay((current) => {
      const next = !current;
      writeVideoChoice(next ? "play" : "pause");
      return next;
    });
  }, []);

  return { videoRef, sectionRef, paused: wantsPlay !== true, toggle };
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
  const {
    videoRef,
    sectionRef,
    paused: videoPaused,
    toggle: toggleVideo,
  } = useUmscHeroVideo(hasVideo);

  return (
    <section
      ref={sectionRef}
      aria-label="Hero"
      {...sectionGroupAttr("homepage", "hero")}
      className="umsc-hero relative flex min-h-[calc(100svh-106px)] w-full items-end overflow-hidden bg-[var(--umsc-black)] md:min-h-[calc(100svh-122px)]"
    >
      {/* ── Background media ── */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {hasVideo ? (
          <video
            ref={videoRef}
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

      {/* ── Pause / play (WCAG 2.2.2) — outside the aria-hidden media layer ── */}
      {hasVideo && (
        <button
          type="button"
          onClick={toggleVideo}
          aria-label={
            videoPaused ? "Play background video" : "Pause background video"
          }
          className="absolute right-4 bottom-4 z-[3] flex size-11 items-center justify-center rounded-full border border-[var(--umsc-line-gold)] bg-[color-mix(in_srgb,var(--umsc-black)_55%,transparent)] text-[var(--umsc-cream-on-black)] backdrop-blur-sm transition-colors hover:border-[var(--umsc-gold)] hover:text-[var(--umsc-gold-soft)] sm:right-6 sm:bottom-6"
        >
          {videoPaused ? (
            <Play aria-hidden="true" className="size-4 translate-x-px" />
          ) : (
            <Pause aria-hidden="true" className="size-4" />
          )}
        </button>
      )}

      {/* ── Static readability scrim ── */}
      <div aria-hidden="true" className="umsc-hero-scrim absolute inset-0" />

      {/* ── Content ── */}
      <div className="relative z-[2] mx-auto w-full max-w-[1280px] px-6 pt-[96px] pb-[clamp(44px,8vh,84px)] text-center sm:px-8">
        {headline && (
          <h1
            {...fieldAttr("umsc.homepage.hero-headline")}
            className="umsc-hero-rise umsc-serif text-[clamp(32px,4.6vw,64px)] leading-[1.08] tracking-[0.035em] text-balance text-[var(--umsc-cream-on-black)] uppercase"
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

        {/* PF10 (B2.5): each button is hidden individually when its own
            href's flag is off (hero.tsx-props already resolve `primaryUrl`/
            `secondaryUrl` through `navHrefFlag`, blanking a gated href) —
            never swap in another destination. */}
        {((primaryLabel && primaryUrl) || (secondaryLabel && secondaryUrl)) && (
          <div
            className="umsc-hero-rise mt-9 flex flex-wrap items-center justify-center gap-4"
            style={{ transitionDelay: "200ms" }}
            data-visible={shown || undefined}
          >
            {primaryLabel && primaryUrl && (
              <UmscButton
                variant="gold"
                href={primaryUrl}
                fieldKey="umsc.homepage.hero-primary-label"
                showArrow={false}
              >
                {primaryLabel}
              </UmscButton>
            )}
            {secondaryLabel && secondaryUrl && (
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
