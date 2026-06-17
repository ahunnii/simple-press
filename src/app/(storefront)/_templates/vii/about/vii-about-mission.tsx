"use client";

import Image from "next/image";

import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  missionImage?: string;
  heading: string;
  headingAccent: string;
  body: string;
};

export function ViiAboutMission({
  missionImage,
  heading,
  headingAccent,
  body,
}: Props) {
  const { ref, visible } = useViiReveal(0.08);

  return (
    <section
      aria-labelledby="about-mission-heading"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--vii-navy)",
        display: "flex",
        alignItems: "flex-end",
        minHeight: "clamp(420px, 52vw, 640px)",
        padding: "clamp(56px, 9vw, 112px) clamp(24px, 6vw, 96px)",
      }}
    >
      {/* Background image */}
      {missionImage?.trim() && (
        <Image
          src={missionImage}
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover", opacity: 0.32 }}
          aria-hidden="true"
        />
      )}

      {/* Scrim */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(30,53,64,0.85) 0%, rgba(30,53,64,0.55) 60%, rgba(30,53,64,0.4) 100%)",
        }}
      />

      {/* Content */}
      <div
        ref={ref}
        className={`vii-reveal${visible ? " is-visible" : ""}`}
        style={{ position: "relative", zIndex: 1, maxWidth: 640 }}
      >
        <h2
          id="about-mission-heading"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(34px, 5vw, 64px)",
            lineHeight: 1.05,
            color: "var(--vii-paper)",
            margin: "0 0 20px",
          }}
        >
          {heading}{" "}
          <em style={{ fontStyle: "italic", color: "var(--vii-copper-light)" }}>
            {headingAccent}
          </em>
        </h2>

        {body && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(15px, 1.5vw, 19px)",
              lineHeight: 1.7,
              color: "var(--vii-tan)",
              margin: 0,
              maxWidth: 560,
            }}
          >
            {body}
          </p>
        )}
      </div>
    </section>
  );
}
