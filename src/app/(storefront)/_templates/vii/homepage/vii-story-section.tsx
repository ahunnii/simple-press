"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { TemplateListRow } from "~/lib/template-fields";

import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  heading: string;
  headingAccent: string;
  intro: string;
  cards: TemplateListRow[];
};

export function ViiStorySection({
  heading,
  headingAccent,
  intro,
  cards,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { ref: textRef, visible: textVisible } = useViiReveal(0.1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const total = cards.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  // Pager display (1-based, zero-padded)
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section
      aria-labelledby="story-heading"
      style={{
        background: "var(--vii-navy)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "clamp(32px, 6vw, 80px)",
          alignItems: "center",
        }}
        className="vii-story-grid"
      >
        {/* ── Left: text column ── */}
        <div
          ref={textRef}
          className={`vii-reveal${textVisible ? "is-visible" : ""}`}
        >
          <h2
            id="story-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 60px)",
              lineHeight: 1.1,
              color: "var(--vii-paper)",
              marginBottom: 24,
            }}
          >
            {heading}{" "}
            <em
              style={{
                fontStyle: "italic",
                color: "var(--vii-copper-light)",
              }}
            >
              {headingAccent}
            </em>
          </h2>

          {intro && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(14px, 1.3vw, 16px)",
                lineHeight: 1.7,
                color: "var(--vii-tan)",
                maxWidth: 460,
              }}
            >
              {intro}
            </p>
          )}
        </div>

        {/* ── Right: carousel ── */}
        {total > 0 ? (
          <div>
            {/* Card display */}
            <div
              role="region"
              aria-label="Story image carousel"
              aria-live="polite"
              aria-atomic="true"
              tabIndex={0}
              onKeyDown={handleKeyDown}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "3/4",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                  background: "var(--vii-slate)",
                  transition: reducedMotion ? "none" : "opacity 0.4s ease",
                }}
              >
                {cards.map((card, i) => {
                  const image =
                    typeof card.image === "string" ? card.image : "";
                  const title =
                    typeof card.title === "string" ? card.title : "";
                  return (
                    <div
                      key={card._id ?? i}
                      aria-hidden={i !== current}
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: i === current ? 1 : 0,
                        transition: reducedMotion
                          ? "none"
                          : "opacity 0.5s ease",
                      }}
                    >
                      {image ? (
                        <Image
                          src={image}
                          alt={title || `Story card ${i + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          style={{ objectFit: "cover" }}
                          priority={i === 0}
                        />
                      ) : (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "var(--vii-slate)",
                          }}
                          aria-label={title || `Story card ${i + 1}`}
                        />
                      )}

                      {/* Title overlay */}
                      {title && (
                        <div
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: "32px 24px 24px",
                            background:
                              "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) 85%, transparent) 0%, transparent 100%)",
                          }}
                        >
                          <p
                            style={{
                              fontFamily: "var(--font-serif)",
                              fontSize: "clamp(16px, 2vw, 22px)",
                              fontWeight: 400,
                              color: "var(--vii-paper)",
                              margin: 0,
                              letterSpacing: "0.02em",
                            }}
                          >
                            {title}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              {/* Pager */}
              <span
                aria-live="polite"
                aria-atomic="true"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--vii-tan)",
                  letterSpacing: "0.1em",
                }}
              >
                {pad(current + 1)} / {pad(total)}
              </span>

              {/* Prev / Next */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous story card"
                  disabled={total <= 1}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border:
                      "1px solid color-mix(in srgb, var(--vii-tan) 35%, transparent)",
                    background: "transparent",
                    color: "var(--vii-tan)",
                    cursor: total <= 1 ? "default" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: total <= 1 ? 0.4 : 1,
                    transition: "background 0.2s ease, opacity 0.2s ease",
                  }}
                >
                  <ChevronLeft
                    aria-hidden={true}
                    style={{ width: 16, height: 16 }}
                  />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next story card"
                  disabled={total <= 1}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border:
                      "1px solid color-mix(in srgb, var(--vii-tan) 35%, transparent)",
                    background: "transparent",
                    color: "var(--vii-tan)",
                    cursor: total <= 1 ? "default" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: total <= 1 ? 0.4 : 1,
                    transition: "background 0.2s ease, opacity 0.2s ease",
                  }}
                >
                  <ChevronRight
                    aria-hidden={true}
                    style={{ width: 16, height: 16 }}
                  />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Responsive stacking styles */}
      <style>{`
        @media (max-width: 768px) {
          .vii-story-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
