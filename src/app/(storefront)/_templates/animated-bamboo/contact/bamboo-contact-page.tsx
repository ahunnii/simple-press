import type { CSSProperties } from "react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooMap } from "../shared/bamboo-map";
import { BambooReveal } from "../shared/bamboo-reveal";
import { BambooContactForm } from "./bamboo-contact-form";

/**
 * Contact page — "Illustrated & Alive" redesign. Ported from
 * `docs/templates/bamboo/build/mockup-refs/mockup-b-contact.elided.html`.
 * Zero field-key changes from the pre-redesign page. See
 * `docs/templates/bamboo/build/reports/s3-w2.md` for rationale.
 */

export function BambooContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "animated-bamboo.contact.header",
    "animated-bamboo.contact.subheader",
    "animated-bamboo.contact.hours",
    "animated-bamboo.contact.map-heading",
    "animated-bamboo.global.map-lat",
    "animated-bamboo.global.map-lng",
  ]);

  const email = business?.supportEmail?.trim();
  const location = business?.businessAddress?.trim();
  const phone = business?.phoneNumber?.trim();
  const hours = (f["animated-bamboo.contact.hours"] ?? "").trim();

  const latRaw = f["animated-bamboo.global.map-lat"]?.trim();
  const lngRaw = f["animated-bamboo.global.map-lng"]?.trim();
  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapDest = location ? encodeURIComponent(location) : `${lat},${lng}`;
  const viewUrl = `https://www.google.com/maps/search/?api=1&query=${mapDest}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapDest}`;

  const mapVisible =
    hasCoords &&
    isSectionVisible(customFields, "animated-bamboo", "contact.map");

  return (
    // flex column + flex-1 so this root grows to fill <main> (a column flex
    // container) and the trailing pine BambooEdge's mt-auto can pin to the
    // bottom instead of leaving a strip of paper above the footer.
    <div className="flex flex-1 flex-col">
      {/* 1. Hero — short sage band (~30vh), one pot anchoring the corner */}
      <section
        {...sectionGroupAttr("contact", "info")}
        aria-labelledby="bamboo-contact-hero-h"
        className="relative min-h-[clamp(268px,32vh,400px)] overflow-hidden bg-[var(--bamboo-sage)] pt-[76px] pb-9 md:pt-[100px] md:pb-9"
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <span
            className="bamboo-el bamboo-el--b bamboo-contact-pot"
            style={
              {
                "--w": "148px",
                "--l": "89%",
                "--b": "-24px",
                "--d": ".12s",
              } as CSSProperties
            }
          >
            <i
              className="bamboo-shd"
              style={
                { "--sw": "82%", "--sh": "15%", "--sb": "-6%" } as CSSProperties
              }
            />
            <span
              className="bamboo-bob"
              style={
                {
                  "--dur": "6.6s",
                  "--dl": "-2.4s",
                  "--amp": "5px",
                  "--rot": "-1.4deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-pot" />
            </span>
          </span>
          <span
            className="bamboo-drift"
            style={
              {
                "--l": "63%",
                "--t": "12%",
                "--w": "24px",
                "--dur": "17s",
                "--dl": "-4s",
                "--dx": "70px",
                "--dy": "300px",
                "--dr": "170deg",
              } as CSSProperties
            }
          >
            <BambooGlyph id="s-leaf-l" />
          </span>
        </div>

        <div className="relative z-2 mx-auto w-[min(1200px,calc(100%-48px))]">
          <div className="max-w-[600px]">
            <h1
              id="bamboo-contact-hero-h"
              className="font-heading text-[clamp(2.3rem,4.6vw,3.5rem)] font-bold tracking-[-0.026em] text-[var(--bamboo-pine)]"
            >
              <span {...fieldAttr("animated-bamboo.contact.header")}>
                {f["animated-bamboo.contact.header"] ?? ""}
              </span>
            </h1>
            <p
              className="mt-[18px] max-w-[50ch] text-[1.08rem] leading-[1.62] text-[var(--bamboo-ink)]"
              {...fieldAttr("animated-bamboo.contact.subheader")}
            >
              {f["animated-bamboo.contact.subheader"] ?? ""}
            </p>
          </div>
        </div>
      </section>

      <BambooEdge
        from="sage"
        to="paper"
        variant="a"
        leaves={[
          { id: "s-leaf-d", l: "16%", t: "8%", w: "26px", r: "-20deg" },
          { id: "s-leaf", l: "52%", t: "32%", w: "21px", r: "16deg" },
          { id: "s-leaf-l", l: "78%", t: "4%", w: "24px", r: "-8deg" },
        ]}
      />

      {/* 2. Form + info panel */}
      <section
        aria-label="Contact form and information"
        className="bg-[var(--bamboo-paper)] pt-8 pb-14 md:pt-[52px] md:pb-[58px]"
      >
        <div className="mx-auto grid w-[min(1200px,calc(100%-48px))] items-start gap-8 md:grid-cols-[1.12fr_0.88fr] md:gap-[clamp(34px,4.5vw,72px)]">
          <BambooReveal>
            <BambooContactForm />
          </BambooReveal>

          <div className="grid gap-[26px]">
            <BambooReveal
              className="bamboo-torn-card"
              style={{ "--rd": "90ms" } as React.CSSProperties}
            >
              <h2 className="font-heading text-[1.3rem] tracking-[-0.01em] text-[var(--bamboo-pine)]">
                Contact Details
              </h2>
              <dl className="mt-[22px] grid gap-[18px]">
                {email && (
                  <div>
                    <dt className="font-heading text-[0.98rem] font-semibold text-[var(--bamboo-pine)]">
                      Email
                    </dt>
                    <dd className="mt-1 text-[1rem] leading-[1.5] text-[var(--bamboo-ink-soft)]">
                      <a
                        href={`mailto:${email}`}
                        className="bamboo-swipe font-medium text-[var(--bamboo-pine)]"
                      >
                        {email}
                      </a>
                    </dd>
                  </div>
                )}
                {location && (
                  <div>
                    <dt className="font-heading text-[0.98rem] font-semibold text-[var(--bamboo-pine)]">
                      Location
                    </dt>
                    <dd className="mt-1 text-[1rem] leading-[1.5] text-[var(--bamboo-ink-soft)]">
                      {location}
                    </dd>
                  </div>
                )}
                {phone && (
                  <div>
                    <dt className="font-heading text-[0.98rem] font-semibold text-[var(--bamboo-pine)]">
                      Phone
                    </dt>
                    <dd className="mt-1 text-[1rem] leading-[1.5] text-[var(--bamboo-ink-soft)]">
                      <a
                        href={`tel:${phone}`}
                        className="bamboo-swipe font-medium text-[var(--bamboo-pine)]"
                      >
                        {phone}
                      </a>
                    </dd>
                  </div>
                )}
                {hours && (
                  <div>
                    <dt className="font-heading text-[0.98rem] font-semibold text-[var(--bamboo-pine)]">
                      Hours
                    </dt>
                    <dd
                      className="mt-1 text-[1rem] leading-[1.5] text-[var(--bamboo-ink-soft)]"
                      {...fieldAttr("animated-bamboo.contact.hours")}
                    >
                      {hours}
                    </dd>
                  </div>
                )}
              </dl>
              {/* Structural copy, not a field — ContactPage keeps zero field-key
                  changes per the redesign scope; see s3-w2.md for rationale. */}
              <p className="mt-6 border-t border-dashed border-[var(--bamboo-outline)] pt-5 text-[0.94rem] font-medium text-[var(--bamboo-muted)]">
                Proudly made in Detroit.
              </p>
            </BambooReveal>
          </div>
        </div>
      </section>

      {/* 3. Location map (hideable) */}
      {mapVisible && (
        <section
          {...sectionGroupAttr("contact", "map")}
          aria-labelledby="bamboo-contact-map-h"
          className="bg-[var(--bamboo-paper)] pt-2 pb-14 md:pb-[58px]"
        >
          <div className="mx-auto w-[min(1200px,calc(100%-48px))]">
            <BambooReveal className="mb-10 text-center">
              <h2
                id="bamboo-contact-map-h"
                className="font-heading text-[clamp(2rem,3.4vw,2.95rem)] font-bold text-[var(--bamboo-pine)]"
                {...fieldAttr("animated-bamboo.contact.map-heading")}
              >
                {f["animated-bamboo.contact.map-heading"] ?? ""}
              </h2>
            </BambooReveal>
            <BambooReveal style={{ "--rd": "100ms" } as React.CSSProperties}>
              <BambooMap
                businessName={business?.name ?? ""}
                address={location}
                latitude={lat}
                longitude={lng}
                viewUrl={viewUrl}
                directionsUrl={directionsUrl}
              />
            </BambooReveal>
          </div>
        </section>
      )}

      <BambooEdge from="paper" to="pine" variant="c" />
    </div>
  );
}
