"use client";

import Image from "next/image";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  bandImage?: string;
  label: string;
  statement: string;
};

export function ViiAboutBand({ bandImage, label, statement }: Props) {
  const { ref, visible } = useViiReveal(0.08);

  if (!statement.trim()) return null;

  return (
    <section
      aria-labelledby="about-band-heading"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--vii-navy)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "clamp(360px, 46vw, 560px)",
        padding: "clamp(64px, 10vw, 128px) clamp(24px, 8vw, 120px)",
      }}
    >
      {/* Background image */}
      {bandImage?.trim() && (
        <Image
          src={bandImage}
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
            "linear-gradient(to bottom, color-mix(in srgb, var(--vii-navy) 70%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 85%, transparent) 100%)",
        }}
      />

      {/* Content */}
      <div
        ref={ref}
        className={`vii-reveal${visible ? " is-visible" : ""}`}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 760,
          textAlign: "center",
        }}
      >
        {label.trim() && (
          <ViiOverline align="center" tone="dark" style={{ marginBottom: 22 }}>
            {label}
          </ViiOverline>
        )}

        <h2
          id="about-band-heading"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(28px, 4.4vw, 52px)",
            lineHeight: 1.18,
            color: "var(--vii-paper)",
            margin: 0,
          }}
        >
          {statement}
        </h2>
      </div>
    </section>
  );
}
