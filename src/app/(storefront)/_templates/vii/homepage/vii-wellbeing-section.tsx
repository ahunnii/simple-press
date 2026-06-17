"use client";

import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";
import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  heading: string;
  headingAccent: string;
  body: string;
  awards: TemplateListRow[];
};

export function ViiWellbeingSection({
  heading,
  headingAccent,
  body,
  awards,
}: Props) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.1);
  const { ref: bodyRef, visible: bodyVisible } = useViiReveal(0.1);
  const { ref: awardsRef, visible: awardsVisible } = useViiReveal(0.1);

  return (
    <section
      aria-labelledby="wellbeing-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Heading */}
        <div
          ref={headRef}
          className={`vii-reveal${headVisible ? " is-visible" : ""}`}
        >
          <h2
            id="wellbeing-heading"
            style={{
              fontFamily: "var(--font-vii-serif, serif)",
              fontWeight: 400,
              fontSize: "clamp(40px, 6vw, 80px)",
              lineHeight: 1.05,
              color: "var(--vii-navy)",
              marginBottom: 0,
            }}
          >
            {heading}{" "}
            <em
              style={{
                fontStyle: "italic",
                color: "var(--vii-copper)",
              }}
            >
              {headingAccent}
            </em>
          </h2>
        </div>

        {/* Body */}
        {body && (
          <div
            ref={bodyRef}
            className={`vii-reveal${bodyVisible ? " is-visible" : ""}`}
            style={{ marginTop: 32 }}
          >
            <p
              style={{
                fontFamily: "var(--font-vii-sans, sans-serif)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.7,
                color: "var(--vii-ink-soft)",
                maxWidth: 680,
              }}
            >
              {body}
            </p>
          </div>
        )}

        {/* Awards row */}
        {awards.length > 0 && (
          <div
            ref={awardsRef}
            className={`vii-reveal${awardsVisible ? " is-visible" : ""}`}
            style={{ marginTop: 56 }}
          >
            <p
              style={{
                fontFamily: "var(--font-vii-sans, sans-serif)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
                marginBottom: 24,
              }}
            >
              Awards &amp; Recognition
            </p>
            <ul
              role="list"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "clamp(24px, 4vw, 56px)",
                alignItems: "center",
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {awards.map((award, i) => {
                const image =
                  typeof award.image === "string" ? award.image : "";
                const caption =
                  typeof award.caption === "string" ? award.caption : "";
                return (
                  <li
                    key={award._id ?? i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {image ? (
                      <div
                        style={{ position: "relative", width: 90, height: 56 }}
                      >
                        <Image
                          src={image}
                          alt={caption || "Award logo"}
                          fill
                          sizes="90px"
                          style={{ objectFit: "contain" }}
                        />
                      </div>
                    ) : null}
                    {caption && (
                      <span
                        style={{
                          fontFamily: "var(--font-vii-sans, sans-serif)",
                          fontSize: 11,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--vii-ink-soft)",
                          textAlign: "center",
                        }}
                      >
                        {caption}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
