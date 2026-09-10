"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "~/lib/utils";
// Deliberate cross-feature import: the service pages own the ONE reduced-motion
// /pause-state hook in the repo. Copying it here (or hoisting it to a third
// location) would fork the behaviour the moment either side is tweaked.
import { useVideoAutoplay } from "~/app/(storefront)/_templates/_service-pages/_shared/use-video-autoplay";

type Props = {
  /** `Event.coverVideo` — any browser-playable type (mp4/webm/mov). */
  src: string;
  /**
   * Event name. Only used to qualify the toggle's accessible name, so a page
   * listing several video fliers doesn't ship a column of buttons that all
   * announce identically.
   */
  name?: string;
  /** Extra classes for the <video> itself. */
  className?: string;
  /** Extra classes for the toggle, so a template can apply its own tokens. */
  buttonClassName?: string;
};

/**
 * The video counterpart to `EventFlierLightbox`: an event's uploaded
 * `coverVideo` playing inline inside the card's existing flier frame.
 *
 * Deliberately NOT lightboxed. The lightbox exists so a dense flier's text can
 * be read at full size; a video is already motion the viewer is watching, and
 * putting it behind a dialog would only add a trap between them and it. Callers
 * therefore must not wrap this in a trigger or hang tap affordances off it.
 *
 * Renders a fragment, not a wrapper: the video and its toggle are absolutely
 * positioned, so the PARENT supplies the frame (position/aspect-ratio/overflow)
 * exactly as it does for the `next/image` fill path it replaces.
 *
 * Muted + loop + playsInline so it reads as a moving poster rather than media
 * to sit through, `aria-hidden` because it carries no accessible content of its
 * own (the card's heading names the event), autoplay suppressed under
 * `prefers-reduced-motion`, and a pause/play control for WCAG 2.2.2 — all per
 * the `_service-pages/_shared` video precedent.
 */
export function EventFlierVideo({
  src,
  name,
  className,
  buttonClassName,
}: Props) {
  const { videoRef, videoPaused, reduceMotion, toggleVideo } =
    useVideoAutoplay();

  const suffix = name ? ` for ${name}` : "";

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        // No <source type="video/mp4">: owners upload whatever their phone
        // produced, and a hardcoded type makes the browser refuse a webm/mov
        // outright. `src` lets it sniff.
        autoPlay={!reduceMotion}
        muted
        loop
        playsInline
        aria-hidden="true"
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />

      {/* WCAG 2.2.2 — Pause, Stop, Hide. Styled with classes rather than
          inline styles so template scopes still reach it: `.pink *` squares
          every corner, and an inline `border-radius` would win over that. */}
      <button
        type="button"
        onClick={toggleVideo}
        aria-label={
          videoPaused ? `Play video${suffix}` : `Pause video${suffix}`
        }
        className={cn(
          "absolute right-2 bottom-2 z-10 inline-flex size-9 items-center justify-center rounded-full border border-white/45 bg-black/45 text-white backdrop-blur-[2px] transition-opacity hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          buttonClassName,
        )}
      >
        {videoPaused ? (
          <Play className="size-4" aria-hidden="true" />
        ) : (
          <Pause className="size-4" aria-hidden="true" />
        )}
      </button>
    </>
  );
}
