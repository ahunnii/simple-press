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
 *    Optional background video takes precedence over the image.
 * 2. Rich-text "philosophy" block on cream (centered, italic accent) with
 *    optional section media (image or video) beneath the body.
 * 3. Ritual steps — one per service item, alternating image/text sides.
 *    Each step contains the item name, compare-at / duration / price chips,
 *    tier list, add-on list, description, and Book.
 * 4. Full-bleed navy closing CTA with background image, optional button, and
 *    optional booking embed.
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

import { ViiContactCtaSection } from "../../homepage/vii-contact-cta-section";
import { useViiReveal } from "../../hooks/use-vii-reveal";
import { ViiOverline } from "../../shared/vii-overline";
import { resolveRitualFields } from "./fields";

// ─── Sub-components ────────────────────────────────────────────────────────────

function RitualHero({
  heroVideo,
  heroImage,
  overline,
  serviceName,
  serviceDescription,
}: {
  heroVideo?: string;
  heroImage?: string;
  overline: string;
  serviceName: string;
  serviceDescription?: string | null;
}) {
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Entrance animation — fire ~60 ms after mount so the browser has painted once
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Honour prefers-reduced-motion: skip all entrance animation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setReduced(true);
  }, []);

  const easeOut = "var(--vii-ease)";

  // Staggered fade-rise for overline, copper rule, and description.
  // Reduced-motion users land on the final visible state immediately.
  const revealStyle = (delay: number): React.CSSProperties =>
    reduced
      ? { opacity: 1 }
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(20px)",
          transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
        };

  // Heading wipes up behind a clip-path mask — cinematic, same 0.15s beat as
  // vii-hero-section.
  const headingStyle: React.CSSProperties = reduced
    ? { opacity: 1 }
    : {
        opacity: shown ? 1 : 0,
        clipPath: shown ? "inset(0 0 0% 0)" : "inset(0 0 110% 0)",
        transform: shown ? "translateY(0)" : "translateY(8px)",
        transition: `opacity 0.95s ${easeOut} 0.15s, clip-path 0.95s ${easeOut} 0.15s, transform 0.95s ${easeOut} 0.15s`,
      };

  // Slow Ken-Burns scale-settle on the background media layer.
  const mediaStyle: React.CSSProperties = reduced
    ? {}
    : {
        transform: shown ? "scale(1)" : "scale(1.08)",
        transition: `transform 2.2s ${easeOut}`,
      };

  const hasVideo = !!heroVideo?.trim();
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
      {/* Background media layer — overflow:hidden clips the Ken-Burns bloom.
          The scale lives on the media element itself (video/image), not this
          wrapper, so the pause/play button (a sibling of the video) stays put. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        {hasVideo ? (
          <ServiceHeroVideo
            src={heroVideo ?? ""}
            buttonClassName="vii-ritual-video-btn"
            style={mediaStyle}
          />
        ) : hasImage ? (
          <Image
            src={heroImage ?? ""}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", opacity: 0.35, ...mediaStyle }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, var(--vii-navy) 0%, var(--vii-slate) 100%)",
            }}
          />
        )}
      </div>

      {/* Scrim */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "color-mix(in srgb, var(--vii-navy) 55%, transparent)",
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
        {/* Overline — cascade beat 0 */}
        {overline && (
          <ViiOverline tone="dark" align="center" style={{ ...revealStyle(0), marginBottom: 20 }}>
            {overline}
          </ViiOverline>
        )}

        {/* Service name — clip-path wipe, beat 0.15s */}
        <h1
          style={{
            ...headingStyle,
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(42px, 7.5vw, 96px)",
            lineHeight: 1.0,
            color: "var(--vii-paper)",
            margin: 0,
            // Room below the baseline so the clip-path reveal doesn't shave
            // Playfair descenders (g/y/p).
            paddingBottom: "0.18em",
          }}
        >
          {serviceName}
        </h1>

        {/* Copper rule divider — beat 0.3s */}
        <div
          aria-hidden="true"
          style={{
            ...revealStyle(0.3),
            width: 56,
            height: 1,
            background: "var(--vii-copper-light)",
            margin: "28px auto",
          }}
        />

        {/* Description — beat 0.3s */}
        {serviceDescription && (
          <p
            style={{
              ...revealStyle(0.3),
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(14px, 1.4vw, 16px)",
              lineHeight: 1.8,
              color: "var(--vii-paper)",
              opacity: shown || reduced ? 0.82 : 0,
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

      {/* Style vii-ritual video toggle to match vii aesthetic */}
      <style>{`
        .vii-ritual-video-btn {
          border-color: color-mix(in srgb, var(--vii-paper) 50%, transparent) !important;
          background: color-mix(in srgb, var(--vii-navy) 55%, transparent) !important;
          color: var(--vii-paper) !important;
        }
      `}</style>
    </section>
  );
}

function RitualPhilosophy({
  overline,
  heading,
  headingAccent,
  bodyJson,
  bodyFallback,
  philosophyImageSrc,
  philosophyVideoSrc,
}: {
  overline: string;
  heading: string;
  headingAccent: string;
  bodyJson: TiptapJSON | null;
  bodyFallback: string;
  philosophyImageSrc?: string;
  philosophyVideoSrc?: string;
}) {
  const { ref, visible } = useViiReveal(0.1);
  const { ref: mediaRef, visible: mediaVisible } = useViiReveal(0.1);

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
          <ViiOverline tone="light" align="center" style={{ marginBottom: 16 }}>
            {overline}
          </ViiOverline>
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

      {/* Optional section media beneath the body */}
      {(Boolean(philosophyImageSrc) || Boolean(philosophyVideoSrc)) && (
        <div
          ref={mediaRef}
          className={`vii-reveal${mediaVisible ? " is-visible" : ""}`}
        >
          <ServiceSectionMedia
            imageSrc={philosophyImageSrc}
            videoSrc={philosophyVideoSrc}
            alt=""
            style={{
              maxWidth: 680,
              margin: "clamp(32px, 5vw, 48px) auto 0",
              aspectRatio: "16/9",
            }}
          />
        </div>
      )}
    </section>
  );
}

/** Wraps all ritual steps in a single vii-reveal-group so they stagger in
 *  together under one IntersectionObserver rather than firing independently. */
function StepsGroup({ children }: { children: React.ReactNode }) {
  const { ref, visible } = useViiReveal(0.05);
  return (
    <div
      ref={ref}
      className={`vii-reveal-group${visible ? " is-visible" : ""}`}
    >
      {children}
    </div>
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
  const isReversed = index % 2 === 1;
  const stepNum = String(index + 1).padStart(2, "0");

  const priceTiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);

  return (
    <div
      className={`vii-reveal-item vii-ritual-step${isReversed ? " is-reversed" : ""}`}
      style={
        {
          "--i": Math.min(index, 7),
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "clamp(360px, 50vw, 560px)",
        } as React.CSSProperties
      }
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
          /* group wrapper lets the scale transition be clipped by the
             parent's overflow:hidden without an extra positioning layer */
          <div
            className="group"
            style={{ position: "absolute", inset: 0 }}
          >
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{
                objectFit: "cover",
                transition: "transform 0.65s var(--vii-ease)",
              }}
              className="group-hover:scale-[1.04]"
            />
          </div>
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
            color: "color-mix(in srgb, var(--vii-tan) 22%, transparent)",
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
        {/* Duration + price + compare-at chips */}
        {(item.durationLabel ?? item.priceLabel ?? item.compareAtPriceLabel) && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              flexWrap: "wrap",
              alignItems: "center",
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
                  padding: "3px 10px",
                  border: "1px solid var(--vii-copper)",
                  borderRadius: "var(--radius)",
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
              margin: "0 0 24px",
              maxWidth: 420,
            }}
          >
            {item.description}
          </p>
        )}

        {/* Price tiers */}
        {priceTiers.length > 0 && (
          <div style={{ marginBottom: 20 }}>
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

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div style={{ marginBottom: 24 }}>
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
    </div>
  );
}

