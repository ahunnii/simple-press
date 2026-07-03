"use client";

import Image from "next/image";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  overline: string;
  heading: string;
  headingAccent: string;
  role: string;
  body: string;
  ownerImage?: string;
};

export function ViiAboutTeamOwner({
  overline,
  heading,
  headingAccent,
  role,
  body,
  ownerImage,
}: Props) {
  const { ref: textRef, visible: textVisible } = useViiReveal(0.1);
  const { ref: imgRef, visible: imgVisible } = useViiReveal(0.1);
  const ownerName = `${heading} ${headingAccent}`.trim();

  return (
    <section
      aria-labelledby="about-owner-heading"
      {...sectionGroupAttr("about", "owner")}
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div
        className="vii-about-owner-grid"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "clamp(32px, 5vw, 72px)",
          alignItems: "center",
        }}
      >
        {/* Text */}
        <div
          ref={textRef}
          className={`vii-reveal${textVisible ? " is-visible" : ""}`}
        >
          {overline && (
            <ViiOverline
              align="left"
              tone="light"
              style={{ marginBottom: 14 }}
              fieldKey="vii.about.owner-overline"
            >
              {overline}
            </ViiOverline>
          )}

          <h2
            id="about-owner-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.08,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {heading}{" "}
            <em
              {...fieldAttr("vii.about.owner-heading-accent")}
              style={{ fontStyle: "italic", color: "var(--vii-copper)" }}
            >
              {headingAccent}
            </em>
          </h2>

          {role.trim() && (
            <p
              {...fieldAttr("vii.about.owner-role")}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--vii-navy)",
                margin: "14px 0 0",
              }}
            >
              {role}
            </p>
          )}

          {body && (
            <p
              {...fieldAttr("vii.about.owner-body")}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(14px, 1.3vw, 16px)",
                lineHeight: 1.8,
                color: "var(--vii-ink-soft)",
                margin: "24px 0 0",
              }}
            >
              {body}
            </p>
          )}
        </div>

        {/* Image */}
        <div
          ref={imgRef}
          className={`vii-reveal${imgVisible ? " is-visible" : ""}`}
          style={{
            position: "relative",
            aspectRatio: "4/5",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            background: "var(--vii-tan)",
          }}
        >
          {ownerImage?.trim() ? (
            <Image
              src={ownerImage}
              alt={ownerName ? `Portrait of ${ownerName}` : ""}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, var(--vii-clay) 0%, var(--vii-tan) 100%)",
              }}
            />
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .vii-about-owner-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
