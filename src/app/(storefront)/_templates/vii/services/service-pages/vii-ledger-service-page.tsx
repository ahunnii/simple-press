"use client";

/**
 * vii-ledger — Minimal, type-led service page
 *
 * Designed for services that often have NO photography and NO testimonials.
 * Looks intentional with zero images; supports optional media when present.
 *
 * Layout:
 * 1. Adaptive hero (LedgerHero) — three branches by precedence:
 *    - Video set → full-width media panel (ServiceHeroVideo) + navy scrim + bottom-left name overlay
 *    - Image set (no video) → full-bleed next/image fill + same scrim + name overlay
 *    - Neither (DEFAULT) → light cream typographic hero: copper-deep overline, thin copper rule,
 *      service name in large navy Playfair-italic <h1>, optional description in ink-soft
 * 2. LedgerIntro — centred overline + serif heading + copper-italic accent + richtext body
 *    via TiptapRenderer + optional image/video via ServiceSectionMedia.
 *    Returns null when heading/accent/body are all empty.
 * 3. LedgerList — two-column treatment table (gridTemplateColumns: "1fr 1.4fr"),
 *    tan hairline rules, duration/compare-at/price chips, price tiers, add-ons,
 *    inline underlined "Book →" ServiceBookingDialog.
 * 4. Closing CTA — ViiContactCtaSection with vii-ledger.cta-* fields.
 */
import { useEffect, useState } from "react";
import Image from "next/image";

import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { parseTemplateIframeValue, parseTemplateRichtext } from "~/lib/template-fields";
import { parseServiceAddOns, parseServicePriceTiers } from "~/lib/validators/services";
import { PageTransition } from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ServiceHeroVideo } from "~/app/(storefront)/_templates/_service-pages/_shared/service-hero-video";
import { ServiceSectionMedia } from "~/app/(storefront)/_templates/_service-pages/_shared/service-section-media";

import { api } from "~/trpc/react";

import { ViiContactCtaSection } from "../../homepage/vii-contact-cta-section";
import { ViiProductRail } from "../../homepage/vii-product-rail";
import { useViiReveal } from "../../hooks/use-vii-reveal";
import { ViiOverline } from "../../shared/vii-overline";
import { resolveLedgerFields } from "./fields";

// ─── Sub-components ────────────────────────────────────────────────────────────

