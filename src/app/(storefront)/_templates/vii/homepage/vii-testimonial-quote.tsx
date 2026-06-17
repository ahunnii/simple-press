"use client";

import Image from "next/image";

import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  quoteImage?: string;
  quoteText: string;
  quoteAuthor: string;
};

export function ViiTestimonialQuote({
  quoteImage,
  quoteText,
  quoteAuthor,
}: Props) {
  const { ref, visible } = useViiReveal(0.08);

  return (
    <section
      aria-label="Guest testimonial"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--vii-slate)",
        padding: "clamp(72px, 12vw, 140px) clamp(24px, 8vw, 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "clamp(360px, 45vw, 560px)",
      }}
    >
      {/* Background image */}
      {quoteImage && (
        <Image
          src={quoteImage}
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover", mixBlendMode: "overlay", opacity: 0.35 }}
          aria-hidden="true"
        />
      )}

      {/* Scrim */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(30,53,64,0.72)",
        }}
      />

      {/* Quote content */}
      <div
        ref={ref}
        className={`vii-reveal${visible ? " is-visible" : ""}`}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 800,
          textAlign: "center",
        }}
      >
        <blockquote
          style={{ margin: 0, padding: 0 }}
          cite={quoteAuthor ? undefined : undefined}
        >
          <p
            style={{
              fontFamily: "var(--font-vii-serif, serif)",
              fontSize: "clamp(22px, 3.2vw, 42px)",
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 1.45,
              color: "var(--vii-paper)",
              marginBottom: 32,
            }}
          >
            {quoteText}
          </p>

          {quoteAuthor && (
            <footer>
              <cite
                style={{
                  fontFamily: "var(--font-vii-sans, sans-serif)",
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--vii-tan)",
                  fontStyle: "normal",
                }}
              >
                — {quoteAuthor}
              </cite>
            </footer>
          )}
        </blockquote>
      </div>
    </section>
  );
}
