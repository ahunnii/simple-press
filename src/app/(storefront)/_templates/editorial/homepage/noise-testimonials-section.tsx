import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, StaggerContainer, StaggerItem } from "~/components/page-animations";

type Testimonial = RouterOutputs["testimonial"]["listRandom"][number];

type NoiseTestimonialsSectionProps = {
  heading?: string;
  testimonials: Testimonial[];
};

export function NoiseTestimonialsSection({
  heading,
  testimonials,
}: NoiseTestimonialsSectionProps) {
  if (!testimonials.length) return null;

  const displayHeading = heading ?? "Worn out loud.";

  return (
    <section
      className="border-y-2 border-foreground py-20 px-7"
      style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
    >
      <div className="mx-auto max-w-7xl">
        <FadeIn className="mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b pb-8" style={{ borderColor: "#2a2c30" }}>
          <div>
            <p
              className="mb-4 font-mono text-[9.5px] tracking-[0.4em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Section / 04 — Voices
            </p>
            <h2
              className="font-serif italic leading-none tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", letterSpacing: "-0.02em" }}
            >
              {displayHeading}
            </h2>
          </div>
          <Link
            href="/testimonials"
            className="inline-flex shrink-0 items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase transition-opacity hover:opacity-60"
            style={{ color: "var(--vn-bone)" }}
          >
            <span>All Reviews</span>
            <span className="h-px w-10" style={{ background: "var(--vn-bone)" }} />
          </Link>
        </FadeIn>

        <StaggerContainer
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.1}
        >
          {testimonials.map((t, i) => (
            <StaggerItem key={t.id}>
              <div
                className="flex flex-col gap-5 border-t pt-6"
                style={{ borderColor: "#2a2c30" }}
              >
                <p
                  className="font-serif italic text-xl leading-relaxed font-light"
                  style={{ color: "var(--vn-bone)", opacity: 0.85 }}
                >
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <p
                    className="font-mono text-[9.5px] tracking-[0.25em] uppercase"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    — {t.customerName}
                  </p>
                  <span
                    className="font-mono text-[9px] tracking-[0.14em]"
                    style={{ color: "var(--vn-steel-mist)", opacity: 0.5 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
