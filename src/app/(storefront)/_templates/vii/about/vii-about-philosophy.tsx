"use client";

import Image from "next/image";

import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  overline: string;
  heading: string;
  headingAccent: string;
  body: string;
  philosophyImage?: string;
};

export function ViiAboutPhilosophy({
  overline,
  heading,
  headingAccent,
  body,
  philosophyImage,
}: Props) {
  const { ref: textRef, visible: textVisible } = useViiReveal(0.1);
  const { ref: imgRef, visible: imgVisible } = useViiReveal(0.1);

  return (
    <section
      aria-labelledby="about-philosophy-heading"
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div
        className="vii-about-philosophy-grid"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "clamp(32px, 5vw, 72px)",
          alignItems: "center",
        }}
      >
        {/* Text */}
        <div
          ref={textRef}
          className={`vii-reveal${textVisible ? " is-visible" : ""}`}
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
            id="about-philosophy-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.08,
              color: "var(--vii-navy)",
              margin: "0 0 24px",
            }}
          >
            {heading}{" "}
            <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
              {headingAccent}
            </em>
          </h2>

          {body && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(14px, 1.3vw, 16px)",
                lineHeight: 1.8,
                color: "var(--vii-ink-soft)",
                margin: 0,
              }}
            >
              {body}
            </p>
          )}
        </div>

        {/* Image */}
        <div
          ref={imgRef}
          className={`vii-reveal${imgVisible ? " is-visible" : ""}`}
          style={{
            position: "relative",
            aspectRatio: "4/5",
            borderRadius: "0.2rem",
            overflow: "hidden",
            background: "var(--vii-tan)",
          }}
        >
          {philosophyImage?.trim() ? (
            <Image
              src={philosophyImage}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, var(--vii-clay) 0%, var(--vii-tan) 100%)",
              }}
            />
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .vii-about-philosophy-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
