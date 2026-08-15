"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll-driven parallax background layer, reproducing the Squarespace
 * "Index-page--has-image" Parallax behavior for a captured section.
 * The image layer is oversized and translated slower than the scroll so the
 * background drifts behind the foreground content as the section moves through
 * the viewport.
 *
 * Ported verbatim from `building-clone/src/app/components/parallax-background.tsx`
 * — the template's one signature motion moment (see design.md Motion). The
 * only change from the clone source is the default `overlayClassName`, which
 * now points at the `--coop-clr-4` token instead of the clone's raw utility.
 */
export function CoopParallaxBackground({
  src,
  alt = "",
  speed = 0.3,
  overlayClassName = "bg-[var(--coop-clr-4)]",
}: {
  src: string;
  alt?: string;
  speed?: number;
  overlayClassName?: string;
}) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const section = layer.parentElement;
    if (!section) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const viewportH =
        window.innerHeight || document.documentElement.clientHeight;
      // Progress of the section center relative to the viewport center.
      const offset = rect.top + rect.height / 2 - viewportH / 2;
      layer.style.transform = `translate3d(0, ${(-offset * speed).toFixed(2)}px, 0)`;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [speed]);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="absolute inset-x-0 top-[-15%] z-0 h-[130%] will-change-transform"
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover object-center"
      />
      <div className={`absolute inset-0 ${overlayClassName}`} />
    </div>
  );
}
