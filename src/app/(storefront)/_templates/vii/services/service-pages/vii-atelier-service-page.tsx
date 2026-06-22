"use client";

/**
 * vii-atelier — Gallery-forward "atelier" layout
 *
 * Visual concept: the service page as a curated atelier wall — photography
 * leads. The hero is a full-bleed mosaic image-grid. Treatments are rendered
 * as a refined two-column table-like list (no heavy cards) — minimal ink,
 * maximum whitespace, very editorial. A pull-quote section separates the
 * gallery from the list. Booking lives in an inline right-aligned CTA per row.
 *
 * Layout:
 * 1. Masonry-inspired mosaic gallery (up to 5 owner images) on navy.
 *    Service name in oversized serif overlays the bottom-left cell.
 * 2. Pull-quote / brand statement block (dark navy band, large italic serif).
 * 3. Refined treatment list — two columns (name/meta + description/book).
 *    Thin 1px tan rules between rows. No card borders, no shadows.
 * 4. Closing CTA (reuses ViiContactCtaSection).
 */
import Image from "next/image";

import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { parseTemplateListRows } from "~/lib/template-fields";
import { PageTransition } from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";

import { ViiContactCtaSection } from "../../homepage/vii-contact-cta-section";
import { useViiReveal } from "../../hooks/use-vii-reveal";
import { resolveAtelierFields } from "./fields";

// ─── Sub-components ────────────────────────────────────────────────────────────

/**
 * Mosaic gallery: up to 5 images in a CSS grid.
 * Layout: large cell top-left (spans 2 rows), 2 tall cells right, 2 small cells bottom-left.
 * Falls back to a plain navy + service-name banner when no gallery images are configured.
 */
