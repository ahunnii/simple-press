"use client";

/**
 * vii Services Index — client body
 *
 * Lists all service groups (e.g. Facials, Massage) with editorial image cards,
 * linking each to /services/[slug]. Layout:
 *
 * 1. Hero — three-branch media precedence (video → image → cream typographic),
 *    matching LedgerHero idioms.
 * 2. Service-group grid — 2-up editorial full-overlay image cards.
 * 3. Gallery strip — full-bleed row of images from an owner-selected gallery
 *    (resolved server-side and passed in as `galleryImages`).
 * 4. Closing CTA — ViiContactCtaSection wired from vii.services.cta-* fields.
 */
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { parseTemplateIframeValue } from "~/lib/template-fields";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { ViiContactCtaSection } from "../homepage/vii-contact-cta-section";
import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServicesGalleryImage = { url: string; altText: string };

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
  /** Images resolved server-side from the owner-selected gallery. */
  galleryImages: ServicesGalleryImage[];
};

// ─── ServicesHero ─────────────────────────────────────────────────────────────

function ServicesHero({
  heroVideo,
  heroImage,
  heading,
  headingAccent,
  overline,
  intro,
}: {
  heroVideo?: string;
  heroImage?: string;
  heading: string;
  headingAccent: string;
  overline: string;
  intro: string;
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

  const headingRevealStyle: React.CSSProperties = reduceMotion
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

  const displayHeading = heading.trim() || "Our";
  const displayAccent = headingAccent.trim() || "services.";

  if (hasVideo || hasImage) {
    return (
      <section
        aria-label="Services"
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
            <div style={{ position: "absolute", inset: 0, ...mediaStyle }}>
              <video
                autoPlay
                muted
                loop
                playsInline
                src={heroVideo}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
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

        {/* Navy scrim — bottom-to-top */}
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

        {/* Bottom-aligned content */}
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
            <ViiOverline
              tone="dark"
              align="left"
              style={{ ...revealStyle(0), marginBottom: 16 }}
            >
              {overline}
            </ViiOverline>
          )}

          <h1
            style={{
              ...headingRevealStyle,
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
            {displayHeading}{" "}
            <em
              style={{ fontStyle: "italic", color: "var(--vii-copper-light)" }}
            >
              {displayAccent}
            </em>
          </h1>

          {intro && (
            <p
              style={{
                ...revealStyle(0.3),
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(14px, 1.4vw, 17px)",
                lineHeight: 1.75,
                color:
                  "color-mix(in srgb, var(--vii-paper) 85%, var(--vii-navy))",
                maxWidth: 520,
                margin: "16px 0 0",
                textWrap: "pretty",
              }}
            >
              {intro}
            </p>
          )}
        </div>
      </section>
    );
  }

  // Cream typographic hero (default — no media)
  return (
    <section
      aria-label="Services"
      style={{
        background: "var(--vii-cream)",
        padding:
          "clamp(80px, 14vh, 140px) clamp(24px, 6vw, 96px) clamp(64px, 10vh, 112px)",
      }}
    >
      <div style={{ maxWidth: 860 }}>
        {overline && (
          <ViiOverline
            tone="light"
            align="left"
            style={{ ...revealStyle(0), marginBottom: 28 }}
          >
            {overline}
          </ViiOverline>
        )}

        <h1
          style={{
            ...headingRevealStyle,
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(44px, 7vw, 88px)",
            lineHeight: 1.0,
            color: "var(--vii-navy)",
            margin: 0,
            marginBottom: intro ? 24 : 0,
            paddingBottom: "0.18em",
            textWrap: "balance",
            maxWidth: 720,
          }}
        >
          {displayHeading}{" "}
          <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
            {displayAccent}
          </em>
        </h1>

        {intro && (
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
            {intro}
          </p>
        )}
      </div>
    </section>
  );
}

// ─── ServicesIntro ────────────────────────────────────────────────────────────

function ServicesIntro({
  overline,
  heading,
  headingAccent,
  body,
}: {
  overline: string;
  heading: string;
  headingAccent: string;
  body: string;
}) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.1);
  const { ref: bodyRef, visible: bodyVisible } = useViiReveal(0.1);

  if (
    !overline.trim() &&
    !heading.trim() &&
    !headingAccent.trim() &&
    !body.trim()
  ) {
    return null;
  }

  const hasHeading = !!(heading.trim() || headingAccent.trim());

  return (
    <section
      aria-label="About our services"
      style={{
        background: "var(--vii-cream)",
        padding:
          "clamp(64px, 9vh, 104px) clamp(24px, 6vw, 96px) clamp(8px, 2vh, 24px)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div
          ref={headRef}
          className={`vii-reveal${headVisible ? "is-visible" : ""}`}
        >
          {overline && (
            <ViiOverline
              align="center"
              tone="light"
              style={{ marginBottom: 14 }}
            >
              {overline}
            </ViiOverline>
          )}

          {hasHeading && (
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(34px, 5vw, 64px)",
                lineHeight: 1.05,
                color: "var(--vii-navy)",
                margin: 0,
              }}
            >
              {heading}
              {heading && headingAccent ? " " : ""}
              {headingAccent && (
                <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
                  {headingAccent}
                </em>
              )}
            </h2>
          )}
        </div>

        {body && (
          <div style={{ marginTop: 28 }}>
            <div
              ref={bodyRef}
              className={`vii-reveal${bodyVisible ? "is-visible" : ""}`}
            >
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "clamp(15px, 1.4vw, 17px)",
                  lineHeight: 1.8,
                  color: "var(--vii-ink-soft)",
                  margin: "0 auto",
                  maxWidth: "62ch",
                }}
              >
                {body}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── ServiceCard ──────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  index,
}: {
  service: Props["services"][number];
  index: number;
}) {
  const initial = service.name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/services/${service.slug}`}
      aria-label={`Explore ${service.name}`}
      className="vii-services-card"
      style={
        {
          display: "block",
          position: "relative",
          aspectRatio: "4 / 5",
          overflow: "hidden",
          borderRadius: "var(--radius)",
          textDecoration: "none",
          "--i": Math.min(index, 7),
        } as React.CSSProperties
      }
    >
      {service.image ? (
        <Image
          src={service.image}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="vii-services-card__img"
          style={{ objectFit: "cover" }}
        />
      ) : (
        /* Navy background with decorative serif initial */
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--vii-navy)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(96px, 18vw, 220px)",
              fontWeight: 500,
              color: "var(--vii-tan)",
              opacity: 0.18,
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            {initial}
          </span>
        </div>
      )}

      {/* Bottom-to-top navy scrim */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) 82%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 18%, transparent) 50%, color-mix(in srgb, var(--vii-navy) 5%, transparent) 100%)",
          zIndex: 1,
        }}
      />

      {/* Bottom-aligned overlay content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "clamp(20px, 4vw, 36px)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(22px, 3.5vw, 38px)",
            lineHeight: 1.1,
            color: "var(--vii-paper)",
            margin: "0 0 8px",
            textWrap: "balance",
          }}
        >
          {service.name}
        </h2>

        {service.description && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(13px, 1.2vw, 15px)",
              lineHeight: 1.65,
              color:
                "color-mix(in srgb, var(--vii-paper) 82%, var(--vii-navy))",
              margin: "0 0 14px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {service.description}
          </p>
        )}

        {/* "Explore →" copper underline affordance */}
        <span className="vii-services-explore-link">Explore &rarr;</span>
      </div>
    </Link>
  );
}

// ─── GalleryStrip ─────────────────────────────────────────────────────────────

function GalleryStrip({ images }: { images: ServicesGalleryImage[] }) {
  const { ref, visible } = useViiReveal(0.08);

  const shown = images.filter((img) => img.url.trim().length > 0).slice(0, 5);

  if (shown.length === 0) return null;

  return (
    <section
      aria-label="Gallery"
      style={{
        background: "var(--vii-navy)",
        padding: "0",
        overflow: "hidden",
      }}
    >
      <div
        ref={ref}
        className={`vii-services-gallery-strip vii-reveal-group${visible ? "is-visible" : ""}`}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${shown.length}, 1fr)`,
          gap: 0,
        }}
      >
        {shown.map((img, i) => (
          <div
            key={i}
            className="vii-reveal-item"
            style={
              {
                "--i": Math.min(i, 7),
                position: "relative",
                aspectRatio: "1 / 1",
                overflow: "hidden",
              } as React.CSSProperties
            }
          >
            <Image
              src={img.url}
              alt={img.altText}
              fill
              sizes="(max-width: 640px) 50vw, 20vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .vii-services-gallery-strip {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyServicesState() {
  const { ref, visible } = useViiReveal(0.08);

  return (
    <section
      aria-label="No services available"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
        textAlign: "center",
      }}
    >
      <div
        ref={ref}
        className={`vii-reveal${visible ? "is-visible" : ""}`}
        style={{ maxWidth: 560, margin: "0 auto" }}
      >
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(28px, 4vw, 48px)",
            lineHeight: 1.15,
            color: "var(--vii-navy)",
            margin: "0 0 16px",
            textWrap: "balance",
          }}
        >
          No services yet.
        </h2>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(14px, 1.3vw, 16px)",
            lineHeight: 1.7,
            color: "var(--vii-ink-soft)",
            margin: 0,
          }}
        >
          Our service menu is being refined. Please check back soon.
        </p>
      </div>
    </section>
  );
}

