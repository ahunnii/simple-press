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
 * 1. Optional full-width hero video panel above the mosaic (when set). When no
 *    video is configured, the masonry mosaic is the primary hero as before.
 * 2. Masonry-inspired mosaic gallery (up to 5 owner images) on navy.
 *    Service name in oversized serif overlays the bottom-left cell.
 * 3. Pull-quote / brand statement block (dark navy band, large italic serif)
 *    with optional media (image or video) beneath the quote.
 * 4. Refined treatment list — two columns (name/meta + description/book).
 *    Thin 1px tan rules between rows. Each row shows compare-at, tiers, and
 *    add-ons alongside the standard price chip.
 * 5. Closing CTA (reuses ViiContactCtaSection) with optional button + embed.
 */
import { useEffect, useState } from "react";
import Image from "next/image";

import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { parseTemplateIframeValue, parseTemplateListRows } from "~/lib/template-fields";
import { parseServiceAddOns, parseServicePriceTiers } from "~/lib/validators/services";
import { PageTransition } from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { ServiceHeroVideo } from "~/app/(storefront)/_templates/_service-pages/_shared/service-hero-video";
import { ServiceSectionMedia } from "~/app/(storefront)/_templates/_service-pages/_shared/service-section-media";

import { ViiContactCtaSection } from "../../homepage/vii-contact-cta-section";
import { useViiReveal } from "../../hooks/use-vii-reveal";
import { ViiOverline } from "../../shared/vii-overline";
import { resolveAtelierFields } from "./fields";

// ─── Sub-components ────────────────────────────────────────────────────────────

/**
 * When a hero video is configured it renders as a large full-width panel above
 * the mosaic — the mosaic still renders beneath it as the secondary gallery.
 * When no video is set the mosaic is the primary (and only) hero element.
 */
function AtelierHeroVideo({ src }: { src: string }) {
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setReduced(true);
  }, []);

  // Ken-Burns scale-settle on the media layer; pause/play button lives outside
  // this wrapper so it stays fixed in position during the scale.
  const mediaStyle: React.CSSProperties = reduced
    ? {}
    : {
        transform: shown ? "scale(1)" : "scale(1.08)",
        transition: "transform 2.2s var(--vii-ease)",
      };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "clamp(320px, 50vw, 640px)",
        background: "var(--vii-navy)",
        overflow: "hidden",
      }}
    >
      {/* The Ken-Burns scale lives on the <video> itself (via the style prop),
          so the pause/play button — a sibling of the video — stays fixed while
          the media settles. The wrapper's overflow:hidden clips the bloom. */}
      <ServiceHeroVideo
        src={src}
        buttonClassName="vii-atelier-video-btn"
        style={mediaStyle}
      />
      <style>{`
        .vii-atelier-video-btn {
          border-color: color-mix(in srgb, var(--vii-paper) 50%, transparent) !important;
          background: color-mix(in srgb, var(--vii-navy) 55%, transparent) !important;
          color: var(--vii-paper) !important;
        }
      `}</style>
    </div>
  );
}

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
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setReduced(true);
  }, []);

  // Ken-Burns scale-settle on the primary (large) mosaic cell image.
  const mediaStyle: React.CSSProperties = reduced
    ? {}
    : {
        transform: shown ? "scale(1)" : "scale(1.08)",
        transition: "transform 2.2s var(--vii-ease)",
      };

  // Clip-path line-reveal on the oversized h1 — wipes up from below.
  const headingStyle: React.CSSProperties = reduced
    ? { opacity: 1 }
    : {
        opacity: shown ? 1 : 0,
        clipPath: shown ? "inset(0 0 0% 0)" : "inset(0 0 110% 0)",
        transform: shown ? "translateY(0)" : "translateY(8px)",
        transition:
          "opacity 0.95s var(--vii-ease) 0.15s, clip-path 0.95s var(--vii-ease) 0.15s, transform 0.95s var(--vii-ease) 0.15s",
      };

  // Staggered fade-rise for the overline (delay 0) — matches hero-section cascade.
  const revealStyle = (delay: number): React.CSSProperties =>
    reduced
      ? { opacity: 1 }
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(20px)",
          transition: `opacity 0.9s var(--vii-ease) ${delay}s, transform 0.9s var(--vii-ease) ${delay}s`,
        };

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
          {/* Cell 1 — large, spans 2 rows left. Ken-Burns applied here. */}
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
                style={{ objectFit: "cover", ...mediaStyle }}
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
          <ViiOverline tone="dark" align="left" style={{ ...revealStyle(0), marginBottom: 16 }}>
            {overline}
          </ViiOverline>
        )}

        <h1
          style={{
            ...headingStyle,
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(52px, 9vw, 120px)",
            lineHeight: 0.95,
            color: "var(--vii-paper)",
            margin: 0,
            // Room below the baseline so the clip-path reveal doesn't shave
            // Playfair descenders (g/y/p).
            paddingBottom: "0.18em",
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
  quoteImageSrc,
  quoteVideoSrc,
}: {
  quote: string;
  attribution: string;
  quoteImageSrc?: string;
  quoteVideoSrc?: string;
}) {
  const { ref, visible } = useViiReveal(0.08);
  const { ref: mediaRef, visible: mediaVisible } = useViiReveal(0.1);

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

      {/* Optional media beneath the quote — contained within the navy band */}
      <div
        ref={mediaRef}
        className={`vii-reveal${mediaVisible ? " is-visible" : ""}`}
      >
        <ServiceSectionMedia
          imageSrc={quoteImageSrc}
          videoSrc={quoteVideoSrc}
          alt=""
          rounded={false}
          style={{
            maxWidth: 760,
            margin: "clamp(40px, 6vw, 64px) auto 0",
            aspectRatio: "16/9",
          }}
        />
      </div>
    </section>
  );
}

