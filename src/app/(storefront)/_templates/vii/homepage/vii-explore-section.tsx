"use client";

import Image from "next/image";
import Link from "next/link";

import type { TemplateListRow } from "~/lib/template-fields";
import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  overline: string;
  heading: string;
  exploreImage?: string;
  tabs: TemplateListRow[];
  galleryLinkText: string;
  galleryLink: string;
  packageTitle: string;
  packageBody: string;
  packageImage?: string;
  packageCtaText: string;
  packageCtaLink: string;
};

export function ViiExploreSection({
  overline,
  heading,
  exploreImage,
  tabs,
  galleryLinkText,
  galleryLink,
  packageTitle,
  packageBody,
  packageImage,
  packageCtaText,
  packageCtaLink,
}: Props) {
  const { ref: headerRef, visible: headerVisible } = useViiReveal(0.1);
  const { ref: galleryRef, visible: galleryVisible } = useViiReveal(0.08);
  const { ref: packageRef, visible: packageVisible } = useViiReveal(0.08);

  return (
    <section
      aria-labelledby="explore-heading"
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div
          ref={headerRef}
          className={`vii-reveal${headerVisible ? " is-visible" : ""}`}
          style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}
        >
          {overline && (
            <p
              style={{
                fontFamily: "var(--font-vii-serif, serif)",
                fontSize: "clamp(28px, 4vw, 52px)",
                fontStyle: "italic",
                fontWeight: 400,
                color: "var(--vii-copper)",
                marginBottom: 4,
                lineHeight: 1,
              }}
            >
              {overline}
            </p>
          )}
          {heading && (
            <h2
              id="explore-heading"
              style={{
                fontFamily: "var(--font-vii-sans, sans-serif)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--vii-navy)",
                margin: 0,
              }}
            >
              {heading}
            </h2>
          )}
        </div>

        {/* ── Main image + tab labels ── */}
        <div
          ref={galleryRef}
          className={`vii-reveal${galleryVisible ? " is-visible" : ""}`}
        >
          {/* Image */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16/7",
              borderRadius: "0.15rem",
              overflow: "hidden",
              background: "var(--vii-tan)",
              marginBottom: 24,
            }}
          >
            {exploreImage && (
              <Image
                src={exploreImage}
                alt="Resort gallery"
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                style={{ objectFit: "cover" }}
              />
            )}
          </div>

          {/* Tab labels (styled as a descriptive nav, not interactive tabs) */}
          {tabs.length > 0 && (
            <nav aria-label="Resort areas">
              <ul
                role="list"
                style={{
                  display: "flex",
                  gap: "clamp(20px, 4vw, 48px)",
                  listStyle: "none",
                  margin: "0 0 12px 0",
                  padding: 0,
                  flexWrap: "wrap",
                }}
              >
                {tabs.map((tab, i) => {
                  const label =
                    typeof tab.label === "string" ? tab.label : "";
                  return (
                    <li key={tab._id ?? i}>
                      <span
                        style={{
                          fontFamily: "var(--font-vii-sans, sans-serif)",
                          fontSize: 13,
                          letterSpacing: "0.1em",
                          color: "var(--vii-ink-soft)",
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          {/* Gallery link */}
          {galleryLinkText && (
            <Link
              href={galleryLink}
              style={{
                display: "inline-block",
                fontFamily: "var(--font-vii-sans, sans-serif)",
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--vii-navy)",
                textDecoration: "none",
                borderBottom: "1px solid var(--vii-copper)",
                paddingBottom: 2,
                marginTop: 8,
              }}
            >
              {galleryLinkText}
            </Link>
          )}
        </div>

        {/* ── Inclusive Package card ── */}
        {packageTitle && (
          <div
            ref={packageRef}
            className={`vii-reveal${packageVisible ? " is-visible" : ""}`}
            style={{ marginTop: "clamp(40px, 6vw, 72px)" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "clamp(24px, 4vw, 48px)",
                alignItems: "center",
                background: "var(--vii-cream)",
                borderRadius: "0.15rem",
                overflow: "hidden",
              }}
              className="vii-package-grid"
            >
              {/* Text */}
              <div style={{ padding: "clamp(32px, 5vw, 56px)" }}>
                <p
                  style={{
                    fontFamily: "var(--font-vii-sans, sans-serif)",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--vii-ink-soft)",
                    marginBottom: 12,
                  }}
                >
                  Offering
                </p>
                <h3
                  style={{
                    fontFamily: "var(--font-vii-serif, serif)",
                    fontSize: "clamp(22px, 2.8vw, 36px)",
                    fontWeight: 400,
                    color: "var(--vii-navy)",
                    marginBottom: 16,
                    lineHeight: 1.2,
                  }}
                >
                  {packageTitle}
                </h3>
                {packageBody && (
                  <p
                    style={{
                      fontFamily: "var(--font-vii-sans, sans-serif)",
                      fontSize: "clamp(14px, 1.3vw, 16px)",
                      lineHeight: 1.7,
                      color: "var(--vii-ink-soft)",
                      marginBottom: 28,
                    }}
                  >
                    {packageBody}
                  </p>
                )}
                {packageCtaText && (
                  <Link
                    href={packageCtaLink}
                    style={{
                      display: "inline-block",
                      padding: "12px 28px",
                      background: "var(--vii-copper)",
                      color: "var(--vii-paper)",
                      fontFamily: "var(--font-vii-sans, sans-serif)",
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      borderRadius: "0.15rem",
                    }}
                  >
                    {packageCtaText}
                  </Link>
                )}
              </div>

              {/* Image */}
              <div
                style={{
                  position: "relative",
                  aspectRatio: "4/3",
                  background: "var(--vii-tan)",
                }}
              >
                {packageImage && (
                  <Image
                    src={packageImage}
                    alt={`${packageTitle} package`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={{ objectFit: "cover" }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .vii-package-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
