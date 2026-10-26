"use client";

import type { Ref, SyntheticEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

import { meaningfulAltText } from "~/lib/images/alt-text";
import type { ProductMediaLike } from "~/lib/products/media";
import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

/**
 * Video slides for product galleries.
 *
 * Product galleries mix photos and short owner-uploaded clips (≤50MB
 * mp4/webm/mov, see `~/lib/products/media`). Every gallery — the two shared
 * ones in this folder and the template-owned ones — renders a video item
 * through these three pieces so playback rules stay identical everywhere:
 *
 * - `ProductGalleryVideo` — the main-frame slide. Muted, looping, plays only
 *   while it is the active slide AND on screen; never autoplays under
 *   `prefers-reduced-motion` (poster + centred play button instead); corner
 *   pause/play + mute toggles for WCAG 2.2.2.
 * - `ProductGalleryThumb` — drop-in content for an existing thumbnail button.
 * - `ProductLightboxVideo` — the enlarged player (native controls, sound on).
 *
 * The service-page `useVideoAutoplay` hook is deliberately NOT reused here: it
 * only models "reduced motion → start paused" + a user toggle, with no notion
 * of an active slide, viewport visibility or blocked autoplay. Bolting those on
 * would change service-page/event-flier behaviour, so the gallery keeps its own
 * focused state machine below (`useGalleryVideoPlayback`).
 */

export type ProductGalleryVideoItem = ProductMediaLike & {
  altText?: string | null;
  posterUrl?: string | null;
};

const VIDEO_FILENAME = /^\S+\.(?:mp4|webm|mov|m4v|qt)$/i;

/** Owner alt text worth announcing — empty/file-name values count as missing. */
function videoLabel(
  item: ProductGalleryVideoItem,
  fallback = "Product video",
): string {
  const alt = meaningfulAltText(item.altText);
  if (!alt || VIDEO_FILENAME.test(alt)) return fallback;
  return alt;
}

/**
 * Without a poster, `#t=0.1` makes browsers seek to (and paint) an early frame
 * once metadata is in, instead of showing a black box. Left alone when the URL
 * already carries a fragment.
 */
function firstFrameSrc(url: string): string {
  return url.includes("#") ? url : `${url}#t=0.1`;
}

/**
 * Overlay controls live inside gallery frames that open a lightbox on click
 * and (in some templates) swipe on pointer/touch drags. Stop every event a
 * frame-level handler could react to. Note React's `stopPropagation` only
 * stops React handlers and native listeners on `document`/`window` added after
 * React's root listener — a carousel that binds NATIVE listeners directly on
 * an ancestor element still sees the event (check `event.target.closest(
 * "[data-gallery-video-control]")` there).
 */
const stop = (e: SyntheticEvent) => e.stopPropagation();
const stopHandlers = {
  onPointerDown: stop,
  onMouseDown: stop,
  onTouchStart: stop,
  "data-gallery-video-control": "",
} as const;

const CHIP_CLASS =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/40 bg-black/55 text-white backdrop-blur-[2px] transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer";

// ── Playback state ───────────────────────────────────────────────────────────

function useGalleryVideoPlayback(active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();

  const [inView, setInView] = useState(false);
  /** Mirrors the element's real state (from play/pause events) for the icon. */
  const [playing, setPlaying] = useState(false);
  /** The viewer pressed pause — sticks until they press play. */
  const [userPaused, setUserPaused] = useState(false);
  /** The viewer pressed play — the only way playback starts under reduced motion. */
  const [userStarted, setUserStarted] = useState(false);
  /** The browser refused autoplay (iOS Low Power Mode, data saver, ...). */
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // React does not reliably reflect the `muted` prop onto the DOM property,
  // and autoplay policies check the property.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const shouldPlay =
    active &&
    inView &&
    !userPaused &&
    !blocked &&
    (!reduceMotion || userStarted);

  const attemptPlay = useCallback((el: HTMLVideoElement) => {
    el.play().catch((err: unknown) => {
      // AbortError = a pause() (slide change, scroll away) beat the play
      // promise — not a refusal. Anything else: show the play button.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setBlocked(true);
    });
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (shouldPlay) attemptPlay(el);
    else if (!el.paused) el.pause();
  }, [shouldPlay, attemptPlay]);

  const play = () => {
    const el = videoRef.current;
    setUserPaused(false);
    setUserStarted(true);
    setBlocked(false);
    // Called synchronously inside the click so it counts as a user gesture
    // (iOS won't honour a play() deferred to an effect after a refusal).
    if (el) attemptPlay(el);
  };

  const pause = () => {
    setUserPaused(true);
    videoRef.current?.pause();
  };

  const toggleMuted = () => {
    const next = !muted;
    const el = videoRef.current;
    if (el) el.muted = next;
    setMuted(next);
  };

  /** Paused for a reason other than the viewer pressing pause. */
  const awaitingStart =
    !playing && !userPaused && ((reduceMotion && !userStarted) || blocked);

  return {
    videoRef,
    playing,
    setPlaying,
    muted,
    toggleMuted,
    play,
    pause,
    awaitingStart,
  };
}

// ── Main slide ───────────────────────────────────────────────────────────────

export type ProductGalleryVideoProps = {
  item: ProductGalleryVideoItem;
  /**
   * True only while this is the gallery's selected slide AND no lightbox is
   * covering it. Inactive slides pause (and skip preloading when a poster
   * exists).
   */
  active?: boolean;
  /**
   * `true`: absolutely fills the nearest positioned ancestor, like
   * `next/image` `fill` (the shared galleries' frames). `false`: a relative
   * block sized by `className` (e.g. `aspect-square w-full`).
   */
  fill?: boolean;
  objectFit?: "cover" | "contain";
  /** On the wrapper (which also positions the controls). */
  className?: string;
  /** Extra classes for the <video> element itself. */
  videoClassName?: string;
  /** Extra classes for every control chip, for template tokens. */
  controlsClassName?: string;
  /** Accessible name when the item has no meaningful alt text. */
  fallbackLabel?: string;
  /**
   * When set, a transparent full-frame button sits UNDER the controls and
   * calls this (open the lightbox). Use it instead of wrapping the slide in
   * the gallery's own enlarge <button> — nested buttons are invalid HTML.
   */
  onExpand?: () => void;
  expandLabel?: string;
  /** Ref to the expand button, so a lightbox can return focus to it. */
  expandButtonRef?: Ref<HTMLButtonElement>;
};

export function ProductGalleryVideo({
  item,
  active = true,
  fill = false,
  objectFit = "cover",
  className,
  videoClassName,
  controlsClassName,
  fallbackLabel,
  onExpand,
  expandLabel = "Enlarge video",
  expandButtonRef,
}: ProductGalleryVideoProps) {
  const {
    videoRef,
    playing,
    setPlaying,
    muted,
    toggleMuted,
    play,
    pause,
    awaitingStart,
  } = useGalleryVideoPlayback(active);

  const poster = item.posterUrl ?? undefined;
  const label = videoLabel(item, fallbackLabel);
  const preload = poster ? (active ? "auto" : "none") : "metadata";
  const chip = cn(CHIP_CLASS, controlsClassName);

  return (
    <div
      className={cn(fill ? "absolute inset-0" : "relative", className)}
      data-gallery-video=""
    >
      <video
        ref={videoRef}
        src={poster ? item.url : firstFrameSrc(item.url)}
        poster={poster}
        preload={preload}
        muted
        loop
        playsInline
        disablePictureInPicture
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className={cn(
          fill ? "absolute inset-0 h-full w-full" : "block h-full w-full",
          objectFit === "contain" ? "object-contain" : "object-cover",
          videoClassName,
        )}
      />

      {onExpand ? (
        <button
          ref={expandButtonRef}
          type="button"
          onClick={onExpand}
          aria-label={expandLabel}
          aria-haspopup="dialog"
          className="absolute inset-0 z-[1] cursor-zoom-in appearance-none border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
        />
      ) : null}

      {awaitingStart ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <button
            type="button"
            {...stopHandlers}
            onClick={(e) => {
              e.stopPropagation();
              play();
            }}
            aria-label="Play video"
            className={cn(chip, "pointer-events-auto size-14")}
          >
            <Play className="size-6 translate-x-px" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="absolute right-2 bottom-2 z-10 flex items-center gap-1.5">
        <button
          type="button"
          {...stopHandlers}
          onClick={(e) => {
            e.stopPropagation();
            toggleMuted();
          }}
          aria-label={muted ? "Unmute" : "Mute"}
          className={chip}
        >
          {muted ? (
            <VolumeX className="size-4" aria-hidden="true" />
          ) : (
            <Volume2 className="size-4" aria-hidden="true" />
          )}
        </button>
        {/* WCAG 2.2.2 — Pause, Stop, Hide. Hidden while the centred play
            button is up so two "Play video" buttons never sit side by side. */}
        {awaitingStart ? null : (
          <button
            type="button"
            {...stopHandlers}
            onClick={(e) => {
              e.stopPropagation();
              if (playing) pause();
              else play();
            }}
            aria-label={playing ? "Pause video" : "Play video"}
            className={chip}
          >
            {playing ? (
              <Pause className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Thumbnail ────────────────────────────────────────────────────────────────

export type ProductGalleryThumbProps = {
  item: ProductGalleryVideoItem;
  className?: string;
  /** next/image `sizes` for the poster. */
  sizes?: string;
};

/**
 * Content for an existing thumbnail button: fills its (positioned) parent.
 * The surrounding button should say "video" in its own accessible name —
 * an `aria-label` on the button overrides the visually-hidden "Video" here.
 */
export function ProductGalleryThumb({
  item,
  className,
  sizes = "64px",
}: ProductGalleryThumbProps) {
  return (
    <span className={cn("absolute inset-0 block", className)}>
      {item.posterUrl ? (
        <Image
          src={item.posterUrl}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <video
          src={firstFrameSrc(item.url)}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-black/55 text-white">
          <Play className="size-3 translate-x-px fill-current" />
        </span>
      </span>
      <span className="sr-only">Video</span>
    </span>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

export type ProductLightboxVideoProps = {
  item: ProductGalleryVideoItem;
  className?: string;
  /**
   * `true`: absolutely fills a sized parent (glove-style `relative h-full`
   * box). `false` (default): intrinsic size capped to the viewport.
   */
  fill?: boolean;
  fallbackLabel?: string;
  /** The <video>, e.g. to add it to a lightbox focus trap. */
  ref?: Ref<HTMLVideoElement>;
};

/**
 * The enlarged player: native controls, sound on. Tries to start on mount
 * (opening the lightbox was a click, which usually satisfies autoplay
 * policies); if the browser refuses, it stays paused on the poster with its
 * controls. Never auto-starts under `prefers-reduced-motion`.
 *
 * Mount it only while the lightbox is open (and key it by URL when the
 * lightbox steps between items) so each open gets a fresh play attempt.
 */
export function ProductLightboxVideo({
  item,
  className,
  fill = false,
  fallbackLabel,
  ref,
}: ProductLightboxVideoProps) {
  const innerRef = useRef<HTMLVideoElement | null>(null);
  const reduceMotion = useReducedMotion();

  const setRefs = useCallback(
    (el: HTMLVideoElement | null) => {
      innerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  useEffect(() => {
    const el = innerRef.current;
    if (!el || reduceMotion) return;
    el.muted = false;
    el.play().catch(() => undefined);
  }, [reduceMotion, item.url]);

  const poster = item.posterUrl ?? undefined;

  return (
    <video
      ref={setRefs}
      src={poster ? item.url : firstFrameSrc(item.url)}
      poster={poster}
      preload={poster ? "auto" : "metadata"}
      controls
      playsInline
      loop
      aria-label={videoLabel(item, fallbackLabel)}
      className={cn(
        fill
          ? "absolute inset-0 h-full w-full object-contain"
          : "block h-auto max-h-[90vh] w-auto max-w-[90vw] object-contain",
        className,
      )}
    />
  );
}