function LedgerHero({
  heroVideo,
  heroImage,
  serviceName,
  serviceDescription,
  overline,
}: {
  heroVideo?: string;
  heroImage?: string;
  serviceName: string;
  serviceDescription?: string | null;
  overline: string;
}) {
  const [shown, setShown] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Entrance reveal on mount — skipped entirely when the user prefers reduced
  // motion (mirrors SanctuaryHero's behaviour).
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setReduceMotion(true);
      setShown(true);
      return;
    }
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const hasVideo = !!heroVideo?.trim();
  const hasImage = !!heroImage?.trim();

  // Staggered fade-rise for overline, rule, description.
  const revealStyle = (delay: number): React.CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(20px)",
          transition: `opacity 0.95s var(--vii-ease) ${delay}s, transform 0.95s var(--vii-ease) ${delay}s`,
        };

  // Clip-path line-reveal on the primary <h1> — more cinematic than a plain
  // fade-rise. Mirrors headingStyle from vii-hero-section.tsx.
  const headingStyle: React.CSSProperties = reduceMotion
    ? {}
    : {
        opacity: shown ? 1 : 0,
        clipPath: shown ? "inset(0 0 0% 0)" : "inset(0 0 110% 0)",
        transform: shown ? "translateY(0)" : "translateY(8px)",
        transition: `opacity 0.95s var(--vii-ease) 0.15s, clip-path 0.95s var(--vii-ease) 0.15s, transform 0.95s var(--vii-ease) 0.15s`,
      };

  // Slow Ken-Burns scale-settle on the background media — mirrors mediaStyle
  // from vii-hero-section.tsx. Applied to the inner media wrapper (which is
  // nested inside an overflow:hidden container so the scale is clipped).
  const mediaStyle: React.CSSProperties = reduceMotion
    ? {}
    : {
        transform: shown ? "scale(1)" : "scale(1.08)",
        transition: `transform 2.2s var(--vii-ease)`,
      };

  // ── Media branch (video or image): navy background + scrim + bottom-left overlay ──
  if (hasVideo || hasImage) {
    return (
      <section
        aria-label={serviceName}
        style={{
          position: "relative",
          width: "100%",
          height: "clamp(420px, 65vw, 720px)",
          background: "var(--vii-navy)",
          overflow: "hidden",
        }}
      >
        {hasVideo ? (
          // The Ken-Burns scale lives on the <video> itself (via the style
          // prop), not this wrapper — so the pause/play button, a sibling of
          // the video, stays fixed while the media settles. overflow:hidden
          // clips the scaled bloom.
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
            }}
          >
            <ServiceHeroVideo
              src={heroVideo!}
              buttonClassName="vii-ledger-video-btn"
              style={mediaStyle}
            />
          </div>
        ) : (
          // Image: apply Ken-Burns scale; section's overflow:hidden clips it.
          <div
            style={{
              position: "absolute",
              inset: 0,
              ...mediaStyle,
            }}
          >
            <Image
              src={heroImage!}
              alt=""
              fill
              priority
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        )}

        {/* Navy scrim — stronger at the bottom where text sits */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) 88%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 20%, transparent) 55%, color-mix(in srgb, var(--vii-navy) 15%, transparent) 100%)",
            zIndex: 1,
          }}
        />

        {/* Bottom-left name overlay — cascades in on entrance */}
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

        <style>{`
          .vii-ledger-video-btn {
            border-color: color-mix(in srgb, var(--vii-paper) 50%, transparent) !important;
            background: color-mix(in srgb, var(--vii-navy) 55%, transparent) !important;
            color: var(--vii-paper) !important;
          }
        `}</style>
      </section>
    );
  }

  // ── Cream typographic hero (default — no media) ──
  return (
    <section
      aria-label={serviceName}
      style={{
        background: "var(--vii-cream)",
        padding:
          "clamp(80px, 14vh, 140px) clamp(24px, 6vw, 96px) clamp(64px, 10vh, 112px)",
      }}
    >
      <div style={{ maxWidth: 860 }}>
        {overline && (
          <ViiOverline tone="light" align="left" style={{ ...revealStyle(0), marginBottom: 28 }}>
            {overline}
          </ViiOverline>
        )}

        <h1
          style={{
            ...headingStyle,
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(44px, 7vw, 88px)",
            lineHeight: 1.0,
            color: "var(--vii-navy)",
            margin: 0,
            marginBottom: serviceDescription ? 24 : 0,
            // Room below the baseline so the clip-path reveal doesn't shave
            // Playfair descenders (g/y/p).
            paddingBottom: "0.18em",
          }}
        >
          {serviceName}
        </h1>

        {serviceDescription && (
          <p
            style={{
              ...revealStyle(0.25),
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(14px, 1.4vw, 17px)",
              lineHeight: 1.75,
              color: "var(--vii-ink-soft)",
              maxWidth: 540,
              margin: 0,
            }}
          >
            {serviceDescription}
          </p>
        )}
      </div>
    </section>
  );
}