function AtelierMosaic({
  galleryImages,
  serviceName,
  overline,
}: {
  galleryImages: string[];
  serviceName: string;
  overline: string;
}) {
  const imgs = galleryImages.slice(0, 5);
  const hasImages = imgs.length > 0;

  return (
    <section
      aria-label={serviceName}
      style={{
        position: "relative",
        background: "var(--vii-navy)",
        minHeight: "clamp(480px, 75vh, 860px)",
        overflow: "hidden",
      }}
    >
      {hasImages ? (
        <div
          className="vii-atelier-mosaic"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: 3,
          }}
        >
          {/* Cell 1 — large, spans 2 rows left */}
          <div
            style={{
              gridColumn: "1",
              gridRow: "1 / span 2",
              position: "relative",
              overflow: "hidden",
              background: "var(--vii-slate)",
            }}
          >
            {imgs[0] && (
              <Image
                src={imgs[0]}
                alt=""
                fill
                priority
                sizes="33vw"
                style={{ objectFit: "cover" }}
              />
            )}
          </div>

          {/* Cells 2-5 — right side 2×2 */}
          {([1, 2, 3, 4] as const).map((n) => {
            const cellImg = imgs[n];
            return (
              <div
                key={n}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: "var(--vii-slate)",
                }}
              >
                {cellImg ? (
                  <Image
                    src={cellImg}
                    alt=""
                    fill
                    sizes="33vw"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(${n % 2 === 0 ? "135" : "225"}deg, var(--vii-navy) 0%, var(--vii-slate) 100%)`,
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Overall scrim */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) 88%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 20%, transparent) 55%, color-mix(in srgb, var(--vii-navy) 15%, transparent) 100%)",
              zIndex: 1,
            }}
          />
        </div>
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

      {/* Service name overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "0 clamp(24px, 6vw, 96px) clamp(48px, 8vh, 88px)",
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
            fontSize: "clamp(52px, 9vw, 120px)",
            lineHeight: 0.95,
            color: "var(--vii-paper)",
            margin: 0,
            maxWidth: 700,
          }}
        >
          {serviceName}
        </h1>
      </div>
    </section>
  );
}

function PullQuote({
  quote,
  attribution,
}: {
  quote: string;
  attribution: string;
}) {
  const { ref, visible } = useViiReveal(0.08);

  if (!quote) return null;

  return (
    <section
      aria-label="Brand statement"
      style={{
        background: "var(--vii-navy)",
        padding: "clamp(64px, 10vw, 112px) clamp(24px, 8vw, 128px)",
        textAlign: "center",
      }}
    >
      <div
        ref={ref}
        className={`vii-reveal${visible ? " is-visible" : ""}`}
        style={{ maxWidth: 760, margin: "0 auto" }}
      >
        {/* Opening quotation mark */}
        <span
          aria-hidden="true"
          style={{
            display: "block",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(64px, 10vw, 120px)",
            lineHeight: 0.6,
            color: "var(--vii-copper-light)",
            marginBottom: 16,
            opacity: 0.6,
          }}
        >
          &ldquo;
        </span>

        <blockquote
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(22px, 3.5vw, 44px)",
            lineHeight: 1.3,
            color: "var(--vii-paper)",
            margin: 0,
          }}
        >
          {quote}
        </blockquote>

        {attribution && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--vii-copper-light)",
              marginTop: 28,
              opacity: 0.9,
            }}
          >
            — {attribution}
          </p>
        )}
      </div>
    </section>
  );
}

function TreatmentListRow({
  item,
  embedsEnabled,
  isLast,
}: {
  item: ServiceTemplateProps["items"][number];
  embedsEnabled: boolean;
  isLast: boolean;
}) {
  const { ref, visible } = useViiReveal(0.1);

  return (
    <div
      ref={ref}
      className={`vii-reveal vii-atelier-list-row${visible ? " is-visible" : ""}`}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1.4fr",
        gap: "clamp(24px, 4vw, 56px)",
        padding: "clamp(28px, 4vw, 48px) 0",
        borderBottom: isLast ? "none" : "1px solid var(--vii-tan)",
        alignItems: "start",
      }}
    >
      {/* Left: name + meta */}
      <div>
        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(20px, 2.5vw, 30px)",
            lineHeight: 1.15,
            color: "var(--vii-navy)",
            margin: "0 0 14px",
          }}
        >
          {item.name}
        </h3>

        {/* Duration + price */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                borderRadius: "var(--radius)",
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
                color: "var(--vii-navy)",
                fontWeight: 500,
                padding: "3px 10px",
                border: "1px solid var(--vii-copper)",
                borderRadius: "var(--radius)",
              }}
            >
              {item.priceLabel}
            </span>
          )}
        </div>
      </div>

      {/* Right: description + book */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 18,
        }}
      >
        {item.description && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(13px, 1.2vw, 15px)",
              lineHeight: 1.8,
              color: "var(--vii-ink-soft)",
              margin: 0,
            }}
          >
            {item.description}
          </p>
        )}

        {/* Inline book — very minimal text link style */}
        <div className="vii-atelier-book">
          <ServiceBookingDialog
            triggerLabel="Book →"
            itemName={item.name}
            embedSrc={item.bookingEmbedSrc ?? undefined}
            embedHeight={item.bookingEmbedHeight ?? undefined}
            embedsEnabled={embedsEnabled}
          />
        </div>
      </div>
    </div>
  );
}

/** Hoisted once per page (not per row) — book-link styling + mobile collapse. */
function AtelierListStyles() {
  return (
    <style>{`
      .vii-atelier-book button,
      .vii-atelier-book a {
        display: inline-block;
        padding: 11px 0;
        background: transparent;
        color: var(--vii-navy) !important;
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        text-decoration: underline;
        text-decoration-color: var(--vii-copper-deep);
        text-underline-offset: 5px;
        text-decoration-thickness: 1px;
        border: none;
        cursor: pointer;
        transition: text-decoration-thickness 0.2s ease, opacity 0.2s ease;
        box-shadow: none;
      }
      .vii-atelier-book button:hover,
      .vii-atelier-book a:hover { text-decoration-thickness: 2px; }
      .vii-atelier-book button:disabled {
        color: var(--vii-ink-soft) !important;
        text-decoration: none;
        cursor: not-allowed;
      }
      @media (max-width: 640px) {
        .vii-atelier-list-row {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ViiAtelierServicePage({
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const f = resolveAtelierFields(service.customFields, [
    "vii-atelier.hero-overline",
    "vii-atelier.pull-quote",
    "vii-atelier.pull-quote-attribution",
    "vii-atelier.list-heading",
    "vii-atelier.list-intro",
    "vii-atelier.cta-image",
    "vii-atelier.cta-heading",
    "vii-atelier.cta-subheading",
    "vii-atelier.cta-body",
    "vii-atelier.cta-phone",
    "vii-atelier.cta-email",
  ]);

  // Parse gallery images from the list field
  const galleryRows = parseTemplateListRows(
    (service.customFields as Record<string, unknown> | null | undefined)?.[
      "vii-atelier.gallery"
    ],
  );
  const galleryImages = galleryRows
    .map((r) => (typeof r.image === "string" ? r.image : ""))
    .filter(Boolean)
    .slice(0, 5);

  const publishedItems = items.filter((it) => it.published !== false);

  return (
    <PageTransition>
      {/* 1. Mosaic gallery hero */}
      <AtelierMosaic
        galleryImages={galleryImages}
        serviceName={service.name}
        overline={f["vii-atelier.hero-overline"] ?? ""}
      />

      {/* 2. Pull quote */}
      <PullQuote
        quote={f["vii-atelier.pull-quote"] ?? ""}
        attribution={f["vii-atelier.pull-quote-attribution"] ?? ""}
      />

      {/* 3. Refined treatment list */}
      {publishedItems.length > 0 && (
        <AtelierList
          items={publishedItems}
          embedsEnabled={embedsEnabled}
          listHeading={f["vii-atelier.list-heading"] ?? ""}
          listIntro={f["vii-atelier.list-intro"] ?? ""}
        />
      )}

      {/* 4. Closing CTA */}
      <ViiContactCtaSection
        contactImage={f["vii-atelier.cta-image"] ?? undefined}
        heading={f["vii-atelier.cta-heading"] ?? ""}
        subheading={f["vii-atelier.cta-subheading"] ?? ""}
        body={f["vii-atelier.cta-body"] ?? ""}
        phone={f["vii-atelier.cta-phone"] ?? ""}
        email={f["vii-atelier.cta-email"] ?? ""}
      />
    </PageTransition>
  );
}

function AtelierList({
  items,
  embedsEnabled,
  listHeading,
  listIntro,
}: {
  items: ServiceTemplateProps["items"];
  embedsEnabled: boolean;
  listHeading: string;
  listIntro: string;
}) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.08);

  return (
    <section
      aria-labelledby="atelier-list-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <AtelierListStyles />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Section header */}
        <div
          ref={headRef}
          className={`vii-reveal vii-atelier-list-row${headVisible ? " is-visible" : ""}`}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: "clamp(24px, 4vw, 56px)",
            marginBottom: "clamp(32px, 5vw, 56px)",
            paddingBottom: "clamp(24px, 3vw, 40px)",
            borderBottom: "1px solid var(--vii-tan)",
            alignItems: "end",
          }}
          id="atelier-list-heading"
        >
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 52px)",
              lineHeight: 1.08,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {listHeading || (
              <>
                Our{" "}
                <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
                  treatments
                </em>
              </>
            )}
          </h2>

          {listIntro && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(14px, 1.3vw, 15px)",
                lineHeight: 1.8,
                color: "var(--vii-ink-soft)",
                margin: 0,
              }}
            >
              {listIntro}
            </p>
          )}
        </div>

        {/* Treatment rows */}
        <div>
          {items.map((item, i) => (
            <TreatmentListRow
              key={item.id}
              item={item}
              embedsEnabled={embedsEnabled}
              isLast={i === items.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
