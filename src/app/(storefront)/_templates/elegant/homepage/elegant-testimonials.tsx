/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { useReducedMotion } from "~/hooks/use-reduced-motion";

const testimonials = [
  {
    id: 1,
    name: "Sarah M.",
    location: "New York",
    rating: 5,
    text: "My skin has never felt so soft and nourished. The Radiance Serum is now a permanent part of my morning routine.",
    product: "Radiance Serum",
  },
  {
    id: 2,
    name: "Emma L.",
    location: "Los Angeles",
    rating: 5,
    text: "Finally, skincare that actually feels natural. No more harsh chemicals. My sensitive skin loves Boty products.",
    product: "Gentle Cleanser",
  },
  {
    id: 3,
    name: "Jessica R.",
    location: "Chicago",
    rating: 5,
    text: "The Hydra Cream is absolutely divine. It absorbs beautifully and keeps my skin hydrated all day long.",
    product: "Hydra Cream",
  },
  {
    id: 4,
    name: "Maria K.",
    location: "Miami",
    rating: 5,
    text: "I've tried countless serums but nothing compares to the glow I get from Boty. Absolutely transformative.",
    product: "Glow Serum",
  },
  {
    id: 5,
    name: "Sophie T.",
    location: "Seattle",
    rating: 5,
    text: "The packaging is beautiful and sustainable. I feel good knowing I'm choosing eco-friendly skincare.",
    product: "Night Cream",
  },
  {
    id: 6,
    name: "Anna P.",
    location: "Boston",
    rating: 5,
    text: "My acne-prone skin has cleared up since switching to Boty. Natural ingredients really make a difference.",
    product: "Gentle Cleanser",
  },
  {
    id: 7,
    name: "Claire B.",
    location: "Austin",
    rating: 5,
    text: "The texture of the Renewal Oil is perfection. It absorbs quickly and leaves my skin glowing.",
    product: "Renewal Oil",
  },
  {
    id: 8,
    name: "Lily W.",
    location: "Portland",
    rating: 5,
    text: "I love that Boty is cruelty-free and vegan. Great products that align with my values.",
    product: "Hydra Cream",
  },
  {
    id: 9,
    name: "Rachel D.",
    location: "Denver",
    rating: 5,
    text: "The scent is so subtle and natural. No overpowering fragrances, just pure botanical goodness.",
    product: "Radiance Serum",
  },
];

const TestimonialCard = ({
  testimonial,
}: {
  testimonial: (typeof testimonials)[0];
}) => (
  <div
    style={{
      marginBottom: 16,
      flexShrink: 0,
      borderRadius: 8,
      background: "var(--el-paper, #fbf8f2)",
      padding: 24,
      border: "1px solid var(--el-line-2, rgba(28,26,23,0.06))",
    }}
  >
    <p
      style={{
        fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
        fontSize: 18,
        lineHeight: 1.55,
        color: "var(--el-ink, #1c1a17)",
        marginBottom: 16,
        fontStyle: "italic",
      }}
    >
      &ldquo;{testimonial.text}&rdquo;
    </p>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--el-ink, #1c1a17)",
          }}
        >
          {testimonial.name}
        </p>
        <p
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--el-ink-soft, #6b6659)",
          }}
        >
          {testimonial.location}
        </p>
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: 9.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--el-ink-soft, #6b6659)",
          background: "var(--el-cream, #f5f1ea)",
          padding: "4px 10px",
          borderRadius: 999,
          whiteSpace: "nowrap",
        }}
      >
        {testimonial.product}
      </span>
    </div>
  </div>
);