function LedgerIntro({
  overline,
  heading,
  headingAccent,
  bodyJson,
  introImageSrc,
  introVideoSrc,
}: {
  overline: string;
  heading: string;
  headingAccent: string;
  bodyJson: TiptapJSON | null;
  introImageSrc?: string;
  introVideoSrc?: string;
}) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.1);
  const { ref: bodyRef, visible: bodyVisible } = useViiReveal(0.1);
  const { ref: mediaRef, visible: mediaVisible } = useViiReveal(0.1);

  // Hidden entirely when all content is empty
  if (!heading && !headingAccent && !bodyJson) return null;

  return (
    <section
      aria-labelledby="ledger-intro-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div
          ref={headRef}
          className={`vii-reveal${headVisible ? " is-visible" : ""}`}
        >
          {overline && (
            <ViiOverline tone="light" align="center" style={{ marginBottom: 16 }}>
              {overline}
            </ViiOverline>
          )}

          {(heading || headingAccent) && (
            <h2
              id="ledger-intro-heading"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(36px, 5.5vw, 72px)",
                lineHeight: 1.05,
                color: "var(--vii-navy)",
                margin: 0,
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
        </div>

        {bodyJson && (
          <div
            ref={bodyRef}
            className={`vii-reveal${bodyVisible ? " is-visible" : ""}`}
            style={{ marginTop: 32 }}
          >
            <div
              className="prose prose-neutral max-w-none"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.8,
                color: "var(--vii-ink-soft)",
              }}
            >
              <TiptapRenderer content={bodyJson} />
            </div>
          </div>
        )}

        {/* Optional section media */}
        {(Boolean(introImageSrc) || Boolean(introVideoSrc)) && (
          <div
            ref={mediaRef}
            className={`vii-reveal${mediaVisible ? " is-visible" : ""}`}
          >
            <ServiceSectionMedia
              imageSrc={introImageSrc}
              videoSrc={introVideoSrc}
              alt=""
              style={{
                marginTop: "clamp(32px, 5vw, 48px)",
                maxWidth: 680,
                margin: "clamp(32px, 5vw, 48px) auto 0",
                aspectRatio: "16/9",
              }}
            />
          </div>
        )}
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
      className="vii-reveal-item vii-ledger-list-row"
      style={
        {
          "--i": Math.min(index, 7),
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: "clamp(24px, 4vw, 56px)",
          padding: "clamp(28px, 4vw, 48px) 0",
          borderBottom: isLast ? "none" : "1px solid var(--vii-tan)",
          alignItems: "start",
        } as React.CSSProperties
      }
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
        <div className="vii-ledger-book">
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
function LedgerListStyles() {
  return (
    <style>{`
      .vii-ledger-book button,
      .vii-ledger-book a {
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
      .vii-ledger-book button:hover,
      .vii-ledger-book a:hover { text-decoration-thickness: 2px; }
      .vii-ledger-book button:disabled {
        color: var(--vii-ink-soft) !important;
        text-decoration: none;
        cursor: not-allowed;
      }
      @media (max-width: 640px) {
        .vii-ledger-list-row {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  );
}

function LedgerList({
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
  const { ref: rowsRef, visible: rowsVisible } = useViiReveal(0.08);

  return (
    <section
      aria-labelledby="ledger-list-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <LedgerListStyles />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Section header */}
        <div
          ref={headRef}
          className={`vii-reveal vii-ledger-list-row${headVisible ? " is-visible" : ""}`}
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
            id="ledger-list-heading"
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

        {/* Treatment rows — stagger group */}
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

// ─── LedgerNotes ──────────────────────────────────────────────────────────────

function LedgerNotes({
  heading,
  gratuity,
  cancellation,
}: {
  heading: string;
  gratuity: string;
  cancellation: string;
}) {
  const { ref, visible } = useViiReveal(0.08);

  if (!gratuity && !cancellation) return null;

  const hasHeading = heading.trim().length > 0;

  return (
    <section
      {...(hasHeading
        ? { "aria-labelledby": "ledger-notes-heading" }
        : { "aria-label": "Before you book" })}
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(8px, 2vw, 20px) clamp(24px, 6vw, 96px) clamp(48px, 6vw, 80px)",
      }}
    >
      {/* Grid mirrors the treatment table (same max-width + 1fr 1.4fr columns +
          gap) so the note's two items align directly under the table columns. */}
      <style>{`
        .vii-ledger-notes-grid {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: clamp(24px, 4vw, 56px);
        }
        @media (max-width: 640px) {
          .vii-ledger-notes-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          borderTop: "1px solid var(--vii-tan)",
          paddingTop: "clamp(28px, 3.5vw, 40px)",
        }}
      >
        <div
          ref={ref}
          className={`vii-reveal${visible ? " is-visible" : ""}`}
        >
          {hasHeading && (
            <h2
              id="ledger-notes-heading"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontStyle: "italic",
                fontSize: "clamp(22px, 3vw, 30px)",
                lineHeight: 1.15,
                color: "var(--vii-navy)",
                margin: "0 0 clamp(20px, 3vw, 32px)",
              }}
            >
              {heading}
            </h2>
          )}

          <div className="vii-ledger-notes-grid">
            {gratuity && (
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--vii-copper-deep)",
                    margin: "0 0 8px",
                  }}
                >
                  Gratuity
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "clamp(13px, 1.2vw, 15px)",
                    lineHeight: 1.7,
                    color: "var(--vii-ink-soft)",
                    margin: 0,
                  }}
                >
                  {gratuity}
                </p>
              </div>
            )}

            {cancellation && (
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--vii-copper-deep)",
                    margin: "0 0 8px",
                  }}
                >
                  Cancellations
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "clamp(13px, 1.2vw, 15px)",
                    lineHeight: 1.7,
                    color: "var(--vii-ink-soft)",
                    margin: 0,
                  }}
                >
                  {cancellation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── LedgerProductRail ─────────────────────────────────────────────────────────

function LedgerProductRail({
  overline,
  heading,
  ctaText,
  ctaHref,
  collectionId,
  featuredOnly,
}: {
  overline: string;
  heading: string;
  ctaText: string;
  ctaHref: string;
  collectionId: string;
  featuredOnly: boolean;
}) {
  const id = collectionId.trim();
  const hasCollection = id.length > 0;

  const collQ = api.collections.getProductsByCollectionId.useQuery(id, {
    enabled: hasCollection,
    retry: false,
  });
  const railQ = api.product.getRailProducts.useQuery(
    { featuredOnly },
    { enabled: !hasCollection, retry: false },
  );

  const products = hasCollection
    ? (collQ.data?.products ?? [])
    : (railQ.data ?? []);

  return (
    <ViiProductRail
      overline={overline || undefined}
      heading={heading}
      ctaText={ctaText}
      ctaHref={ctaHref}
      products={products as unknown as Parameters<typeof ViiProductRail>[0]["products"]}
    />
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ViiLedgerServicePage({
  business,
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const cf = service.customFields as Record<string, unknown> | null | undefined;

  const f = resolveLedgerFields(service.customFields, [
    "vii-ledger.hero-video",
    "vii-ledger.hero-image",
    "vii-ledger.hero-overline",
    "vii-ledger.intro-overline",
    "vii-ledger.intro-heading",
    "vii-ledger.intro-heading-accent",
    "vii-ledger.intro-image",
    "vii-ledger.intro-video",
    "vii-ledger.list-heading",
    "vii-ledger.list-intro",
    "vii-ledger.notes-heading",
    "vii-ledger.notes-gratuity",
    "vii-ledger.notes-cancellation",
    "vii-ledger.rail-overline",
    "vii-ledger.rail-heading",
    "vii-ledger.rail-collection",
    "vii-ledger.rail-featured-only",
    "vii-ledger.rail-cta-text",
    "vii-ledger.rail-cta-url",
    "vii-ledger.cta-image",
    "vii-ledger.cta-heading",
    "vii-ledger.cta-subheading",
    "vii-ledger.cta-body",
    "vii-ledger.cta-button-label",
    "vii-ledger.cta-button-url",
    "vii-ledger.cta-embed",
    "vii-ledger.cta-embed-reveal",
  ]);

  // Parse richtext body directly from service.customFields (bypasses string-only resolver)
  const introBodyJson = parseTemplateRichtext(cf?.["vii-ledger.intro-body"]);

  // Parse CTA embed
  const ctaEmbed = parseTemplateIframeValue(f["vii-ledger.cta-embed"]);
  const ctaEmbedReveal = f["vii-ledger.cta-embed-reveal"] === "true";

  const publishedItems = items.filter((it) => it.published !== false);

  return (
    <PageTransition>
      {/* 1. Adaptive hero */}
      <LedgerHero
        heroVideo={f["vii-ledger.hero-video"] ?? undefined}
        heroImage={f["vii-ledger.hero-image"] ?? undefined}
        serviceName={service.name}
        serviceDescription={service.description}
        overline={f["vii-ledger.hero-overline"] ?? ""}
      />

      {/* 2. Intro (hidden when all content is empty) */}
      <LedgerIntro
        overline={f["vii-ledger.intro-overline"] ?? ""}
        heading={f["vii-ledger.intro-heading"] ?? ""}
        headingAccent={f["vii-ledger.intro-heading-accent"] ?? ""}
        bodyJson={introBodyJson}
        introImageSrc={f["vii-ledger.intro-image"] ?? ""}
        introVideoSrc={f["vii-ledger.intro-video"] ?? ""}
      />

      {/* 3. Treatment list */}
      {publishedItems.length > 0 && (
        <LedgerList
          items={publishedItems}
          embedsEnabled={embedsEnabled}
          listHeading={f["vii-ledger.list-heading"] ?? ""}
          listIntro={f["vii-ledger.list-intro"] ?? ""}
        />
      )}

      {/* 4. Gratuity / cancellation note */}
      <LedgerNotes
        heading={f["vii-ledger.notes-heading"] ?? ""}
        gratuity={f["vii-ledger.notes-gratuity"] ?? ""}
        cancellation={f["vii-ledger.notes-cancellation"] ?? ""}
      />

      {/* 5. Product rail */}
      <LedgerProductRail
        overline={f["vii-ledger.rail-overline"] ?? ""}
        heading={f["vii-ledger.rail-heading"] ?? ""}
        ctaText={f["vii-ledger.rail-cta-text"] ?? ""}
        ctaHref={f["vii-ledger.rail-cta-url"] ?? "/shop"}
        collectionId={f["vii-ledger.rail-collection"] ?? ""}
        featuredOnly={f["vii-ledger.rail-featured-only"] === "true"}
      />

      {/* 6. Closing CTA */}
      <ViiContactCtaSection
        contactImage={f["vii-ledger.cta-image"] ?? undefined}
        heading={f["vii-ledger.cta-heading"] ?? ""}
        subheading={f["vii-ledger.cta-subheading"] ?? ""}
        body={f["vii-ledger.cta-body"] ?? ""}
        phone={business.phoneNumber ?? ""}
        email={business.supportEmail ?? ""}
        buttonLabel={f["vii-ledger.cta-button-label"] ?? ""}
        buttonHref={f["vii-ledger.cta-button-url"] ?? ""}
        embed={ctaEmbed}
        embedsEnabled={embedsEnabled}
        embedReveal={ctaEmbedReveal}
      />
    </PageTransition>
  );
}
