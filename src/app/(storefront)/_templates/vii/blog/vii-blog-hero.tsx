"use client";

import { ViiOverline } from "../shared/vii-overline";

type Props = {
  heading: string;
  headingAccent: string;
  intro: string;
  storyCount: number;
};

/**
 * ViiBlogHero — the Journal masthead.
 *
 * A type-led editorial masthead (not a generic centered-title-on-photo hero):
 * oversized Playfair display with a copper italic accent, framed by hairline
 * rules and a dateline. The photographic moment lives in the cover story below.
 */
export function ViiBlogHero({
  heading,
  headingAccent,
  intro,
  storyCount,
}: Props) {
  return (
    <section
      aria-label="The Journal"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(88px, 11vw, 168px) clamp(24px, 6vw, 96px) clamp(36px, 5vw, 64px)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Meta row above a hairline rule */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 24,
            flexWrap: "wrap",
            borderTop: "1px solid var(--vii-hairline)",
            paddingTop: 18,
          }}
        >
          <ViiOverline tone="light" align="left">
            The Journal
          </ViiOverline>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: "var(--vii-ink-soft)",
            }}
          >
            {storyCount} {storyCount === 1 ? "Story" : "Stories"} · Detroit
          </span>
        </div>

        {/* Oversized masthead title */}
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(50px, 9vw, 96px)",
            lineHeight: 0.98,
            letterSpacing: "-0.015em",
            color: "var(--vii-navy)",
            margin: "clamp(20px, 3vw, 40px) 0 0",
            textWrap: "balance",
          }}
        >
          {heading}
          {heading && headingAccent ? " " : ""}
          {headingAccent && (
            <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
              {headingAccent}
            </em>
          )}
        </h1>

        {/* Intro — narrow measure, offset right for editorial asymmetry */}
        {intro && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(15px, 1.5vw, 18px)",
              lineHeight: 1.7,
              color: "var(--vii-ink-soft)",
              margin: "clamp(24px, 3vw, 40px) 0 0 auto",
              maxWidth: "52ch",
            }}
          >
            {intro}
          </p>
        )}
      </div>
    </section>
  );
}
