"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import { PinkImageFallback } from "../shared/pink-image-fallback";

export type PinkHeroPanel = {
  image: string;
  caption: string;
  /** Parallax depth multiplier, e.g. "1.4". Parsed leniently — bad input falls back to 1. */
  depth: string;
  _id?: string;
};

type Props = {
  panels: PinkHeroPanel[];
};

const SPOTLIGHT_INTERVAL_MS = 3400;
/** design.md → Motion → Hero: panel entrance stagger, in seconds. */
const PANEL_ENTER_DELAYS_S = [0.55, 0.68, 0.81, 0.94];

function depthOf(panel: PinkHeroPanel): number {
  const parsed = Number.parseFloat(panel.depth);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function gridColumnsFor(activeIndex: number, count: number): string {
  return Array.from({ length: count }, (_, i) => (i === activeIndex ? "1.6fr" : "1fr")).join(" ");
}

/**
 * The homepage hero's signature 4-panel strip (design.md → Motion → Hero).
 * Three layered, independently-transformed behaviours:
 *   1. Spotlight — the grid's active column widens on a 3400ms interval.
 *   2. Parallax — a rAF-throttled mousemove listener translates each panel's
 *      inner image at a per-panel depth; a scroll listener translates the
 *      whole panel. Never attached on `(pointer: coarse)`.
 *   3. (The 22s ken-burns layer was removed on 2026-07-31 — it read as grungy
 *      and was part of the homepage's idle layout churn.)
 * The spotlight interval and the parallax listeners are explicitly gated on
 * `prefers-reduced-motion` in JS (a CSS-only gate can't stop a `setInterval`
 * or an event listener from doing work).
 *
 * They are additionally gated on the strip being **on screen** and the tab being
 * **visible**. Removing the ken-burns layer cut the homepage's idle churn but did
 * not end it: the spotlight's `grid-template-columns` transition kept re-laying-out
 * all four panels every 3.4s forever, including while scrolled far past the hero
 * (measured 2026-07-31 — 237 layouts/5s off-screen, 136 with the tab hidden).
 * Animating `grid-template-columns` is inherently layout-bound; the cost while the
 * strip is actually visible is the price of the effect, but paying it off-screen
 * was pure waste.
 */
export function PinkHeroStrip({ panels }: Props) {
  const shown = panels.slice(0, 4);
  const count = shown.length;

  const [spotlight, setSpotlight] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  const stripRef = useRef<HTMLDivElement | null>(null);
  const scrollLayerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mouseLayerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ tx: number; ty: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionEnabled(!mq.matches);
    const onChange = () => setMotionEnabled(!mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Is the strip actually on screen? `grid-template-columns` is the most
  // expensive property here to animate — every transition frame re-lays-out all
  // four panels — so the spotlight must not run when nobody can see it.
  // Measured 2026-07-31: without this gate the homepage did 237 layouts per 5s
  // while the strip was scrolled 3251px off-screen, versus 262 in view.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      // Resume just before it scrolls back in, so the first visible frame is
      // already mid-rotation rather than starting cold.
      { rootMargin: "100px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A background tab still ran the interval and its transition (136 layouts
  // per 5s when hidden), because rAF throttling does not stop `setInterval`.
  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // 1. Spotlight rotation.
  useEffect(() => {
    if (!motionEnabled || count === 0 || !inView || !pageVisible) return;
    const id = setInterval(() => {
      setSpotlight((i) => (i + 1) % count);
    }, SPOTLIGHT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [motionEnabled, count, inView, pageVisible]);

  // 2. Parallax — mousemove (rAF-throttled) + scroll. Skipped under reduced
  // motion, and the mousemove listener is never attached on coarse pointers.
  // Also gated on `inView`: both handlers wrote transforms to off-screen panels
  // on every scroll/mousemove anywhere on the page.
  useEffect(() => {
    if (!motionEnabled || !inView) return;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

    const flush = () => {
      rafRef.current = null;
      const pending = pendingRef.current;
      if (!pending) return;
      const { tx, ty } = pending;
      shown.forEach((panel, i) => {
        const depth = depthOf(panel);
        const layer = mouseLayerRefs.current[i];
        if (layer) {
          layer.style.transform = `translate3d(${tx * 22 * depth}px, ${ty * 14 * depth}px, 0) scale(1.06)`;
        }
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      pendingRef.current = {
        tx: (e.clientX - cx) / cx,
        ty: (e.clientY - cy) / cy,
      };
      rafRef.current ??= requestAnimationFrame(flush);
    };

    const onScroll = () => {
      const y = window.scrollY;
      shown.forEach((panel, i) => {
        const depth = depthOf(panel);
        const layer = scrollLayerRefs.current[i];
        if (layer) {
          layer.style.transform = `translate3d(0, ${-y * 0.05 * depth}px, 0)`;
        }
      });
    };

    if (!isCoarsePointer) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    // The listener is detached while the strip is off-screen, so `scrollY` will
    // have moved without the panels tracking it. Sync once on re-attach or the
    // strip scrolls back into view carrying a stale offset until the next
    // scroll event — which, if the user stops right at the boundary, never comes.
    onScroll();

    return () => {
      if (!isCoarsePointer) {
        window.removeEventListener("mousemove", onMouseMove);
      }
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [motionEnabled, inView, shown]);

  const setScrollLayerRef = useCallback(
    (i: number) => (el: HTMLDivElement | null) => {
      scrollLayerRefs.current[i] = el;
    },
    [],
  );
  const setMouseLayerRef = useCallback(
    (i: number) => (el: HTMLDivElement | null) => {
      mouseLayerRefs.current[i] = el;
    },
    [],
  );

  if (count === 0) return null;

  // The strip used to carry a blanket `aria-hidden="true"`, which also hid the
  // owner-authored panel captions from assistive tech (audit 2026-07-31, P3-6).
  // Judgment: the *images* are decorative (they stay `alt=""`), but a caption is
  // an editable content field — an owner who types copy into it has published
  // copy, so silently dropping it from the accessibility tree is a content
  // decision the template shouldn't make on their behalf. Exposed as a labelled
  // list of the captions only, so nothing is announced twice: the images
  // contribute no text, and `PinkImageFallback` is rendered without a `label`.
  // When no panel has a caption there is nothing but decoration left, so the
  // whole strip stays hidden rather than exposing an empty list.
  const hasCaptions = shown.some((panel) => Boolean(panel.caption));

  return (
    <div
      ref={stripRef}
      // A caption-less tile is hidden individually so every child this list
      // owns is a `listitem`, as ARIA requires.
      aria-hidden={hasCaptions ? undefined : "true"}
      role={hasCaptions ? "list" : undefined}
      aria-label={hasCaptions ? "Highlights" : undefined}
      // Below 640px the strip drops to two columns: four tiles at 390px are
      // ~95px wide and truncate every caption. The spotlight widening only
      // applies from `sm` up, where there is room for it to read as motion
      // rather than jitter.
      className="pink-hero-strip relative z-10 grid grid-cols-2 gap-[2px] sm:[grid-template-columns:var(--pink-hero-cols)]"
      style={
        {
          height: "clamp(190px, 21vw, 290px)",
          "--pink-hero-cols": gridColumnsFor(spotlight, count),
          transition: "grid-template-columns 1.1s cubic-bezier(.16,.84,.16,1)",
        } as React.CSSProperties
      }
    >
      {shown.map((panel, i) => (
        <div
          key={panel._id ?? i}
          role={hasCaptions && panel.caption ? "listitem" : undefined}
          aria-hidden={hasCaptions && !panel.caption ? "true" : undefined}
          className="pink-anim-panel relative overflow-hidden"
          style={{
            animationDelay: `${PANEL_ENTER_DELAYS_S[i] ?? 0.55}s`,
            // Panels sit on the pink wash so an image-less tile reads as a
            // designed empty slot on the white hero rather than a dark void.
            // (Was --pink-ink-panel while the hero was a dark band.)
            // Original note: without a background the strip
            // renders as light blocks against the dark hero whenever a panel has
            // no image yet (a fresh store), which breaks the hero band.
            background: "var(--pink-panel)",
          }}
        >
          {/* Scroll-parallax layer */}
          <div ref={setScrollLayerRef(i)} className="absolute inset-0">
            {/* Mousemove-parallax layer */}
            <div ref={setMouseLayerRef(i)} className="absolute inset-0">
              {/* Ken-burns layer */}
              {/* No image yet → the template's own paper-surface fallback fills
                  the tile. The caption is already rendered as the overlay chip
                  below, so it is not duplicated here. */}
              {panel.image ? (
                <div className="absolute inset-0">
                  <Image
                    src={panel.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              ) : (
                <PinkImageFallback surface="paper" className="absolute inset-0" />
              )}
            </div>
          </div>

          {panel.caption && (
            <span
              className="pink-display absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate px-2.5 py-1.5 text-[12px] font-medium"
              style={{
                background: "var(--pink-scrim)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                color: "var(--pink-petal-badge)",
              }}
            >
              {panel.caption}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
