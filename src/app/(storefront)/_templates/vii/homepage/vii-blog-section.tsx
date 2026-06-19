"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useViiReveal } from "../hooks/use-vii-reveal";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
};

type Props = {
  heading: string;
  headingAccent: string;
  intro: string;
  ctaText: string;
  ctaHref: string;
  posts: BlogPost[];
};

export function ViiBlogSection({
  heading,
  headingAccent,
  intro,
  ctaText,
  ctaHref,
  posts,
}: Props) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.1);
  const { ref: gridRef, visible: gridVisible } = useViiReveal(0.08);

  const shown = posts.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <section
      aria-labelledby="vii-blog-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div
          ref={headRef}
          className={`vii-reveal${headVisible ? " is-visible" : ""}`}
          style={{ maxWidth: 720, marginBottom: "clamp(36px, 5vw, 60px)" }}
        >
          <h2
            id="vii-blog-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(38px, 5.6vw, 76px)",
              lineHeight: 1.05,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {heading}
            {heading && headingAccent ? " " : ""}
            {headingAccent && (
              <em
                style={{
                  fontStyle: "italic",
                  color: "var(--vii-copper)",
                }}
              >
                {headingAccent}
              </em>
            )}
          </h2>

          {intro && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.7,
                color: "var(--vii-ink-soft)",
                margin: "24px 0 0",
              }}
            >
              {intro}
            </p>
          )}
        </div>

        {/* ── Post cards ── */}
        <div
          ref={gridRef}
          className={`vii-reveal${gridVisible ? " is-visible" : ""}`}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "clamp(20px, 3vw, 36px)",
          }}
        >
          {shown.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group vii-blog-card"
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4 / 3",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                  background: "var(--vii-tan)",
                  marginBottom: 18,
                }}
              >
                {post.image ? (
                  <Image
                    src={post.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  />
                ) : null}
              </div>

              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(20px, 2.2vw, 27px)",
                  lineHeight: 1.2,
                  color: "var(--vii-navy)",
                  margin: "0 0 10px",
                }}
              >
                {post.title}
              </h3>

              {post.excerpt && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: "var(--vii-ink-soft)",
                    margin: "0 0 14px",
                  }}
                >
                  {post.excerpt}
                </p>
              )}

              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: "var(--vii-navy)",
                  borderBottom: "1px solid var(--vii-copper)",
                  paddingBottom: 3,
                }}
              >
                Read more
                <ArrowRight style={{ width: 13, height: 13 }} />
              </span>
            </Link>
          ))}
        </div>

        {/* ── CTA ── */}
        {ctaText && (
          <div
            style={{ textAlign: "center", marginTop: "clamp(40px, 5vw, 60px)" }}
          >
            <Link
              href={ctaHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: "var(--vii-navy)",
                textDecoration: "none",
                borderBottom: "1px solid var(--vii-copper)",
                paddingBottom: 4,
              }}
            >
              {ctaText}
              <ArrowRight
                aria-hidden="true"
                style={{ width: 14, height: 14 }}
              />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
