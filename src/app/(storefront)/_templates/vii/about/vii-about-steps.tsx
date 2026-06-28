"use client";

import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  overline: string;
  heading: string;
  headingAccent: string;
  intro: string;
  steps: TemplateListRow[];
};

function StepRow({
  image,
  title,
  body,
  index,
}: {
  image: string;
  title: string;
  body: string;
  index: number;
}) {
  const reversed = index % 2 === 1;
  const number = String(index + 1).padStart(2, "0");

  return (
    <div
      className={`vii-reveal-item vii-step-row${reversed ? "is-reversed" : ""}`}
      style={
        {
          "--i": Math.min(index + 1, 7),
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "clamp(28px, 5vw, 72px)",
          alignItems: "center",
        } as React.CSSProperties
      }
    >
      {/* Media */}
      <div
        className="vii-step-media"
        style={{
          position: "relative",
          aspectRatio: "4/3",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          background: "var(--vii-tan)",
        }}
      >
        {image ? (
          <Image
            src={image}
            alt={title || `Facial step ${index + 1}`}
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

      {/* Text */}
      <div className="vii-step-text">
        <span
          aria-hidden="true"
          style={{
            display: "block",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(40px, 6vw, 84px)",
            lineHeight: 1,
            color: "var(--vii-copper)",
            marginBottom: 12,
          }}
        >
          {number}
        </span>

        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(24px, 3vw, 38px)",
            lineHeight: 1.1,
            color: "var(--vii-navy)",
            margin: "0 0 14px",
          }}
        >
          {title}
        </h3>

        {body && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(14px, 1.3vw, 16px)",
              lineHeight: 1.8,
              color: "var(--vii-ink-soft)",
              margin: 0,
              maxWidth: 460,
            }}
          >
            {body}
          </p>
        )}
      </div>
    </div>
  );
}

export function ViiAboutSteps({
  overline,
  heading,
  headingAccent,
  intro,
  steps,
}: Props) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.1);

  return (
    <section
      aria-labelledby="about-steps-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div
        ref={headRef}
        className={`vii-reveal-group${headVisible ? "is-visible" : ""}`}
        style={{ maxWidth: 1100, margin: "0 auto" }}
      >
        {/* Header */}
        <div
          className="vii-reveal-item"
          style={
            {
              "--i": 0,
              textAlign: "center",
              maxWidth: 680,
              margin: "0 auto clamp(48px, 7vw, 80px)",
            } as React.CSSProperties
          }
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

          <h2
            id="about-steps-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(34px, 5vw, 64px)",
              lineHeight: 1.06,
              color: "var(--vii-navy)",
              margin: intro ? "0 0 20px" : 0,
            }}
          >
            {heading}{" "}
            <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
              {headingAccent}
            </em>
          </h2>

          {intro && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(14px, 1.3vw, 16px)",
                lineHeight: 1.7,
                color: "var(--vii-ink-soft)",
                margin: 0,
              }}
            >
              {intro}
            </p>
          )}
        </div>

        {/* Zigzag step rows */}
        {steps.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(48px, 8vw, 104px)",
            }}
          >
            {steps.map((step, i) => (
              <StepRow
                key={step._id ?? i}
                index={i}
                image={typeof step.image === "string" ? step.image : ""}
                title={typeof step.title === "string" ? step.title : ""}
                body={typeof step.body === "string" ? step.body : ""}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .vii-step-row.is-reversed .vii-step-media { order: 2; }
        .vii-step-row.is-reversed .vii-step-text { order: 1; }
        @media (max-width: 768px) {
          .vii-step-row {
            grid-template-columns: 1fr !important;
          }
          .vii-step-row .vii-step-media { order: 1 !important; }
          .vii-step-row .vii-step-text { order: 2 !important; }
        }
      `}</style>
    </section>
  );
}
