"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Testimonial = RouterOutputs["testimonial"]["list"][number];

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  // Hero
  overline: string;
  heading: string;
  headingAccent: string;
  intro: string;
  emptyMessage: string;
  // CTA
  ctaHeading: string;
  ctaHeadingAccent: string;
  ctaBody: string;
  ctaButton: string;
  // Data
  testimonials: Testimonial[];
};

// ─── Flow block (masonry) ─────────────────────────────────────────────────────

function FlowBlock({ testimonial }: { testimonial: Testimonial }) {
  const date = new Date(testimonial.testimonialDate);
  const dateLabel = date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const attribution = [testimonial.customerTitle, testimonial.customerCompany]
    .filter(Boolean)
    .join(", ");

  const photos = testimonial.photoUrls.slice(0, 3);

  return (
    <div
      style={{
        breakInside: "avoid",
        marginBottom: "clamp(24px, 3.5vw, 44px)",
        paddingTop: "clamp(20px, 2.5vw, 28px)",
        borderTop:
          "1px solid var(--vii-hairline, color-mix(in srgb, var(--vii-navy) 10%, transparent))",
      }}
    >
      {/* Opening quotation mark */}
      <p
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 48,
          lineHeight: 1,
          color: "var(--vii-copper)",
          margin: "0 0 8px",
          userSelect: "none",
        }}
      >
        &ldquo;
      </p>

      {/* Optional title */}
      {testimonial.title && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--vii-ink-soft)",
            margin: "0 0 10px",
          }}
        >
          {testimonial.title}
        </p>
      )}

      {/* Quote text */}
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          lineHeight: 1.6,
          color: "var(--vii-navy)",
          margin: "0 0 20px",
        }}
      >
        {testimonial.text}
      </p>

      {/* Photos */}
      {photos.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {photos.map((url, i) => (
            <Image
              key={i}
              src={url}
              alt=""
              aria-hidden="true"
              width={52}
              height={52}
              style={{
                width: 52,
                height: 52,
                borderRadius: "var(--radius)",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Attribution */}
      <div>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--vii-ink-soft)",
            margin: 0,
          }}
        >
          {testimonial.customerName}
        </p>
        {attribution && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--vii-ink-soft)",
              margin: "3px 0 0",
            }}
          >
            {attribution}
          </p>
        )}
        <time
          dateTime={date.toISOString()}
          style={{
            display: "block",
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--vii-ink-soft)",
            marginTop: 6,
          }}
        >
          {dateLabel}
        </time>
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function ViiTestimonialsClient({
  overline,
  heading,
  headingAccent,
  intro,
  emptyMessage,
  ctaHeading,
  ctaHeadingAccent,
  ctaBody,
  ctaButton,
  testimonials,
}: Props) {
  const { ref: heroRef, visible: heroVisible } = useViiReveal(0.08);
  const { ref: featuredRef, visible: featuredVisible } = useViiReveal(0.08);
  const { ref: flowRef, visible: flowVisible } = useViiReveal(0.06);
  const { ref: ctaRef, visible: ctaVisible } = useViiReveal(0.1);
  const [ctaHovered, setCtaHovered] = useState(false);

  const featured = testimonials[0];
  const remaining = testimonials.slice(1);

  const featuredPhoto =
    featured && featured.photoUrls.length > 0 ? featured.photoUrls[0] : null;

  const featuredAttribution = featured
    ? [featured.customerTitle, featured.customerCompany]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div>
      {/* ── Hero (cream) ────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="vii-testimonials-heading"
        style={{
          background: "var(--vii-cream)",
          padding:
            "clamp(168px, 16vw, 208px) clamp(24px, 6vw, 96px) clamp(48px, 6vw, 72px)",
        }}
      >
        <div
          ref={heroRef}
          className={`vii-reveal${heroVisible ? "is-visible" : ""}`}
          style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}
        >
          {overline && (
            <ViiOverline
              align="center"
              tone="light"
              style={{ marginBottom: 14 }}
            >
              {overline}
            </ViiOverline>
          )}

          <h1
            id="vii-testimonials-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5.5vw, 64px)",
              lineHeight: 1.05,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {heading}{" "}
            <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
              {headingAccent}
            </em>
          </h1>

          {intro && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.8,
                color: "var(--vii-ink-soft)",
                maxWidth: "54ch",
                margin: "24px auto 0",
                textWrap: "balance",
              }}
            >
              {intro}
            </p>
          )}

          {testimonials.length > 0 && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
                margin: "20px 0 0",
              }}
            >
              {testimonials.length} verified review
              {testimonials.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </section>

      {/* ── Featured room (navy) — only when there are testimonials ─────────── */}
      {featured ? (
        <section
          aria-label="Featured testimonial"
          style={{
            background: "var(--vii-navy)",
            padding: "clamp(72px, 12vw, 140px) clamp(24px, 8vw, 120px)",
          }}
        >
          <div
            ref={featuredRef}
            className={`vii-reveal${featuredVisible ? "is-visible" : ""}`}
            style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}
          >
            {/* Optional photo */}
            {featuredPhoto && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 32,
                }}
              >
                <Image
                  src={featuredPhoto}
                  alt=""
                  aria-hidden="true"
                  width={84}
                  height={84}
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid var(--vii-copper-light)",
                  }}
                />
              </div>
            )}

            <blockquote style={{ margin: 0, padding: 0 }}>
              {/* Optional title above quote */}
              {featured.title && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--vii-copper-light)",
                    margin: "0 0 16px",
                  }}
                >
                  {featured.title}
                </p>
              )}

              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(22px, 3.2vw, 42px)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  lineHeight: 1.45,
                  color: "var(--vii-paper)",
                  margin: "0 0 32px",
                }}
              >
                {featured.text}
              </p>

              <footer>
                <cite
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--vii-tan)",
                    fontStyle: "normal",
                  }}
                >
                  — {featured.customerName}
                  {featuredAttribution ? `, ${featuredAttribution}` : ""}
                </cite>
              </footer>
            </blockquote>
          </div>
        </section>
      ) : (
        /* ── Empty state ──────────────────────────────────────────────────── */
        <section
          style={{
            background: "var(--vii-paper)",
            padding: "clamp(72px, 12vw, 140px) clamp(24px, 8vw, 120px)",
          }}
        >
          <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                color: "var(--vii-ink-soft)",
              }}
            >
              {emptyMessage}
            </p>
          </div>
        </section>
      )}

      {/* ── Masonry flow (paper) — only when remaining items exist ──────────── */}
      {remaining.length > 0 && (
        <section
          aria-label="Customer testimonials"
          style={{
            background: "var(--vii-paper)",
            padding:
              "clamp(56px, 8vw, 96px) clamp(24px, 6vw, 96px) clamp(64px, 9vw, 112px)",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div
              ref={flowRef}
              className={`vii-reveal${flowVisible ? "is-visible" : ""}`}
              style={{
                columns: "320px auto",
                columnGap: "clamp(24px, 3.5vw, 44px)",
              }}
            >
              {remaining.map((t) => (
                <FlowBlock key={t.id} testimonial={t} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA band ────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="vii-testimonials-cta-heading"
        style={{
          background: "var(--vii-cream)",
          padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
        }}
      >
        <div
          ref={ctaRef}
          className={`vii-reveal${ctaVisible ? "is-visible" : ""}`}
          style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}
        >
          <h2
            id="vii-testimonials-cta-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 52px)",
              lineHeight: 1.1,
              color: "var(--vii-navy)",
              margin: "0 0 20px",
            }}
          >
            {ctaHeading}{" "}
            <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
              {ctaHeadingAccent}
            </em>
          </h2>

          {ctaBody && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.75,
                color: "var(--vii-ink-soft)",
                maxWidth: "52ch",
                margin: "0 auto 32px",
              }}
            >
              {ctaBody}
            </p>
          )}

          <Link
            href="/testimonials/submit"
            onMouseEnter={() => setCtaHovered(true)}
            onMouseLeave={() => setCtaHovered(false)}
            onFocus={() => setCtaHovered(true)}
            onBlur={() => setCtaHovered(false)}
            style={{
              display: "inline-block",
              background: ctaHovered
                ? "var(--vii-copper)"
                : "var(--vii-copper-deep)",
              color: "var(--vii-paper)",
              padding: "16px 36px",
              borderRadius: "var(--radius)",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 0.3s ease",
            }}
          >
            {ctaButton}
          </Link>
        </div>
      </section>
    </div>
  );
}
