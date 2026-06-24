"use client";

/**
 * vii-sanctuary — Immersive editorial hero + treatment menu
 *
 * Layout:
 * 1. Full-viewport hero (video or image) with the service name arching over a
 *    dark navy scrim.
 * 2. Centred intro block — overline, split heading + italic accent, richtext body,
 *    optional section media (image or video).
 * 3. Benefits strip (icon-list row across a dark-navy band).
 * 4. Treatment menu — a 3-col card grid in cream. Each card: image, name,
 *    compare-at / duration / price chips, tier list, add-on list, description,
 *    and a copper "Book" CTA.
 * 5. Closing contact CTA section (reuses ViiContactCtaSection).
 */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { parseTemplateIframeValue, parseTemplateListRows, parseTemplateRichtext } from "~/lib/template-fields";
import { parseServiceAddOns, parseServicePriceTiers } from "~/lib/validators/services";
import { PageTransition } from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ServiceSectionMedia } from "~/app/(storefront)/_templates/_service-pages/_shared/service-section-media";

import { ViiContactCtaSection } from "../../homepage/vii-contact-cta-section";
import { useViiReveal } from "../../hooks/use-vii-reveal";
import { resolveSanctuaryFields } from "./fields";

// ─── Sub-components ────────────────────────────────────────────────────────────

function SanctuaryHero({
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
  const [videoPaused, setVideoPaused] = useState(false);
  const [shown, setShown] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Entrance reveal on mount — skipped entirely when the user prefers reduced
  // motion (mirrors useViiReveal's behaviour for the rest of the template).
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
  const ease = "cubic-bezier(0.16, 1, 0.3, 1)";

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setVideoPaused(false);
    } else {
      v.pause();
      setVideoPaused(true);
    }
  };

  // entrance reveal styles — no animation under reduced-motion
  const revealStyle = (delay: number): React.CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(20px)",
          transition: `opacity 0.95s ${ease} ${delay}s, transform 0.95s ${ease} ${delay}s`,
        };

  return (
    <section
      aria-label={serviceName}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "clamp(520px, 90vh, 900px)",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
        background: "var(--vii-navy)",
      }}
    >
      {/* Background media */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay={!reduceMotion}
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
      ) : hasImage ? (
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

      {/* Layered scrim — stronger at the bottom where text sits */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) 90%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 40%, transparent) 50%, color-mix(in srgb, var(--vii-navy) 15%, transparent) 100%)",
          zIndex: 1,
        }}
      />

      {/* Horizontal rule accent near bottom */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "clamp(120px, 20vh, 200px)",
          left: "clamp(24px, 6vw, 96px)",
          width: 48,
          height: 1,
          background: "var(--vii-copper-light)",
          zIndex: 2,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 clamp(24px, 6vw, 96px) clamp(56px, 9vh, 100px)",
          maxWidth: 860,
        }}
      >
        {overline && (
          <p
            style={{
              ...revealStyle(0),
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--vii-copper-light)",
              marginBottom: 18,
            }}
          >
            {overline}
          </p>
        )}

        <h1
          style={{
            ...revealStyle(0.12),
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(48px, 8vw, 96px)",
            lineHeight: 0.98,
            color: "var(--vii-paper)",
            margin: 0,
            marginBottom: serviceDescription ? 24 : 0,
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
              color: "var(--vii-paper)",
              opacity: 0.8,
              maxWidth: 560,
              margin: 0,
            }}
          >
            {serviceDescription}
          </p>
        )}
      </div>

      {/* Accessible pause/play control for the autoplaying background video
          (WCAG 2.2.2 — Pause, Stop, Hide). */}
      {hasVideo && (
        <button
          type="button"
          onClick={toggleVideo}
          aria-label={
            videoPaused ? "Play background video" : "Pause background video"
          }
          className="vii-sanctuary-video-toggle"
          style={{
            position: "absolute",
            bottom: "clamp(20px, 4vh, 40px)",
            right: "clamp(20px, 4vw, 40px)",
            zIndex: 3,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "50%",
            border:
              "1px solid color-mix(in srgb, var(--vii-paper) 50%, transparent)",
            background: "color-mix(in srgb, var(--vii-navy) 55%, transparent)",
            color: "var(--vii-paper)",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
          }}
        >
          {videoPaused ? (
            <Play size={16} aria-hidden="true" />
          ) : (
            <Pause size={16} aria-hidden="true" />
          )}
        </button>
      )}
    </section>
  );
}