function TreatmentListRow({
  item,
  embedsEnabled,
  isLast,
  index,
}: {
  item: ServiceTemplateProps["items"][number];
  embedsEnabled: boolean;
  isLast: boolean;
  index: number;
}) {
  const priceTiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);

  return (
    <div
      className="vii-reveal-item vii-atelier-list-row"
      style={{
        "--i": Math.min(index, 7),
        display: "grid",
        gridTemplateColumns: "1fr 1.4fr",
        gap: "clamp(24px, 4vw, 56px)",
        padding: "clamp(28px, 4vw, 48px) 0",
        borderBottom: isLast ? "none" : "1px solid var(--vii-tan)",
        alignItems: "start",
      } as React.CSSProperties & { "--i": number }}
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

        {/* Duration + compare-at + price chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
          {item.compareAtPriceLabel && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
                textDecoration: "line-through",
                opacity: 0.6,
              }}
            >
              {item.compareAtPriceLabel}
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

        {/* Price tiers */}
        {priceTiers.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
                marginBottom: 6,
              }}
            >
              Pricing
            </p>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {priceTiers.map((tier, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--vii-ink-soft)",
                  }}
                >
                  <span>{tier.label}</span>
                  <span
                    aria-hidden="true"
                    style={{ color: "var(--vii-copper-light)", flexShrink: 0 }}
                  >
                    —
                  </span>
                  {tier.compareAtPriceLabel && (
                    <span style={{ textDecoration: "line-through", opacity: 0.55 }}>
                      {tier.compareAtPriceLabel}
                    </span>
                  )}
                  <span style={{ color: "var(--vii-navy)", fontWeight: 500 }}>
                    {tier.priceLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right: description + add-ons + book */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 16,
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

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
                marginBottom: 6,
              }}
            >
              Add-ons
            </p>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {addOns.map((addon, i) => (
                <li
                  key={i}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--vii-ink-soft)",
                  }}
                >
                  <span>{addon.name}</span>
                  {addon.priceLabel && (
                    <>
                      <span
                        aria-hidden="true"
                        style={{ margin: "0 4px", color: "var(--vii-copper-light)" }}
                      >
                        ·
                      </span>
                      <span style={{ color: "var(--vii-navy)", fontWeight: 500 }}>
                        {addon.priceLabel}
                      </span>
                    </>
                  )}
                  {addon.description && (
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        opacity: 0.65,
                        marginTop: 1,
                      }}
                    >
                      {addon.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
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
        display: inline-flex;
        align-items: center;
        height: auto;
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
  business,
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const cf = service.customFields as Record<string, unknown> | null | undefined;

  const f = resolveAtelierFields(service.customFields, [
    "vii-atelier.hero-video",
    "vii-atelier.hero-overline",
    "vii-atelier.pull-quote",
    "vii-atelier.pull-quote-attribution",
    "vii-atelier.quote-image",
    "vii-atelier.quote-video",
    "vii-atelier.list-heading",
    "vii-atelier.list-intro",
    "vii-atelier.cta-image",
    "vii-atelier.cta-heading",
    "vii-atelier.cta-subheading",
    "vii-atelier.cta-body",
    "vii-atelier.cta-button-label",
    "vii-atelier.cta-button-url",
    "vii-atelier.cta-embed",
    "vii-atelier.cta-embed-reveal",
  ]);

  // Parse gallery images from the list field
  const galleryRows = parseTemplateListRows(cf?.["vii-atelier.gallery"]);
  const galleryImages = galleryRows
    .map((r) => (typeof r.image === "string" ? r.image : ""))
    .filter(Boolean)
    .slice(0, 5);

  // Parse CTA embed
  const ctaEmbed = parseTemplateIframeValue(f["vii-atelier.cta-embed"]);
  const ctaEmbedReveal = f["vii-atelier.cta-embed-reveal"] === "true";

  const heroVideoSrc = f["vii-atelier.hero-video"] ?? "";

  const publishedItems = items.filter((it) => it.published !== false);

  return (
    <PageTransition>
      {/* 1a. Optional hero video — full-width panel above the mosaic */}
      {heroVideoSrc && <AtelierHeroVideo src={heroVideoSrc} />}

      {/* 1b. Mosaic gallery hero (always rendered; secondary when video is set) */}
      <AtelierMosaic
        galleryImages={galleryImages}
        serviceName={service.name}
        overline={f["vii-atelier.hero-overline"] ?? ""}
      />

      {/* 2. Pull quote + optional media */}
      <PullQuote
        quote={f["vii-atelier.pull-quote"] ?? ""}
        attribution={f["vii-atelier.pull-quote-attribution"] ?? ""}
        quoteImageSrc={f["vii-atelier.quote-image"] ?? ""}
        quoteVideoSrc={f["vii-atelier.quote-video"] ?? ""}
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
        phone={business.phoneNumber ?? ""}
        email={business.supportEmail ?? ""}
        buttonLabel={f["vii-atelier.cta-button-label"] ?? ""}
        buttonHref={f["vii-atelier.cta-button-url"] ?? ""}
        embed={ctaEmbed}
        embedsEnabled={embedsEnabled}
        embedReveal={ctaEmbedReveal}
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
  const { ref: rowsRef, visible: rowsVisible } = useViiReveal(0.06);

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
        >
          <h2
            id="atelier-list-heading"
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

        {/* Treatment rows — stagger group: one observer, per-item --i cascade */}
        <div
          ref={rowsRef}
          className={`vii-reveal-group${rowsVisible ? " is-visible" : ""}`}
        >
          {items.map((item, i) => (
            <TreatmentListRow
              key={item.id}
              item={item}
              embedsEnabled={embedsEnabled}
              isLast={i === items.length - 1}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
