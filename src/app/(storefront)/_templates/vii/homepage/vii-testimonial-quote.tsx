"use client";

import Image from "next/image";

import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

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
      aria-label="Customer testimonial"
      {...sectionGroupAttr("homepage", "testimonial")}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--vii-slate)",
        padding: "clamp(54px, 9vw, 105px) clamp(24px, 6vw, 90px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "clamp(270px, 34vw, 420px)",
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
          background: "color-mix(in srgb, var(--vii-navy) 72%, transparent)",
        }}
      />

      {/* Quote content */}
      <div
        ref={ref}
        className={cn("vii-reveal", visible && "is-visible")}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 640,
          textAlign: "center",
        }}
      >
        <blockquote style={{ margin: 0, padding: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(17px, 2.4vw, 32px)",
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 1.45,
              color: "var(--vii-paper)",
              marginBottom: 24,
            }}
          >
            {quoteText}
          </p>

          {quoteAuthor && (
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
                — {quoteAuthor}
              </cite>
            </footer>
          )}
        </blockquote>
      </div>
    </section>
  );
}
