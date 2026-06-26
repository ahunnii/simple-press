"use client";

/**
 * Shared sub-components extracted from vii-ledger-service-page.tsx.
 * Used by both ViiLedgerServicePage and ViiCollectionServicePage.
 */
import { useEffect, useState } from "react";
import Image from "next/image";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { ServiceHeroVideo } from "~/app/(storefront)/_templates/_service-pages/_shared/service-hero-video";
import { ServiceSectionMedia } from "~/app/(storefront)/_templates/_service-pages/_shared/service-section-media";
import { isContentEmpty } from "~/lib/template-fields";
import { parseServiceAddOns, parseServicePriceTiers } from "~/lib/validators/services";
import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";

import { api } from "~/trpc/react";

import { ViiProductRail } from "../../homepage/vii-product-rail";
import { useViiReveal } from "../../hooks/use-vii-reveal";
import { ViiOverline } from "../../shared/vii-overline";

// ─── LedgerHero ───────────────────────────────────────────────────────────────

export function LedgerHero({
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

  const revealStyle = (delay: number): React.CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(20px)",
          transition: `opacity 0.95s var(--vii-ease) ${delay}s, transform 0.95s var(--vii-ease) ${delay}s`,
        };

  const headingStyle: React.CSSProperties = reduceMotion
    ? {}
    : {
        opacity: shown ? 1 : 0,
        clipPath: shown ? "inset(0 0 0% 0)" : "inset(0 0 110% 0)",
        transform: shown ? "translateY(0)" : "translateY(8px)",
        transition: `opacity 0.95s var(--vii-ease) 0.15s, clip-path 0.95s var(--vii-ease) 0.15s, transform 0.95s var(--vii-ease) 0.15s`,
      };

  const mediaStyle: React.CSSProperties = reduceMotion
    ? {}
    : {
        transform: shown ? "scale(1)" : "scale(1.08)",
        transition: `transform 2.2s var(--vii-ease)`,
      };

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
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <ServiceHeroVideo
              src={heroVideo!}
              buttonClassName="vii-ledger-video-btn"
              style={mediaStyle}
            />
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, ...mediaStyle }}>
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
              paddingBottom: "0.18em",
              maxWidth: 700,
              textWrap: "balance",
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

  // Cream typographic hero (default — no media)
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
            paddingBottom: "0.18em",
            textWrap: "balance",
            maxWidth: 720,
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
              textWrap: "pretty",
            }}
          >
            {serviceDescription}
          </p>
        )}
      </div>
    </section>
  );
}

// ─── LedgerIntro ──────────────────────────────────────────────────────────────

