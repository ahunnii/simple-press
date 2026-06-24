"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultBlogPostPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/utils";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  posts: DefaultBlogPostPageTemplateProps["relatedPosts"];
  currentSlug: string;
};

export function ViiBlogRelated({ posts, currentSlug }: Props) {
  const others = posts.filter((p) => p.slug !== currentSlug).slice(0, 3);

  const { ref: headRef, visible: headVisible } = useViiReveal(0.1);
  const { ref: gridRef, visible: gridVisible } = useViiReveal(0.08);

  if (others.length === 0) return null;

  return (
    <section
      aria-labelledby="vii-related-heading"
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(64px, 9vw, 104px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header row */}
        <div
          ref={headRef}
          className={`vii-reveal${headVisible ? " is-visible" : ""}`}
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: "clamp(36px, 5vw, 56px)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <ViiOverline align="left" tone="light" style={{ marginBottom: 16 }}>
              Continue reading
            </ViiOverline>
            <h2
              id="vii-related-heading"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(28px, 4vw, 48px)",
                lineHeight: 1.1,
                color: "var(--vii-navy)",
                margin: 0,
              }}
            >
              More from the Journal
            </h2>
          </div>

          <Link
            href="/blog"
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
              textDecoration: "none",
              borderBottom: "1px solid var(--vii-copper)",
              paddingBottom: 4,
              flexShrink: 0,
            }}
          >
            All posts
            <ArrowRight aria-hidden="true" style={{ width: 13, height: 13 }} />
          </Link>
        </div>

        {/* Post grid */}
        <div
          ref={gridRef}
          className={`vii-reveal${gridVisible ? " is-visible" : ""}`}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(20px, 3vw, 36px)",
          }}
        >
          {others.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group vii-blog-card"
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
                // Grow to fill a multi-card row, but cap width so a single
                // related post doesn't stretch to a full-bleed thumbnail.
                flex: "1 1 280px",
                maxWidth: 380,
                minWidth: 0,
              }}
            >
              {/* Thumbnail */}
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

              {/* Date label */}
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: "var(--vii-ink-soft)",
                  margin: "0 0 10px",
                }}
              >
                {formatDate(post.createdAt)}
              </p>

              {/* Title */}
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(18px, 2vw, 24px)",
                  lineHeight: 1.2,
                  color: "var(--vii-navy)",
                  margin: "0 0 14px",
                }}
              >
                {post.title}
              </h3>

              {/* Read more link signal */}
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
      </div>
    </section>
  );
}
