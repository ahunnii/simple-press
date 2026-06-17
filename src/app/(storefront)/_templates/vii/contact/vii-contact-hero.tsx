"use client";

import Image from "next/image";

type Props = {
  heroImage?: string;
  overline: string;
  heading: string;
};

export function ViiContactHero({ heroImage, overline, heading }: Props) {
  const hasImage = !!heroImage?.trim();

  return (
    <section
      aria-label="Contact"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "clamp(340px, 46vw, 560px)",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
        background: "var(--vii-navy)",
      }}
    >
      {/* Background image */}
      {hasImage ? (
        <Image
          src={heroImage!}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(160deg, var(--vii-navy) 0%, var(--vii-slate) 100%)",
          }}
        />
      )}

      {/* Scrim */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(30,53,64,0.82) 0%, rgba(30,53,64,0.3) 55%, rgba(30,53,64,0.12) 100%)",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 clamp(24px, 6vw, 96px) clamp(48px, 7vh, 88px)",
          maxWidth: 760,
        }}
      >
        {overline && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--vii-tan)",
              marginBottom: 16,
            }}
          >
            {overline}
          </p>
        )}

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(44px, 7vw, 96px)",
            lineHeight: 1.02,
            color: "var(--vii-paper)",
            margin: 0,
          }}
        >
          {heading}
        </h1>
      </div>
    </section>
  );
}
