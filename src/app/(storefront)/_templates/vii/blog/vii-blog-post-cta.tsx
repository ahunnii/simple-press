"use client";

import Link from "next/link";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  overline: string;
  heading: string;
  body: string;
  buttonText?: string;
  buttonLink?: string;
};

/**
 * ViiBlogPostCta — a calm, cream editorial sign-off that closes blog posts.
 *
 * Replaces the heavy navy ViiContactCtaSection with a quiet centered block
 * that sits naturally after "More from the Blog." No phone/email/image.
 */
export function ViiBlogPostCta({ overline, heading, body, buttonText, buttonLink }: Props) {
  const { ref, visible } = useViiReveal(0.1);

  return (
    <section
      aria-labelledby="blog-post-cta-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(56px,8vw,88px) clamp(24px,6vw,96px)",
      }}
    >
      <div
        ref={ref}
        className={`vii-reveal${visible ? " is-visible" : ""}`}
        style={{
          maxWidth: 640,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {overline && (
          <ViiOverline tone="light" align="center" style={{ marginBottom: 24 }}>
            {overline}
          </ViiOverline>
        )}

        {heading && (
          <h2
            id="blog-post-cta-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(24px,3vw,36px)",
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: "var(--vii-navy)",
              margin: "0 0 16px",
              textWrap: "balance",
            }}
          >
            {heading}
          </h2>
        )}

        {body && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(14px,1.3vw,16px)",
              lineHeight: 1.7,
              color: "var(--vii-ink-soft)",
              maxWidth: 520,
              margin: "0 auto 36px",
            }}
          >
            {body}
          </p>
        )}

        <Link
          href={buttonLink ?? "/contact"}
          className="vii-cta-btn"
          style={{
            position: "relative",
            overflow: "hidden",
            display: "inline-flex",
            alignItems: "center",
            padding: "14px 32px",
            background: "var(--vii-copper-deep)",
            color: "var(--vii-paper)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            textDecoration: "none",
            borderRadius: "var(--radius)",
            transition:
              "background 0.3s var(--vii-ease), opacity 0.3s var(--vii-ease)",
          }}
        >
          {buttonText ?? "Book a visit"}
        </Link>
      </div>
    </section>
  );
}
