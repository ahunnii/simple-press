"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatDate } from "~/lib/utils";

import { resolveFields } from "..";
import { ElegantNewsletter } from "../homepage/elegant-newsletter";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

function useScrollReveal(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) { setVisible(true); io.disconnect(); }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export function ElegantBlogPage({ pages, customFields }: Props) {
  const [shown, setShown] = useState(false);
  const [query, setQuery] = useState("");
  const gridReveal = useScrollReveal();

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const f = resolveFields(customFields, [
    "elegant.blog.listing-title",
    "elegant.blog.listing-intro",
  ]);
  const listingTitle = (f["elegant.blog.listing-title"] ?? "").trim() || "Journal";
  const listingIntro = (f["elegant.blog.listing-intro"] ?? "").trim();

  const postsWithSearch = useMemo(
    () => pages.map((p) => ({ post: p, searchBlob: buildBlogSearchBlob(p) })),
    [pages],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return postsWithSearch
      .filter(({ searchBlob }) => blobIncludesQuery(searchBlob, q))
      .map(({ post }) => post);
  }, [query, pages, postsWithSearch]);

  const [featured, ...rest] = filtered;
  const gridPosts = query.trim() ? filtered : rest;

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

  if (pages.length === 0) {
    return (
      <div style={{ background: "var(--el-cream, #f5f1ea)", minHeight: "60vh" }}>
        <section {...sectionGroupAttr("blog", "header")} style={{ padding: "48px 40px 80px" }}>
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <div style={fadeStyle(0)}>
              <span style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11, letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
              }}>
                Journal
              </span>
            </div>
            <h1 style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(52px, 8vw, 110px)",
              lineHeight: 0.95,
              marginTop: 18,
              color: "var(--el-ink, #1c1a17)",
            }}>
              <span style={{ display: "block", overflow: "hidden" }}>
                <span style={maskStyle(0.08)}>{listingTitle}</span>
              </span>
            </h1>
            <p style={{
              marginTop: 48,
              fontFamily: "var(--font-serif, serif)",
              fontSize: 22,
              color: "var(--el-ink-soft, #6b6659)",
            }}>
              No posts yet — check back soon.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)" }}>
      {/* ── Hero ── */}
      <section {...sectionGroupAttr("blog", "header")} style={{ padding: "48px 40px 0" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div style={fadeStyle(0)}>
            <span style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11, letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
            }}>
              Journal · {pages.length} {pages.length === 1 ? "entry" : "entries"}
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
              <span style={maskStyle(0.08)}>{listingTitle}</span>
            </span>
          </h1>

          {/* Description paragraph — separate from heading */}
          {listingIntro && (
            <div style={fadeStyle(0.5)}>
              <p style={{
                marginTop: 28,
                color: "var(--el-ink-soft, #6b6659)",
                fontSize: 18,
                maxWidth: 560,
                lineHeight: 1.65,
                fontFamily: "var(--font-sans, sans-serif)",
              }}>
                {listingIntro}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Search + filter bar ── */}
      <section style={{ padding: "32px 40px 0" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            paddingBottom: 24,
            borderBottom: "1px solid var(--el-line, rgba(28,26,23,0.12))",
            flexWrap: "wrap",
          }}>
            <span
              aria-live="polite"
              aria-atomic="true"
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
              }}
            >
              {query.trim()
                ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
                : `${pages.length} post${pages.length !== 1 ? "s" : ""}`}
            </span>
            {/* Search input */}
            <label style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Search style={{ width: 13, height: 13, color: "var(--el-ink-soft, #6b6659)" }} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the journal…"
                aria-label="Search blog posts"
                style={{
                  background: "transparent",
                  border: 0,
                  outline: "none",
                  fontSize: 13,
                  color: "var(--el-ink, #1c1a17)",
                  fontFamily: "var(--font-sans, sans-serif)",
                  width: 220,
                }}
              />
            </label>
          </div>
        </div>
      </section>

      {/* ── Featured post ── */}
      {!query.trim() && featured && (
        <section style={{ padding: "40px 40px 0" }}>
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            <Link
              href={`/blog/${featured.slug}`}
              aria-labelledby={`featured-post-${featured.slug}`}
              style={{ display: "block", textDecoration: "none" }}
              className="el-featured-post group"
            >
              <div className="el-feature-grid" style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr",
                gap: 56,
                alignItems: "center",
                opacity: shown ? 1 : 0,
                transform: shown ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.9s ${easeOut} 0.2s, transform 0.9s ${easeOut} 0.2s`,
              }}>
                {/* Image */}
                <div style={{
                  position: "relative",
                  aspectRatio: "5/4",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "var(--el-cream-2, #ebe6dc)",
                }}>
                  <Image
                    src={featured.image ?? "/placeholder.svg"}
                    alt={featured.title}
                    fill
                    className="object-cover"
                    priority
                    style={{ transition: `transform 1.2s ${ease}` }}
                    sizes="(max-width: 800px) 100vw, 55vw"
                  />
                  <span style={{
                    position: "absolute",
                    top: 12, left: 12,
                    padding: "4px 10px",
                    background: "var(--el-ink, #1c1a17)",
                    color: "var(--el-paper, #fbf8f2)",
                    borderRadius: 999,
                    fontFamily: "var(--font-mono, ui-monospace)",
                    fontSize: 9.5,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}>
                    Latest
                  </span>
                </div>
                {/* Text */}
                <div>
                  <div style={{
                    fontFamily: "var(--font-mono, ui-monospace)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--el-ink-soft, #6b6659)",
                    marginBottom: 16,
                  }}>
                    {formatDate(featured.createdAt)}
                  </div>
                  <h2
                    id={`featured-post-${featured.slug}`}
                    style={{
                      fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontWeight: 400,
                      fontSize: "clamp(32px, 4.8vw, 60px)",
                      lineHeight: 1.05,
                      color: "var(--el-ink, #1c1a17)",
                      marginBottom: 18,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p style={{
                      fontSize: 17,
                      color: "var(--el-ink-soft, #6b6659)",
                      lineHeight: 1.65,
                      marginBottom: 26,
                      fontFamily: "var(--font-sans, sans-serif)",
                    }}>
                      {featured.excerpt}
                    </p>
                  )}
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--el-ink, #1c1a17)",
                    fontFamily: "var(--font-sans, sans-serif)",
                  }}>
                    Read the piece
                    <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
                  </span>
                </div>
              </div>
            </Link>
          </div>

        </section>
      )}

      {/* ── Grid of posts ── */}
      {gridPosts.length > 0 && (
        <section
          ref={gridReveal.ref}
          style={{
            padding: "60px 40px 80px",
            background: !query.trim() ? "var(--el-paper, #fbf8f2)" : "var(--el-cream, #f5f1ea)",
            marginTop: !query.trim() ? 60 : 0,
          }}
        >
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            {!query.trim() && (
              <div style={{
                opacity: gridReveal.visible ? 1 : 0,
                transform: gridReveal.visible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.9s ${easeOut}, transform 0.9s ${easeOut}`,
                marginBottom: 40,
              }}>
                <span style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}>
                  More from the journal
                </span>
              </div>
            )}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 40,
            }}>
              {gridPosts.map((post, i) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  aria-label={post.title}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    opacity: gridReveal.visible ? 1 : 0,
                    transform: gridReveal.visible ? "translateY(0)" : "translateY(24px)",
                    transition: `opacity 0.7s ${easeOut} ${(i % 3) * 80}ms, transform 0.7s ${easeOut} ${(i % 3) * 80}ms`,
                  }}
                  className="el-post-card group"
                >
                  {/* 4/5 image */}
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
                  {/* Meta */}
                  <div style={{
                    fontFamily: "var(--font-mono, ui-monospace)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--el-ink-soft, #6b6659)",
                    marginTop: 18,
                    marginBottom: 10,
                  }}>
                    {formatDate(post.createdAt)}
                  </div>
                  <h3 style={{
                    fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                    fontWeight: 400,
                    fontSize: 26,
                    lineHeight: 1.15,
                    color: "var(--el-ink, #1c1a17)",
                    marginBottom: 10,
                    letterSpacing: "-0.005em",
                  }}>
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p style={{
                      fontSize: 15,
                      color: "var(--el-ink-soft, #6b6659)",
                      lineHeight: 1.6,
                      fontFamily: "var(--font-sans, sans-serif)",
                    }}>
                      {post.excerpt.length > 100
                        ? post.excerpt.slice(0, 100) + "…"
                        : post.excerpt}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>

        </section>
      )}

      {/* No results */}
      {query.trim() && filtered.length === 0 && (
        <section style={{ padding: "80px 40px" }}>
          <div style={{ maxWidth: 1360, margin: "0 auto", textAlign: "center" }}>
            <p style={{
              fontFamily: "var(--font-serif, serif)",
              fontSize: 28,
              color: "var(--el-ink, #1c1a17)",
              marginBottom: 10,
            }}>
              Nothing found.
            </p>
            <p style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: 15,
              color: "var(--el-ink-soft, #6b6659)",
            }}>
              Try a different search term.
            </p>
          </div>
        </section>
      )}

      {/* Newsletter strip — matches design */}
      <ElegantNewsletter />
    </div>
  );
}
