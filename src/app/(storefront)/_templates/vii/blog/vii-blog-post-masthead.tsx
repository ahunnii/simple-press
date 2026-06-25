"use client";

import { formatDate } from "~/lib/utils";

import {
  heroHeadingStyle,
  heroRevealStyle,
  useViiHeroMotion,
} from "../hooks/use-vii-hero-motion";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  title: string;
  createdAt: Date;
  excerpt?: string;
};

/**
 * ViiBlogPostMasthead — cream type-led masthead for blog posts without a
 * featured image. Mirrors the index hero (vii-blog-hero.tsx) and the
 * generic-page cream fallback (vii-generic-page.tsx:217-256).
 *
 * Stagger: overline 0s → h1 0.15s → excerpt 0.3s.
 */
export function ViiBlogPostMasthead({ title, createdAt, excerpt }: Props) {
  const { shown, reduced } = useViiHeroMotion();

  return (
    <section
      aria-label={title}
      style={{
        background: "var(--vii-cream)",
        borderBottom: "1px solid var(--vii-hairline)",
        padding:
          "clamp(72px,10vw,140px) clamp(24px,6vw,96px) clamp(40px,5vw,64px)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Overline kicker — beat 0s */}
        <ViiOverline
          tone="light"
          align="left"
          style={{ ...heroRevealStyle(shown, reduced, 0), marginBottom: 20 }}
        >
          {`Journal · ${formatDate(createdAt)}`}
        </ViiOverline>

        {/* Post title — beat 0.15s */}
        <h1
          style={{
            ...heroHeadingStyle(shown, reduced, 0.15),
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(36px,6vw,72px)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "var(--vii-navy)",
            margin: 0,
            textWrap: "balance",
          }}
        >
          {title}
        </h1>

        {/* Optional excerpt — beat 0.3s; only rendered when non-empty */}
        {!!excerpt?.trim() && (
          <p
            style={{
              ...heroRevealStyle(shown, reduced, 0.3),
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(15px,1.5vw,18px)",
              lineHeight: 1.7,
              color: "var(--vii-ink-soft)",
              maxWidth: 620,
              margin: "clamp(20px,2.5vw,32px) 0 0",
            }}
          >
            {excerpt}
          </p>
        )}
      </div>
    </section>
  );
}
