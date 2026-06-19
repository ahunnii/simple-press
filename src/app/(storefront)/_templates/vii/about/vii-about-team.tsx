"use client";

import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  overline: string;
  heading: string;
  intro: string;
  members: TemplateListRow[];
};

function MemberCard({
  image,
  name,
  role,
  bio,
  index,
}: {
  image: string;
  name: string;
  role: string;
  bio: string;
  index: number;
}) {
  const { ref, visible } = useViiReveal(0.12);

  return (
    <div
      ref={ref}
      className={`vii-reveal${visible ? " is-visible" : ""}`}
      style={{ transitionDelay: `${index * 0.05}s` }}
    >
      {/* Portrait */}
      <div
        style={{
          position: "relative",
          aspectRatio: "3/4",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          background: "var(--vii-tan)",
          marginBottom: 20,
        }}
      >
        {image ? (
          <Image
            src={image}
            alt={name ? `Portrait of ${name}` : ""}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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

      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          fontSize: "clamp(22px, 2.6vw, 28px)",
          lineHeight: 1.15,
          color: "var(--vii-navy)",
          margin: 0,
        }}
      >
        {name}
      </h3>

      {role.trim() && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--vii-ink-soft)",
            margin: "8px 0 0",
          }}
        >
          {role}
        </p>
      )}

      {bio.trim() && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(13px, 1.2vw, 15px)",
            lineHeight: 1.75,
            color: "var(--vii-ink-soft)",
            margin: "14px 0 0",
          }}
        >
          {bio}
        </p>
      )}
    </div>
  );
}

export function ViiAboutTeam({ overline, heading, intro, members }: Props) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.1);

  if (members.length === 0) return null;

  return (
    <section
      aria-labelledby="about-team-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          ref={headRef}
          className={`vii-reveal${headVisible ? " is-visible" : ""}`}
          style={{
            textAlign: "center",
            maxWidth: 680,
            margin: "0 auto clamp(48px, 7vw, 80px)",
          }}
        >
          {overline && (
            <ViiOverline align="center" tone="light" style={{ marginBottom: 14 }}>
              {overline}
            </ViiOverline>
          )}

          <h2
            id="about-team-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.08,
              color: "var(--vii-navy)",
              margin: intro ? "0 0 20px" : 0,
            }}
          >
            {heading}
          </h2>

          {intro && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(14px, 1.3vw, 16px)",
                lineHeight: 1.7,
                color: "var(--vii-ink-soft)",
                margin: 0,
              }}
            >
              {intro}
            </p>
          )}
        </div>

        {/* Member grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "clamp(28px, 4vw, 48px)",
          }}
        >
          {members.map((m, i) => (
            <MemberCard
              key={m._id ?? i}
              index={i}
              image={typeof m.image === "string" ? m.image : ""}
              name={typeof m.name === "string" ? m.name : ""}
              role={typeof m.role === "string" ? m.role : ""}
              bio={typeof m.bio === "string" ? m.bio : ""}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
