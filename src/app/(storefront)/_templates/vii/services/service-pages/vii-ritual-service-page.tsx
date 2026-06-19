"use client";

/**
 * vii-ritual — Intimate "ritual journey" layout
 *
 * Visual concept: the service page as a curated guide through a sensory
 * ritual — treatments are presented as sequenced "moments" in alternating
 * full-bleed media + text rows (mirroring vii-about-steps). A narrow navy
 * column-rule separates each row for editorial rhythm.
 *
 * Layout:
 * 1. Compact dark hero with the service name, a thin copper rule, and a
 *    brief description below — positioned centre-stage, not bottom-anchored.
 * 2. Rich-text "philosophy" block on cream (centered, italic accent).
 * 3. Ritual steps — one per service item, alternating image/text sides.
 *    Each step contains the item name, duration/price, description, and Book.
 * 4. Full-bleed navy closing CTA with background image.
 */
import Image from "next/image";

import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { PageTransition } from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { ViiContactCtaSection } from "../../homepage/vii-contact-cta-section";
import { useViiReveal } from "../../hooks/use-vii-reveal";
import { resolveRitualFields } from "./fields";

// ─── Sub-components ────────────────────────────────────────────────────────────

function RitualHero({
  heroImage,
  overline,
  serviceName,
  serviceDescription,
}: {
  heroImage?: string;
  overline: string;
  serviceName: string;
  serviceDescription?: string | null;
}) {
  const hasImage = !!heroImage?.trim();

  return (
    <section
      aria-label={serviceName}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "clamp(400px, 62vh, 680px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--vii-navy)",
      }}
    >
      {hasImage ? (
        <Image
          src={heroImage!}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", opacity: 0.35 }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, var(--vii-navy) 0%, var(--vii-slate) 100%)",
          }}
        />
      )}

      {/* Scrim */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(30,53,64,0.55)",
          zIndex: 1,
        }}
      />

      {/* Centre-stage content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: "clamp(48px, 8vw, 96px) clamp(24px, 6vw, 96px)",
          maxWidth: 760,
        }}
      >
        {overline && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--vii-copper-light)",
              marginBottom: 20,
            }}
          >
            {overline}
          </p>
        )}

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(42px, 7.5vw, 96px)",
            lineHeight: 1.0,
            color: "var(--vii-paper)",
            margin: 0,
          }}
        >
          {serviceName}
        </h1>

        {/* Copper rule divider */}
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 1,
            background: "var(--vii-copper-light)",
            margin: "28px auto",
          }}
        />

        {serviceDescription && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(14px, 1.4vw, 16px)",
              lineHeight: 1.8,
              color: "var(--vii-paper)",
              opacity: 0.82,
              margin: 0,
              maxWidth: 520,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {serviceDescription}
          </p>
        )}
      </div>
    </section>
  );
}

