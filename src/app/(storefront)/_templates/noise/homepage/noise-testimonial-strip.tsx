"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr } from "~/lib/preview/section-attrs";

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

  // Honor the user's reduced-motion preference (WCAG 2.3.3)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Auto-advance every 5 s, matching the design.
  // Stops when paused by the user or when reduced motion is requested (WCAG 2.2.2).
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
        <p
          className="mb-8 font-mono text-[9.5px] tracking-[.28em] uppercase"
          style={{ color: "var(--vn-steel)" }}
          {...fieldAttr("noise.homepage-testimonials-heading")}
        >
          {heading ?? "Worn by"}
        </p>

        {/* Quote carousel — stack all, fade active */}
        {/* Only announce via live region when NOT auto-rotating (i.e. user paused, reduced motion, or navigating manually) */}
        <div
          style={{ minHeight: "160px", position: "relative" }}
          aria-live={
            paused || prefersReduced || testimonials.length <= 1
              ? "polite"
              : "off"
          }
          aria-atomic="true"
        >
          {testimonials.map((t, j) => (
            <div
              key={t.id}
              aria-hidden={j !== active}
              style={{
                position: "absolute",
                inset: 0,
                opacity: j === active ? 1 : 0,
                transition: "opacity .6s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <p
                className="font-serif leading-[1.45] tracking-tight italic"
                style={{
                  fontSize: "clamp(1.3rem, 2.5vw, 1.9rem)",
                  letterSpacing: "-0.01em",
                  color: "var(--vn-ink)",
                }}
              >
                &ldquo;{t.text}&rdquo;
              </p>
              <p
                className="font-mono text-[11px] tracking-[.18em] uppercase"
                style={{ color: "var(--vn-steel)" }}
              >
                — {t.customerName}
              </p>
            </div>
          ))}
        </div>

        {/* Navigation dots + pause control */}
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      width: 6,
                      height: 6,
                      borderRadius: 9999,
                      background:
                        j === active ? "var(--vn-ink)" : "rgba(0,0,0,.18)",
                      transition: "background .3s",
                      flexShrink: 0,
                    }}
                  />
                </button>
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
                className="inline-flex items-center justify-center transition-opacity hover:opacity-60"
                style={{
                  width: 18,
                  height: 18,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                  color: "var(--vn-steel)",
                }}
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
          className="mt-8 inline-block font-mono uppercase transition-opacity hover:opacity-60"
          style={{
            fontSize: "11px",
            letterSpacing: ".26em",
            borderBottom: "1px solid var(--vn-ink)",
            paddingBottom: "4px",
            color: "var(--vn-ink)",
          }}
        >
          Read all reviews →
        </Link>
      </div>
    </section>
  );
}
