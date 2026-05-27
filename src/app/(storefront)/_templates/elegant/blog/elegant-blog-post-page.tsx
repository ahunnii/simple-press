"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { formatDate } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

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

export function ElegantBlogPostPage({ page, relatedPosts }: DefaultBlogPostPageTemplateProps) {
  const [shown, setShown] = useState(false);
  const keepReading = useScrollReveal();

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const others = relatedPosts.filter((p) => p.slug !== page.slug).slice(0, 3);

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
      {/* ── Post header ── */}
      <section style={{ padding: "24px 40px 40px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {/* Back link */}
          <div style={fadeStyle(0)}>
            <Link
              href="/blog"
              style={{
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
              }}
              className="el-blog-back"
            >
              <ArrowLeft style={{ width: 13, height: 13 }} />
              Back to journal
            </Link>
          </div>

          {/* Date */}
          <div style={fadeStyle(0.08)}>
            <span style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
            }}>
              {formatDate(page.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 84px)",
            lineHeight: 1.0,
            letterSpacing: "-0.01em",
            marginTop: 14,
            color: "var(--el-ink, #1c1a17)",
          }}>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={maskStyle(0.12)}>{page.title}</span>
            </span>
          </h1>

          {/* Excerpt */}
          {page.excerpt && (
            <div style={fadeStyle(0.35)}>
              <p style={{
                marginTop: 24,
                fontSize: 20,
                color: "var(--el-ink-soft, #6b6659)",
                lineHeight: 1.55,
                fontFamily: "var(--font-sans, sans-serif)",
              }}>
                {page.excerpt}
              </p>
            </div>
          )}

          {/* Byline divider */}
          <div style={{
            ...fadeStyle(0.45),
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
          }}>
            <span style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
            }}>
              {formatDate(page.createdAt)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Hero image ── */}
      {page.image && (
        <section style={{ padding: "0 40px" }}>
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <div style={{
              ...fadeStyle(0.4),
              position: "relative",
              width: "100%",
              aspectRatio: "16/8",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--el-cream-2, #ebe6dc)",
            }}>
              <Image
                src={page.image}
                alt={page.title}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Body ── */}
      <section style={{ padding: "60px 40px 40px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="el-blog-body"
          />

          {/* Footer: filed under + back */}
          <div style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}>
            <span style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
            }}>
              {formatDate(page.createdAt)}
            </span>
            <Link
              href="/blog"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 22px",
                borderRadius: 999,
                fontSize: 12,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 500,
                background: "transparent",
                color: "var(--el-ink, #1c1a17)",
                border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                textDecoration: "none",
                fontFamily: "var(--font-sans, sans-serif)",
                transition: `background 0.4s ${ease}, color 0.4s ${ease}`,
              }}
              className="el-btn-ghost"
            >
              Back to journal
            </Link>
          </div>
        </div>
      </section>

      {/* ── Keep reading ── */}
      {others.length > 0 && (
        <section
          ref={keepReading.ref}
          style={{ padding: "80px 40px", background: "var(--el-paper, #fbf8f2)" }}
        >
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <div style={{
              opacity: keepReading.visible ? 1 : 0,
              transform: keepReading.visible ? "translateY(0)" : "translateY(24px)",
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
                Keep reading
              </span>
              <h2 style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4vw, 48px)",
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                color: "var(--el-ink, #1c1a17)",
              }}>
                More from the <em style={{ fontStyle: "italic" }}>journal</em>.
              </h2>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 32,
            }}>
              {others.map((post, i) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    opacity: keepReading.visible ? 1 : 0,
                    transform: keepReading.visible ? "translateY(0)" : "translateY(24px)",
                    transition: `opacity 0.7s ${easeOut} ${i * 80}ms, transform 0.7s ${easeOut} ${i * 80}ms`,
                  }}
                  className="el-related-post group"
                >
                  <div style={{
                    position: "relative",
                    aspectRatio: "4/5",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "var(--el-cream-2, #ebe6dc)",
                  }}>
                    <Image
                      src={post.image ?? "/placeholder.svg"}
                      alt={post.title}
                      fill
                      className="object-cover"
                      style={{ transition: `transform 1.2s ${ease}` }}
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono, ui-monospace)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--el-ink-soft, #6b6659)",
                    marginTop: 16,
                    marginBottom: 8,
                  }}>
                    {formatDate(post.createdAt)}
                  </div>
                  <h4 style={{
                    fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                    fontWeight: 400,
                    fontSize: 22,
                    lineHeight: 1.2,
                    color: "var(--el-ink, #1c1a17)",
                    letterSpacing: "-0.005em",
                  }}>
                    {post.title}
                  </h4>
                </Link>
              ))}
            </div>

            {/* View all link */}
            <div style={{ marginTop: 48, textAlign: "center" }}>
              <Link
                href="/blog"
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
                All posts
                <ArrowRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>
          </div>

          <style>{`
            .el-related-post:hover .object-cover { transform: scale(1.04); }
            .el-btn-ghost:hover {
              background: var(--el-ink, #1c1a17) !important;
              color: var(--el-paper, #fbf8f2) !important;
            }
            .el-blog-back:hover { color: var(--el-ink, #1c1a17) !important; }
          `}</style>
        </section>
      )}

      {/* ── Blog body typography ── */}
      <style>{`
        .el-blog-body {
          font-size: 18px;
          line-height: 1.8;
          color: var(--el-ink-2, #2a2722);
          font-family: var(--font-sans, sans-serif);
        }
        .el-blog-body h1,
        .el-blog-body h2,
        .el-blog-body h3,
        .el-blog-body h4 {
          font-family: var(--font-serif, 'Cormorant Garamond', serif);
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--el-ink, #1c1a17);
          margin: 44px 0 18px;
        }
        .el-blog-body h2 { font-size: clamp(28px, 3.2vw, 40px); }
        .el-blog-body h3 { font-size: clamp(22px, 2.4vw, 30px); }
        .el-blog-body p { margin-top: 18px; color: var(--el-ink-2, #2a2722); }
        .el-blog-body blockquote {
          margin: 44px 0;
          padding: 32px 0 32px 32px;
          border-left: 1px solid var(--el-sage, #4a5240);
          font-family: var(--font-serif, 'Cormorant Garamond', serif);
          font-style: italic;
          font-size: clamp(22px, 2.4vw, 30px);
          line-height: 1.3;
          color: var(--el-ink, #1c1a17);
        }
        .el-blog-body a {
          color: var(--el-ink, #1c1a17);
          text-underline-offset: 3px;
        }
        .el-blog-body ul,
        .el-blog-body ol {
          padding-left: 24px;
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .el-blog-body img {
          border-radius: 6px;
          margin: 32px 0;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
