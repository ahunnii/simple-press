"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

type Testimonial = RouterOutputs["testimonial"]["list"][number];

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) { setVisible(true); io.disconnect(); }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div aria-label={`${count} out of 5 stars`} style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          aria-hidden={true}
          style={{ width: 13, height: 13, color: "var(--el-sage, #4a5240)", fill: "var(--el-sage, #4a5240)" }}
        />
      ))}
    </div>
  );
}

function TestimonialCard({
  testimonial,
  index,
  visible,
}: {
  testimonial: Testimonial;
  index: number;
  visible: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const initials = testimonial.customerName.slice(0, 1).toUpperCase();
  const attribution = [testimonial.customerTitle, testimonial.customerCompany]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      aria-label={`Review by ${testimonial.customerName}`}
      style={{
        background: "var(--el-paper, #fbf8f2)",
        border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
        padding: "28px 28px 24px",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        ...(reducedMotion ? {} : {
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${easeOut} ${(index % 3) * 80}ms, transform 0.7s ${easeOut} ${(index % 3) * 80}ms`,
        }),
      }}
    >
      <Stars />
      {testimonial.title && (
        <div style={{
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--el-ink-soft, #6b6659)",
        }}>
          {testimonial.title}
        </div>
      )}
      <p style={{
        fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
        fontSize: 21,
        lineHeight: 1.38,
        color: "var(--el-ink, #1c1a17)",
        flex: 1,
        fontStyle: "italic",
      }}>
        &ldquo;{testimonial.text}&rdquo;
      </p>

      {/* Author */}
      <div style={{
        marginTop: "auto",
        paddingTop: 14,
        borderTop: "1px solid var(--el-line-2, rgba(28,26,23,0.06))",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        {testimonial.photoUrls?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={testimonial.photoUrls[0]}
            alt={testimonial.customerName}
            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--el-cream-2, #ebe6dc)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-serif, serif)",
            fontStyle: "italic",
            fontSize: 16,
            color: "var(--el-ink-soft, #6b6659)",
            flexShrink: 0,
          }}>
            {initials}
          </div>
        )}
        <div>
          <div style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--el-ink, #1c1a17)",
            fontFamily: "var(--font-sans, sans-serif)",
          }}>
            {testimonial.customerName}
          </div>
          {attribution && (
            <div style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              marginTop: 2,
            }}>
              {attribution}
            </div>
          )}
        </div>
      </div>

      {/* Extra photos */}
      {testimonial.photoUrls && testimonial.photoUrls.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          {testimonial.photoUrls.slice(1, 5).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`Photo ${i + 1} from ${testimonial.customerName}`}
              style={{ width: 52, height: 52, borderRadius: 6, objectFit: "cover" }}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export function ElegantTestimonialsClient({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const [shown, setShown] = useState(false);
  const featuredReveal = useScrollReveal(0.08);
  const gridReveal = useScrollReveal(0.06);
  const ctaReveal = useScrollReveal(0.1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const maskStyle = (delay: number): React.CSSProperties =>
    reducedMotion
      ? { display: "block" }
      : {
          display: "block",
          transform: shown ? "translateY(0)" : "translateY(110%)",
          transition: `transform 1.1s ${easeOut} ${delay}s`,
        };

  const fadeStyle = (delay: number): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
        };

  // Pick the first testimonial as the hero quote, rest go in the grid
  const [heroTestimonial, ...gridTestimonials] = testimonials;

  if (testimonials.length === 0) {
    return (
      <div style={{ background: "var(--el-cream, #f5f1ea)", minHeight: "60vh" }}>
        <section style={{ padding: "48px 40px 80px" }}>
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <div style={fadeStyle(0)}>
              <span style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
              }}>
                Kind words
              </span>
            </div>
            <h1 style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(52px, 8vw, 110px)",
              lineHeight: 0.95,
              marginTop: 18,
              color: "var(--el-ink, #1c1a17)",
            }}>
              <span style={{ display: "block", overflow: "hidden" }}>
                <span style={maskStyle(0.08)}>In their <em style={{ fontStyle: "italic" }}>own</em> words.</span>
              </span>
            </h1>
            <p style={{
              marginTop: 48,
              fontFamily: "var(--font-serif, serif)",
              fontSize: 22,
              color: "var(--el-ink-soft, #6b6659)",
            }}>
              No testimonials yet — check back soon.
            </p>
            <div style={{ marginTop: 32 }}>
              <Link href="/" style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
                textDecoration: "none",
              }}>
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)" }}>
      {/* ── Hero ── */}
      <section style={{ padding: "48px 40px 40px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div style={fadeStyle(0)}>
            <span style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
            }}>
              Reviews · {testimonials.length} verified
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontWeight: 400,
            fontSize: "clamp(52px, 8vw, 118px)",
            lineHeight: 0.95,
            letterSpacing: "-0.01em",
            marginTop: 18,
            color: "var(--el-ink, #1c1a17)",
            maxWidth: 900,
          }}>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={maskStyle(0.08)}>In their</span>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <em style={{ ...maskStyle(0.2), fontStyle: "italic" }}>own</em>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={maskStyle(0.32)}>words.</span>
            </span>
          </h1>

          {/* Stars row */}
          <div style={fadeStyle(0.5)}>
            <div style={{
              marginTop: 28,
              display: "flex",
              gap: 20,
              alignItems: "center",
              flexWrap: "wrap",
            }}>
              <Stars count={5} />
              <span style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
              }}>
                {testimonials.length} verified review{testimonials.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hero quote (first testimonial) ── */}
      {heroTestimonial && (
        <section
          ref={featuredReveal.ref}
          style={{ padding: "60px 40px" }}
        >
          <div style={{ maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
            <p style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontStyle: "italic",
              fontSize: "clamp(26px, 3.8vw, 48px)",
              lineHeight: 1.2,
              color: "var(--el-ink-2, #2a2722)",
              ...(reducedMotion ? {} : {
                opacity: featuredReveal.visible ? 1 : 0,
                transform: featuredReveal.visible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.9s ${easeOut}, transform 0.9s ${easeOut}`,
              }),
            }}>
              <em>&ldquo;</em>{heroTestimonial.text}<em>&rdquo;</em>
            </p>
            <div style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              marginTop: 28,
              ...(reducedMotion ? {} : {
                opacity: featuredReveal.visible ? 1 : 0,
                transform: featuredReveal.visible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.9s ${easeOut} 0.15s, transform 0.9s ${easeOut} 0.15s`,
              }),
            }}>
              {heroTestimonial.customerName}
              {heroTestimonial.customerTitle ? ` · ${heroTestimonial.customerTitle}` : ""}
            </div>
          </div>
        </section>
      )}

      {/* ── Grid ── */}
      {gridTestimonials.length > 0 && (
        <section
          ref={gridReveal.ref}
          style={{ padding: "60px 40px 80px", background: "var(--el-paper, #fbf8f2)" }}
        >
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 24,
            }}>
              {gridTestimonials.map((t, i) => (
                <TestimonialCard
                  key={t.id}
                  testimonial={t}
                  index={i}
                  visible={gridReveal.visible}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* If only one testimonial (no grid), still show paper section */}
      {gridTestimonials.length === 0 && testimonials.length === 1 && (
        <section style={{ padding: "60px 40px 80px", background: "var(--el-paper, #fbf8f2)" }}>
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
              <TestimonialCard testimonial={testimonials[0]!} index={0} visible />
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section
        ref={ctaReveal.ref}
        style={{ padding: "80px 40px" }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontWeight: 400,
            fontSize: "clamp(32px, 4vw, 52px)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "var(--el-ink, #1c1a17)",
            marginBottom: 28,
            ...(reducedMotion ? {} : {
              opacity: ctaReveal.visible ? 1 : 0,
              transform: ctaReveal.visible ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 0.9s ${easeOut}, transform 0.9s ${easeOut}`,
            }),
          }}>
            Want to see for <em style={{ fontStyle: "italic" }}>yourself</em>?
          </h2>
          <div style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            flexWrap: "wrap",
            ...(reducedMotion ? {} : {
              opacity: ctaReveal.visible ? 1 : 0,
              transform: ctaReveal.visible ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 0.9s ${easeOut} 0.1s, transform 0.9s ${easeOut} 0.1s`,
            }),
          }}>
            <Link
              href="/shop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 26px",
                borderRadius: 999,
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                background: "var(--el-ink, #1c1a17)",
                color: "var(--el-paper, #fbf8f2)",
                textDecoration: "none",
                fontFamily: "var(--font-sans, sans-serif)",
                transition: `background 0.4s ${ease}`,
              }}
              className="el-cta-primary"
            >
              Shop the collection
              <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
            </Link>
            <Link
              href="/testimonials/submit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 26px",
                borderRadius: 999,
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                background: "transparent",
                color: "var(--el-ink, #1c1a17)",
                border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                textDecoration: "none",
                fontFamily: "var(--font-sans, sans-serif)",
                transition: `background 0.4s ${ease}, color 0.4s ${ease}`,
              }}
              className="el-cta-ghost"
            >
              Write a review
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
