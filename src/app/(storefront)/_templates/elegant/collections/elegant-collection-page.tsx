"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

export function ElegantCollectionPage({
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const [shown, setShown] = useState(false);
  const productsReveal = useScrollReveal();
  const othersReveal = useScrollReveal();

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p): p is NonNullable<typeof p> => p != null);

  const others = (additionalCollections ?? [])
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 3);

  const maskStyle = (delay: number): React.CSSProperties => ({
    display: "block",
    transform: shown ? "translateY(0)" : "translateY(110%)",
    transition: `transform 1.1s ${easeOut} ${delay}s`,
  });

  const fadeStyle = (delay: number): React.CSSProperties => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
  });

  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)" }}>
      {/* ── Hero ── */}
      <section style={{ padding: "24px 40px 40px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          {/* Back link */}
          <div style={fadeStyle(0)}>
            <Link href="/collections" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              textDecoration: "none",
              marginBottom: 32,
              transition: `color 0.3s ${ease}`,
            }}>
              <ArrowLeft style={{ width: 13, height: 13 }} />
              All collections
            </Link>
          </div>

          {/* Editorial hero: text left / image right */}
          <div
            className="el-collection-hero"
            style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56, alignItems: "center" }}
          >
            <div>
              <div style={fadeStyle(0.05)}>
                <span style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}>
                  Collection · {products.length} {products.length === 1 ? "item" : "items"}
                </span>
              </div>

              <h1 style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontWeight: 400,
                fontSize: "clamp(48px, 7vw, 96px)",
                lineHeight: 0.95,
                letterSpacing: "-0.01em",
                marginTop: 14,
                color: "var(--el-ink, #1c1a17)",
              }}>
                {collection.name.split(" ").map((word, i, arr) =>
                  i === arr.length - 1 ? (
                    <span key={i} style={{ display: "block", overflow: "hidden" }}>
                      <em style={{ ...maskStyle(0.08 + i * 0.1), fontStyle: "italic" }}>{word}</em>
                    </span>
                  ) : (
                    <span key={i} style={{ display: "block", overflow: "hidden" }}>
                      <span style={maskStyle(0.08 + i * 0.1)}>{word} </span>
                    </span>
                  )
                )}
              </h1>

              {collection.description && (
                <div style={fadeStyle(0.28)}>
                  <p style={{
                    marginTop: 22,
                    fontSize: 18,
                    color: "var(--el-ink-soft, #6b6659)",
                    lineHeight: 1.65,
                    maxWidth: 480,
                    fontFamily: "var(--font-sans, sans-serif)",
                  }}>
                    {collection.description}
                  </p>
                </div>
              )}

              <div style={fadeStyle(0.38)}>
                <Link href="/shop" style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 32,
                  padding: "14px 26px",
                  borderRadius: 999,
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  background: "transparent",
                  color: "var(--el-ink, #1c1a17)",
                  border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                  textDecoration: "none",
                  fontFamily: "var(--font-sans, sans-serif)",
                  transition: `background 0.4s ${ease}, color 0.4s ${ease}`,
                }} className="el-btn-ghost">
                  Continue browsing
                  <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
                </Link>
              </div>
            </div>

            {/* Hero image */}
            <div style={{
              ...fadeStyle(0.2),
              position: "relative",
              aspectRatio: "4/5",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--el-cream-2, #ebe6dc)",
            }}>
              {collection.imageUrl && (
                <Image
                  src={collection.imageUrl}
                  alt={collection.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 800px) 100vw, 50vw"
                />
              )}
            </div>
          </div>
        </div>

      </section>

      {/* ── Products ── */}
      <section ref={productsReveal.ref} style={{ padding: "60px 40px 80px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div style={{
            opacity: productsReveal.visible ? 1 : 0,
            transform: productsReveal.visible ? "translateY(0)" : "translateY(24px)",
            transition: `opacity 0.9s ${easeOut}, transform 0.9s ${easeOut}`,
            marginBottom: 40,
          }}>
            <span style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              display: "block",
              marginBottom: 14,
            }}>
              What&apos;s inside
            </span>
            <h2 style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4vw, 52px)",
              lineHeight: 1.05,
              color: "var(--el-ink, #1c1a17)",
            }}>
              The <em style={{ fontStyle: "italic" }}>{products.length} pieces</em>.
            </h2>
          </div>

          {products.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <p style={{
                fontFamily: "var(--font-serif, serif)",
                fontSize: 28,
                color: "var(--el-ink, #1c1a17)",
                marginBottom: 10,
              }}>
                Nothing here yet.
              </p>
              <Link href="/shop" style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
                textDecoration: "none",
              }}>
                Browse all products →
              </Link>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 32,
            }}>
              {products.map((product, i) => {
                const displayPrice = product.variants[0]?.price ?? product.price;
                const image = product.images[0]?.url ?? "/placeholder.svg";

                return (
                  <Link
                    key={product.id}
                    href={`/shop/${product.slug}`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      opacity: productsReveal.visible ? 1 : 0,
                      transform: productsReveal.visible ? "translateY(0)" : "translateY(24px)",
                      transition: `opacity 0.7s ${easeOut} ${i * 80}ms, transform 0.7s ${easeOut} ${i * 80}ms`,
                    }}
                    className="el-collection-product-card group"
                  >
                    {/* Image */}
                    <div style={{
                      position: "relative",
                      aspectRatio: "4/5",
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "var(--el-cream-2, #ebe6dc)",
                    }}>
                      <Image
                        src={image}
                        alt={product.name}
                        fill
                        className="object-cover"
                        style={{ transition: `transform 1.2s ${ease}` }}
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    </div>
                    {/* Meta */}
                    <div style={{
                      marginTop: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 12,
                    }}>
                      <div style={{
                        fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                        fontSize: 20,
                        fontWeight: 500,
                        lineHeight: 1.2,
                        color: "var(--el-ink, #1c1a17)",
                      }}>
                        {product.name}
                      </div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        color: "var(--el-ink, #1c1a17)",
                      }}>
                        {formatPrice(displayPrice)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </section>

      {/* ── Other collections ── */}
      {others.length > 0 && (
        <section
          ref={othersReveal.ref}
          style={{ padding: "80px 40px", background: "var(--el-paper, #fbf8f2)" }}
        >
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <div style={{
              opacity: othersReveal.visible ? 1 : 0,
              transform: othersReveal.visible ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 0.9s ${easeOut}, transform 0.9s ${easeOut}`,
              marginBottom: 40,
            }}>
              <span style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
                display: "block",
                marginBottom: 14,
              }}>
                Other edits
              </span>
              <h3 style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontWeight: 400,
                fontSize: "clamp(28px, 3.4vw, 40px)",
                lineHeight: 1.05,
                color: "var(--el-ink, #1c1a17)",
              }}>
                Or try one of <em style={{ fontStyle: "italic" }}>these</em>.
              </h3>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 24,
            }}>
              {others.map((col, i) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    opacity: othersReveal.visible ? 1 : 0,
                    transform: othersReveal.visible ? "translateY(0)" : "translateY(24px)",
                    transition: `opacity 0.7s ${easeOut} ${i * 80}ms, transform 0.7s ${easeOut} ${i * 80}ms`,
                  }}
                  className="el-other-col group"
                >
                  <div style={{
                    position: "relative",
                    aspectRatio: "4/5",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "var(--el-cream-2, #ebe6dc)",
                  }}>
                    {col.imageUrl && (
                      <Image
                        src={col.imageUrl}
                        alt={col.name}
                        fill
                        className="object-cover"
                        style={{ transition: `transform 1.2s ${ease}` }}
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    )}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(180deg, transparent 50%, rgba(28,26,23,0.6) 100%)",
                    }} />
                    <div style={{
                      position: "absolute", left: 20, right: 20, bottom: 20,
                      color: "var(--el-paper, #fbf8f2)",
                    }}>
                      <div style={{
                        fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                        fontSize: 26,
                        fontWeight: 400,
                      }}>
                        {col.name}
                      </div>
                      <div style={{
                        fontFamily: "var(--font-mono, ui-monospace)",
                        fontSize: 10,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        marginTop: 4,
                        opacity: 0.75,
                        color: "var(--el-paper, #fbf8f2)",
                      }}>
                        {col._count.collectionProducts} items
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </section>
      )}
    </div>
  );
}
