"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { TemplateListRow } from "~/lib/template-fields";
import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  overline: string;
  heading: string;
  headingAccent: string;
  body: string;
  image?: string;
  details: TemplateListRow[];
  ctaText: string;
  ctaHref: string;
};

export function ViiDetroitSection({
  overline,
  heading,
  headingAccent,
  body,
  image,
  details,
  ctaText,
  ctaHref,
}: Props) {
  const { ref: mediaRef, visible: mediaVisible } = useViiReveal(0.1);
  const { ref: textRef, visible: textVisible } = useViiReveal(0.1);

  // Nothing to show if the owner has cleared the whole section.
  if (!heading && !headingAccent && !body) return null;

  return (
    <section
      aria-labelledby="vii-detroit-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div
        className="vii-detroit-grid"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: "clamp(32px, 5vw, 72px)",
          alignItems: "center",
        }}
      >
        {/* ── Image ── */}
        <div
          ref={mediaRef}
          className={`vii-reveal${mediaVisible ? " is-visible" : ""}`}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4 / 5",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            background: "var(--vii-slate)",
          }}
        >
          {image?.trim() ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "clamp(28px, 4vw, 44px)",
                color: "rgba(251,248,241,0.55)",
              }}
            >
              Detroit
            </span>
          )}
        </div>

        {/* ── Text ── */}
        <div
          ref={textRef}
          className={`vii-reveal${textVisible ? " is-visible" : ""}`}
        >
          {overline && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: "var(--vii-ink-soft)",
                margin: "0 0 16px",
              }}
            >
              {overline}
            </p>
          )}

          {(heading || headingAccent) && (
            <h2
              id="vii-detroit-heading"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4.6vw, 60px)",
                lineHeight: 1.06,
                color: "var(--vii-navy)",
                margin: 0,
              }}
            >
              {heading}
              {heading && headingAccent ? " " : ""}
              {headingAccent && (
                <em
                  style={{ fontStyle: "italic", color: "var(--vii-copper)" }}
                >
                  {headingAccent}
                </em>
              )}
            </h2>
          )}

          {body && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.75,
                color: "var(--vii-ink-soft)",
                maxWidth: 480,
                margin: "24px 0 0",
              }}
            >
              {body}
            </p>
          )}

          {/* Detail row — neighborhood, est., etc. */}
          {details.length > 0 && (
            <ul
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "clamp(16px, 2.5vw, 32px)",
                listStyle: "none",
                margin: "28px 0 0",
                padding: "20px 0 0",
                borderTop: "1px solid rgba(30,53,64,0.15)",
              }}
            >
              {details.map((detail, i) => {
                const label =
                  typeof detail.label === "string" ? detail.label : "";
                if (!label) return null;
                return (
                  <li
                    key={detail._id ?? i}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                      color: "var(--vii-navy)",
                    }}
                  >
                    {label}
                  </li>
                );
              })}
            </ul>
          )}

          {ctaText && (
            <div style={{ marginTop: "clamp(28px, 4vw, 40px)" }}>
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
                <ArrowRight aria-hidden="true" style={{ width: 14, height: 14 }} />
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .vii-detroit-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