// ─── ServiceGrid ──────────────────────────────────────────────────────────────

function ServiceGrid({ services }: { services: Props["services"] }) {
  const { ref, visible } = useViiReveal(0.06);

  return (
    <section
      aria-label="Services"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(56px, 8vh, 96px) clamp(24px, 6vw, 96px)",
      }}
    >
      <style>{`
        .vii-services-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(16px, 3vw, 32px);
        }
        @media (max-width: 640px) {
          .vii-services-grid {
            grid-template-columns: 1fr;
          }
        }
        /* Card image hover zoom */
        .vii-services-card:hover .vii-services-card__img,
        .vii-services-card:focus-visible .vii-services-card__img {
          transform: scale(1.04);
        }
        .vii-services-card__img {
          transition: transform 0.7s var(--vii-ease);
        }
        /* Explore link — copper underline, uppercase label */
        .vii-services-explore-link {
          display: inline-block;
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--vii-copper-light);
          text-decoration: underline;
          text-decoration-color: var(--vii-copper-light);
          text-underline-offset: 5px;
          text-decoration-thickness: 1px;
          transition: text-decoration-thickness 0.2s ease;
        }
        .vii-services-card:hover .vii-services-explore-link,
        .vii-services-card:focus-visible .vii-services-explore-link {
          text-decoration-thickness: 2px;
        }
        /* Scrim deepens on hover */
        .vii-services-card:hover > [aria-hidden="true"],
        .vii-services-card:focus-visible > [aria-hidden="true"] {
          opacity: 1.15;
        }
        @media (prefers-reduced-motion: reduce) {
          .vii-services-card__img {
            transition: none !important;
          }
        }
      `}</style>

      <div
        ref={ref}
        className={`vii-services-grid vii-reveal-group${visible ? "is-visible" : ""}`}
      >
        {services.map((service, i) => (
          <div
            key={service.id}
            className="vii-reveal-item"
            style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
          >
            <ServiceCard service={service} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ViiServicesIndexClient({
  business,
  services,
  galleryImages,
}: Props) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "vii.services.hero-video",
    "vii.services.hero-image",
    "vii.services.hero-overline",
    "vii.services.hero-heading",
    "vii.services.hero-heading-accent",
    "vii.services.hero-intro",
    "vii.services.intro-overline",
    "vii.services.intro-heading",
    "vii.services.intro-heading-accent",
    "vii.services.intro-body",
    "vii.services.cta-image",
    "vii.services.cta-heading",
    "vii.services.cta-subheading",
    "vii.services.cta-body",
    "vii.services.cta-button-label",
    "vii.services.cta-button-url",
    "vii.services.cta-embed",
    "vii.services.cta-embed-reveal",
    "vii.services.cta-show-phone",
    "vii.services.cta-show-email",
  ]);

  // Parse CTA embed
  const ctaEmbed = parseTemplateIframeValue(f["vii.services.cta-embed"] ?? "");
  const ctaEmbedReveal = f["vii.services.cta-embed-reveal"] === "true";

  return (
    <PageTransition>
      {/* 1. Hero */}
      <ServicesHero
        heroVideo={f["vii.services.hero-video"] ?? undefined}
        heroImage={f["vii.services.hero-image"] ?? undefined}
        overline={f["vii.services.hero-overline"] ?? ""}
        heading={f["vii.services.hero-heading"] ?? ""}
        headingAccent={f["vii.services.hero-heading-accent"] ?? ""}
        intro={f["vii.services.hero-intro"] ?? ""}
      />

      {/* 2. Intro — centered overline / split heading / body (hidden when all fields blank) */}
      <ServicesIntro
        overline={f["vii.services.intro-overline"] ?? ""}
        heading={f["vii.services.intro-heading"] ?? ""}
        headingAccent={f["vii.services.intro-heading-accent"] ?? ""}
        body={f["vii.services.intro-body"] ?? ""}
      />

      {/* 3. Service-group grid — or empty state */}
      {services.length > 0 ? (
        <ServiceGrid services={services} />
      ) : (
        <EmptyServicesState />
      )}

      {/* 4. Gallery strip — only when the selected gallery has images */}
      <GalleryStrip images={galleryImages} />

      {/* 5. Closing CTA */}
      <ViiContactCtaSection
        contactImage={f["vii.services.cta-image"] ?? undefined}
        heading={f["vii.services.cta-heading"] ?? ""}
        subheading={f["vii.services.cta-subheading"] ?? ""}
        body={f["vii.services.cta-body"] ?? ""}
        phone={business.phoneNumber ?? ""}
        email={business.supportEmail ?? ""}
        buttonLabel={f["vii.services.cta-button-label"] ?? ""}
        buttonHref={f["vii.services.cta-button-url"] ?? ""}
        embed={ctaEmbed}
        embedsEnabled={true}
        embedReveal={ctaEmbedReveal}
        showPhone={f["vii.services.cta-show-phone"] !== "false"}
        showEmail={f["vii.services.cta-show-email"] !== "false"}
      />
    </PageTransition>
  );
}
