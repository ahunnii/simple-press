"use client";

import type { CSSProperties, FocusEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import {
  hasOliveImage,
  OliveButton,
  OliveLeafMark,
  OliveRevealGroup,
} from "../shared";

type Props = {
  images: string[];
  video: string;
  showCard: boolean;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
  bodyFieldKey?: string;
  ctaLabelFieldKey?: string;
};

/** Autoplay dwell per photograph. Long enough to be looked at, not read. */
const AUTOPLAY_MS = 6000;
/** Must stay in step with the `olive-swatch-turn` keyframes in globals.css. */
const SWATCH_TURN_MS = 520;

/**
 * The hero — the template's signature moment.
 *
 * A full-width photograph (or a silent looping video) under a scrim, with the
 * white swatch card pinned into the bottom-left corner: the rivet, the page's
 * one h1, a single line, and the sage button.
 *
 * The load moment is the cover opening. The photograph settles from 1.04 to
 * 1.0 over 1400ms; on that same first painted frame a sage-tinted leaf edge
 * sweeps across the scrim left to right over 600ms — the swatch turn's band,
 * borrowed — and the white card is dealt in its wake. Inside the card the
 * print then arrives one piece at a time on a hero-only 110ms cadence: leaf
 * mark, headline, line, button. All of it rides the shared reveal system, so
 * reduced motion and a JS-less first paint are handled in one place; the
 * sweep itself is mounted off `settled`, so it is never server-painted.
 *
 * With two or more photographs the hero turns between them on its own. The
 * transition is olive's swatch turn — the same wipe and the same travelling
 * leaf edge the product gallery uses for a colour change — rather than a
 * crossfade or a slide: olive's world is the swatch book, so the one gesture
 * for "the next picture" is a leaf being turned, and reusing it keeps the
 * carousel reading as the template's own hand instead of added chrome. The
 * mechanics are the gallery's, kept deliberately identical:
 *
 * - `turns` starts at 0 and is only ever raised by a real change of index, so
 *   the first render — server and client alike — is one plain, unclipped
 *   image. The leading photograph carries `priority` and is the page's LCP
 *   element; a clip-path animation with `both` fill would paint it clipped.
 * - The stage is raised *during render* (React's "adjust state when something
 *   changes" pattern), never in an effect, so the incoming leaf carries its
 *   wipe class on its very first mounted frame instead of flashing unclipped.
 * - The covered leaf stays mounted and opaque underneath for the length of
 *   the wipe, because a swatch book never shows the counter between leaves.
 *
 * One `userPaused` flag carries every deliberate stop — the disc and a dot
 * pick both set it — and the disc's icon reflects only that. The transient
 * suspensions (mouse hover, focus inside the hero) are separate flags that
 * never touch the icon, because a control that changed under the pointer on
 * its way to being pressed would be lying about what it does.
 *
 * With one photograph `turning` is never true and nothing but the plain image
 * mounts. With a video the photographs stand down entirely — the video wins,
 * and the first photograph becomes its poster frame. With none, the ground is
 * the sage cover itself, which is a designed state rather than an empty
 * rectangle: the white card reads beautifully on it and nothing shifts.
 *
 * The card can be switched off in the editor. The h1 survives as an sr-only
 * heading when it is: the page still needs exactly one h1, and the section's
 * `aria-labelledby` still needs something to point at.
 */
export function OliveHeroSection({
  images,
  video,
  showCard,
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
  /** The video wins outright; nothing carousel-related mounts behind it. */
  const photos = hasVideo ? [] : images;
  const count = photos.length;
  const carousel = count > 1;
  const poster = images[0];
  const hasMedia = hasVideo || images.length > 0;

  /** The requested slide. */
  const [index, setIndex] = useState(0);
  /** Set by the disc and by a dot pick alike — the one deliberate stop. */
  const [userPaused, setUserPaused] = useState(false);
  /** Mouse hover only: a touch tap must not wedge the carousel shut. */
  const [hovered, setHovered] = useState(false);
  /** Focus anywhere inside the hero. */
  const [focused, setFocused] = useState(false);

  const [stage, setStage] = useState({
    index: 0,
    /** How many turns have happened. Also keys the leaf edge. */
    turns: 0,
    /** The leaf being covered, kept visible for the length of the wipe. */
    under: null as number | null,
  });
  if (stage.index !== index) {
    setStage({ index, turns: stage.turns + 1, under: stage.index });
  }
  const { turns, under } = stage;
  const turning = turns > 0;

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

  // Drop the covered leaf once the wipe is over. A timer rather than
  // `onAnimationEnd`, because under reduced motion there is no animation to
  // end and the underlay would sit there for the rest of the session.
  useEffect(() => {
    if (under === null) return;
    const timer = setTimeout(
      () => setStage((current) => ({ ...current, under: null })),
      SWATCH_TURN_MS + 80,
    );
    return () => clearTimeout(timer);
  }, [under, turns]);

  // The leaves turn on their own until someone stops them, looks closely
  // (hover), or reaches in with the keyboard (focus). Reduced motion never
  // starts the timer at all — the carousel then only moves when asked.
  const autoplay = carousel && !reduced && !userPaused && !hovered && !focused;
  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % count),
      AUTOPLAY_MS,
    );
    return () => clearInterval(timer);
  }, [autoplay, count]);

  /** Picking a photograph is also a request to stop being moved along. */
  const pick = (next: number) => {
    setUserPaused(true);
    setIndex(next);
  };

  const togglePlayback = () => setUserPaused((current) => !current);

  const suspensionHandlers = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") setHovered(true);
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") setHovered(false);
    },
    onFocus: () => setFocused(true),
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    },
  };

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

  /** One leaf. `priority` stays pinned to slide 0 — the LCP frame — and the
   *  rest are eager so a turn never waits on a lazy loader. `fetchPriority`
   *  is set by hand: Next 15 does not derive it from `priority`. */
  const photo = (position: number) => {
    const src = photos[position];
    if (!src) return null;
    return (
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        priority={position === 0}
        fetchPriority={position === 0 ? "high" : undefined}
        loading={position === 0 ? undefined : "eager"}
        className="object-cover"
      />
    );
  };

  return (
    <section
      {...sectionAttrs}
      aria-labelledby="olive-hero-heading"
      data-controls={carousel ? "true" : undefined}
      className="olive-hero relative isolate flex w-full flex-col justify-end overflow-hidden"
      style={{
        backgroundColor: "var(--olive-sage)",
        paddingInline: "var(--olive-section-pad-x)",
      }}
      {...(carousel ? suspensionHandlers : {})}
    >
      {/* The photographs and their controls. The role is only claimed when
          there is actually more than one leaf to turn. */}
      <div
        className="absolute inset-0"
        {...(carousel
          ? {
              role: "group",
              "aria-roledescription": "carousel",
              "aria-label": "Hero photographs",
            }
          : {})}
      >
        {/* Ground: video, photographs, or the sage cover itself. */}
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          {/* The settle (1.04 → 1.0) and its reduced-motion guard both live in
              the scoped `.olive-hero-media` rules; this only flips the flag.
              Every leaf is inside it, so they scale together. */}
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
                poster={hasOliveImage(poster) ? poster : undefined}
                className="h-full w-full object-cover"
              >
                <source src={video} />
              </video>
            ) : count > 0 ? (
              <>
                {/* The next leaf, fetched but not drawn, so the wipe never
                    reveals a frame that is still decoding. */}
                {carousel ? (
                  <div
                    key={`warm-${(index + 1) % count}`}
                    className="invisible absolute inset-0"
                  >
                    {photo((index + 1) % count)}
                  </div>
                ) : null}
                {under !== null ? (
                  <div key={`under-${under}`} className="absolute inset-0">
                    {photo(under)}
                  </div>
                ) : null}
                <div
                  key={`leaf-${index}`}
                  className={cn(
                    "absolute inset-0",
                    turning && "olive-swatch-turn",
                  )}
                >
                  {photo(index)}
                </div>
                {turning ? (
                  <span
                    key={`edge-${turns}`}
                    className="olive-swatch-edge"
                    aria-hidden="true"
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {carousel ? (
          <>
            {/* Silent while the leaves are turning on their own — an
                unattended rotation is not an announcement (WCAG 2.2.2). */}
            <p
              className="sr-only"
              aria-atomic="true"
              aria-live={userPaused || reduced ? "polite" : "off"}
            >
              Photo {index + 1} of {count}
            </p>

            <div className="olive-hero-controls">
              {photos.map((_, position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => pick(position)}
                  aria-label={`Show photo ${position + 1}`}
                  aria-current={position === index ? "true" : undefined}
                  className="olive-icon-btn olive-icon-btn-invert olive-hero-dot"
                />
              ))}
              {/* No disc under reduced motion: nothing is moving to stop. */}
              {!reduced ? (
                <button
                  type="button"
                  onClick={togglePlayback}
                  aria-label={
                    userPaused
                      ? "Play the photo carousel"
                      : "Pause the photo carousel"
                  }
                  className="olive-icon-btn olive-icon-btn-invert olive-icon-btn-on-photo"
                >
                  {userPaused ? (
                    <Play aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Pause aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {/* Scrim — only over real media, and only ever the measured value. */}
      {hasMedia ? (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundColor: "var(--olive-scrim)" }}
        />
      ) : null}

      {/* The leaf edge that opens the cover. Mounted only once `settled` has
          flipped on the client, so it never appears in the server-rendered
          markup and needs no `.olive-js` gate of its own. */}
      {settled ? <div aria-hidden="true" className="olive-hero-sweep" /> : null}

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

      {/* The swatch card — or, when it is switched off, the h1 alone. */}
      <div
        className="relative z-10 mx-auto w-full"
        style={{ maxWidth: "var(--olive-container)" }}
      >
        {showCard ? (
          <OliveRevealGroup>
            <div
              className="olive-reveal-item olive-card flex w-full flex-col items-start gap-4"
              style={
                {
                  "--i": 0,
                  maxWidth: "480px",
                  padding: "clamp(1.5rem, 4vw, 2.25rem)",
                  boxShadow: "var(--olive-shadow)",
                } as CSSProperties
              }
            >
              <span
                className="olive-reveal-item flex items-center"
                style={
                  { "--i": 1, color: "var(--olive-leaf)" } as CSSProperties
                }
              >
                <OliveLeafMark size={20} />
              </span>

              <h1
                id="olive-hero-heading"
                className="olive-h1 olive-reveal-item"
                style={{ "--i": 2 } as CSSProperties}
                {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
              >
                {heading}
              </h1>

              {body ? (
                <p
                  className="olive-reveal-item text-[0.9375rem] leading-relaxed"
                  style={
                    {
                      "--i": 3,
                      color: "var(--olive-ink-soft)",
                    } as CSSProperties
                  }
                  {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
                >
                  {body}
                </p>
              ) : null}

              {ctaLabel ? (
                <div
                  className="olive-reveal-item"
                  style={{ "--i": 4 } as CSSProperties}
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
        ) : (
          /* No `fieldAttr` here: there is no hotspot to patch in place, so
             the visual editor falls back to reloading the preview. */
          <h1 id="olive-hero-heading" className="sr-only">
            {heading}
          </h1>
        )}
      </div>
    </section>
  );
}
