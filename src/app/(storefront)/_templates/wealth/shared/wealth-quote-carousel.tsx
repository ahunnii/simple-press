"use client";

import { useId, useState } from "react";
import Image from "next/image";

import { cn } from "~/lib/utils";

export type WealthQuote = {
  id: string;
  quote: string;
  /** Attribution name (mono caps). */
  name: string;
  /** Role / program line beside the name. */
  role?: string | null;
  image?: string | null;
  imageAlt?: string | null;
  imagePosition?: string;
};

type WealthQuoteCarouselProps = {
  quotes: WealthQuote[];
  /** Accessible name of the carousel region. */
  label?: string;
  className?: string;
};

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        d={dir === "prev" ? "M11 3.5L5.5 9l5.5 5.5" : "M7 3.5L12.5 9 7 14.5"}
      />
    </svg>
  );
}

/**
 * One-at-a-time quote carousel (design.md redesign "wealth-quote-carousel"):
 * square photo on a sage offset block + italic PT Sans quote, prev/next
 * buttons, square dots, Arrow-key support and a polite live status. Slides
 * are stacked in one grid cell; inactive ones are `inert` + hidden, so only
 * the active slide is in the a11y tree. The first slide is active in the
 * SSR HTML. No auto-advance (motion-safe by design). Feed it APPROVED
 * testimonials only; render nothing upstream when there are none.
 */
export function WealthQuoteCarousel({
  quotes,
  label = "Quotes",
  className,
}: WealthQuoteCarouselProps) {
  const [index, setIndex] = useState(0);
  // Announce only after the visitor moves the carousel, never on load.
  const [status, setStatus] = useState("");
  const baseId = useId();

  if (quotes.length === 0) return null;

  const count = quotes.length;
  const hasImages = quotes.some((q) => !!q.image?.trim());

  const go = (next: number) => {
    const i = (next + count) % count;
    setIndex(i);
    setStatus(`Quote ${i + 1} of ${count}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className={cn(
        "wealth-carousel",
        hasImages && "wealth-carousel--images",
        className,
      )}
      onKeyDown={onKeyDown}
    >
      <div className="wealth-carousel__track">
        {quotes.map((q, i) => {
          const active = i === index;
          const hasImage = !!q.image?.trim();
          return (
            <figure
              key={q.id}
              id={`${baseId}-slide-${i}`}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={active ? undefined : true}
              inert={!active}
              className={cn(
                "wealth-quote",
                !hasImage && "wealth-quote--noimage",
                active && "is-active",
              )}
            >
              {hasImage ? (
                <div className="wealth-quote__photo">
                  <Image
                    src={q.image ?? ""}
                    alt={q.imageAlt ?? ""}
                    fill
                    sizes="(min-width: 900px) 440px, 90vw"
                    style={
                      q.imagePosition
                        ? { objectPosition: q.imagePosition }
                        : undefined
                    }
                  />
                </div>
              ) : null}
              <div>
                <span className="wealth-quote__mark" aria-hidden="true">
                  &ldquo;
                </span>
                <blockquote className="wealth-quote__text">
                  <p>{q.quote}</p>
                </blockquote>
                <figcaption className="wealth-quote__by">
                  <span className="wealth-quote__name">{q.name}</span>
                  {q.role ? (
                    <span className="wealth-quote__role">{q.role}</span>
                  ) : null}
                </figcaption>
              </div>
            </figure>
          );
        })}
      </div>

      {count > 1 ? (
        <div className="wealth-carousel__controls">
          <div className="wealth-carousel__arrows">
            <button
              type="button"
              className="wealth-carousel__btn"
              aria-label="Previous quote"
              onClick={() => go(index - 1)}
            >
              <Chevron dir="prev" />
            </button>
            <button
              type="button"
              className="wealth-carousel__btn"
              aria-label="Next quote"
              onClick={() => go(index + 1)}
            >
              <Chevron dir="next" />
            </button>
          </div>
          <div className="wealth-dots">
            {quotes.map((q, i) => (
              <button
                key={q.id}
                type="button"
                aria-label={`Show quote ${i + 1} of ${count}`}
                aria-current={i === index ? "true" : "false"}
                aria-controls={`${baseId}-slide-${i}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {status}
          </p>
        </div>
      ) : null}
    </div>
  );
}
