import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { ViiBlogClient } from "./vii-blog-client";
import { ViiBlogHero } from "./vii-blog-hero";

type Props = {
  pages: DefaultBlogPageTemplateProps["pages"];
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  customFields?: Record<string, string>;
};

export function ViiBlogPage({ pages, business, customFields }: Props) {
  // Prefer the customFields prop passed directly from the route; fall back to
  // reading from business.siteContent (same approach as vii-about-page).
  const fields = customFields ?? business.siteContent?.customFields;

  const f = resolveFields(fields, [
    "vii.blog.hero-image",
    "vii.blog.heading",
    "vii.blog.heading-accent",
    "vii.blog.intro",
  ]);

  const heading = f["vii.blog.heading"] ?? "The";
  const headingAccent = f["vii.blog.heading-accent"] ?? "Journal";
  const intro = f["vii.blog.intro"] ?? "";
  // Optional owner override for the cover-story image (else the cover uses the
  // latest post's own image, handled in the client).
  const coverImage = f["vii.blog.hero-image"]?.trim()
    ? f["vii.blog.hero-image"]
    : undefined;

  return (
    <PageTransition>
      {/* 1. Masthead */}
      <ViiBlogHero
        heading={heading}
        headingAccent={headingAccent}
        intro={intro}
        storyCount={pages.length}
      />

      {/* 2. Posts — or empty state */}
      {pages.length === 0 ? (
        <section
          aria-label="No stories yet"
          style={{
            background: "var(--vii-cream)",
            padding:
              "clamp(80px, 14vw, 160px) clamp(24px, 6vw, 96px)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(22px, 3vw, 36px)",
              lineHeight: 1.2,
              color: "var(--vii-navy)",
              margin: "0 0 24px",
            }}
          >
            No stories yet.
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--vii-ink-soft)",
              margin: "0 0 36px",
            }}
          >
            Check back soon — something is in the works.
          </p>
          <Link
            href="/"
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
            }}
          >
            Back to home
            <ArrowRight aria-hidden="true" style={{ width: 13, height: 13 }} />
          </Link>
        </section>
      ) : (
        <ViiBlogClient pages={pages} coverImage={coverImage} />
      )}
    </PageTransition>
  );
}