function SanctuaryIntro({
  overline,
  heading,
  headingAccent,
  bodyJson,
  bodyFallback,
  introImageSrc,
  introVideoSrc,
}: {
  overline: string;
  heading: string;
  headingAccent: string;
  bodyJson: TiptapJSON | null;
  bodyFallback: string;
  introImageSrc?: string;
  introVideoSrc?: string;
}) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.1);
  const { ref: bodyRef, visible: bodyVisible } = useViiReveal(0.1);
  const { ref: mediaRef, visible: mediaVisible } = useViiReveal(0.1);

  if (!heading && !headingAccent && !bodyJson && !bodyFallback) return null;

  return (
    <section
      aria-labelledby="sanctuary-intro-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div
          ref={headRef}
          className={`vii-reveal${headVisible ? "is-visible" : ""}`}
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
              id="sanctuary-intro-heading"
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

        {(bodyJson ?? bodyFallback) && (
          <div
            ref={bodyRef}
            className={`vii-reveal${bodyVisible ? "is-visible" : ""}`}
            style={{ marginTop: 32 }}
          >
            {bodyJson ? (
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
            ) : (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "clamp(15px, 1.4vw, 17px)",
                  lineHeight: 1.8,
                  color: "var(--vii-ink-soft)",
                  margin: 0,
                }}
              >
                {bodyFallback}
              </p>
            )}
          </div>
        )}

        {/* Optional section media */}
        {(Boolean(introImageSrc) || Boolean(introVideoSrc)) && (
          <div
            ref={mediaRef}
            className={`vii-reveal${mediaVisible ? "is-visible" : ""}`}
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

function BenefitsStrip({ benefits }: { benefits: string[] }) {
  const { ref, visible } = useViiReveal(0.08);
  if (benefits.length === 0) return null;

  return (
    <section
      aria-label="Service highlights"
      style={{
        background: "var(--vii-navy)",
        padding: "clamp(36px, 5vw, 56px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div
        ref={ref}
        className={`vii-reveal${visible ? "is-visible" : ""}`}
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(20px, 3vw, 40px)",
          justifyContent: "center",
        }}
      >
        {benefits.map((label, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Copper dot */}
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--vii-copper-light)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--vii-tan)",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TreatmentCard({
  item,
  embedsEnabled,
  index,
}: {
  item: ServiceTemplateProps["items"][number];
  embedsEnabled: boolean;
  index: number;
}) {
  const { ref, visible } = useViiReveal(0.1);

  const priceTiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);

  return (
    <article
      ref={ref}
      className={`vii-reveal${visible ? "is-visible" : ""}`}
      style={{
        transitionDelay: `${index * 0.07}s`,
        background: "var(--vii-paper)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          aspectRatio: "3/2",
          background: "var(--vii-tan)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{
              objectFit: "cover",
              transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className="vii-sanctuary-card-img"
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, var(--vii-clay) 0%, var(--vii-tan) 100%)",
            }}
          />
        )}
      </div>

      {/* Body */}
      <div
        style={{
          padding: "clamp(20px, 3vw, 28px)",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 0,
        }}
      >
        {/* Duration + price + compare-at chips */}
        {(item.durationLabel ?? item.priceLabel ?? item.compareAtPriceLabel) && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
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
            fontSize: "clamp(18px, 2vw, 22px)",
            lineHeight: 1.2,
            color: "var(--vii-navy)",
            margin: "0 0 10px",
          }}
        >
          {item.name}
        </h3>

        {item.description && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(13px, 1.2vw, 15px)",
              lineHeight: 1.75,
              color: "var(--vii-ink-soft)",
              margin: "0 0 20px",
              flex: 1,
            }}
          >
            {item.description}
          </p>
        )}

        {/* Price tiers */}
        {priceTiers.length > 0 && (
          <div style={{ marginBottom: 16 }}>
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
                    <span
                      style={{
                        textDecoration: "line-through",
                        opacity: 0.55,
                      }}
                    >
                      {tier.compareAtPriceLabel}
                    </span>
                  )}
                  <span
                    style={{
                      color: "var(--vii-navy)",
                      fontWeight: 500,
                    }}
                  >
                    {tier.priceLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div style={{ marginBottom: 16 }}>
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
                        style={{
                          margin: "0 4px",
                          color: "var(--vii-copper-light)",
                        }}
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

        {/* Book CTA — styled to match vii's copper button aesthetic */}
        <div style={{ marginTop: "auto" }}>
          <ViiBookButton
            itemName={item.name}
            embedSrc={item.bookingEmbedSrc ?? undefined}
            embedHeight={item.bookingEmbedHeight ?? undefined}
            embedsEnabled={embedsEnabled}
          />
        </div>
      </div>
    </article>
  );
}

