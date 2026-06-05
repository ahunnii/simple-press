"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";

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
    <section
      style={{ background: "var(--sl-cream)", padding: "4rem 1.75rem" }}
      {...sectionAttrs}
    >
      <div
        className="grid grid-cols-1 items-center gap-12 md:grid-cols-2"
        style={{ maxWidth: "1100px", margin: "0 auto" }}
      >
        {/* Left: text side */}
        <div>
          <h2
            className="font-heading font-bold"
            style={{
              fontSize: "clamp(3rem, 7vw, 6rem)",
              color: "var(--sl-coral)",
              lineHeight: 1.05,
              marginBottom: "2rem",
            }}
          >
            {heading ?? "Testimonials"}
          </h2>

          {/* Quote carousel */}
          <div
            style={{
              minHeight: "160px",
              position: "relative",
              marginBottom: "1.5rem",
            }}
            aria-live="polite"
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
                  transition: "opacity 0.6s ease",
                }}
              >
                {/* Red accent bar + italic quote */}
                <div
                  style={{
                    borderLeft: "4px solid var(--sl-red)",
                    paddingLeft: "1.25rem",
                  }}
                >
                  <p
                    className="font-sans italic"
                    style={{
                      fontSize: "clamp(17.5px, 2.25vw, 21.25px)",
                      color: "var(--sl-ink)",
                      lineHeight: 1.85,
                      maxWidth: "52ch",
                    }}
                  >
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <p
                    className="font-sans font-semibold"
                    style={{
                      fontSize: "13px",
                      color: "var(--sl-ink-soft)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    — {t.customerName}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation dots + pause + Read More */}
          <div>
            {testimonials.length > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1.25rem",
                }}
              >
                {testimonials.map((_, j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setActive(j)}
                    aria-label={`Go to testimonial ${j + 1}`}
                    aria-current={j === active}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 9999,
                      background:
                        j === active ? "var(--sl-coral)" : "rgba(0,0,0,0.2)",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.3s",
                      padding: 0,
                    }}
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
                    className="inline-flex items-center justify-center transition-opacity hover:opacity-60"
                    style={{
                      width: 20,
                      height: 20,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                      color: "var(--sl-coral)",
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

            <Link href="/testimonials" className="sl-btn">
              Read More →
            </Link>
          </div>
        </div>

        {/* Right: product image */}
        {image && (
          <div
            style={{
              position: "relative",
              aspectRatio: "4/5",
              borderRadius: "0.75rem",
              overflow: "hidden",
              background: "var(--sl-green)",
            }}
          >
            <Image
              src={image}
              alt="Featured product"
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
