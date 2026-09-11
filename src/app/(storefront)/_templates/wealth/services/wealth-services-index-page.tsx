import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthLink } from "../shared/wealth-link";
import { WealthSection } from "../shared/wealth-section";
import { WealthSectionHeading } from "../shared/wealth-section-heading";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

// ─── ProgramCard ────────────────────────────────────────────────────────────
// Square image card, bottom scrim, mono-caps label — the "homepage-tile
// visual language" design.md calls for (see homepage's "Our Programs" tiles).

function ProgramCard({
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
      aria-label={`Learn more about ${service.name}`}
      className="wealth-program-card"
      style={{ "--i": Math.min(index, 7) } as React.CSSProperties}
    >
      <div className="wealth-program-card__media">
        {service.image ? (
          <Image
            src={service.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="wealth-program-card__img"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--wealth-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-wealth-sub)",
                fontStyle: "italic",
                fontSize: "clamp(56px, 12vw, 120px)",
                color: "var(--wealth-primary)",
                opacity: 0.25,
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              {initial}
            </span>
          </div>
        )}

        <div aria-hidden="true" className="wealth-program-card__scrim" />
        <div aria-hidden="true" className="wealth-program-card__hover-tint" />

        <div className="wealth-program-card__content">
          <span className="wealth-eyebrow" style={{ color: "var(--wealth-paper)" }}>
            {service.name}
          </span>
          {service.description && (
            <p className="wealth-program-card__desc">{service.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────

function EmptyProgramsState({
  message,
  ctaLabel,
  ctaUrl,
}: {
  message: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <p
        {...fieldAttr("wealth.services.grid-empty-message")}
        style={{
          fontSize: "17px",
          lineHeight: 1.6,
          color: "var(--wealth-ink)",
          margin: "0 0 16px",
        }}
      >
        {message}
      </p>
      {ctaLabel && (
        <WealthLink href={ctaUrl || "/contact"}>
          <span {...fieldAttr("wealth.services.grid-empty-cta-label")}>
            {ctaLabel}
          </span>
        </WealthLink>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export async function WealthServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "wealth.services.hero-heading",
    "wealth.services.hero-intro",
    "wealth.services.hero-leadin",
    "wealth.services.grid-empty-message",
    "wealth.services.grid-empty-cta-label",
    "wealth.services.grid-empty-cta-url",
    "wealth.services.cta-heading",
    "wealth.services.cta-label",
    "wealth.services.cta-url",
  ]);

  return (
    <>
      {/* ── 1. Hero — not hideable: this owns the page's sole <h1> ────────── */}
      <WealthSection
        sectionAttrs={sectionGroupAttr("services", "hero")}
        className="text-center"
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h1
            {...fieldAttr("wealth.services.hero-heading")}
            style={{
              fontFamily: "var(--font-wealth-sub)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(32px, 5vw, 48px)",
              lineHeight: 1.2,
              letterSpacing: "0.21px",
              color: "var(--wealth-ink)",
              margin: "0 0 20px",
            }}
          >
            {f["wealth.services.hero-heading"] ?? "Our Programs"}
          </h1>

          {f["wealth.services.hero-intro"] && (
            <p
              {...fieldAttr("wealth.services.hero-intro")}
              style={{
                fontSize: "17px",
                lineHeight: 1.7,
                color: "var(--wealth-ink)",
                margin: "0 auto 24px",
                maxWidth: "62ch",
              }}
            >
              {f["wealth.services.hero-intro"]}
            </p>
          )}

          {f["wealth.services.hero-leadin"] && (
            <p
              {...fieldAttr("wealth.services.hero-leadin")}
              style={{
                display: "inline-block",
                borderBottom: "1px solid var(--wealth-primary)",
                paddingBottom: "2px",
                fontSize: "15px",
                color: "var(--wealth-ink)",
              }}
            >
              {f["wealth.services.hero-leadin"]}
            </p>
          )}
        </div>
      </WealthSection>

      {/* ── 2. Grid — or its designed empty state ──────────────────────────── */}
      <WealthSection sectionAttrs={sectionGroupAttr("services", "grid")}>
        <style>{`
          .wealth-program-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: clamp(16px, 3vw, 32px);
          }
          @media (min-width: 640px) {
            .wealth-program-grid { grid-template-columns: 1fr 1fr; }
          }
          @media (min-width: 1024px) {
            .wealth-program-grid { grid-template-columns: 1fr 1fr 1fr; }
          }
          .wealth-program-card {
            display: block;
            text-decoration: none;
          }
          .wealth-program-card__media {
            position: relative;
            aspect-ratio: 1 / 1;
            overflow: hidden;
          }
          .wealth-program-card__scrim {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              to top,
              color-mix(in srgb, var(--wealth-ink) 82%, transparent) 0%,
              color-mix(in srgb, var(--wealth-ink) 18%, transparent) 55%,
              transparent 100%
            );
          }
          /* Hover/focus treatment matches the homepage program tiles exactly
             (design.md Motion: "color/border-color .1s ease-in-out... no
             transforms on hover, no parallax") — a sage tint, not a zoom. */
          .wealth-program-card__hover-tint {
            position: absolute;
            inset: 0;
            background: transparent;
            transition: background-color var(--wealth-dur-hover) var(--wealth-ease-hover);
          }
          .wealth-program-card:hover .wealth-program-card__hover-tint,
          .wealth-program-card:focus-visible .wealth-program-card__hover-tint {
            background: color-mix(in srgb, var(--wealth-primary) 22%, transparent);
          }
          .wealth-program-card__content {
            position: absolute;
            inset: 0;
            z-index: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding: clamp(16px, 3vw, 28px);
            gap: 8px;
          }
          .wealth-program-card__desc {
            font-size: 14px;
            line-height: 1.6;
            color: color-mix(in srgb, var(--wealth-paper) 85%, transparent);
            margin: 0;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          @media (prefers-reduced-motion: reduce) {
            .wealth-program-card__hover-tint { transition: none !important; }
          }
        `}</style>

        {services.length > 0 ? (
          <div className="wealth-program-grid">
            {services.map((service, i) => (
              <ProgramCard key={service.id} service={service} index={i} />
            ))}
          </div>
        ) : (
          <EmptyProgramsState
            message={f["wealth.services.grid-empty-message"] ?? ""}
            ctaLabel={f["wealth.services.grid-empty-cta-label"] ?? ""}
            ctaUrl={f["wealth.services.grid-empty-cta-url"] ?? "/contact"}
          />
        )}
      </WealthSection>

      {/* ── 3. Closing CTA — hideable ───────────────────────────────────────── */}
      {isSectionVisible(customFields, "wealth", "services.cta") && (
        <WealthSection
          sectionAttrs={sectionGroupAttr("services", "cta")}
          className="text-center"
        >
          {f["wealth.services.cta-heading"] && (
            <WealthSectionHeading className="mx-auto mb-6">
              <span {...fieldAttr("wealth.services.cta-heading")}>
                {f["wealth.services.cta-heading"]}
              </span>
            </WealthSectionHeading>
          )}
          {f["wealth.services.cta-label"] && f["wealth.services.cta-url"] && (
            <WealthLedgeButton
              href={f["wealth.services.cta-url"] ?? "/contact"}
              variant="accent"
            >
              <span {...fieldAttr("wealth.services.cta-label")}>
                {f["wealth.services.cta-label"]}
              </span>
            </WealthLedgeButton>
          )}
        </WealthSection>
      )}
    </>
  );
}
