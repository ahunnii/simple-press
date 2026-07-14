"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type Testimonial = RouterOutputs["testimonial"]["listRandom"][number];

type SledgeTestimonialsProps = {
  testimonials: Testimonial[];
  heading?: string;
  image?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function SledgeTestimonials({
  testimonials,
  heading,
  image,
  sectionAttrs,
}: SledgeTestimonialsProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  // Honor the user's reduced-motion preference (WCAG 2.3.3)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Auto-advance every 5 s (WCAG 2.2.2)
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
    <section className="sl-section-cream" {...sectionAttrs}>
      <div className="sl-container grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        {/* Left: text side */}
        <div>
          <h2
            className="sl-heading-xl font-heading"
            {...fieldAttr("sledge.homepage-testimonials-heading")}
          >
            {heading ?? "Testimonials"}
          </h2>

          {/* Quote carousel */}
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
                  "sl-testimonial-slide",
                  j === active ? "opacity-100" : "opacity-0",
                )}
              >
                {/* Red accent bar + italic quote */}
                <div className="">
                  <p className="sl-quote-body font-sans italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <p className="font-sans text-[13px] font-semibold tracking-wide text-[var(--sl-ink-soft)]">
                    — {t.customerName}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation dots + pause + Read More */}
          <div>
            {testimonials.length > 1 && (
              <div className="mb-5 flex items-center gap-2">
                {testimonials.map((_, j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setActive(j)}
                    aria-label={`Go to testimonial ${j + 1}`}
                    aria-current={j === active}
                    className={cn(
                      "sl-testimonial-dot",
                      j === active
                        ? "sl-testimonial-dot-active"
                        : "sl-testimonial-dot-inactive",
                    )}
                  />
                ))}
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
                    className="inline-flex size-5 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[var(--sl-coral)] transition-opacity hover:opacity-60"
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

            <Link href="/testimonials" className="sl-btn">
              Read More →
            </Link>
          </div>
        </div>

        {/* Right: product image */}
        {image && (
          <div className="sl-media-frame sl-media-frame-green">
            <Image
              src={image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}
      </div>
    </section>
  );
}
