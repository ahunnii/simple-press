"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

type Testimonial = RouterOutputs["testimonial"]["listRandom"][number];

type NoiseTestimonialStripProps = {
  testimonials: Testimonial[];
  heading?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function NoiseTestimonialStrip({
  testimonials,
  heading,
  sectionAttrs,
}: NoiseTestimonialStripProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (testimonials.length <= 1 || paused || prefersReduced) return;
    const t = setInterval(
      () => setActive((x) => (x + 1) % testimonials.length),
      5000,
    );
    return () => clearInterval(t);
  }, [testimonials.length, paused, prefersReduced]);

  if (!testimonials.length) return null;

  return (
    <section className="px-6 py-16" {...sectionAttrs}>
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-8 font-mono text-[9.5px] tracking-[.28em] text-[var(--sl-green)] uppercase">
          {heading ?? "Worn by"}
        </p>

        <div
          className="sl-testimonial-stage"
          aria-live="polite"
          aria-atomic="true"
        >
          {testimonials.map((t, j) => (
            <div
              key={t.id}
              aria-hidden={j !== active}
              className={cn(
                "sl-testimonial-slide flex flex-col items-center gap-5",
                j === active ? "opacity-100" : "opacity-0",
              )}
            >
              <p className="font-serif text-[clamp(1.3rem,2.5vw,1.9rem)] leading-[1.45] tracking-[-0.01em] text-[var(--sl-ink)] italic">
                &ldquo;{t.text}&rdquo;
              </p>
              <p className="font-mono text-[11px] tracking-[.18em] text-[var(--sl-green)] uppercase">
                — {t.customerName}
              </p>
            </div>
          ))}
        </div>

        {testimonials.length > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              {testimonials.map((_, j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setActive(j)}
                  aria-label={`Go to testimonial ${j + 1}`}
                  aria-current={j === active}
                  className={cn(
                    "sl-testimonial-dot h-1.5 w-1.5",
                    j === active
                      ? "bg-[var(--sl-ink)]"
                      : "bg-black/18",
                  )}
                />
              ))}
            </div>
            {!prefersReduced && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={
                  paused
                    ? "Resume testimonial rotation"
                    : "Pause testimonial rotation"
                }
                aria-pressed={paused}
                className="inline-flex h-[18px] w-[18px] cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[var(--sl-green)] transition-opacity hover:opacity-60"
              >
                {paused ? (
                  <Play className="size-3" aria-hidden="true" />
                ) : (
                  <Pause className="size-3" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        )}

        <Link
          href="/testimonials"
          className="mt-8 inline-block border-b border-[var(--sl-ink)] pb-1 font-mono text-[11px] tracking-[.26em] text-[var(--sl-ink)] uppercase transition-opacity hover:opacity-60"
        >
          Read all reviews →
        </Link>
      </div>
    </section>
  );
}
