"use client";

import * as React from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

import { cn } from "~/lib/utils";
import { Dialog, DialogTrigger } from "~/components/ui/dialog";
// Deliberate cross-feature import: the service pages own the ONE reduced-motion
// /pause-state hook in the repo. Copying it here (or hoisting it to a third
// location) would fork the behaviour the moment either side is tweaked.
import { useVideoAutoplay } from "~/app/(storefront)/_templates/_service-pages/_shared/use-video-autoplay";

import { EventFlierLightboxPanel } from "./event-flier-lightbox";

type Props = {
  /** `Event.coverVideo` — any browser-playable type (mp4/webm/mov). */
  src: string;
  /**
   * Event name. Only used to qualify the controls' accessible names, so a page
   * listing several video fliers doesn't ship a column of buttons that all
   * announce identically.
   */
  name?: string;
  /** Extra classes for the <video> itself. */
  className?: string;
  /** Extra classes for the controls, so a template can apply its own tokens. */
  buttonClassName?: string;
  /** Extra classes for the dialog panel, so a template can apply its own tokens. */
  panelClassName?: string;
  closeLabel?: string;
};

/**
 * The video counterpart to `EventFlierLightbox`: an event's uploaded
 * `coverVideo` playing inline inside the card's existing flier frame, and
 * tappable to expand into the same shared lightbox panel the image path uses.
 *
 * The inline copy stays a muted-autoplay moving poster — with a mute toggle so
 * sound is available without leaving the card — while the expanded copy is the
 * real player: native `controls` give scrubbing and volume, which is where a
 * viewer who actually wants to watch the thing belongs.
 *
 * The expand trigger is a transparent overlay rendered as a SIBLING of the
 * control cluster rather than a wrapper around it: nesting the mute/pause
 * buttons inside a trigger button is invalid HTML and would need
 * stopPropagation gymnastics to keep a mute tap from also opening the dialog.
 * Sitting under them at `z-[1]` costs nothing and keeps both keyboard-reachable
 * in reading order (expand, mute, pause).
 *
 * Opening the dialog pauses the inline copy so two copies never play — or
 * sound — at once; closing resumes it only if the viewer hadn't paused it
 * themselves (which also respects reduced motion's initial paused state).
 *
 * Renders a fragment, not a wrapper (`Dialog` itself emits no DOM): the video
 * and its controls are absolutely positioned, so the PARENT supplies the frame
 * (position/aspect-ratio/overflow) exactly as it does for the `next/image` fill
 * path it replaces. Callers must not wrap this in their own trigger — it brings
 * its own trigger and dialog. Pass `panelClassName` for template-scoped dialog
 * styling, since Radix portals the panel to document.body, outside any
 * template scope class.
 *
 * Loop + playsInline throughout, `aria-hidden` on the inline video because it
 * carries no accessible content of its own (the labelled trigger and controls
 * carry the semantics; the card's heading names the event), autoplay suppressed
 * under `prefers-reduced-motion`, and a pause/play control for WCAG 2.2.2 — all
 * per the `_service-pages/_shared` video precedent.
 */
export function EventFlierVideo({
  src,
  name,
  className,
  buttonClassName,
  panelClassName,
  closeLabel = "Close",
}: Props) {
  const { videoRef, videoPaused, reduceMotion, toggleVideo } =
    useVideoAutoplay();

  const [muted, setMuted] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  const suffix = name ? ` for ${name}` : "";

  const toggleMuted = () => {
    const next = !muted;
    // Belt and braces with the React prop: `muted` is one of the few DOM
    // properties React doesn't reliably reflect from an attribute.
    if (videoRef.current) videoRef.current.muted = next;
    setMuted(next);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    const video = videoRef.current;
    if (nextOpen) {
      // Imperative only — this is not a user pause, so `videoPaused` stays put
      // and the control keeps offering the state the viewer chose.
      video?.pause();
    } else if (!videoPaused) {
      void video?.play().catch(() => undefined);
    }
  };

  // Shared chrome for both inline controls. Classes rather than inline styles
  // so template scopes still reach them: `.pink *` squares every corner, and an
  // inline `border-radius` would win over that.
  const controlClassName = cn(
    "inline-flex size-9 items-center justify-center rounded-full border border-white/45 bg-black/45 text-white backdrop-blur-[2px] transition-opacity hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
    buttonClassName,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <video
        ref={videoRef}
        src={src}
        // No <source type="video/mp4">: owners upload whatever their phone
        // produced, and a hardcoded type makes the browser refuse a webm/mov
        // outright. `src` lets it sniff.
        autoPlay={!reduceMotion}
        muted={muted}
        loop
        playsInline
        aria-hidden="true"
        className={cn(
          "absolute inset-0 h-full w-full object-contain",
          className,
        )}
      />

      {/* Sits beneath the controls (z-[1] vs z-10), so a tap on mute or pause
          never reaches it — no stopPropagation, no nested buttons. */}
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`View flier${suffix}`}
          className="absolute inset-0 z-[1] cursor-zoom-in appearance-none border-0 bg-transparent p-0"
        />
      </DialogTrigger>

      <div className="absolute right-2 bottom-2 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleMuted}
          aria-label={muted ? `Unmute video${suffix}` : `Mute video${suffix}`}
          className={controlClassName}
        >
          {muted ? (
            <VolumeX className="size-4" aria-hidden="true" />
          ) : (
            <Volume2 className="size-4" aria-hidden="true" />
          )}
        </button>

        {/* WCAG 2.2.2 — Pause, Stop, Hide. */}
        <button
          type="button"
          onClick={toggleVideo}
          aria-label={
            videoPaused ? `Play video${suffix}` : `Pause video${suffix}`
          }
          className={controlClassName}
        >
          {videoPaused ? (
            <Play className="size-4" aria-hidden="true" />
          ) : (
            <Pause className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <EventFlierLightboxPanel
        title={name ? `${name} — enlarged flier` : "Enlarged flier"}
        panelClassName={panelClassName}
        closeLabel={closeLabel}
      >
        {/* Unmuted: opening the dialog is a user gesture, so autoplay with
            sound is honoured. Native `controls` are the recovery path if a
            browser blocks it anyway. Same no-<source type> reasoning as above. */}
        <video
          src={src}
          controls
          playsInline
          loop
          autoPlay={!reduceMotion}
          aria-label={`Video flier${suffix}`}
          className="max-h-[88vh] w-full object-contain"
        />
      </EventFlierLightboxPanel>
    </Dialog>
  );
}
