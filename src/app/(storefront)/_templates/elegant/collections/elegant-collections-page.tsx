"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultCollectionsPageTemplateProps } from "../../types";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

// Alternating mosaic column spans (12-col grid)
const SPANS = ["span 8", "span 4", "span 4", "span 8", "span 6", "span 6"];
const ASPECTS = ["5/4", "4/5", "4/5", "5/4", "5/4", "5/4"];

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

export function ElegantCollectionsPage({ collections }: DefaultCollectionsPageTemplateProps) {
  const [shown, setShown] = useState(false);
  const editorial = useScrollReveal();

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const list = collections ?? [];

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
      <section style={{ padding: "48px 40px 40px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div style={fadeStyle(0)}>
            <span style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
            }}>
              Collections · {list.length} {list.length === 1 ? "edit" : "edits"}
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontWeight: 400,
            fontSize: "clamp(52px, 8.5vw, 118px)",
            lineHeight: 0.95,
            letterSpacing: "-0.01em",
            marginTop: 18,
            color: "var(--el-ink, #1c1a17)",
            maxWidth: 900,
          }}>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={maskStyle(0.08)}>Small edits,</span>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <em style={{ ...maskStyle(0.2), fontStyle: "italic" }}>built around</em>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={maskStyle(0.32)}>a life.</span>
            </span>
          </h1>

          <div style={fadeStyle(0.55)}>
            <p style={{
              marginTop: 28,
              color: "var(--el-ink-soft, #6b6659)",
              fontSize: 18,
              maxWidth: 560,
              lineHeight: 1.65,
              fontFamily: "var(--font-sans, sans-serif)",
            }}>
              Curated edits for moments in the day, thoughtfully arranged.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mosaic grid ── */}
      <section style={{ padding: "40px 40px 80px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          {list.length === 0 ? (
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <p style={{
                fontFamily: "var(--font-serif, serif)",
                fontSize: 32,
                color: "var(--el-ink, #1c1a17)",
                marginBottom: 10,
              }}>
                Nothing here yet.
              </p>
              <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: 15, color: "var(--el-ink-soft, #6b6659)" }}>
                Collections will appear once added.
              </p>
            </div>
          ) : (
            <>
              <div
                className="el-collections-mosaic"
                style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}
              >
                {list.map((collection, i) => {
                  const count = collection._count.collectionProducts;
                  const span = SPANS[i % SPANS.length] ?? "span 6";
                  const aspect = ASPECTS[i % ASPECTS.length] ?? "5/4";
                  return (
                    <Link
                      key={collection.id}
                      href={`/collections/${collection.slug}`}
                      className="el-collection-cell"
                      style={{
                        gridColumn: span,
                        display: "block",
                        textDecoration: "none",
                        opacity: shown ? 1 : 0,
                        transform: shown ? "translateY(0)" : "translateY(24px)",
                        transition: `opacity 0.9s ${easeOut} ${(i % 3) * 0.08 + 0.2}s, transform 0.9s ${easeOut} ${(i % 3) * 0.08 + 0.2}s`,
                      }}
                    >
                      <div style={{ position: "relative", aspectRatio: aspect, borderRadius: 8, overflow: "hidden", cursor: "pointer" }}>
                        {collection.imageUrl ? (
                          <Image
                            src={collection.imageUrl}
                            alt={collection.name}
                            fill
                            className="object-cover"
                            style={{ transition: `transform 1.4s ${ease}` }}
                            sizes="(max-width: 800px) 100vw, 60vw"
                          />
                        ) : (
                          <div style={{ position: "absolute", inset: 0, background: "var(--el-cream-2, #ebe6dc)" }} />
                        )}
                        {/* Dark gradient overlay */}
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "linear-gradient(180deg, transparent 40%, rgba(28,26,23,0.65) 100%)",
                        }} />
                        {/* Collection label */}
                        <div style={{
                          position: "absolute", left: 24, right: 24, bottom: 22,
                          color: "var(--el-paper, #fbf8f2)",
                        }}>
                          <div style={{
                            fontFamily: "var(--font-mono, ui-monospace)",
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            opacity: 0.75,
                            marginBottom: 8,
                            color: "var(--el-paper, #fbf8f2)",
                          }}>
                            {String(i + 1).padStart(2, "0")} · {count} {count === 1 ? "item" : "items"}
                          </div>
                          <div style={{
                            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                            fontSize: "clamp(24px, 2.8vw, 40px)",
                            lineHeight: 1.05,
                            fontWeight: 400,
                          }}>
                            {collection.name}
                          </div>
                          {collection.description && (
                            <div style={{
                              fontSize: 14,
                              opacity: 0.8,
                              marginTop: 6,
                              lineHeight: 1.45,
                              fontFamily: "var(--font-sans, sans-serif)",
                            }}>
                              {collection.description.length > 80
                                ? collection.description.slice(0, 80) + "…"
                                : collection.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

            </>
          )}
        </div>
      </section>

      {/* ── Editorial CTA ── */}
      <section
        ref={editorial.ref}
        style={{ padding: "80px 40px", background: "var(--el-paper, #fbf8f2)" }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div
            className="el-editorial-cta"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}
          >
            <div style={{
              opacity: editorial.visible ? 1 : 0,
              transform: editorial.visible ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 0.9s ${easeOut}, transform 0.9s ${easeOut}`,
            }}>
              <span style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
                display: "block",
                marginBottom: 16,
              }}>
                Don&apos;t see your ritual?
              </span>
              <h2 style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontWeight: 400,
                fontSize: "clamp(36px, 4.5vw, 56px)",
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                color: "var(--el-ink, #1c1a17)",
                marginBottom: 22,
              }}>
                Something more <em style={{ fontStyle: "italic" }}>personal</em>?
              </h2>
              <p style={{
                fontSize: 17,
                color: "var(--el-ink-soft, #6b6659)",
                lineHeight: 1.7,
                marginBottom: 28,
                maxWidth: 480,
                fontFamily: "var(--font-sans, sans-serif)",
              }}>
                Reach out and tell us what you&apos;re looking for. We&apos;d love to help you find the right fit.
              </p>
              <Link href="/contact" style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 26px",
                borderRadius: 999,
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                background: "var(--el-ink, #1c1a17)",
                color: "var(--el-paper, #fbf8f2)",
                textDecoration: "none",
                fontFamily: "var(--font-sans, sans-serif)",
                transition: `background 0.4s ${ease}`,
              }}>
                Get in touch
                <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
              </Link>
            </div>

            <div style={{
              opacity: editorial.visible ? 1 : 0,
              transform: editorial.visible ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 0.9s ${easeOut} 0.15s, transform 0.9s ${easeOut} 0.15s`,
              position: "relative",
              aspectRatio: "4/5",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--el-cream-2, #ebe6dc)",
            }} />
          </div>
        </div>

      </section>
    </div>
  );
}
