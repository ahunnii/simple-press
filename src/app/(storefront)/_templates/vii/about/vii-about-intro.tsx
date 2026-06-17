"use client";

import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  overline: string;
  heading: string;
  headingAccent: string;
  body: string;
};

export function ViiAboutIntro({
  overline,
  heading,
  headingAccent,
  body,
}: Props) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.1);
  const { ref: bodyRef, visible: bodyVisible } = useViiReveal(0.1);

  return (
    <section
      aria-labelledby="about-intro-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div
          ref={headRef}
          className={`vii-reveal${headVisible ? " is-visible" : ""}`}
        >
          {overline && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
                marginBottom: 14,
              }}
            >
              {overline}
            </p>
          )}

          <h2
            id="about-intro-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5.5vw, 72px)",
              lineHeight: 1.05,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {heading}{" "}
            <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
              {headingAccent}
            </em>
          </h2>
        </div>

        {body && (
          <div
            ref={bodyRef}
            className={`vii-reveal${bodyVisible ? " is-visible" : ""}`}
            style={{ marginTop: 32 }}
          >
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.8,
                color: "var(--vii-ink-soft)",
                margin: 0,
              }}
            >
              {body}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