function RitualPhilosophy({
  overline,
  heading,
  headingAccent,
  bodyJson,
  bodyFallback,
}: {
  overline: string;
  heading: string;
  headingAccent: string;
  bodyJson: TiptapJSON | null;
  bodyFallback: string;
}) {
  const { ref, visible } = useViiReveal(0.1);

  if (!heading && !headingAccent && !bodyJson && !bodyFallback) return null;

  return (
    <section
      aria-labelledby="ritual-philosophy-heading"
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(72px, 10vw, 112px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div
        ref={ref}
        className={`vii-reveal${visible ? " is-visible" : ""}`}
        style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}
      >
        {overline && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--vii-ink-soft)",
              marginBottom: 16,
            }}
          >
            {overline}
          </p>
        )}

        {(heading || headingAccent) && (
          <h2
            id="ritual-philosophy-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 5vw, 60px)",
              lineHeight: 1.08,
              color: "var(--vii-navy)",
              margin: "0 0 28px",
            }}
          >
            {heading}{" "}
            {headingAccent && (
              <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
                {headingAccent}
              </em>
            )}
          </h2>
        )}

        {bodyJson ? (
          <div
            className="prose prose-neutral max-w-none"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(15px, 1.4vw, 17px)",
              lineHeight: 1.85,
              color: "var(--vii-ink-soft)",
            }}
          >
            <TiptapRenderer content={bodyJson} />
          </div>
        ) : bodyFallback ? (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(15px, 1.4vw, 17px)",
              lineHeight: 1.85,
              color: "var(--vii-ink-soft)",
              margin: 0,
            }}
          >
            {bodyFallback}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function RitualStep({
  item,
  index,
  embedsEnabled,
}: {
  item: ServiceTemplateProps["items"][number];
  index: number;
  embedsEnabled: boolean;
}) {
  const { ref, visible } = useViiReveal(0.1);
  const isReversed = index % 2 === 1;
  const stepNum = String(index + 1).padStart(2, "0");

  return (
    <div
      ref={ref}
      className={`vii-reveal vii-ritual-step${isReversed ? "is-reversed" : ""}${visible ? " is-visible" : ""}`}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "clamp(360px, 50vw, 560px)",
      }}
    >
      {/* Media panel */}
      <div
        className="vii-ritual-media"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--vii-tan)",
          order: isReversed ? 2 : 1,
        }}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
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
              background: `linear-gradient(${isReversed ? "225deg" : "135deg"}, var(--vii-navy) 0%, var(--vii-slate) 100%)`,
            }}
          />
        )}

        {/* Large italic step number watermark */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "clamp(16px, 3vw, 32px)",
            left: isReversed ? "auto" : "clamp(16px, 3vw, 32px)",
            right: isReversed ? "clamp(16px, 3vw, 32px)" : "auto",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(80px, 14vw, 160px)",
            lineHeight: 1,
            color: "rgba(193,170,145,0.22)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {stepNum}
        </div>
      </div>

      {/* Text panel */}
      <div
        className="vii-ritual-text"
        style={{
          background: index % 4 < 2 ? "var(--vii-cream)" : "var(--vii-paper)",
          padding: "clamp(40px, 7vw, 80px) clamp(28px, 5vw, 64px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          order: isReversed ? 1 : 2,
        }}
      >
        {/* Chips */}
        {(item.durationLabel ?? item.priceLabel) && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {item.durationLabel && (
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--vii-ink-soft)",
                  padding: "3px 10px",
                  border: "1px solid var(--vii-tan)",
                  borderRadius: "0.15rem",
                }}
              >
                {item.durationLabel}
              </span>
            )}
            {item.priceLabel && (
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--vii-copper)",
                  padding: "3px 10px",
                  border: "1px solid var(--vii-copper)",
                  borderRadius: "0.15rem",
                }}
              >
                {item.priceLabel}
              </span>
            )}
          </div>
        )}

        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(24px, 3vw, 40px)",
            lineHeight: 1.1,
            color: "var(--vii-navy)",
            margin: "0 0 16px",
          }}
        >
          {item.name}
        </h3>

        {item.description && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(14px, 1.3vw, 16px)",
              lineHeight: 1.8,
              color: "var(--vii-ink-soft)",
              margin: "0 0 32px",
              maxWidth: 420,
            }}
          >
            {item.description}
          </p>
        )}

        {/* Book button — copper ghost style */}
        <div className="vii-ritual-book">
          <ServiceBookingDialog
            triggerLabel="Reserve This Ritual"
            itemName={item.name}
            embedSrc={item.bookingEmbedSrc ?? undefined}
            embedHeight={item.bookingEmbedHeight ?? undefined}
            embedsEnabled={embedsEnabled}
          />
        </div>
      </div>

      <style>{`
        .vii-ritual-book button,
        .vii-ritual-book a {
          display: inline-block;
          padding: 13px 32px;
          background: transparent;
          color: var(--vii-navy) !important;
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 0.15rem;
          border: 1.5px solid var(--vii-navy);
          cursor: pointer;
          transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }
        .vii-ritual-book button:hover,
        .vii-ritual-book a:hover {
          background: var(--vii-navy);
          color: var(--vii-paper) !important;
        }
        .vii-ritual-book button:disabled {
          border-color: var(--vii-tan);
          color: var(--vii-tan) !important;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .vii-ritual-step {
            grid-template-columns: 1fr !important;
          }
          .vii-ritual-media { order: 1 !important; min-height: 260px; }
          .vii-ritual-text { order: 2 !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ViiRitualServicePage({
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const f = resolveRitualFields(service.customFields, [
    "vii-ritual.hero-image",
    "vii-ritual.hero-overline",
    "vii-ritual.philosophy-overline",
    "vii-ritual.philosophy-heading",
    "vii-ritual.philosophy-heading-accent",
    "vii-ritual.philosophy-body",
    "vii-ritual.cta-image",
    "vii-ritual.cta-heading",
    "vii-ritual.cta-subheading",
    "vii-ritual.cta-body",
    "vii-ritual.cta-phone",
    "vii-ritual.cta-email",
  ]);

  // Parse richtext philosophy body
  let philosophyBodyJson: TiptapJSON | null = null;
  const philosophyBodyRaw = f["vii-ritual.philosophy-body"];
  if (philosophyBodyRaw) {
    try {
      philosophyBodyJson = JSON.parse(philosophyBodyRaw) as TiptapJSON;
    } catch {
      // fall back to plain text
    }
  }

  const publishedItems = items.filter((it) => it.published !== false);

  return (
    <PageTransition>
      {/* 1. Hero */}
      <RitualHero
        heroImage={f["vii-ritual.hero-image"] ?? undefined}
        overline={f["vii-ritual.hero-overline"] ?? ""}
        serviceName={service.name}
        serviceDescription={service.description}
      />

      {/* 2. Philosophy block */}
      <RitualPhilosophy
        overline={f["vii-ritual.philosophy-overline"] ?? ""}
        heading={f["vii-ritual.philosophy-heading"] ?? ""}
        headingAccent={f["vii-ritual.philosophy-heading-accent"] ?? ""}
        bodyJson={philosophyBodyJson}
        bodyFallback={philosophyBodyJson ? "" : (philosophyBodyRaw ?? "")}
      />

      {/* 3. Ritual steps */}
      {publishedItems.length > 0 && (
        <section aria-label="Treatment rituals">
          {publishedItems.map((item, i) => (
            <RitualStep
              key={item.id}
              item={item}
              index={i}
              embedsEnabled={embedsEnabled}
            />
          ))}
        </section>
      )}

      {/* 4. Closing CTA */}
      <ViiContactCtaSection
        contactImage={f["vii-ritual.cta-image"] ?? undefined}
        heading={f["vii-ritual.cta-heading"] ?? ""}
        subheading={f["vii-ritual.cta-subheading"] ?? ""}
        body={f["vii-ritual.cta-body"] ?? ""}
        phone={f["vii-ritual.cta-phone"] ?? ""}
        email={f["vii-ritual.cta-email"] ?? ""}
      />
    </PageTransition>
  );
}
