"use client";

import { useEffect, useState } from "react";

import { cn } from "~/lib/utils";

/**
 * Client-testimonial carousel (design.md → Shared component inventory, and the
 * homepage / Reviews "Our Client Testimonials!" sections).
 *
 * The source shipped a frozen Squarespace carousel whose cards were positioned
 * with baked `matrix(...)` transforms and whose arrow buttons did nothing
 * (deviation #4 — "carousel … made functional"). This is the real thing:
 *
 *  - 3 cards visible from 1025px, 2 from 572px, 1 below — the widths are pure
 *    CSS, so the first server-rendered paint is already correct; JavaScript
 *    only supplies the index arithmetic and the arrow visibility.
 *  - The track moves by whole cards with a `translateX` transition. Under
 *    `prefers-reduced-motion: reduce` the transition is dropped and the track
 *    jumps instantly.
 *  - Both arrows are real `<button>`s (salmon discs, 48px → 60px) with
 *    labels, disabled at the ends, and the visible window is announced through
 *    a polite live region.
 */

const CARD_GAP_CLASS = "px-2.5";

type RelocationTestimonial = {
  id: string;
  text: string;
  customerName: string;
};

type Props = {
  testimonials: RelocationTestimonial[];
  className?: string;
};

/** Stroked arrow glyphs recovered from the source carousel markup. */
function ArrowIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 44 18"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-9 min-[1025px]:h-5 min-[1025px]:w-11"
    >
      {direction === "prev" ? (
        <>
          <path d="M9.90649 16.96L2.1221 9.17556L9.9065 1.39116" />
          <path d="M42.8633 9.18125L3.37868 9.18125" />
        </>
      ) : (
        <>
          <path d="M34.1477 1.39111L41.9321 9.17551L34.1477 16.9599" />
          <path d="M1.19088 9.16982H40.6755" />
        </>
      )}
    </svg>
  );
}

export function RelocationTestimonialCarousel({
  testimonials,
  className,
}: Props) {
  const [perView, setPerView] = useState(3);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Card widths are CSS; this only drives the index maths and the arrows.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1025px)");
    const tablet = window.matchMedia("(min-width: 572px)");
    const update = () => {
      setPerView(desktop.matches ? 3 : tablet.matches ? 2 : 1);
    };
    update();
    desktop.addEventListener("change", update);
    tablet.addEventListener("change", update);
    return () => {
      desktop.removeEventListener("change", update);
      tablet.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(motion.matches);
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);

  const maxIndex = Math.max(0, testimonials.length - perView);

  // Clamp when the breakpoint changes under a scrolled carousel.
  useEffect(() => {
    setIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  if (testimonials.length === 0) return null;

  const showArrows = testimonials.length > perView;
  const firstVisible = index + 1;
  const lastVisible = Math.min(index + perView, testimonials.length);

  return (
    <div
      className={cn("w-full", className)}
      role="group"
      aria-roledescription="carousel"
      aria-label="Client testimonials"
    >
      <div className="-mx-2.5 overflow-hidden">
        <ul
          className="flex list-none items-stretch"
          style={{
            transform: `translateX(calc(${index} * -100% / ${perView}))`,
            transition: reduceMotion
              ? "none"
              : "transform 0.5s var(--relocation-ease)",
          }}
        >
          {testimonials.map((testimonial) => (
            <li
              key={testimonial.id}
              className={cn(
                "w-full shrink-0 min-[572px]:w-1/2 min-[1025px]:w-1/3",
                CARD_GAP_CLASS,
              )}
            >
              <figure className="flex h-full flex-col justify-start bg-[var(--relocation-card)] p-[2.15rem] text-center min-[1025px]:p-[2.375rem]">
                <blockquote className="[font-family:var(--font-relocation-display)] text-[1.375rem] leading-[1.4375rem] font-semibold text-[var(--relocation-charcoal)] min-[1025px]:text-[1.6875rem] min-[1025px]:leading-[1.8125rem]">
                  {testimonial.text}
                </blockquote>
                <figcaption className="mt-2.5 [font-family:var(--font-relocation-body)] text-base leading-[1.625rem] text-[var(--relocation-ink)] min-[1025px]:text-[1.125rem] min-[1025px]:leading-[1.8125rem]">
                  {testimonial.customerName}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>

      <p aria-live="polite" className="sr-only">
        {`Showing testimonial${firstVisible === lastVisible ? "" : "s"} ${firstVisible}${
          firstVisible === lastVisible ? "" : ` to ${lastVisible}`
        } of ${testimonials.length}`}
      </p>

      {showArrows ? (
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous testimonials"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            className="relocation-arrow-disc flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-[var(--relocation-salmon)] text-[var(--relocation-paper)] disabled:cursor-not-allowed disabled:opacity-40 min-[1025px]:h-15 min-[1025px]:w-15"
          >
            <ArrowIcon direction="prev" />
          </button>
          <button
            type="button"
            aria-label="Next testimonials"
            disabled={index >= maxIndex}
            onClick={() =>
              setIndex((current) => Math.min(maxIndex, current + 1))
            }
            className="relocation-arrow-disc flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-[var(--relocation-salmon)] text-[var(--relocation-paper)] disabled:cursor-not-allowed disabled:opacity-40 min-[1025px]:h-15 min-[1025px]:w-15"
          >
            <ArrowIcon direction="next" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
