"use client";

import Image from "next/image";
import Link from "next/link";

import type { TemplateListRow } from "~/lib/template-fields";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";
import { ViiSection } from "../shared/vii-section";

type Props = {
  overline?: string;
  heading: string;
  cards: TemplateListRow[];
};

export function ViiCategorySection({ overline, heading, cards }: Props) {
  const { ref, visible } = useViiReveal(0.08);
  if (cards.length === 0) return null;

  return (
    <ViiSection tone="cream" aria-labelledby="vii-categories-heading">
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 12,
          marginBottom: "clamp(36px, 5vw, 56px)",
        }}
      >
        {overline && (
          <ViiOverline tone="light" align="center">
            {overline}
          </ViiOverline>
        )}
        {heading && (
          <h2
            id="vii-categories-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(30px, 4.5vw, 56px)",
              lineHeight: 1.05,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {heading}
          </h2>
        )}
      </div>

      {/* Category tiles */}
      <div
        ref={ref}
        className={`vii-reveal-group${visible ? "is-visible" : ""}`}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "clamp(16px, 2.5vw, 28px)",
        }}
      >
        {cards.map((card, i) => {
          const image = typeof card.image === "string" ? card.image : "";
          const title = typeof card.title === "string" ? card.title : "";
          const link =
            typeof card.link === "string" && card.link.trim()
              ? card.link
              : "/shop";
          return (
            <Link
              key={card._id ?? i}
              href={link}
              aria-label={title || `Category ${i + 1}`}
              className="group vii-reveal-item"
              style={
                {
                  "--i": Math.min(i, 7),
                  position: "relative",
                  display: "block",
                  overflow: "hidden",
                  borderRadius: "var(--radius)",
                  aspectRatio: "4 / 3",
                  background: "var(--vii-slate)",
                } as React.CSSProperties
              }
            >
              {image ? (
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                />
              ) : null}

              {/* Gradient + title overlay */}

              {title && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) 70%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 55%, transparent) 100%)",
                  }}
                />
              )}

              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                  textAlign: "center",
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(22px, 2.6vw, 34px)",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: "var(--vii-paper)",
                }}
              >
                {title}
              </span>
            </Link>
          );
        })}
      </div>
    </ViiSection>
  );
}
