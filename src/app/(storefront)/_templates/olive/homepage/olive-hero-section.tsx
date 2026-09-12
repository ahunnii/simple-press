"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import {
  hasOliveImage,
  OliveButton,
  OliveLeafMark,
  OliveRevealGroup,
} from "../shared";

type Props = {
  image: string;
  video: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
  bodyFieldKey?: string;
  ctaLabelFieldKey?: string;
};

/**
 * The hero — the template's signature moment.
 *
 * A full-width photograph (or a silent looping video) under a scrim, with the
 * white swatch card pinned into the bottom-left corner: the rivet, the page's
 * one h1, a single line, and the sage button. The photograph settles from
 * 1.04 to 1.0 over 1400ms while the card is dealt in behind it — the card at
 * 180ms and the button at 360ms, both through the shared reveal system so
 * reduced motion and a JS-less first paint are handled in one place.
 *
 * With no photograph and no video the ground is the sage cover itself, which
 * is a designed state rather than an empty rectangle: the white card reads
 * beautifully on it, and nothing about the layout shifts.
 */
export function OliveHeroSection({
  image,
  video,
  heading,
  body,
  ctaLabel,
  ctaHref,
  sectionAttrs,
  headingFieldKey,
  bodyFieldKey,
  ctaLabelFieldKey,
}: Props) {
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [settled, setSettled] = useState(false);

  const hasVideo = video.trim().length > 0;
  const hasPhoto = hasOliveImage(image);
  const hasMedia = hasVideo || hasPhoto;

  // The photograph settles into place on the first painted frame. Skipped
  // entirely under reduced motion, where it is already at rest.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Autoplay is started here rather than through the `autoplay` attribute so
  // that a reduced-motion visitor is left with the poster frame, and so the
  // server-rendered markup never shows a frame the user did not ask for.
  useEffect(() => {
    const element = videoRef.current;
    if (!element || !hasVideo) return;
    if (reduced) {
      element.pause();
      setPlaying(false);
      return;
    }
    void element
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [hasVideo, reduced]);

  const toggleVideo = () => {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) {
      void element
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      element.pause();
      setPlaying(false);
    }
  };

  return (
    <section
      {...sectionAttrs}
      aria-labelledby="olive-hero-heading"
      className="olive-hero relative isolate flex w-full flex-col justify-end overflow-hidden"
      style={{
        backgroundColor: "var(--olive-sage)",
        paddingBlock: "clamp(40px, 7vw, 72px)",
        paddingInline: "var(--olive-section-pad-x)",
      }}
    >
      {/* Ground: video, photograph, or the sage cover itself. */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {/* The settle (1.04 → 1.0) and its reduced-motion guard both live in
            the scoped `.olive-hero-media` rules; this only flips the flag. */}
        <div
          className="olive-hero-media relative h-full w-full"
          data-settled={settled ? "true" : undefined}
        >
          {hasVideo ? (
            <video
              ref={videoRef}
              muted
              loop
              playsInline
              preload="metadata"
              poster={hasPhoto ? image : undefined}
              className="h-full w-full object-cover"
            >
              <source src={video} />
            </video>
          ) : hasPhoto ? (
            <Image
              src={image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : null}
        </div>
      </div>

      {/* Scrim — only over real media, and only ever the measured value. */}
      {hasMedia ? (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundColor: "var(--olive-scrim)" }}
        />
      ) : null}

      {hasVideo ? (
        <button
          type="button"
          onClick={toggleVideo}
          aria-label={playing ? "Pause the hero video" : "Play the hero video"}
          className="olive-icon-btn olive-icon-btn-invert olive-icon-btn-on-photo absolute right-4 bottom-4 z-20"
        >
          {playing ? (
            <Pause aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Play aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      ) : null}

      {/* The swatch card. */}
      <div
        className="relative z-10 mx-auto w-full"
        style={{ maxWidth: "var(--olive-container)" }}
      >
        <OliveRevealGroup>
          <div
            className="olive-reveal-item olive-card flex w-full flex-col items-start gap-4"
            style={
              {
                "--i": 3,
                maxWidth: "480px",
                padding: "clamp(1.5rem, 4vw, 2.25rem)",
                boxShadow: "var(--olive-shadow)",
              } as CSSProperties
            }
          >
            <span
              className="flex items-center"
              style={{ color: "var(--olive-leaf)" }}
            >
              <OliveLeafMark size={20} />
            </span>

            <h1
              id="olive-hero-heading"
              className="olive-h1"
              {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
            >
              {heading}
            </h1>

            {body ? (
              <p
                className="text-[0.9375rem] leading-relaxed"
                style={{ color: "var(--olive-ink-soft)" }}
                {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
              >
                {body}
              </p>
            ) : null}

            {ctaLabel ? (
              <div
                className="olive-reveal-item"
                style={{ "--i": 6 } as CSSProperties}
              >
                <OliveButton
                  variant="primary"
                  size="lg"
                  href={ctaHref}
                  data-sp-field={ctaLabelFieldKey}
                >
                  {ctaLabel}
                </OliveButton>
              </div>
            ) : null}
          </div>
        </OliveRevealGroup>
      </div>
    </section>
  );
}
