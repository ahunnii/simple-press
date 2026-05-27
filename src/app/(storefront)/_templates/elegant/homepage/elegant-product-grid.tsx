"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";

import { ElegantProductCard } from "../shared/elegant-product-card";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";

function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export function ElegantProductGrid({
  homepage,
  productsTagline,
  productsTitle,
  productsDescription,
  productsButtonText,
  productsButtonLink,
}: {
  homepage: RouterOutputs["business"]["getHomepage"];
  productsTagline?: string;
  productsTitle?: string;
  productsDescription?: string;
  productsButtonText?: string;
  productsButtonLink?: string;
}) {
  const { ref: headerRef, visible: headerVisible } = useReveal();
  const { ref: gridRef, visible: gridVisible } = useReveal();

  const products = homepage?.products ?? [];

  const revealStyle = (delay: number): React.CSSProperties => ({
    opacity: headerVisible ? 1 : 0,
    transform: headerVisible ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
  });

  return (
    <section
      style={{
        padding: "80px 40px",
        background: "var(--el-cream, #f5f1ea)",
      }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        {/* Section header */}
        <div
          ref={headerRef}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 48,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={revealStyle(0)}>
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              >
                {productsTagline ?? "Our Products"}
              </span>
            </div>
            <div style={revealStyle(0.1)}>
              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontWeight: 400,
                  fontSize: "clamp(40px, 5.5vw, 72px)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.01em",
                  marginTop: 14,
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                {productsTitle ?? "Featured"}{" "}
                <em style={{ fontStyle: "italic" }}>for you</em>.
              </h2>
            </div>
            {productsDescription && (
              <div style={revealStyle(0.18)}>
                <p
                  style={{
                    marginTop: 12,
                    maxWidth: 520,
                    fontSize: 17,
                    lineHeight: 1.6,
                    color: "var(--el-ink-soft, #6b6659)",
                    fontFamily: "var(--font-sans, sans-serif)",
                  }}
                >
                  {productsDescription}
                </p>
              </div>
            )}
          </div>

          <div style={revealStyle(0.2)}>
            <Link
              href={productsButtonLink ?? "/shop"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--el-ink, #1c1a17)",
                textDecoration: "none",
                fontFamily: "var(--font-sans, sans-serif)",
              }}
            >
              {productsButtonText ?? "View all"}
              <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 32,
          }}
        >
          {products.map((product, i) => (
            <ElegantProductCard
              key={product.id}
              product={product}
              index={i}
              isVisible={gridVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