/** Hoisted once per page (not per step) — book-button styling + mobile stacking. */
function RitualStepStyles() {
  return (
    <style>{`
      .vii-ritual-book button,
      .vii-ritual-book a {
        display: inline-flex;
        align-items: center;
        height: auto;
        padding: 13px 32px;
        background: transparent;
        color: var(--vii-navy) !important;
        font-family: var(--font-sans);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        text-decoration: none;
        border-radius: var(--radius);
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
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ViiRitualServicePage({
  business,
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const cf = service.customFields as Record<string, unknown> | null | undefined;

  const f = resolveRitualFields(service.customFields, [
    "vii-ritual.hero-video",
    "vii-ritual.hero-image",
    "vii-ritual.hero-overline",
    "vii-ritual.philosophy-overline",
    "vii-ritual.philosophy-heading",
    "vii-ritual.philosophy-heading-accent",
    "vii-ritual.philosophy-image",
    "vii-ritual.philosophy-video",
    "vii-ritual.cta-image",
    "vii-ritual.cta-heading",
    "vii-ritual.cta-subheading",
    "vii-ritual.cta-body",
    "vii-ritual.cta-button-label",
    "vii-ritual.cta-button-url",
    "vii-ritual.cta-embed",
    "vii-ritual.cta-embed-reveal",
  ]);

  // Parse richtext philosophy body directly from service.customFields
  const philosophyBodyJson = parseTemplateRichtext(cf?.["vii-ritual.philosophy-body"]);

  // Parse CTA embed
  const ctaEmbed = parseTemplateIframeValue(f["vii-ritual.cta-embed"]);
  const ctaEmbedReveal = f["vii-ritual.cta-embed-reveal"] === "true";

  const publishedItems = items.filter((it) => it.published !== false);

  return (
    <PageTransition>
      {/* 1. Hero */}
      <RitualHero
        heroVideo={f["vii-ritual.hero-video"] ?? ""}
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
        bodyFallback=""
        philosophyImageSrc={f["vii-ritual.philosophy-image"] ?? ""}
        philosophyVideoSrc={f["vii-ritual.philosophy-video"] ?? ""}
      />

      {/* 3. Ritual steps — one IntersectionObserver on the group; each step
           staggers in via vii-reveal-item + --i index */}
      {publishedItems.length > 0 && (
        <section aria-label="Treatment rituals">
          <RitualStepStyles />
          <StepsGroup>
          {publishedItems.map((item, i) => (
            <RitualStep
              key={item.id}
              item={item}
              index={i}
              embedsEnabled={embedsEnabled}
            />
          ))}
          </StepsGroup>
        </section>
      )}

      {/* 4. Closing CTA */}
      <ViiContactCtaSection
        contactImage={f["vii-ritual.cta-image"] ?? undefined}
        heading={f["vii-ritual.cta-heading"] ?? ""}
        subheading={f["vii-ritual.cta-subheading"] ?? ""}
        body={f["vii-ritual.cta-body"] ?? ""}
        phone={business.phoneNumber ?? ""}
        email={business.supportEmail ?? ""}
        buttonLabel={f["vii-ritual.cta-button-label"] ?? ""}
        buttonHref={f["vii-ritual.cta-button-url"] ?? ""}
        embed={ctaEmbed}
        embedsEnabled={embedsEnabled}
        embedReveal={ctaEmbedReveal}
      />
    </PageTransition>
  );
}
