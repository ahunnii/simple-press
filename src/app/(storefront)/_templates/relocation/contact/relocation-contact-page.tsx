import type { DefaultContactPageTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { RelocationCredentialsBand } from "../shared/relocation-credentials-band";
import { relocationTelHref } from "../shared/relocation-phone";
import { RelocationReveal } from "../shared/relocation-reveal";
import { RelocationSectionHeading } from "../shared/relocation-section-heading";
import { RelocationWaveHero } from "../shared/relocation-wave-hero";
import { RelocationContactForm } from "./relocation-contact-form";
import { RelocationContactMap } from "./relocation-contact-map";

/**
 * Handy Relocations — Contact page (`/contact`).
 *
 * Structure follows the reference screenshot
 * (docs/relocation/"Contact Us _ Handy Relocations.jpeg"):
 *   1. Wave hero — "CONTACT US" + welcome line + optional round photo +
 *      outlined CALL US TODAY, which dials the business phone number
 *      (Settings → General) using the global hero-CTA label.
 *   2. "Visit Us" — address / hours / phone / email column on the left, a real
 *      interactive MapLibre map on the right. The values come straight from
 *      the Business record (Settings → General / Settings → Hours); only the
 *      bold labels above them are owner-editable here.
 *   3. "SEND US A MESSAGE" — a plain name/email/phone/message contact form
 *      posting through the shared `contact.send` tRPC pipeline, the same
 *      pipeline every other template's contact form uses.
 *   4. Shared credentials band (global fields, rendered by the band itself).
 *
 * design.md deviation #5 ("no contact form here") was user-approved on
 * 2026-08-10 but REVERSED on 2026-08-13 for platform consistency — see
 * contact/index.ts for the full history. The homepage quote form remains the
 * primary moving-quote lead channel; this form is the standard contact-page
 * form every other template carries. The clone's "MELVYN" reasons /
 * testimonials / gallery sections stay dropped, unrelated to that reversal.
 */
export function RelocationContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "relocation.contact.hero-heading",
    "relocation.contact.hero-subheading",
    "relocation.contact.hero-image",
    "relocation.contact.hero-image-alt",
    "relocation.contact.visit-heading",
    "relocation.contact.hours-label",
    "relocation.contact.phone-label",
    "relocation.contact.email-label",
    "relocation.contact.map-latitude",
    "relocation.contact.map-longitude",
    "relocation.contact.map-zoom",
    "relocation.contact.form-heading",
    "relocation.contact.form-name-label",
    "relocation.contact.form-email-label",
    "relocation.contact.form-email-placeholder",
    "relocation.contact.form-phone-label",
    "relocation.contact.form-message-label",
    "relocation.contact.form-message-placeholder",
    "relocation.contact.form-submit-label",
    "relocation.contact.form-success-heading",
    "relocation.contact.form-success-body",
    "relocation.contact.form-success-again-label",
    "relocation.global.branding.hero-cta-label",
  ]);

  const heroImage = f["relocation.contact.hero-image"] ?? "";
  const ctaHref = relocationTelHref(business?.phoneNumber ?? "");
  const ctaLabel =
    ctaHref === ""
      ? ""
      : (f["relocation.global.branding.hero-cta-label"] ?? "");

  const address = business?.businessAddress ?? "";
  const hoursLabel = f["relocation.contact.hours-label"] ?? "";
  const hoursRows = formatBusinessHours(
    parseBusinessHours(business?.businessHours),
  );
  const phoneLabel = f["relocation.contact.phone-label"] ?? "";
  const phoneValue = business?.phoneNumber ?? "";
  const phoneHref = relocationTelHref(phoneValue);
  const emailLabel = f["relocation.contact.email-label"] ?? "";
  const emailValue = business?.supportEmail ?? "";

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

  const mapLabel = business?.businessAddress ?? "";

  const visitHeading = f["relocation.contact.visit-heading"] ?? "";
  const hasAddressBlock =
    address !== "" ||
    hoursRows.length > 0 ||
    phoneValue !== "" ||
    emailValue !== "";

  const showVisit = isSectionVisible(
    customFields,
    "relocation",
    "contact.visit",
  );

  const showForm = isSectionVisible(customFields, "relocation", "contact.form");

  return (
    <>
      <RelocationWaveHero
        title={f["relocation.contact.hero-heading"] ?? ""}
        subtitle={f["relocation.contact.hero-subheading"] ?? ""}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
        photoSrc={heroImage === "" ? undefined : heroImage}
        photoAlt={f["relocation.contact.hero-image-alt"] ?? ""}
        size="tall"
        sectionAttrs={sectionGroupAttr("contact", "hero")}
        titleFieldAttrs={fieldAttr("relocation.contact.hero-heading")}
        subtitleFieldAttrs={fieldAttr("relocation.contact.hero-subheading")}
        ctaFieldAttrs={fieldAttr("relocation.global.branding.hero-cta-label")}
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
                    {address === "" ? null : <p>{address}</p>}

                    {hoursRows.length === 0 ? null : (
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
                        {hoursRows.map((row, i) => (
                          <span key={row.label + row.value}>
                            {row.label}: {row.value}
                            {i < hoursRows.length - 1 ? <br /> : null}
                          </span>
                        ))}
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
                          <span>{phoneValue}</span>
                        ) : (
                          <a
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

      {showForm ? (
        <section
          {...sectionGroupAttr("contact", "form")}
          aria-labelledby="relocation-contact-form-heading"
          className="w-full bg-[var(--relocation-paper)] py-16 min-[1025px]:py-24"
        >
          <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
            <RelocationReveal className="mx-auto w-full max-w-[40rem]">
              <h2
                id="relocation-contact-form-heading"
                {...fieldAttr("relocation.contact.form-heading")}
                className="text-center [font-family:var(--font-relocation-body)] text-[1.1875rem] leading-[1.875rem] font-medium tracking-[-0.19px] whitespace-pre-line text-[var(--relocation-ink)] min-[1025px]:text-[1.4375rem] min-[1025px]:leading-[2.25rem] min-[1025px]:tracking-[-0.23px]"
              >
                {f["relocation.contact.form-heading"] ?? ""}
              </h2>

              <div className="mt-8">
                <RelocationContactForm
                  nameLabel={f["relocation.contact.form-name-label"] ?? ""}
                  emailLabel={f["relocation.contact.form-email-label"] ?? ""}
                  emailPlaceholder={
                    f["relocation.contact.form-email-placeholder"] ?? ""
                  }
                  phoneLabel={f["relocation.contact.form-phone-label"] ?? ""}
                  messageLabel={
                    f["relocation.contact.form-message-label"] ?? ""
                  }
                  messagePlaceholder={
                    f["relocation.contact.form-message-placeholder"] ?? ""
                  }
                  submitLabel={f["relocation.contact.form-submit-label"] ?? ""}
                  successHeading={
                    f["relocation.contact.form-success-heading"] ?? ""
                  }
                  successBody={f["relocation.contact.form-success-body"] ?? ""}
                  successAgainLabel={
                    f["relocation.contact.form-success-again-label"] ?? ""
                  }
                  nameLabelAttrs={fieldAttr(
                    "relocation.contact.form-name-label",
                  )}
                  emailLabelAttrs={fieldAttr(
                    "relocation.contact.form-email-label",
                  )}
                  phoneLabelAttrs={fieldAttr(
                    "relocation.contact.form-phone-label",
                  )}
                  messageLabelAttrs={fieldAttr(
                    "relocation.contact.form-message-label",
                  )}
                  submitLabelAttrs={fieldAttr(
                    "relocation.contact.form-submit-label",
                  )}
                  successHeadingAttrs={fieldAttr(
                    "relocation.contact.form-success-heading",
                  )}
                  successBodyAttrs={fieldAttr(
                    "relocation.contact.form-success-body",
                  )}
                  successAgainLabelAttrs={fieldAttr(
                    "relocation.contact.form-success-again-label",
                  )}
                />
              </div>
            </RelocationReveal>
          </div>
        </section>
      ) : null}

      <RelocationCredentialsBand customFields={customFields} />
    </>
  );
}
