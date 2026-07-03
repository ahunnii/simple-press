"use client";

import Image from "next/image";
import Link from "next/link";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

export type PromoHalf = {
  overline: string;
  heading: string;
  accent: string;
  body: string;
  image: string;
  buttonLabel: string;
  buttonLink: string;
};

type Props = {
  left: PromoHalf;
  right: PromoHalf;
};

export function ViiShopPromoBand({ left, right }: Props) {
  const { ref: leftRef, visible: leftVisible } = useViiReveal(0.08);
  const { ref: rightRef, visible: rightVisible } = useViiReveal(0.08);

  const hasLeft = left.heading.trim().length > 0;
  const hasRight = right.heading.trim().length > 0;

  // If neither half has a heading, render nothing.
  if (!hasLeft && !hasRight) return null;

  // Determine grid columns: single column if only one half has content.
  const columnCount = hasLeft && hasRight ? 2 : 1;

  return (
    <section aria-label="Gift cards and haircare">
      <div
        className="vii-shop-promo-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        }}
      >
        {/* ── Left half — navy room (gift cards) ── */}
        {hasLeft && (
          <div
            style={{
              background: "var(--vii-navy)",
              padding: "clamp(56px, 8vw, 96px) clamp(24px, 6vw, 72px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              ref={leftRef}
              className={`vii-reveal${leftVisible ? " is-visible" : ""}`}
              style={{ maxWidth: 440 }}
            >
              {left.image.trim() && (
                <div
                  style={{
                    position: "relative",
                    width: "auto",
                    height: "clamp(40px, 6vw, 64px)",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Image
                    src={left.image}
                    alt=""
                    fill
                    sizes="200px"
                    style={{
                      objectFit: "contain",
                      objectPosition: "left center",
                    }}
                  />
                </div>
              )}

              {left.overline && (
                <ViiOverline
                  tone="dark"
                  align="left"
                  style={{ marginBottom: 20 }}
                >
                  {left.overline}
                </ViiOverline>
              )}

              <h2
                id="vii-shop-promo-left-heading"
                style={
                  {
                    fontFamily: "var(--font-serif)",
                    fontWeight: 400,
                    fontSize: "clamp(28px, 3.6vw, 48px)",
                    lineHeight: 1.1,
                    color: "var(--vii-paper)",
                    margin: 0,
                    textWrap: "balance",
                  } as React.CSSProperties
                }
              >
                {left.heading}
                {left.heading && left.accent ? " " : ""}
                {left.accent && (
                  <em
                    style={{
                      fontStyle: "italic",
                      color: "var(--vii-copper-light)",
                    }}
                  >
                    {left.accent}
                  </em>
                )}
              </h2>

              {left.body && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    lineHeight: 1.6,
                    letterSpacing: "0.02em",
                    color: "var(--vii-paper)",
                    opacity: 0.82,
                    margin: "20px 0 0",
                    maxWidth: 440,
                  }}
                >
                  {left.body}
                </p>
              )}

              {left.buttonLabel.trim() && left.buttonLink.trim() && (
                <div style={{ marginTop: "clamp(28px, 4vw, 40px)" }}>
                  <Link
                    href={left.buttonLink}
                    className="vii-cta-btn"
                    style={{
                      display: "inline-block",
                      position: "relative",
                      overflow: "hidden",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--vii-paper)",
                      background: "var(--vii-copper-deep)",
                      padding: "16px 36px",
                      borderRadius: "var(--radius, 0.2rem)",
                      textDecoration: "none",
                    }}
                  >
                    {left.buttonLabel}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Right half — cream room (haircare) ── */}
        {hasRight && (
          <div
            style={{
              background: "var(--vii-cream)",
              padding: "clamp(56px, 8vw, 96px) clamp(24px, 6vw, 72px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              ref={rightRef}
              className={`vii-reveal${rightVisible ? " is-visible" : ""}`}
              style={{ maxWidth: 440 }}
            >
              {right.image.trim() && (
                <div
                  style={{
                    position: "relative",
                    width: "auto",
                    height: "clamp(40px, 6vw, 64px)",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Image
                    src={right.image}
                    alt={right.heading}
                    fill
                    sizes="200px"
                    style={{
                      objectFit: "contain",
                      objectPosition: "left center",
                    }}
                  />
                </div>
              )}

              {right.overline && (
                <ViiOverline
                  tone="light"
                  align="left"
                  style={{ marginBottom: 20 }}
                >
                  {right.overline}
                </ViiOverline>
              )}

              <h2
                id="vii-shop-promo-right-heading"
                style={
                  {
                    fontFamily: "var(--font-serif)",
                    fontWeight: 400,
                    fontSize: "clamp(28px, 3.6vw, 48px)",
                    lineHeight: 1.1,
                    color: "var(--vii-navy)",
                    margin: 0,
                    textWrap: "balance",
                  } as React.CSSProperties
                }
              >
                {right.heading}
                {right.heading && right.accent ? " " : ""}
                {right.accent && (
                  <em
                    style={{ fontStyle: "italic", color: "var(--vii-copper)" }}
                  >
                    {right.accent}
                  </em>
                )}
              </h2>

              {right.body && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    lineHeight: 1.6,
                    letterSpacing: "0.02em",
                    color: "var(--vii-ink-soft)",
                    margin: "20px 0 0",
                    maxWidth: 440,
                  }}
                >
                  {right.body}
                </p>
              )}

              {right.buttonLabel.trim() && right.buttonLink.trim() && (
                <div style={{ marginTop: "clamp(28px, 4vw, 40px)" }}>
                  <Link
                    href={right.buttonLink}
                    className="vii-cta-btn"
                    style={{
                      display: "inline-block",
                      position: "relative",
                      overflow: "hidden",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--vii-paper)",
                      background: "var(--vii-copper-deep)",
                      padding: "16px 36px",
                      borderRadius: "var(--radius, 0.2rem)",
                      textDecoration: "none",
                    }}
                  >
                    {right.buttonLabel}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .vii-shop-promo-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
