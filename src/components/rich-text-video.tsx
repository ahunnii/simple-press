"use client";

import { useVideoAutoplay } from "~/app/(storefront)/_templates/_service-pages/_shared/use-video-autoplay";

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

  return (
    <figure className="not-prose my-6">
      {ambient ? (
        <video
          ref={videoRef}
          className="h-auto w-full rounded-md"
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
          className="h-auto w-full rounded-md"
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
