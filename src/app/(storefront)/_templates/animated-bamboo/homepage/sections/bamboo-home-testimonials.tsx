import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { BambooGlyph } from "../../shared/bamboo-glyph";
import { BambooReveal, BambooRevealGroup } from "../../shared/bamboo-reveal";

/**
 * Testimonials — "What Our Customers Say" as speech bubbles
 * (`.bamboo-bubble`, ±1° alternating rotation, staggered reveal). DB
 * testimonials only, no invented quotes. Avatars are WREATH variants
 * (Andrew's decision, deviating from the mockup's plain sprout-mark/colored-
 * circle avatars): #1 is the brand wreath mark; #2/#3 are small in-page
 * circle SVGs layering `#wreathRing` over a terracotta / leaf-mid disc.
 */

type Testimonial = {
  id: string;
  text: string;
  customerName: string;
  customerTitle: string | null;
  customerCompany: string | null;
};

type TestimonialsProps = {
  sectionAttrs: Record<string, string>;
  headingFieldKey: string;
  heading: string;
  testimonials: Testimonial[];
};

function WreathAvatarDisc({ tint }: { tint: "terracotta" | "leaf-mid" }) {
  const fill =
    tint === "terracotta"
      ? "var(--bamboo-terracotta)"
      : "var(--bamboo-ill-leaf-mid)";
  return (
    <svg
      viewBox="-74 -60 118 104"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className="block h-full w-full"
    >
      <rect x={-74} y={-60} width={118} height={104} fill={fill} />
      <use href="#wreathRing" />
    </svg>
  );
}

export function BambooHomeTestimonials({
  sectionAttrs,
  headingFieldKey,
  heading,
  testimonials,
}: TestimonialsProps) {
  return (
    <section
      {...sectionAttrs}
      aria-labelledby="bamboo-testimonials-h"
      className="mx-auto w-[min(1200px,calc(100%-48px))] pb-[var(--bamboo-sp)]"
    >
      <BambooReveal className="mx-auto max-w-[660px] text-center">
        <h2
          id="bamboo-testimonials-h"
          {...fieldAttr(headingFieldKey)}
          className="font-heading text-[clamp(2rem,3.4vw,2.95rem)] text-[var(--bamboo-pine)]"
        >
          {heading}
        </h2>
      </BambooReveal>

      <BambooRevealGroup className="mt-[52px] grid items-start gap-7 md:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <div
            key={testimonial.id}
            className="bamboo-reveal-item"
            style={{ "--i": index } as React.CSSProperties}
          >
            <blockquote
              className="bamboo-bubble"
              data-rotate={index % 2 === 0 ? "left" : "right"}
            >
              <p className="text-[1.1rem] leading-[1.55] text-[var(--bamboo-ink)]">
                &ldquo;{testimonial.text}&rdquo;
              </p>
              <div className="mt-[22px] flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full">
                  {index % 3 === 0 ? (
                    <BambooGlyph id="s-wreath" className="h-full w-full" />
                  ) : (
                    <WreathAvatarDisc
                      tint={index % 3 === 1 ? "terracotta" : "leaf-mid"}
                    />
                  )}
                </div>
                <span className="text-[.95rem] font-medium text-[var(--bamboo-ink-soft)]">
                  {[
                    testimonial.customerName,
                    testimonial.customerTitle,
                    testimonial.customerCompany,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            </blockquote>
          </div>
        ))}
      </BambooRevealGroup>

      <BambooReveal className="mt-8 flex justify-center">
        <Link
          href="/testimonials"
          className="bamboo-swipe text-[var(--bamboo-pine)]"
        >
          Read All Testimonials →
        </Link>
      </BambooReveal>
    </section>
  );
}