export function LedgerIntro({
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

  const bodyEmpty = !bodyJson || isContentEmpty(bodyJson);
  const hasMedia =
    Boolean(introImageSrc?.trim()) || Boolean(introVideoSrc?.trim());
  if (
    !overline.trim() &&
    !heading.trim() &&
    !headingAccent.trim() &&
    bodyEmpty &&
    !hasMedia
  ) {
    return null;
  }

  return (
    <section
      aria-labelledby="ledger-intro-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div ref={headRef} className={`vii-reveal${headVisible ? " is-visible" : ""}`}>
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
                textWrap: "balance",
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

        {!bodyEmpty && (
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

        {(Boolean(introImageSrc) || Boolean(introVideoSrc)) && (
          <div ref={mediaRef} className={`vii-reveal${mediaVisible ? " is-visible" : ""}`}>
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

// ─── LedgerNotes ──────────────────────────────────────────────────────────────

export function LedgerNotes({
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
        background: "var(--vii-navy)",
        padding: "clamp(56px, 8vw, 96px) clamp(24px, 6vw, 96px)",
      }}
    >
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

      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        borderTop: "1px solid color-mix(in srgb, var(--vii-paper) 18%, transparent)",
        paddingTop: "clamp(28px, 3.5vw, 40px)",
      }}>
        <div ref={ref} className={`vii-reveal${visible ? " is-visible" : ""}`}>
          {hasHeading && (
            <h2 id="ledger-notes-heading" style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "clamp(22px, 3vw, 30px)",
              lineHeight: 1.15,
              color: "var(--vii-paper)",
              margin: "0 0 clamp(20px, 3vw, 32px)",
            }}>
              {heading}
            </h2>
          )}

          <div className="vii-ledger-notes-grid">
            {gratuity && (
              <div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--vii-copper-light)", margin: "0 0 8px" }}>
                  Gratuity
                </p>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(16px, 1.8vw, 20px)", lineHeight: 1.6, color: "color-mix(in srgb, var(--vii-paper) 85%, var(--vii-navy))", margin: 0 }}>
                  {gratuity}
                </p>
              </div>
            )}

            {cancellation && (
              <div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--vii-copper-light)", margin: "0 0 8px" }}>
                  Cancellations
                </p>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(16px, 1.8vw, 20px)", lineHeight: 1.6, color: "color-mix(in srgb, var(--vii-paper) 85%, var(--vii-navy))", margin: 0 }}>
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

// ─── LedgerProductRail ────────────────────────────────────────────────────────

export function LedgerProductRail({
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

// ─── TreatmentListRow ─────────────────────────────────────────────────────────

export function TreatmentListRow({
  item,
  embedsEnabled,
  isLast,
  index,
  tone = "light",
}: {
  item: ServiceTemplateProps["items"][number];
  embedsEnabled: boolean;
  isLast: boolean;
  index: number;
  /** "light" = cream background (default). "dark" = navy background — swaps all inline colors for legibility. */
  tone?: "light" | "dark";
}) {
  const priceTiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);

  // Derived color tokens based on tone
  const nameColor = tone === "dark" ? "var(--vii-paper)" : "var(--vii-navy)";
  const secondaryColor =
    tone === "dark"
      ? "color-mix(in srgb, var(--vii-paper) 80%, var(--vii-navy))"
      : "var(--vii-ink-soft)";
  const dividerColor =
    tone === "dark"
      ? "color-mix(in srgb, var(--vii-paper) 18%, transparent)"
      : "var(--vii-tan)";
  const pillBorderColor =
    tone === "dark" ? "var(--vii-copper-light)" : "var(--vii-tan)";
  const priceEmphasisColor =
    tone === "dark" ? "var(--vii-paper)" : "var(--vii-navy)";
  const separatorColor = "var(--vii-copper-light)";

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
          borderBottom: isLast ? "none" : `1px solid ${dividerColor}`,
          alignItems: "start",
        } as React.CSSProperties
      }
    >
      {/* Left: name + meta */}
      <div>
        <h3 style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          fontSize: "clamp(20px, 2.5vw, 30px)",
          lineHeight: 1.15,
          color: nameColor,
          margin: "0 0 14px",
        }}>
          {item.name}
        </h3>

        {item.durationLabel && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: secondaryColor,
              padding: "3px 10px",
              border: `1px solid ${pillBorderColor}`,
              borderRadius: "var(--radius)",
            }}>
              {item.durationLabel}
            </span>
          </div>
        )}

        {priceTiers.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{
              fontFamily: "var(--font-sans)",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: secondaryColor,
              marginBottom: 6,
            }}>
              Pricing
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {priceTiers.map((tier, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12, color: secondaryColor }}>
                  <span>{tier.label}</span>
                  <span aria-hidden="true" style={{ color: separatorColor, flexShrink: 0 }}>—</span>
                  {tier.compareAtPriceLabel && (
                    <span style={{ textDecoration: "line-through" }}>{tier.compareAtPriceLabel}</span>
                  )}
                  <span style={{ color: priceEmphasisColor, fontWeight: 500 }}>{tier.priceLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Single price figure — left column, under the title (mirrors tiers placement) */}
        {priceTiers.length === 0 && item.priceLabel && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 8 }}>
            {item.compareAtPriceLabel && (
              <span style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(12px, 1.2vw, 14px)",
                color: secondaryColor,
                textDecoration: "line-through",
              }}>
                {item.compareAtPriceLabel}
              </span>
            )}
            <span style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(15px, 1.6vw, 20px)",
              fontWeight: 500,
              color: priceEmphasisColor,
            }}>
              {item.priceLabel}
            </span>
          </div>
        )}
      </div>

      {/* Right: description + add-ons + footer row (price + book) */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
        {item.description && (
          <p style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(13px, 1.2vw, 15px)",
            lineHeight: 1.8,
            color: secondaryColor,
            margin: 0,
          }}>
            {item.description}
          </p>
        )}

        {addOns.length > 0 && (
          <div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: secondaryColor, marginBottom: 6 }}>
              Add-ons
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {addOns.map((addon, i) => (
                <li key={i} style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: secondaryColor }}>
                  <span>{addon.name}</span>
                  {addon.priceLabel && (
                    <>
                      <span aria-hidden="true" style={{ margin: "0 4px", color: separatorColor }}>·</span>
                      <span style={{ color: priceEmphasisColor, fontWeight: 500 }}>{addon.priceLabel}</span>
                    </>
                  )}
                  {addon.description && (
                    <span style={{ display: "block", fontSize: 11, opacity: 0.65, marginTop: 1 }}>{addon.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Booking CTA — right-aligned at the trailing edge of the row */}
        <div className="vii-ledger-book" style={{ alignSelf: "flex-end" }}>
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

// ─── LedgerListStyles ─────────────────────────────────────────────────────────

export function LedgerListStyles() {
  return (
    <style>{`
      .vii-ledger-book button,
      .vii-ledger-book a {
        display: inline-flex;
        align-items: center;
        height: auto;
        padding: 15px 0;
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
      .vii-ledger-list--dark .vii-ledger-book button,
      .vii-ledger-list--dark .vii-ledger-book a {
        color: var(--vii-paper) !important;
        text-decoration-color: var(--vii-copper-light);
      }
      @media (max-width: 640px) {
        .vii-ledger-list-row {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  );
}
