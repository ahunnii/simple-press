"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  // Auto-advance every 5 s, matching the design
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const t = setInterval(
      () => setActive((x) => (x + 1) % testimonials.length),
      5000,
    );
    return () => clearInterval(t);
  }, [testimonials.length]);

  if (!testimonials.length) return null;

  return (
    <section className="px-6 py-16" {...sectionAttrs}>
      <div className="mx-auto max-w-3xl text-center">
        <p
          className="mb-8 font-mono text-[9.5px] tracking-[.28em] uppercase"
          style={{ color: "var(--vn-steel)" }}
        >
          {heading ?? "Worn by"}
        </p>

        {/* Quote carousel — stack all, fade active */}
        <div style={{ minHeight: "160px", position: "relative" }}>
          {testimonials.map((t, j) => (
            <div
              key={t.id}
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

        {/* Navigation dots */}
        {testimonials.length > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {testimonials.map((_, j) => (
              <button
                key={j}
                onClick={() => setActive(j)}
                aria-label={`Go to testimonial ${j + 1}`}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 9999,
                  background:
                    j === active ? "var(--vn-ink)" : "rgba(0,0,0,.18)",
                  border: "none",
                  cursor: "pointer",
                  transition: "background .3s",
                  padding: 0,
                }}
              />
            ))}
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