/** Wraps ServiceBookingDialog with vii's copper button styling. */
function ViiBookButton({
  itemName,
  embedSrc,
  embedHeight,
  embedsEnabled,
}: {
  itemName: string;
  embedSrc?: string;
  embedHeight?: number | null;
  embedsEnabled: boolean;
}) {
  return (
    <div className="vii-book-btn-wrap">
      <ServiceBookingDialog
        triggerLabel="Book This Treatment"
        itemName={itemName}
        embedSrc={embedSrc}
        embedHeight={embedHeight}
        embedsEnabled={embedsEnabled}
      />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ViiSanctuaryServicePage({
  business,
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const cf = service.customFields as Record<string, unknown> | null | undefined;

  const f = resolveSanctuaryFields(service.customFields, [
    "vii-sanctuary.hero-video",
    "vii-sanctuary.hero-image",
    "vii-sanctuary.hero-overline",
    "vii-sanctuary.intro-overline",
    "vii-sanctuary.intro-heading",
    "vii-sanctuary.intro-heading-accent",
    "vii-sanctuary.intro-image",
    "vii-sanctuary.intro-video",
    "vii-sanctuary.menu-heading",
    "vii-sanctuary.cta-image",
    "vii-sanctuary.cta-heading",
    "vii-sanctuary.cta-subheading",
    "vii-sanctuary.cta-body",
    "vii-sanctuary.cta-button-label",
    "vii-sanctuary.cta-button-url",
    "vii-sanctuary.cta-embed",
  ]);

  // Parse richtext body directly from service.customFields (bypasses string-only resolver)
  const introBodyJson = parseTemplateRichtext(cf?.["vii-sanctuary.intro-body"]);

  // Parse benefits list
  const benefitRows = parseTemplateListRows(cf?.["vii-sanctuary.benefits"]);
  const benefits = benefitRows
    .map((r) => (typeof r.label === "string" ? r.label : ""))
    .filter(Boolean);

  // Parse CTA embed
  const ctaEmbed = parseTemplateIframeValue(f["vii-sanctuary.cta-embed"]);

  const publishedItems = items.filter((it) => it.published !== false);

  return (
    <PageTransition>
      {/* 1. Hero */}
      <SanctuaryHero
        heroVideo={f["vii-sanctuary.hero-video"] ?? undefined}
        heroImage={f["vii-sanctuary.hero-image"] ?? undefined}
        serviceName={service.name}
        serviceDescription={service.description}
        overline={f["vii-sanctuary.hero-overline"] ?? ""}
      />

      {/* 2. Intro */}
      <SanctuaryIntro
        overline={f["vii-sanctuary.intro-overline"] ?? ""}
        heading={f["vii-sanctuary.intro-heading"] ?? ""}
        headingAccent={f["vii-sanctuary.intro-heading-accent"] ?? ""}
        bodyJson={introBodyJson}
        bodyFallback=""
        introImageSrc={f["vii-sanctuary.intro-image"] ?? ""}
        introVideoSrc={f["vii-sanctuary.intro-video"] ?? ""}
      />

      {/* 3. Benefits strip */}
      <BenefitsStrip benefits={benefits} />

      {/* 4. Treatment menu */}
      {publishedItems.length > 0 && (
        <TreatmentMenu
          items={publishedItems}
          embedsEnabled={embedsEnabled}
          menuHeading={f["vii-sanctuary.menu-heading"] ?? ""}
        />
      )}

      {/* 5. Closing CTA */}
      <ViiContactCtaSection
        contactImage={f["vii-sanctuary.cta-image"] ?? undefined}
        heading={f["vii-sanctuary.cta-heading"] ?? ""}
        subheading={f["vii-sanctuary.cta-subheading"] ?? ""}
        body={f["vii-sanctuary.cta-body"] ?? ""}
        phone={business.phoneNumber ?? ""}
        email={business.supportEmail ?? ""}
        buttonLabel={f["vii-sanctuary.cta-button-label"] ?? ""}
        buttonHref={f["vii-sanctuary.cta-button-url"] ?? ""}
        embed={ctaEmbed}
        embedsEnabled={embedsEnabled}
      />
    </PageTransition>
  );
}

function TreatmentMenu({
  items,
  embedsEnabled,
  menuHeading,
}: {
  items: ServiceTemplateProps["items"];
  embedsEnabled: boolean;
  menuHeading: string;
}) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.08);

  return (
    <section
      aria-labelledby="sanctuary-menu-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Section heading */}
        <div
          ref={headRef}
          className={`vii-reveal${headVisible ? "is-visible" : ""}`}
          style={{ marginBottom: "clamp(40px, 6vw, 64px)" }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--vii-ink-soft)",
              marginBottom: 12,
            }}
          >
            Our Services
          </p>
          <h2
            id="sanctuary-menu-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(30px, 4.5vw, 56px)",
              lineHeight: 1.08,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {menuHeading || (
              <>
                The{" "}
                <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
                  treatment
                </em>{" "}
                menu
              </>
            )}
          </h2>
        </div>

        {/* 3-column grid */}
        <div
          className="vii-sanctuary-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "clamp(16px, 2.5vw, 28px)",
          }}
        >
          {items.map((item, i) => (
            <TreatmentCard
              key={item.id}
              item={item}
              embedsEnabled={embedsEnabled}
              index={i}
            />
          ))}
        </div>
      </div>

      <style>{`
        .vii-sanctuary-card-img:hover { transform: scale(1.04); }
        .vii-book-btn-wrap button,
        .vii-book-btn-wrap a {
          display: inline-block;
          padding: 14px 28px;
          background: var(--vii-copper-deep);
          color: var(--vii-paper) !important;
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: var(--radius);
          border: none;
          cursor: pointer;
          transition: background 0.3s ease, opacity 0.3s ease;
          width: 100%;
          text-align: center;
          justify-content: center;
        }
        .vii-book-btn-wrap button:hover,
        .vii-book-btn-wrap a:hover { background: var(--vii-slate); }
        .vii-book-btn-wrap button:disabled {
          background: var(--vii-tan);
          cursor: not-allowed;
          opacity: 0.7;
        }
        @media (max-width: 900px) {
          .vii-sanctuary-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .vii-sanctuary-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
