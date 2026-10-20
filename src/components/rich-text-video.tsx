"use client";

import { useCallback, useState } from "react";

import { useVideoAutoplay } from "~/app/(storefront)/_templates/_service-pages/_shared/use-video-autoplay";

/**
 * Landscape clips fill the column; portrait clips (phone reels) are capped to
 * the viewport height and centered — full-width 9:16 would run ~1200px tall
 * and push the controls below the fold.
 */
const LANDSCAPE_CLASS = "h-auto w-full rounded-md";
const PORTRAIT_CLASS =
  "mx-auto block h-auto max-h-[80svh] w-auto max-w-full rounded-md";

type RichTextVideoProps = {
  src: string;
  title?: string;
  /** Muted, autoplay, loop, no controls — respects prefers-reduced-motion. */
  ambient?: boolean;
};

/**
 * Storefront renderer for a rich-text `video` node.
 *
 * Mirrors how images sit inside `prose` content: a `<figure>` wrapper with
 * the same vertical rhythm as `GalleryBlock`/`QuoteCalculatorBlock`. `class`
 * and `style` are stripped by the sanitizer before this ever runs, so all
 * styling lives here rather than in stored node attrs.
 *
 * Ambient clips reuse `useVideoAutoplay` (the same hook `ServiceHeroVideo`
 * uses) so a viewer with `prefers-reduced-motion` gets a paused clip instead
 * of an autoplaying one.
 */
export function RichTextVideo({ src, title, ambient }: RichTextVideoProps) {
  const { videoRef, reduceMotion } = useVideoAutoplay();
  const [portrait, setPortrait] = useState(false);
  const measure = useCallback((el: HTMLVideoElement | null) => {
    // readyState >= 1 (HAVE_METADATA): metadata may have loaded before
    // hydration, in which case onLoadedMetadata never fires for us.
    if (el && el.readyState >= 1 && el.videoHeight > el.videoWidth)
      setPortrait(true);
  }, []);
  const className = portrait ? PORTRAIT_CLASS : LANDSCAPE_CLASS;

  return (
    <figure className="not-prose my-6">
      {ambient ? (
        <video
          ref={(el) => {
            videoRef.current = el;
            measure(el);
          }}
          onLoadedMetadata={(e) => measure(e.currentTarget)}
          className={className}
          preload="metadata"
          playsInline
          muted
          loop
          autoPlay={!reduceMotion}
          // Reduced-motion viewers get a paused clip; give them a way to play it.
          controls={reduceMotion}
          aria-label={title}
        >
          <source src={src} />
        </video>
      ) : (
        <video
          ref={measure}
          onLoadedMetadata={(e) => measure(e.currentTarget)}
          className={className}
          preload="metadata"
          playsInline
          controls
          aria-label={title}
        >
          <source src={src} />
        </video>
      )}
    </figure>
  );
}
