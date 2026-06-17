"use client";

import Image from "next/image";

import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  contactImage?: string;
  heading: string;
  subheading: string;
  body: string;
  phone: string;
  email: string;
};

export function ViiContactCtaSection({
  contactImage,
  heading,
  subheading,
  body,
  phone,
  email,
}: Props) {
  const { ref, visible } = useViiReveal(0.08);

  return (
    <section
      aria-labelledby="contact-cta-heading"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--vii-navy)",
        padding: "clamp(80px, 14vw, 160px) clamp(24px, 8vw, 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "clamp(420px, 50vw, 600px)",
      }}
    >
      {/* Background image */}
      {contactImage && (
        <Image
          src={contactImage}
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover", opacity: 0.3 }}
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
            "linear-gradient(to bottom, rgba(30,53,64,0.65) 0%, rgba(30,53,64,0.85) 100%)",
        }}
      />

      {/* Content */}
      <div
        ref={ref}
        className={`vii-reveal${visible ? " is-visible" : ""}`}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 680,
          textAlign: "center",
        }}
      >
        {heading && (
          <h2
            id="contact-cta-heading"
            style={{
              fontFamily: "var(--font-vii-serif, serif)",
              fontSize: "clamp(36px, 6vw, 72px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: "var(--vii-paper)",
              marginBottom: 8,
              lineHeight: 1.1,
            }}
          >
            {heading}
          </h2>
        )}

        {subheading && (
          <p
            style={{
              fontFamily: "var(--font-vii-sans, sans-serif)",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--vii-tan)",
              marginBottom: 24,
            }}
          >
            {subheading}
          </p>
        )}

        {body && (
          <p
            style={{
              fontFamily: "var(--font-vii-sans, sans-serif)",
              fontSize: "clamp(14px, 1.3vw, 16px)",
              lineHeight: 1.7,
              color: "var(--vii-paper)",
              opacity: 0.85,
              marginBottom: 40,
              maxWidth: 520,
              margin: "0 auto 40px",
            }}
          >
            {body}
          </p>
        )}

        {/* Contact info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
          }}
        >
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              style={{
                fontFamily: "var(--font-vii-sans, sans-serif)",
                fontSize: "clamp(15px, 1.5vw, 18px)",
                color: "var(--vii-paper)",
                textDecoration: "none",
                letterSpacing: "0.06em",
              }}
            >
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              style={{
                fontFamily: "var(--font-vii-sans, sans-serif)",
                fontSize: "clamp(14px, 1.3vw, 16px)",
                color: "var(--vii-tan)",
                textDecoration: "none",
                letterSpacing: "0.06em",
              }}
            >
              {email}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
