"use client";

import type { CSSProperties, FocusEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";

import { fieldAttr, listItemAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import { hasOliveImage, OliveButton, OliveRevealGroup } from "../shared";

/** One hero photograph, paired with its original (pre-filter) row index in
 *  the owner's `olive.homepage.hero-images` list, so the currently shown
 *  frame can carry `listItemAttr` back to the right row. */
export type OliveHeroImage = {
  src: string;
  /** Position in the saved list before blank/placeholder rows were dropped. */
  index: number;
};

type Props = {
  images: OliveHeroImage[];
  video: string;
  /** The `hero-show-card` switch: print the eyebrow, h1, line and button. */
  showCard: boolean;
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  sectionAttrs?: Record<string, string>;
  eyebrowFieldKey?: string;
  headingFieldKey?: string;
  bodyFieldKey?: string;
  ctaLabelFieldKey?: string;
};

/** Autoplay dwell per photograph. Long enough to be looked at, not read. */
const AUTOPLAY_MS = 6500;
/**
 * How long the outgoing frame stays mounted under the incoming one. Must be
 * at least the `olive-hero-fade` cross-fade in globals.css (900ms), or the
 * new frame would finish fading in over the bare section ground.
 */
const HERO_FADE_MS = 900;

/** "01", "02" … — the board's numbered slide controls. */
const pad = (value: number) => String(value).padStart(2, "0");

/**
 * The hero — a magazine cover.
 *
 * A full-bleed photograph (or a silent looping video) under the left-weighted
 * espresso scrim, with the copy printed straight onto it on the left: a small
 * tracked-caps line, the page's one h1 in Bodoni display, one line of body
 * and an ivory-filled button. No card. With no media at all the ground is
 * espresso and the same ivory type sits on it — a designed state, not a hole.
 *
 * Load moment: the photograph settles from 1.04 to 1 over ~1.6s (scoped
 * `.olive-hero-media` rules, gated on `.olive-js` and reduced motion), and the
 * copy staggers in on a hero-only cadence through the shared reveal system.
 *
 * With two or more photographs the hero cross-fades between them (900ms).
 * The mechanics:
 *
 * - `turns` starts at 0 and is only ever raised by a real change of index, so
 *   the first render — server and client alike — is one plain image with no
 *   animation class. Slide 0 carries `priority` + `fetchPriority="high"` and
 *   is the page's LCP element; a `both`-filled fade would paint it at 0.
 * - The stage is raised *during render* (React's "adjust state when something
 *   changes" pattern), never in an effect, so the incoming frame carries its
 *   fade class on its very first mounted frame instead of flashing in.
 * - The outgoing frame stays mounted, opaque, underneath for HERO_FADE_MS.
 *
 * Controls sit bottom-left, as on the board: previous, the numbered slides
 * ("01 02 03"), next, and a pause/play square (WCAG 2.2.2 — content that
 * moves by itself for more than five seconds must be stoppable). One
 * `userPaused` flag carries every deliberate stop — pause, a numeral, an
 * arrow — and the pause icon reflects only that. Hover and focus inside the
 * hero are separate, transient suspensions that never touch the icon.
 *
 * The copy can be switched off in the editor (`hero-show-card`). The h1
 * survives as an sr-only heading: the page still needs exactly one h1, and
 * the section's `aria-labelledby` still needs something to point at.
 */
export function OliveHeroSection({
  images,
  video,
  showCard,
  eyebrow,
  heading,
  body,
  ctaLabel,
  ctaHref,
  sectionAttrs,
  eyebrowFieldKey,
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
  const poster = images[0]?.src;
  const hasMedia = hasVideo || images.length > 0;

  /** The requested slide. */
  const [index, setIndex] = useState(0);
  /** Set by pause, a numeral and the arrows alike — the one deliberate stop. */
  const [userPaused, setUserPaused] = useState(false);
  /** Mouse hover only: a touch tap must not wedge the carousel shut. */
  const [hovered, setHovered] = useState(false);
  /** Focus anywhere inside the hero. */
  const [focused, setFocused] = useState(false);

  const [stage, setStage] = useState({
    index: 0,
    /** How many changes have happened. 0 = the untouched first render. */
    turns: 0,
    /** The frame being faded over, kept visible for the length of the fade. */
    under: null as number | null,
  });
  if (stage.index !== index) {
    setStage({ index, turns: stage.turns + 1, under: stage.index });
  }
  const { turns, under } = stage;
  const fading = turns > 0;

  // The photograph settles into place on the first painted frame. Reduced
  // motion is handled in CSS, where it is already at rest.
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

  // Drop the covered frame once the fade is over. A timer rather than
  // `onAnimationEnd`, because under reduced motion there is no animation to
  // end and the underlay would sit there for the rest of the session.
  useEffect(() => {
    if (under === null) return;
    const timer = setTimeout(
      () => setStage((current) => ({ ...current, under: null })),
      HERO_FADE_MS + 80,
    );
    return () => clearTimeout(timer);
  }, [under, turns]);

  // The photographs change on their own until someone stops them, looks
  // closely (hover), or reaches in with the keyboard (focus). Reduced motion
  // never starts the timer — the carousel then only moves when asked.
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
    setIndex(((next % count) + count) % count);
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

  /** One frame. `priority` stays pinned to slide 0 — the LCP frame — and the
   *  rest are eager so a change never waits on a lazy loader. `fetchPriority`
   *  is set by hand: Next 15 does not derive it from `priority`. */
  const photo = (position: number) => {
    const src = photos[position]?.src;
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

  const showEyebrow = eyebrow.trim().length > 0;
  const showBody = body.trim().length > 0;
  const showButton = ctaLabel.trim().length > 0 && ctaHref.trim().length > 0;

  return (
    <section
      {...sectionAttrs}
      aria-labelledby="olive-hero-heading"
      data-controls={carousel ? "true" : undefined}
      className="olive-hero"
      {...(carousel ? suspensionHandlers : {})}
    >
      {/* The photographs and their controls. The carousel role is only
          claimed when there is actually more than one photograph. */}
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
        {/* Ground: video, photographs, or the espresso field itself. */}
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          {/* The settle (1.04 → 1) and its reduced-motion guard both live in
              the scoped `.olive-hero-media` rules; this only flips the flag.
              Every frame is inside it, so they scale together. */}
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
                {/* The next frame, fetched but not drawn, so the fade never
                    reveals a picture that is still decoding. */}
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
                  key={`frame-${index}`}
                  {...(photos[index]
                    ? listItemAttr(
                        "olive.homepage.hero-images",
                        photos[index].index,
                      )
                    : {})}
                  className={cn(
                    "absolute inset-0",
                    fading && "olive-hero-fade",
                  )}
                >
                  {photo(index)}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Scrim — only over real media. Left-weighted on wide screens;
            bottom-weighted under the copy on a phone (globals.css). */}
        {hasMedia ? (
          <div aria-hidden="true" className="olive-hero-scrim" />
        ) : null}

        {carousel ? (
          <>
            {/* Silent while the photographs change on their own — an
                unattended rotation is not an announcement (WCAG 2.2.2). */}
            <p
              className="sr-only"
              aria-atomic="true"
              aria-live={userPaused || reduced ? "polite" : "off"}
            >
              Photo {index + 1} of {count}
            </p>

            <div className="olive-hero-controls">
              <button
                type="button"
                onClick={() => pick(index - 1)}
                aria-label="Previous photo"
                className="olive-icon-btn olive-icon-btn-invert olive-hero-arrow"
              >
                <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.5} />
              </button>

              {photos.map((_, position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => pick(position)}
                  aria-label={`Show photo ${position + 1} of ${count}`}
                  aria-current={position === index ? "true" : undefined}
                  className="olive-hero-dot"
                >
                  <span aria-hidden="true">{pad(position + 1)}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => pick(index + 1)}
                aria-label="Next photo"
                className="olive-icon-btn olive-icon-btn-invert olive-hero-arrow"
              >
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
              </button>

              {/* No pause under reduced motion: nothing is moving to stop. */}
              {!reduced ? (
                <button
                  type="button"
                  onClick={togglePlayback}
                  aria-label={
                    userPaused
                      ? "Play the photo carousel"
                      : "Pause the photo carousel"
                  }
                  className="olive-icon-btn olive-icon-btn-invert olive-hero-pause"
                >
                  {userPaused ? (
                    <Play aria-hidden="true" size={12} strokeWidth={1.75} />
                  ) : (
                    <Pause aria-hidden="true" size={12} strokeWidth={1.75} />
                  )}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {hasVideo ? (
        <button
          type="button"
          onClick={toggleVideo}
          aria-label={playing ? "Pause the hero video" : "Play the hero video"}
          className="olive-icon-btn olive-icon-btn-invert olive-hero-pause olive-hero-video-toggle"
        >
          {playing ? (
            <Pause aria-hidden="true" size={12} strokeWidth={1.75} />
          ) : (
            <Play aria-hidden="true" size={12} strokeWidth={1.75} />
          )}
        </button>
      ) : null}

      {/* The copy — or, when it is switched off, the h1 alone. */}
      <div className="olive-hero-inner">
        {showCard ? (
          <OliveRevealGroup className="olive-hero-copy olive-on-photo">
            {showEyebrow ? (
              <p
                className="olive-eyebrow olive-reveal-item"
                style={{ "--i": 0 } as CSSProperties}
                {...(eyebrowFieldKey ? fieldAttr(eyebrowFieldKey) : {})}
              >
                {eyebrow}
              </p>
            ) : null}

            <h1
              id="olive-hero-heading"
              className="olive-display olive-reveal-item"
              style={{ "--i": 1 } as CSSProperties}
              {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
            >
              {heading}
            </h1>

            {showBody ? (
              <p
                className="olive-hero-body olive-reveal-item"
                style={{ "--i": 2 } as CSSProperties}
                {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
              >
                {body}
              </p>
            ) : null}

            {showButton ? (
              <div
                className="olive-hero-cta olive-reveal-item"
                style={{ "--i": 3 } as CSSProperties}
              >
                <OliveButton
                  variant="ivory"
                  arrow
                  href={ctaHref}
                  data-sp-field={ctaLabelFieldKey}
                >
                  {ctaLabel}
                </OliveButton>
              </div>
            ) : null}
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
