import Link from "next/link";

import { ViiReveal } from "../shared/vii-reveal";

/**
 * ViiCheckoutUnavailable — rendered inside ViiLayout when the store has not
 * yet connected Stripe. ViiLayout already provides the skip link, header,
 * and footer landmarks, so this component renders only its inner content.
 */
export function ViiCheckoutUnavailable() {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(64px, 10vw, 120px) clamp(24px, 6vw, 96px)",
        background: "var(--vii-cream)",
        minHeight: "60vh",
      }}
    >
      <ViiReveal style={{ maxWidth: 480, textAlign: "center" }}>
        {/* Decorative copper mark */}
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 32,
            height: 2,
            background: "var(--vii-copper)",
            marginBottom: 32,
          }}
        />

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: 500,
            lineHeight: 1.2,
            color: "var(--vii-navy)",
            marginBottom: 20,
          }}
        >
          Checkout unavailable
        </h1>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.6,
            letterSpacing: "0.02em",
            color: "var(--vii-ink-soft)",
            marginBottom: 40,
          }}
        >
          This store hasn&apos;t set up payment processing yet. Please contact
          the store owner.
        </p>

        <Link
          href="/shop"
          className="vii-cta-btn"
          style={{
            position: "relative",
            overflow: "hidden",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px 32px",
            background: "var(--vii-copper-deep)",
            color: "var(--vii-paper)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            borderRadius: "var(--radius)",
            textDecoration: "none",
            transition: "background 0.2s ease",
          }}
        >
          Back to shop
        </Link>
      </ViiReveal>
    </div>
  );
}
