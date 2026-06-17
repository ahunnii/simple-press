"use client";

import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";
import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  overline: string;
  headingAccent: string;
  intro: string;
  cards: TemplateListRow[];
};

function JourneyCard({
  image,
  title,
  index,
}: {
  image: string;
  title: string;
  index: number;
}) {
  const { ref, visible } = useViiReveal(0.1);

  return (
    <div
      ref={ref}
      className={`vii-reveal${visible ? " is-visible" : ""}`}
      style={{
        transitionDelay: `${index * 0.08}s`,
        position: "relative",
        aspectRatio: "4/3",
        borderRadius: "0.15rem",
        overflow: "hidden",
        background: "var(--vii-tan)",
      }}
    >
      {image ? (
        <Image
          src={image}
          alt={title || `Journey category ${index + 1}`}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          style={{ objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, var(--vii-clay) 0%, var(--vii-tan) 100%)",
          }}
        />
      )}

      {/* Gradient overlay + title */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(30,53,64,0.70) 0%, rgba(30,53,64,0.05) 60%)",
          display: "flex",
          alignItems: "flex-end",
          padding: "20px 20px",
        }}
      >
        {title && (
          <p
            style={{
              fontFamily: "var(--font-vii-serif, serif)",
              fontSize: "clamp(16px, 2vw, 22px)",
              fontWeight: 400,
              color: "var(--vii-paper)",
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            {title}
          </p>
        )}
      </div>
    </div>
  );
}

export function ViiJourneysSection({
  overline,
  headingAccent,
  intro,
  cards,
}: Props) {
  const { ref: headerRef, visible: headerVisible } = useViiReveal(0.1);

  return (
    <section
      aria-labelledby="journeys-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div
          ref={headerRef}
          className={`vii-reveal${headerVisible ? " is-visible" : ""}`}
          style={{ textAlign: "center", marginBottom: "clamp(40px, 6vw, 64px)" }}
        >
          {overline && (
            <p
              style={{
                fontFamily: "var(--font-vii-sans, sans-serif)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
                marginBottom: 8,
              }}
            >
              {overline}
            </p>
          )}

          <h2
            id="journeys-heading"
            style={{
              fontFamily: "var(--font-vii-serif, serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5vw, 64px)",
              lineHeight: 1.1,
              color: "var(--vii-navy)",
              marginBottom: intro ? 20 : 0,
            }}
          >
            <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
              {headingAccent}
            </em>
          </h2>

          {intro && (
            <p
              style={{
                fontFamily: "var(--font-vii-sans, sans-serif)",
                fontSize: "clamp(14px, 1.3vw, 16px)",
                lineHeight: 1.7,
                color: "var(--vii-ink-soft)",
                maxWidth: 560,
                margin: "0 auto",
              }}
            >
              {intro}
            </p>
          )}
        </div>

        {/* Grid */}
        {cards.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "clamp(12px, 2vw, 24px)",
            }}
            className="vii-journeys-grid"
          >
            {cards.map((card, i) => (
              <JourneyCard
                key={card._id ?? i}
                image={typeof card.image === "string" ? card.image : ""}
                title={typeof card.title === "string" ? card.title : ""}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .vii-journeys-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
