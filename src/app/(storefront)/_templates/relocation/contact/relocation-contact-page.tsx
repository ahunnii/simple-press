import type { DefaultContactPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { RelocationCredentialsBand } from "../shared/relocation-credentials-band";
import { RelocationReveal } from "../shared/relocation-reveal";
import { RelocationSectionHeading } from "../shared/relocation-section-heading";
import { RelocationWaveHero } from "../shared/relocation-wave-hero";
import { RelocationContactMap } from "./relocation-contact-map";

/**
 * Handy Relocations — Contact page (`/contact`).
 *
 * Structure follows the reference screenshot exactly
 * (docs/relocation/"Contact Us _ Handy Relocations.jpeg"):
 *   1. Wave hero, no photo — "CONTACT US" + welcome line + outlined CALL US
 *      TODAY, which dials the header's global phone link.
 *   2. "Visit Us" — address / hours / phone / email column on the left, a real
 *      interactive MapLibre map on the right.
 *   3. Shared credentials band (global fields, rendered by the band itself).
 *
 * NO contact form: design.md deviation #5 (user-approved). The homepage quote
 * form is the lead channel, and the screenshot shows no form here. The clone's
 * "MELVYN" reasons / testimonials / gallery sections are dropped for the same
 * reason.
 */
export function RelocationContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "relocation.contact.hero-heading",
    "relocation.contact.hero-subheading",
    "relocation.contact.hero-cta-label",
    "relocation.contact.visit-heading",
    "relocation.contact.address-line-1",
    "relocation.contact.address-line-2",
    "relocation.contact.hours-label",
    "relocation.contact.hours-value",
    "relocation.contact.phone-label",
    "relocation.contact.phone-value",
    "relocation.contact.phone-href",
    "relocation.contact.email-label",
    "relocation.contact.email-value",
    "relocation.contact.map-latitude",
    "relocation.contact.map-longitude",
    "relocation.contact.map-zoom",
    "relocation.global.branding.phone-href",
  ]);

  const heroCtaLabel = f["relocation.contact.hero-cta-label"] ?? "";
  const heroCtaHref = f["relocation.global.branding.phone-href"] ?? "";

  const addressLine1 = f["relocation.contact.address-line-1"] ?? "";
  const addressLine2 = f["relocation.contact.address-line-2"] ?? "";
  const hoursLabel = f["relocation.contact.hours-label"] ?? "";
  const hoursValue = f["relocation.contact.hours-value"] ?? "";
  const phoneLabel = f["relocation.contact.phone-label"] ?? "";
  const phoneValue = f["relocation.contact.phone-value"] ?? "";
  const phoneHref = f["relocation.contact.phone-href"] ?? "";
  const emailLabel = f["relocation.contact.email-label"] ?? "";
  const emailValue = f["relocation.contact.email-value"] ?? "";

  // Coordinates are owner-entered text; a blank or malformed value hides the
  // map rather than dropping a MapLibre canvas on [NaN, NaN] (bamboo precedent).
  const latitude = Number.parseFloat(
    f["relocation.contact.map-latitude"] ?? "",
  );
  const longitude = Number.parseFloat(
    f["relocation.contact.map-longitude"] ?? "",
  );
  const parsedZoom = Number.parseFloat(f["relocation.contact.map-zoom"] ?? "");
  const hasCoords =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  const zoom = Number.isFinite(parsedZoom) ? parsedZoom : 12;

  const mapLabel = [addressLine1, addressLine2].filter(Boolean).join(", ");

  const visitHeading = f["relocation.contact.visit-heading"] ?? "";
  const hasAddressLines = addressLine1 !== "" || addressLine2 !== "";
  const hasAddressBlock =
    hasAddressLines ||
    hoursValue !== "" ||
    phoneValue !== "" ||
    emailValue !== "";

  const showVisit = isSectionVisible(
    customFields,
    "relocation",
    "contact.visit",
  );

  return (
    <>
      <RelocationWaveHero
        title={f["relocation.contact.hero-heading"] ?? ""}
        subtitle={f["relocation.contact.hero-subheading"] ?? ""}
        ctaLabel={heroCtaLabel}
        ctaHref={heroCtaHref}
        size="tall"
        sectionAttrs={sectionGroupAttr("contact", "hero")}
        titleFieldAttrs={fieldAttr("relocation.contact.hero-heading")}
        subtitleFieldAttrs={fieldAttr("relocation.contact.hero-subheading")}
        ctaFieldAttrs={fieldAttr("relocation.contact.hero-cta-label")}
      />

      {showVisit ? (
        <section
          {...sectionGroupAttr("contact", "visit")}
          aria-labelledby={
            visitHeading === "" ? undefined : "relocation-contact-visit-heading"
          }
          aria-label={visitHeading === "" ? "Visit us" : undefined}
          className="w-full bg-[var(--relocation-paper)] py-16 min-[1025px]:py-24"
        >
          <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
            <div className="grid gap-12 min-[1025px]:grid-cols-12 min-[1025px]:items-start min-[1025px]:gap-16">
              {/* ── Address column ── */}
              <RelocationReveal
                className={
                  hasCoords
                    ? "min-[1025px]:col-span-4"
                    : "min-[1025px]:col-span-12"
                }
              >
                {visitHeading === "" ? null : (
                  <RelocationSectionHeading
                    id="relocation-contact-visit-heading"
                    dark
                    fieldAttrs={fieldAttr("relocation.contact.visit-heading")}
                    // The screenshot renders "Visit Us" at the hero scale (4rem),
                    // a step above the standard section heading.
                    className="text-[2.8125rem] leading-[3rem] min-[1025px]:text-[4rem] min-[1025px]:leading-[4.25rem]"
                  >
                    {visitHeading}
                  </RelocationSectionHeading>
                )}

                {hasAddressBlock ? (
                  <address className="mt-9 flex flex-col gap-6 text-[var(--relocation-ink)] not-italic">
                    {hasAddressLines ? (
                      <p>
                        {addressLine1 === "" ? null : (
                          <span
                            {...fieldAttr("relocation.contact.address-line-1")}
                          >
                            {addressLine1}
                          </span>
                        )}
                        {addressLine1 !== "" && addressLine2 !== "" ? (
                          <br />
                        ) : null}
                        {addressLine2 === "" ? null : (
                          <span
                            {...fieldAttr("relocation.contact.address-line-2")}
                          >
                            {addressLine2}
                          </span>
                        )}
                      </p>
                    ) : null}

                    {hoursValue === "" ? null : (
                      <p>
                        {hoursLabel === "" ? null : (
                          <>
                            <strong
                              {...fieldAttr("relocation.contact.hours-label")}
                              className="font-bold"
                            >
                              {hoursLabel}
                            </strong>
                            <br />
                          </>
                        )}
                        <span {...fieldAttr("relocation.contact.hours-value")}>
                          {hoursValue}
                        </span>
                      </p>
                    )}

                    {phoneValue === "" ? null : (
                      <p>
                        {phoneLabel === "" ? null : (
                          <>
                            <strong
                              {...fieldAttr("relocation.contact.phone-label")}
                              className="font-bold"
                            >
                              {phoneLabel}
                            </strong>
                            <br />
                          </>
                        )}
                        {phoneHref === "" ? (
                          <span
                            {...fieldAttr("relocation.contact.phone-value")}
                          >
                            {phoneValue}
                          </span>
                        ) : (
                          <a
                            {...fieldAttr("relocation.contact.phone-value")}
                            href={phoneHref}
                            className="relocation-hover-fade underline underline-offset-4"
                          >
                            {phoneValue}
                          </a>
                        )}
                      </p>
                    )}

                    {emailValue === "" ? null : (
                      <p>
                        {emailLabel === "" ? null : (
                          <>
                            <strong
                              {...fieldAttr("relocation.contact.email-label")}
                              className="font-bold"
                            >
                              {emailLabel}
                            </strong>
                            <br />
                          </>
                        )}
                        <a
                          {...fieldAttr("relocation.contact.email-value")}
                          href={`mailto:${emailValue}`}
                          className="relocation-hover-fade break-words underline underline-offset-4"
                        >
                          {emailValue}
                        </a>
                      </p>
                    )}
                  </address>
                ) : null}
              </RelocationReveal>

              {/* ── Map column ── */}
              {hasCoords ? (
                <RelocationReveal className="min-[1025px]:col-span-8">
                  <RelocationContactMap
                    latitude={latitude}
                    longitude={longitude}
                    zoom={zoom}
                    label={mapLabel}
                  />
                </RelocationReveal>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <RelocationCredentialsBand customFields={customFields} />
    </>
  );
}