export function ElegantTestimonials() {
  const [headerVisible, setHeaderVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const column1 = [testimonials[0], testimonials[3], testimonials[6]];
  const column2 = [testimonials[1], testimonials[4], testimonials[7]];
  const column3 = [testimonials[2], testimonials[5], testimonials[8]];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHeaderVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      if (headerRef.current) {
        observer.unobserve(headerRef.current);
      }
    };
  }, []);

  return (
    <section
      className="overflow-hidden py-24 pt-12 pb-24"
      style={{ background: "var(--el-cream-2, #ebe6dc)" }}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className="mb-16 text-center"
          style={{ position: "relative" }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              display: "block",
              marginBottom: 16,
              ...(reducedMotion
                ? {}
                : {
                    opacity: headerVisible ? 1 : 0,
                    transform: headerVisible
                      ? "translateY(0)"
                      : "translateY(24px)",
                    transition: "opacity 0.9s 0.1s, transform 0.9s 0.1s",
                  }),
            }}
          >
            Kind Words
          </span>
          <h2
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5vw, 64px)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              color: "var(--el-ink, #1c1a17)",
              ...(reducedMotion
                ? {}
                : {
                    opacity: headerVisible ? 1 : 0,
                    transform: headerVisible
                      ? "translateY(0)"
                      : "translateY(24px)",
                    transition: "opacity 0.9s 0.2s, transform 0.9s 0.2s",
                  }),
            }}
          >
            Loved by our community
          </h2>
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={
              isPaused
                ? "Resume scrolling testimonials"
                : "Pause scrolling testimonials"
            }
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
              background: "transparent",
              cursor: "pointer",
              color: "var(--el-ink-soft, #6b6659)",
            }}
            className="el-icon-btn"
          >
            {isPaused ? (
              <Play aria-hidden={true} size={14} />
            ) : (
              <Pause aria-hidden={true} size={14} />
            )}
          </button>
        </div>

        {/* Scrolling Testimonials */}
        <div className="relative">
          {/* Gradient Overlays */}
          <div className="from-background pointer-events-none absolute top-0 right-0 left-0 z-10 h-32 bg-gradient-to-b to-transparent" />
          <div className="from-background pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-32 bg-gradient-to-t to-transparent" />

          {/* Mobile - Single Column */}
          <div className="h-[600px] md:hidden">
            <div className="relative h-full overflow-hidden">
              <div
                className="animate-scroll-down hover:animate-scroll-down-slow"
                style={{ animationPlayState: isPaused ? "paused" : "running" }}
              >
                {testimonials.map((testimonial) => (
                  <TestimonialCard
                    key={`mobile-${testimonial.id}-first`}
                    testimonial={testimonial}
                  />
                ))}
                <div aria-hidden="true">
                  {testimonials.map((testimonial) => (
                    <TestimonialCard
                      key={`mobile-${testimonial.id}-dup`}
                      testimonial={testimonial}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop - Three Columns */}
          <div className="hidden h-[600px] gap-4 md:grid md:grid-cols-3">
            {/* Column 1 - Scrolling Down */}
            <div className="relative overflow-hidden">
              <div
                className="animate-scroll-down hover:animate-scroll-down-slow"
                style={{ animationPlayState: isPaused ? "paused" : "running" }}
              >
                {column1.map((testimonial) => (
                  <TestimonialCard
                    key={`col1-${testimonial?.id}-first`}
                    testimonial={
                      testimonial ?? {
                        id: 0,
                        name: "",
                        location: "",
                        rating: 0,
                        text: "",
                        product: "",
                      }
                    }
                  />
                ))}
                <div aria-hidden="true">
                  {column1.map((testimonial) => (
                    <TestimonialCard
                      key={`col1-${testimonial?.id}-dup`}
                      testimonial={
                        testimonial ?? {
                          id: 0,
                          name: "",
                          location: "",
                          rating: 0,
                          text: "",
                          product: "",
                        }
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2 - Scrolling Up */}
            <div className="relative overflow-hidden">
              <div
                className="animate-scroll-up hover:animate-scroll-up-slow"
                style={{ animationPlayState: isPaused ? "paused" : "running" }}
              >
                {column2.map((testimonial) => (
                  <TestimonialCard
                    key={`col2-${testimonial?.id}-first`}
                    testimonial={
                      testimonial ?? {
                        id: 0,
                        name: "",
                        location: "",
                        rating: 0,
                        text: "",
                        product: "",
                      }
                    }
                  />
                ))}
                <div aria-hidden="true">
                  {column2.map((testimonial) => (
                    <TestimonialCard
                      key={`col2-${testimonial?.id}-dup`}
                      testimonial={
                        testimonial ?? {
                          id: 0,
                          name: "",
                          location: "",
                          rating: 0,
                          text: "",
                          product: "",
                        }
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Column 3 - Scrolling Down */}
            <div className="relative overflow-hidden">
              <div
                className="animate-scroll-down hover:animate-scroll-down-slow"
                style={{ animationPlayState: isPaused ? "paused" : "running" }}
              >
                {column3.map((testimonial) => (
                  <TestimonialCard
                    key={`col3-${testimonial?.id}-first`}
                    testimonial={
                      testimonial ?? {
                        id: 0,
                        name: "",
                        location: "",
                        rating: 0,
                        text: "",
                        product: "",
                      }
                    }
                  />
                ))}
                <div aria-hidden="true">
                  {column3.map((testimonial) => (
                    <TestimonialCard
                      key={`col3-${testimonial?.id}-dup`}
                      testimonial={
                        testimonial ?? {
                          id: 0,
                          name: "",
                          location: "",
                          rating: 0,
                          text: "",
                          product: "",
                        }
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
