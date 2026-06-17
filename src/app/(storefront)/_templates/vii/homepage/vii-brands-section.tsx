"use client";

import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";
import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  overline?: string;
  heading?: string;
  logos: TemplateListRow[];
};

export function ViiBrandsSection({ overline, heading, logos }: Props) {
  const { ref, visible } = useViiReveal(0.1);
  if (logos.length === 0) return null;

  const labelledBy = heading ? "vii-brands-heading" : undefined;

  return (
    <section
      aria-labelledby={labelledBy}
      aria-label={heading ? undefined : "Brands we carry"}
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(56px, 8vw, 96px) clamp(24px, 6vw, 96px)",
        borderTop: "1px solid var(--vii-rule, rgba(30,53,64,0.08))",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 12,
            marginBottom: "clamp(32px, 5vw, 56px)",
          }}
        >
          {overline && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
                margin: 0,
              }}
            >
              {overline}
            </p>
          )}
          {heading && (
            <h2
              id="vii-brands-heading"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(26px, 4vw, 48px)",
                lineHeight: 1.1,
                color: "var(--vii-navy)",
                margin: 0,
              }}
            >
              {heading}
            </h2>
          )}
        </div>

        {/* Logo row */}
        <div ref={ref} className={`vii-reveal${visible ? " is-visible" : ""}`}>
          <ul
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "clamp(32px, 6vw, 72px)",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
          {logos.map((logo, i) => {
            const image = typeof logo.image === "string" ? logo.image : "";
            const name = typeof logo.name === "string" ? logo.name : "";
            const link =
              typeof logo.link === "string" && logo.link.trim()
                ? logo.link
                : "";
            if (!image) return null;

            const isExternal = /^https?:\/\//i.test(link);
            const img = (
              <span
                style={{
                  position: "relative",
                  display: "block",
                  width: "clamp(110px, 16vw, 160px)",
                  height: "clamp(56px, 8vw, 80px)",
                }}
              >
                <Image
                  src={image}
                  alt={name || "Brand logo"}
                  fill
                  sizes="160px"
                  style={{ objectFit: "contain" }}
                />
              </span>
            );

            return (
              <li key={logo._id ?? i}>
                {link ? (
                  <a
                    href={link}
                    {...(isExternal
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    aria-label={name || "Brand"}
                    className="inline-block transition-opacity hover:opacity-70 focus-visible:opacity-70"
                  >
                    {img}
                    {isExternal && (
                      <span className="sr-only"> (opens in new tab)</span>
                    )}
                  </a>
                ) : (
                  img
                )}
              </li>
            );
          })}
          </ul>
        </div>
      </div>
    </section>
  );
}
