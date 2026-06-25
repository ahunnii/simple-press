"use client";

import Image from "next/image";

import { EmbedDialog } from "~/components/embed-dialog";
import { EmbedFrame } from "~/components/embed-frame";
import { EmbedReveal } from "~/components/embed-reveal";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type EmbedValue = {
  src: string;
  height?: number;
  title: string;
  aspectRatio?: string;
  maxWidth?: string;
  displayMode?: string;
  triggerLabel?: string;
};

type Props = {
  contactImage?: string;
  heading: string;
  subheading: string;
  body: string;
  phone: string;
  email: string;
  buttonLabel?: string;
  buttonHref?: string;
  /** Parsed iframe value from parseTemplateIframeValue. */
  embed?: EmbedValue | null;
  /** When false, render a plain external-link fallback instead of the iframe. */
  embedsEnabled?: boolean;
  /** When true and embedsEnabled, hide the iframe behind a reveal button. Default false. */
  embedReveal?: boolean;
};

export function ViiContactCtaSection({
  contactImage,
  heading,
  subheading,
  body,
  phone,
  email,
  buttonLabel,
  buttonHref,
  embed,
  embedsEnabled,
  embedReveal = false,
}: Props) {
  const { ref, visible } = useViiReveal(0.08);

  return (
    <section
      aria-labelledby="contact-cta-heading"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--vii-navy)",
        padding: "clamp(64px, 9vw, 104px) clamp(24px, 8vw, 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "clamp(300px, 32vw, 420px)",
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
            "linear-gradient(to bottom, color-mix(in srgb, var(--vii-navy) 65%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 85%, transparent) 100%)",
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
          width: "100%",
        }}
      >
        {heading && (
          <h2
            id="contact-cta-heading"
            style={{
              fontFamily: "var(--font-serif)",
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
          <ViiOverline align="center" tone="dark" style={{ marginBottom: 24 }}>
            {subheading}
          </ViiOverline>
        )}

        {body && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
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

        {/* Primary action button */}
        {buttonLabel?.trim() && buttonHref?.trim() && (
          <div style={{ marginBottom: 28 }}>
            <a
              href={buttonHref}
              className="vii-cta-btn"
              style={{
                display: "inline-block",
                position: "relative",
                overflow: "hidden",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--vii-paper)",
                background: "var(--vii-copper-deep)",
                padding: "16px 36px",
                borderRadius: "var(--radius, 0.2rem)",
                textDecoration: "none",
              }}
            >
              {buttonLabel}
            </a>
          </div>
        )}

        {/* Embed — iframe when enabled, external-link fallback when not */}
        {embed && (
          <div style={{ marginBottom: 28 }}>
            {embedsEnabled ? (
              embedReveal ? (
                <EmbedReveal
                  src={embed.src}
                  height={embed.height}
                  title={embed.title || "Book"}
                  triggerLabel={embed.title || "Book Now"}
                  aspectRatio={embed.aspectRatio}
                  maxWidth={embed.maxWidth}
                  triggerClassName="inline-block font-sans text-[13px] tracking-[0.14em] uppercase text-[var(--vii-paper)] bg-[var(--vii-copper-deep)] px-9 py-4 rounded-[var(--radius,0.2rem)] no-underline cursor-pointer border-0 hover:opacity-90 transition-opacity duration-300"
                />
              ) : embed.displayMode === "dialog" ? (
                <EmbedDialog
                  src={embed.src}
                  title={embed.title || "Book"}
                  aspectRatio={embed.aspectRatio}
                  height={embed.height}
                  triggerLabel={embed.triggerLabel ?? embed.title ?? "Book"}
                />
              ) : (
                <EmbedFrame
                  src={embed.src}
                  height={embed.height}
                  title={embed.title || "Book"}
                  aspectRatio={embed.aspectRatio}
                  maxWidth={embed.maxWidth}
                />
              )
            ) : (
              <a
                href={embed.src}
                target="_blank"
                rel="noopener noreferrer"
                className="vii-cta-btn"
                style={{
                  display: "inline-block",
                  position: "relative",
                  overflow: "hidden",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--vii-paper)",
                  background: "var(--vii-copper-deep)",
                  padding: "16px 36px",
                  borderRadius: "var(--radius, 0.2rem)",
                  textDecoration: "none",
                }}
              >
                {embed.title || "Book"}
              </a>
            )}
          </div>
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
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.5vw, 18px)",
                color: "var(--vii-paper)",
                textDecoration: "none",
                letterSpacing: "0.06em",
                display: "inline-flex",
                alignItems: "center",
                minHeight: 44,
              }}
            >
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(14px, 1.3vw, 16px)",
                color: "var(--vii-tan)",
                textDecoration: "none",
                letterSpacing: "0.06em",
                display: "inline-flex",
                alignItems: "center",
                minHeight: 44,
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
