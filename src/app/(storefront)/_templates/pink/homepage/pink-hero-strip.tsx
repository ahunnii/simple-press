"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

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
 *   3. Ken-burns — the innermost layer runs the shared `.pink-anim-ken` CSS
 *      animation (already neutralized under reduced motion by the global
 *      `.pink` reduced-motion block, same as every other `.pink-anim-*`).
 * The spotlight interval and the parallax listeners are explicitly gated on
 * `prefers-reduced-motion` in JS (a CSS-only gate can't stop a `setInterval`
 * or an event listener from doing work).
 */
export function PinkHeroStrip({ panels }: Props) {
  const shown = panels.slice(0, 4);
  const count = shown.length;

  const [spotlight, setSpotlight] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(false);

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

  // 1. Spotlight rotation.
  useEffect(() => {
    if (!motionEnabled || count === 0) return;
    const id = setInterval(() => {
      setSpotlight((i) => (i + 1) % count);
    }, SPOTLIGHT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [motionEnabled, count]);

  // 2. Parallax — mousemove (rAF-throttled) + scroll. Skipped under reduced
  // motion, and the mousemove listener is never attached on coarse pointers.
  useEffect(() => {
    if (!motionEnabled) return;
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

    return () => {
      if (!isCoarsePointer) {
        window.removeEventListener("mousemove", onMouseMove);
      }
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [motionEnabled, shown]);

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

  return (
    <div
      aria-hidden="true"
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
          className="pink-anim-panel relative overflow-hidden"
          style={{
            animationDelay: `${PANEL_ENTER_DELAYS_S[i] ?? 0.55}s`,
            // design.md: panels sit at --pink-ink-panel. Without this the strip
            // renders as light blocks against the dark hero whenever a panel has
            // no image yet (a fresh store), which breaks the hero band.
            background: "var(--pink-ink-panel)",
          }}
        >
          {/* Scroll-parallax layer */}
          <div ref={setScrollLayerRef(i)} className="absolute inset-0">
            {/* Mousemove-parallax layer */}
            <div ref={setMouseLayerRef(i)} className="absolute inset-0">
              {/* Ken-burns layer */}
              {/* No image yet → leave the dark panel bare rather than stretching
                  a light placeholder across the hero's dark band. */}
              {panel.image ? (
                <div className="pink-anim-ken absolute inset-0">
                  <Image
                    src={panel.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              ) : null}
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
