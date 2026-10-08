"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "~/lib/utils";

type GloveCarouselProps = {
  children: ReactNode;
  /** Accessible name, e.g. "Charms". */
  label: string;
  /** Width classes for each slide. Default: 4-up desktop, 2-up tablet, peek on phones. */
  slideClassName?: string;
  className?: string;
  /** Show page dots under the track. */
  showDots?: boolean;
  /** Prev/next button treatment: "overlay" sits on the track edges, "inline" below. */
  buttons?: "overlay" | "none";
};

const DEFAULT_SLIDE =
  "w-[68%] sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-60px)/4)]";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Scroll-snap carousel with prev/next buttons and optional dots. The track is
 * a focusable region: Left/Right/Home/End scroll it; buttons disable at the
 * ends; smooth scrolling is dropped under reduced motion.
 */
export function GloveCarousel({
  children,
  label,
  slideClassName = DEFAULT_SLIDE,
  className,
  showDots = false,
  buttons = "overlay",
}: GloveCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const measure = useCallback(() => {
    const el = trackRef.current;
    // A hidden / not-yet-laid-out track has clientWidth 0, which would make
    // the page count Infinity (and Array.from throw "Invalid array length").
    if (!el || el.clientWidth <= 0) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
    const pages = Math.max(
      1,
      Math.ceil(el.scrollWidth / el.clientWidth - 0.05),
    );
    setPageCount(pages);
    setPage(max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (pages - 1)));
  }, []);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const scrollByPage = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * el.clientWidth * 0.9,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const scrollToPage = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({
      left: pageCount <= 1 ? 0 : (index / (pageCount - 1)) * max,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollByPage(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollByPage(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      scrollToPage(0);
    } else if (e.key === "End") {
      e.preventDefault();
      scrollToPage(pageCount - 1);
    }
  };

  const slides = Children.toArray(children);
  const showButtons = buttons === "overlay" && (canPrev || canNext);

  return (
    <div
      className={cn("relative", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div
        ref={trackRef}
        className="glove-carousel-track"
        tabIndex={0}
        onScroll={measure}
        onKeyDown={onKeyDown}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            className={cn("glove-carousel-slide", slideClassName)}
          >
            {slide}
          </div>
        ))}
      </div>

      {showButtons ? (
        <>
          <button
            type="button"
            className="glove-carousel-btn absolute top-1/2 left-0 z-10 -translate-x-1/3 -translate-y-1/2 max-sm:hidden"
            onClick={() => scrollByPage(-1)}
            disabled={!canPrev}
            aria-label={`Previous ${label}`}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="glove-carousel-btn absolute top-1/2 right-0 z-10 translate-x-1/3 -translate-y-1/2 max-sm:hidden"
            onClick={() => scrollByPage(1)}
            disabled={!canNext}
            aria-label={`Next ${label}`}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </>
      ) : null}

      {showDots && pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-1">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              aria-label={`Go to page ${i + 1}`}
              aria-current={i === page ? "true" : undefined}
              className="flex size-6 items-center justify-center"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block size-2.5 rounded-full border border-[var(--glove-primary)] transition-colors",
                  i === page && "bg-[var(--glove-primary)]",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
